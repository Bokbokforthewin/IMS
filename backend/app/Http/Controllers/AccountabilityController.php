<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\SerializedAsset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\AccountabilityExcelService;
use App\Services\PropertyTagPdfService;

class AccountabilityController extends Controller
{
    /**
     * Display a listing of all serialized assets.
     */
    public function index(): JsonResponse
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

    /**
     * Retrieve all issued accountability receipts along with primary/secondary holder details.
     */
    public function getReceipts(): JsonResponse
    {
        try {
            $receipts = AccountabilityReceipt::with([
                'lines.serializedAsset.item',
                'lines.serializedAsset.currentHolder',
                'user',
                'issuedBy',
                'receivedMrBy'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

            return response()->json($receipts, 200);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve receipts: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve receipts.'], 500);
        }
    }

    /**
     * Issue serialized assets under PAR or ICS receipts and assign primary/secondary receivers.
     */
    public function issueAsset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart' => 'required|array|min:1',
            'cart.*.key' => 'required|string',
            'cart.*.serialized_asset_id' => 'required|exists:serialized_assets,id',
            'cart.*.attach_to_key' => 'nullable|string',
            'cart.*.user_id' => 'nullable|exists:users,id',      // Secondary Receiver per item
            'user_id' => 'nullable|exists:users,id',              // Secondary Receiver default
            'received_mr_by_id' => 'required|exists:users,id',    // Primary Receiver (PAR/ICS Signatory)
            'issued_by_id' => 'required|exists:users,id',         // Issuer / Property Officer
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

                    // Pass 1: Lock and validate availability of each requested asset
                    foreach ($validated['cart'] as $cartItem) {
                        $asset = SerializedAsset::with('item')
                            ->where('id', $cartItem['serialized_asset_id'])
                            ->lockForUpdate()
                            ->first();

                        if (!$asset || $asset->status !== 'Available' || $asset->current_holder_id) {
                            return response()->json([
                                'error' => "Asset #{$cartItem['serialized_asset_id']} is no longer available for issuance."
                            ], 422);
                        }

                        $resolvedByKey[$cartItem['key']] = $asset;
                    }

                    // Pass 2: Link attachments and segregate items into PAR (>= 50k) and ICS (< 50k) buckets
                    $parLines = [];
                    $icsLines = [];

                    foreach ($validated['cart'] as $cartItem) {
                        $key = $cartItem['key'];
                        $asset = $resolvedByKey[$key];

                        // Resolve parent attachment property number
                        $attachTo = null;
                        if (!empty($cartItem['attach_to_key']) && isset($resolvedByKey[$cartItem['attach_to_key']])) {
                            $attachTo = $resolvedByKey[$cartItem['attach_to_key']]->property_number;
                        }

                        // Secondary Receiver priority: Item level -> Form default -> Primary Receiver
                        $secondaryUserId = $cartItem['user_id'] 
                            ?? $validated['user_id'] 
                            ?? $validated['received_mr_by_id'];

                        // Extract and sanitize unit cost
                        $rawCost = $asset->unit_cost ?? $asset->item?->unit_cost ?? 0;
                        $cleanCost = (float) preg_replace('/[^0-9.]/', '', (string) $rawCost);

                        $line = [
                            'asset' => $asset,
                            'attach_to' => $attachTo,
                            'secondary_user_id' => $secondaryUserId,
                            'quantity' => 1,
                        ];

                        if ($cleanCost >= 50000) {
                            $parLines[] = $line;
                        } else {
                            $icsLines[] = $line;
                        }
                    }

                    $createdReceipts = [];
                    $buckets = [
                        ['type' => 'PAR', 'lines' => $parLines],
                        ['type' => 'ICS', 'lines' => $icsLines],
                    ];

                    // Pass 3: Create distinct accountability receipts (PAR/ICS) and assign assets
                    foreach ($buckets as $bucket) {
                        if (empty($bucket['lines'])) continue;

                        $receiptType = $bucket['type'];

                        // Lock and generate next sequential document number
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
                        $documentNumber = sprintf("%s-%s-%04d", $receiptType, $year, $nextSeq);

                        $receipt = AccountabilityReceipt::create([
                            'receipt_type' => $receiptType,
                            'document_number' => $documentNumber,
                            'user_id' => $validated['user_id'] ?? $validated['received_mr_by_id'], // Secondary/Default Recipient
                            'issued_by_id' => $validated['issued_by_id'],
                            'received_mr_by_id' => $validated['received_mr_by_id'],
                            'date_issued' => $dateIssued,
                            'remarks' => $validated['remarks'] ?? null,
                        ]);

                        foreach ($bucket['lines'] as $li) {
                            /** @var SerializedAsset $asset */
                            $asset = $li['asset'];

                            // Update status, parent attachment link, and secondary holder
                            $asset->update([
                                'status' => 'Assigned',
                                'attached_to' => $li['attach_to'],
                                'current_holder_id' => $li['secondary_user_id'],
                            ]);

                            $receipt->lines()->create([
                                'serialized_asset_id' => $asset->id,
                                'item_id' => $asset->item_id,
                                'quantity' => 1,
                            ]);
                        }

                        $createdReceipts[] = $receipt->load([
                            'lines.serializedAsset.item',
                            'lines.serializedAsset.currentHolder',
                            'user',
                            'issuedBy',
                            'receivedMrBy'
                        ]);
                    }

                    return response()->json([
                        'message' => 'Assets successfully issued.',
                        'receipts' => $createdReceipts,
                    ], 201);
                });
            } catch (\Illuminate\Database\QueryException $e) {
                $errorCode = $e->errorInfo[1] ?? null;
                if ($errorCode == 1062 && $attempt < $maxAttempts) {
                    continue; // Retry on duplicate document number collision
                }
                Log::error('Database query failure during asset issuance: ' . $e->getMessage());
                return response()->json(['error' => 'Failed to issue asset(s): ' . $e->getMessage()], 500);
            } catch (\Exception $e) {
                Log::error('General failure during asset issuance: ' . $e->getMessage());
                return response()->json(['error' => 'Failed to issue asset(s): ' . $e->getMessage()], 500);
            }
        }

        return response()->json(['error' => 'Failed to generate a unique document number after several attempts.'], 500);
    }

    /**
     * Update asset lifecycle status (Available, Assigned, Under Repair, Condemned).
     */
    public function updateAssetStatus(Request $request, SerializedAsset $serializedAsset): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Available,Assigned,Under Repair,Condemned',
            'condition_remarks' => 'required_if:status,Under Repair,Condemned|nullable|string|max:1000',
        ]);

        $currentStatus = $serializedAsset->status;
        $newStatus = $validated['status'];

        if ($currentStatus === 'Condemned') {
            return response()->json([
                'error' => 'This asset is condemned and its status cannot be modified.'
            ], 422);
        }

        if ($newStatus === 'Under Repair') {
            if ($currentStatus === 'Under Repair') {
                return response()->json(['error' => 'Asset is already Under Repair.'], 422);
            }

            $serializedAsset->update([
                'status' => 'Under Repair',
                'pre_repair_status' => $currentStatus,
                'condition_remarks' => $validated['condition_remarks'] ?? null,
            ]);

            return response()->json([
                'message' => 'Asset marked Under Repair.',
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        }

        if ($currentStatus === 'Under Repair') {
            $allowedReturn = $serializedAsset->pre_repair_status ?? 'Available';

            if ($newStatus !== $allowedReturn && $newStatus !== 'Condemned') {
                return response()->json([
                    'error' => "This asset was under repair from '{$allowedReturn}' and can only return to '{$allowedReturn}', or be marked Condemned."
                ], 422);
            }

            $serializedAsset->update([
                'status' => $newStatus,
                'pre_repair_status' => null,
                'condition_remarks' => $newStatus === 'Condemned' ? ($validated['condition_remarks'] ?? null) : null,
            ]);

            return response()->json([
                'message' => "Asset status updated to '{$newStatus}'.",
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        }

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

        return response()->json([
            'error' => "Cannot change status from '{$currentStatus}' to '{$newStatus}' directly. Use Return/Transfer for assigned assets."
        ], 422);
    }

    /**
     * Download receipt as an Excel workbook.
     */
    public function downloadExcel(int $id, AccountabilityExcelService $excelService)
    {
        $receipt = AccountabilityReceipt::with([
            'user',
            'issuedBy',
            'receivedMrBy',
            'lines.serializedAsset.item',
            'lines.serializedAsset.currentHolder',
        ])->findOrFail($id);

        return $excelService->generate($receipt);
    }

    /**
     * Download property tag PDF for a serialized asset.
     */
    public function downloadPropertyTagPdf(
        SerializedAsset $serializedAsset,
        Request $request,
        PropertyTagPdfService $pdfService
    ) {
        $pdf = $pdfService->generate($serializedAsset, $request);
        $filename = "PropertyTag-{$serializedAsset->property_number}.pdf";

        return $pdf->download($filename);
    }

    /**
     * Get available assets eligible for selection in the issuance cart.
     */
    public function availableForCart(): JsonResponse
    {
        $available = SerializedAsset::with('item')
            ->whereHas('item', fn($q) => $q->where('tracking_type', 'asset'))
            ->where('status', 'Available')
            ->whereNull('current_holder_id')
            ->where(function ($query) {
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

    /**
     * Get items attached to a specific primary asset.
     */
    public function attachedItems(SerializedAsset $serializedAsset): JsonResponse
    {
        $attached = SerializedAsset::with(['item', 'currentHolder'])
            ->where('attached_to', $serializedAsset->property_number)
            ->get();

        return response()->json($attached, 200);
    }
}