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

   public function issueAsset(Request $request)
    {
        $validated = $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.key' => 'required|string',
            'cart.*.serialized_asset_id' => 'required|exists:serialized_assets,id',
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
                    $resolvedByKey = [];
                    $lineInputs = [];

                    // Pass 1: lock + validate every asset up front
                    foreach ($validated['cart'] as $cartItem) {
                        $asset = SerializedAsset::where('id', $cartItem['serialized_asset_id'])->lockForUpdate()->first();
                        if (!$asset || $asset->status !== 'Available' || $asset->current_holder_id) {
                            return response()->json(['error' => "Asset #{$cartItem['serialized_asset_id']} is not available."], 422);
                        }
                        $resolvedByKey[$cartItem['key']] = $asset;
                    }

                    // Pass 2: apply attach_to now that every asset's property_number is known
                    foreach ($validated['cart'] as $cartItem) {
                        $asset = $resolvedByKey[$cartItem['key']];

                        $attachTo = null;
                        if (!empty($cartItem['attach_to_key']) && isset($resolvedByKey[$cartItem['attach_to_key']])) {
                            $attachTo = $resolvedByKey[$cartItem['attach_to_key']]->property_number;
                        }

                        $asset->update(['status' => 'Assigned', 'attached_to' => $attachTo]);
                        $lineInputs[] = ['asset' => $asset, 'quantity' => 1];
                    }

                    $parLines = array_values(array_filter($lineInputs, fn($li) => (float) $li['asset']->unit_cost >= 50000));
                    $icsLines = array_values(array_filter($lineInputs, fn($li) => (float) $li['asset']->unit_cost < 50000));

                    $recipient = User::find($validated['user_id']);
                    $unitHead = $recipient?->findUnitHead();
                    $createdReceipts = [];

                    foreach ([['type' => 'PAR', 'lines' => $parLines], ['type' => 'ICS', 'lines' => $icsLines]] as $bucket) {
                        if (empty($bucket['lines'])) continue;

                        $receiptType = $bucket['type'];
                        $lastReceipt = AccountabilityReceipt::where('receipt_type', $receiptType)
                            ->whereYear('date_issued', $year)->orderBy('id', 'desc')->lockForUpdate()->first();

                        $nextSeq = 1;
                        if ($lastReceipt && $lastReceipt->document_number) {
                            $parts = explode('-', $lastReceipt->document_number);
                            $nextSeq = intval(end($parts)) + 1;
                        }
                        $documentNumber = sprintf("%s-%s-%04d", $receiptType, $year, $nextSeq);

                        $receipt = AccountabilityReceipt::create([
                            'receipt_type' => $receiptType,
                            'document_number' => $documentNumber,
                            'user_id' => $validated['user_id'],
                            'issued_by_id' => $validated['issued_by_id'],
                            'received_mr_by_id' => $unitHead?->id,
                            'date_issued' => $dateIssued,
                            'remarks' => $validated['remarks'] ?? null,
                        ]);

                        foreach ($bucket['lines'] as $li) {
                            $li['asset']->update(['current_holder_id' => $validated['user_id']]);
                            $receipt->lines()->create([
                                'serialized_asset_id' => $li['asset']->id,
                                'item_id' => $li['asset']->item_id,
                                'quantity' => 1,
                            ]);
                        }

                        $createdReceipts[] = $receipt->load(['lines.serializedAsset.item', 'user', 'issuedBy', 'receivedMrBy']);
                    }

                    return response()->json([
                        'message' => 'Assets successfully issued.',
                        'receipts' => $createdReceipts,
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

    public function downloadPropertyTagPdf(
        SerializedAsset $serializedAsset,
        Request $request,
        PropertyTagPdfService $pdfService
    ) {
        $pdf = $pdfService->generate(
            $serializedAsset,
            $request
        );

        $filename = "PropertyTag-{$serializedAsset->property_number}.pdf";

        return $pdf->download($filename);
    }

    public function availableForCart()
    {
        $available = SerializedAsset::with('item')
            ->whereHas('item', fn($q) => $q->where('tracking_type', 'asset'))
            ->where('status', 'Available')
            ->whereNull('current_holder_id')
            ->where(function ($query) {
                // Only include if it has no parent, OR if its parent is also Available
                $query->whereNull('attached_to')
                    ->orWhereIn('attached_to', function ($subQuery) {
                        $subQuery->select('property_number')
                                ->from('serialized_assets')
                                ->where('status', 'Available');
                    });
            })
            ->orderBy('item_id')
            ->get();

        return response()->json(['assets' => $available], 200);
    }

    public function attachedItems(SerializedAsset $serializedAsset)
    {
        $attached = SerializedAsset::with('item')
            ->where('attached_to', $serializedAsset->property_number)
            ->get();

        return response()->json($attached, 200);
    }
}