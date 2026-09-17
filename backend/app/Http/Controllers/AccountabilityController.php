<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\SerializedAsset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\AccountabilityExcelService;
use App\Services\PropertyTagPdfService;

class AccountabilityController extends Controller
{
    public function index()
    {
        try {
            $assets = SerializedAsset::with(['item', 'currentHolder'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($assets, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch serialized assets: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve assets.'], 500);
        }
    }

    public function getReceipts()
    {
        try {
            $receipts = AccountabilityReceipt::with([
                    'lines.serializedAsset.item',
                    'user', 'issuedBy', 'receivedMrBy'
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($receipts, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to retrieve receipts.'], 500);
        }
    }

    /**
     * Issue one or more serialized assets under a single PAR/ICS document.
     * Receipt type (ICS vs PAR) is decided by the highest-cost asset in the bundle,
     * matching how bundled accessories (0-cost) still ride under a PAR when
     * issued alongside a threshold-crossing main unit.
     */
    public function issueAsset(Request $request)
    {
        $validated = $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.key' => 'required|string',
            'cart.*.type' => 'required|in:serialized,non-serialized',
            'cart.*.serialized_asset_id' => 'required_if:cart.*.type,serialized|nullable|exists:serialized_assets,id',
            'cart.*.item_id' => 'required_if:cart.*.type,non-serialized|nullable|exists:items,id',
            'cart.*.quantity' => 'required_if:cart.*.type,non-serialized|nullable|integer|min:1',
            'cart.*.attach_to_key' => 'nullable|string',
            'user_id' => 'required|exists:users,id',
            'issued_by_id' => 'required|exists:users,id',
            'date_issued' => 'required|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $dateIssued = $validated['date_issued'];
        $year = date('Y', strtotime($dateIssued));
        $maxAttempts = 5;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                return DB::transaction(function () use ($validated, $dateIssued, $year) {
                    $touchedUnitCosts = [];
                    // Resolves each cart entry to the concrete serialized_assets row
                    // it ends up as — keyed by the frontend's cart key, so
                    // attach_to_key lookups can resolve to a real property_number.
                    $resolvedByKey = [];
                    $lineInputs = []; // [{asset, quantity}]

                    // Pass 1: lock and validate every referenced row up front
                    foreach ($validated['cart'] as $cartItem) {
                        if ($cartItem['type'] === 'serialized') {
                            $asset = SerializedAsset::where('id', $cartItem['serialized_asset_id'])
                                ->lockForUpdate()
                                ->first();

                            if (!$asset || $asset->status !== 'Available') {
                                return response()->json([
                                    'error' => "Serialized asset #{$cartItem['serialized_asset_id']} is not available."
                                ], 422);
                            }
                        } else {
                            $requestedQty = $cartItem['quantity'];
                            $totalAvailable = SerializedAsset::where('item_id', $cartItem['item_id'])
                                ->where('status', 'Available')
                                ->whereNull('current_holder_id')
                                ->sum('quantity_on_hand');

                            if ($totalAvailable < $requestedQty) {
                                return response()->json([
                                    'error' => "Insufficient stock for item #{$cartItem['item_id']}. Only {$totalAvailable} available."
                                ], 422);
                            }
                        }
                    }

                    // Pass 2: resolve serialized items first, so their property_number
                    // is known before any attach_to_key lookups need it.
                    foreach ($validated['cart'] as $cartItem) {
                        if ($cartItem['type'] !== 'serialized') continue;

                        $asset = SerializedAsset::where('id', $cartItem['serialized_asset_id'])->lockForUpdate()->first();
                        $touchedUnitCosts[] = (float) $asset->unit_cost;
                        $resolvedByKey[$cartItem['key']] = $asset;
                        $lineInputs[] = ['asset' => $asset, 'quantity' => 1];
                    }

                    // Pass 3: resolve non-serialized items via FIFO pool-splitting
                    foreach ($validated['cart'] as $cartItem) {
                        if ($cartItem['type'] !== 'non-serialized') continue;

                        $attachTo = null;
                        if (!empty($cartItem['attach_to_key']) && isset($resolvedByKey[$cartItem['attach_to_key']])) {
                            $attachTo = $resolvedByKey[$cartItem['attach_to_key']]->property_number;
                        }

                        $qtyToDeduct = $cartItem['quantity'];

                        $poolRows = SerializedAsset::where('item_id', $cartItem['item_id'])
                            ->where('status', 'Available')
                            ->whereNull('current_holder_id')
                            ->where('quantity_on_hand', '>', 0)
                            ->orderBy('created_at', 'asc')
                            ->orderBy('id', 'asc')
                            ->lockForUpdate()
                            ->get();

                        foreach ($poolRows as $pool) {
                            if ($qtyToDeduct <= 0) break;
                            $take = min($pool->quantity_on_hand, $qtyToDeduct);

                            if ($take === $pool->quantity_on_hand) {
                                // Whole row moves out of the warehouse — update in place.
                                $pool->update([
                                    'status' => 'Assigned',
                                    'current_holder_id' => null, // set after we know user_id below
                                    'attached_to' => $attachTo,
                                ]);
                                $issuedRow = $pool;
                            } else {
                                // Partial take — shrink the pool, spin off a new instance row.
                                $pool->update(['quantity_on_hand' => $pool->quantity_on_hand - $take]);

                                $issuedRow = SerializedAsset::create([
                                    'item_id' => $pool->item_id,
                                    'serial_number' => null,
                                    'property_number' => null,
                                    'model' => $pool->model,
                                    'manufacturer_name' => $pool->manufacturer_name,
                                    'country_of_origin' => $pool->country_of_origin,
                                    'unit_cost' => $pool->unit_cost,
                                    'quantity_on_hand' => $take,
                                    'status' => 'Assigned',
                                    'attached_to' => $attachTo,
                                ]);
                            }

                            $touchedUnitCosts[] = (float) $pool->unit_cost;
                            $lineInputs[] = ['asset' => $issuedRow, 'quantity' => $take];
                            $resolvedByKey[$cartItem['key']] = $issuedRow;

                            $qtyToDeduct -= $take;
                        }
                    }

                    $maxCost = !empty($touchedUnitCosts) ? max($touchedUnitCosts) : 0;
                    $receiptType = ($maxCost >= 50000) ? 'PAR' : 'ICS';

                    $lastReceipt = AccountabilityReceipt::where('receipt_type', $receiptType)
                        ->whereYear('date_issued', $year)
                        ->orderBy('id', 'desc')
                        ->lockForUpdate()
                        ->first();

                    $nextSeq = 1;
                    if ($lastReceipt && $lastReceipt->document_number) {
                        $parts = explode('-', $lastReceipt->document_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }

                    $documentNumber = sprintf("UNIT-NAME-%s-%04d", $year, $nextSeq);

                    $recipient = User::find($validated['user_id']);
                    $unitHead = $recipient?->findUnitHead();

                    $receipt = AccountabilityReceipt::create([
                        'receipt_type' => $receiptType,
                        'document_number' => $documentNumber,
                        'user_id' => $validated['user_id'],
                        'issued_by_id' => $validated['issued_by_id'],
                        'received_mr_by_id' => $unitHead?->id,
                        'date_issued' => $dateIssued,
                        'remarks' => $validated['remarks'] ?? null,
                    ]);

                    foreach ($lineInputs as $li) {
                        $li['asset']->update(['current_holder_id' => $validated['user_id']]);

                        $receipt->lines()->create([
                            'serialized_asset_id' => $li['asset']->id,
                            'item_id' => $li['asset']->item_id,
                            'quantity' => $li['quantity'],
                        ]);
                    }

                    return response()->json([
                        'message' => "Assets successfully issued under {$receiptType} ({$documentNumber}).",
                        'document_number' => $documentNumber,
                        'receipt_type' => $receiptType,
                        'receipt' => $receipt->load(['lines.serializedAsset.item', 'user', 'issuedBy', 'receivedMrBy'])
                    ], 201);
                });
            } catch (\Illuminate\Database\QueryException $e) {
                $errorCode = $e->errorInfo[1] ?? null;
                if ($errorCode == 1062 && $attempt < $maxAttempts) continue;
                Log::error('Failed to issue asset(s): ' . $e->getMessage());
                return response()->json(['error' => 'Failed to issue asset(s): ' . $e->getMessage()], 500);
            } catch (\Exception $e) {
                Log::error('Failed to issue asset(s): ' . $e->getMessage());
                return response()->json(['error' => 'Failed to issue asset(s): ' . $e->getMessage()], 500);
            }
        }

        return response()->json(['error' => 'Failed to generate a unique document number after several attempts.'], 500);
    }

    public function updateAssetStatus(Request $request, SerializedAsset $serializedAsset)
    {
        $validated = $request->validate([
            'status' => 'required|in:Available,Assigned,Under Repair,Condemned',
            'condition_remarks' => 'required_if:status,Under Repair,Condemned|nullable|string|max:1000',
        ]);

        $currentStatus = $serializedAsset->status;
        $newStatus = $validated['status'];

        // Condemned is terminal through this endpoint.
        if ($currentStatus === 'Condemned') {
            return response()->json([
                'error' => 'This asset is condemned and its status cannot be changed here.'
            ], 422);
        }

        // Entering repair: remember exactly what status it came from.
        if ($newStatus === 'Under Repair') {
            if ($currentStatus === 'Under Repair') {
                return response()->json(['error' => 'Asset is already Under Repair.'], 422);
            }

            $serializedAsset->update([
                'status' => 'Under Repair',
                'pre_repair_status' => $currentStatus, // 'Available' or 'Assigned'
                'condition_remarks' => $validated['condition_remarks'] ?? null,
            ]);

            return response()->json([
                'message' => 'Asset marked Under Repair.',
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        }

        // Leaving repair: can ONLY go back to the exact status it came from, or Condemned.
        // No other transition is permitted from Under Repair — this is what
        // makes "Under Repair -> Assigned" impossible unless it actually came from Assigned.
        if ($currentStatus === 'Under Repair') {
            $allowedReturn = $serializedAsset->pre_repair_status ?? 'Available';

            if ($newStatus !== $allowedReturn && $newStatus !== 'Condemned') {
                return response()->json([
                    'error' => "This asset was under repair from '{$allowedReturn}' and can only return to '{$allowedReturn}', or be marked Condemned."
                ], 422);
            }

            $serializedAsset->update([
                'status' => $newStatus,
                'pre_repair_status' => null, // clear once resolved
                'condition_remarks' => $newStatus === 'Condemned' ? ($validated['condition_remarks'] ?? null) : null,
            ]);

            return response()->json([
                'message' => "Asset status updated to '{$newStatus}'.",
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        }

        // From Available or Assigned directly to Condemned (skipping repair entirely).
        if ($newStatus === 'Condemned') {
            $serializedAsset->update([
                'status' => 'Condemned',
                'pre_repair_status' => null,
                'condition_remarks' => $validated['condition_remarks'] ?? null,
            ]);

            return response()->json([
                'message' => 'Asset marked Condemned.',
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        }

        // Any other combination (e.g. manually picking "Assigned" or "Available"
        // without going through repair first) is not a valid manual transition here.
        return response()->json([
            'error' => "Cannot change status from '{$currentStatus}' to '{$newStatus}' directly. Use Return/Transfer for returning assigned assets."
        ], 422);
    }

    public function downloadExcel(int $id, AccountabilityExcelService $excelService)
    {
        $receipt = AccountabilityReceipt::with([
            'user',
            'issuedBy',
            'receivedMrBy',
            'lines.serializedAsset.item'
        ])->findOrFail($id);

        return $excelService->generate($receipt);
    }

    public function downloadPropertyTagPdf(int $lineId, PropertyTagPdfService $pdfService)
    {
        $line = \App\Models\AccountabilityReceiptLine::with('serializedAsset.item')->findOrFail($lineId);

        $pdf = $pdfService->generate($line);
        $filename = "PropertyTag-{$line->serializedAsset->property_number}.pdf";

        return $pdf->download($filename);
    }

    public function availableForCart()
    {
        $serialized = SerializedAsset::with('item')
            ->whereHas('item', fn($q) => $q->where('tracking_type', 'serialized'))
            ->where('status', 'Available')
            ->get();

        $nonSerializedByItem = SerializedAsset::with('item')
            ->whereHas('item', fn($q) => $q->where('tracking_type', 'non-serialized'))
            ->where('status', 'Available')
            ->where('quantity_on_hand', '>', 0)
            ->get()
            ->groupBy('item_id')
            ->map(function ($rows) {
                $first = $rows->first();
                return [
                    'item_id' => $first->item_id,
                    'item_name' => $first->item->name,
                    'unit_cost' => $rows->max('unit_cost'), // display purposes
                    'total_available' => $rows->sum('quantity_on_hand'),
                ];
            })
            ->values();

        return response()->json([
            'serialized' => $serialized,
            'non_serialized' => $nonSerializedByItem,
        ], 200);
    }

    public function attachedItems(SerializedAsset $serializedAsset)
    {
        $attached = SerializedAsset::with('item')
            ->where('attached_to', $serializedAsset->property_number)
            ->get();

        return response()->json($attached, 200);
    }
}