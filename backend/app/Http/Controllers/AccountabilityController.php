<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\SerializedAsset;
use App\Models\AccountabilityReceiptLine;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\AccountabilityExcelService;
use App\Services\PropertyTagPdfService;
use App\Services\BulkPropertyTagPdfService;

class AccountabilityController extends Controller
{
    /**
     * Display a listing of all serialized assets (scoped by user division/unit).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $assets = SerializedAsset::with(['item', 'currentHolder'])
                ->applyDataScope($user)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($assets, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch serialized assets: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve assets.'], 500);
        }
    }

    /**
     * Retrieve all issued accountability receipts along with primary/secondary holder details (scoped by user division/unit).
     */
    public function getReceipts(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $receipts = AccountabilityReceipt::with([
                'lines.serializedAsset.item',
                'lines.serializedAsset.currentHolder',
                'user',
                'issuedBy',
                'receivedMrBy'
            ])
            ->applyDataScope($user)
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
            'cart.*.key' => 'required',
            'cart.*.serialized_asset_id' => 'required|exists:serialized_assets,id',
            'cart.*.attach_to_key' => 'nullable',
            'cart.*.user_id' => 'nullable|exists:users,id',
            'user_id' => 'nullable|exists:users,id',
            'received_mr_by_id' => 'required|exists:users,id',
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

                    // Pass 1: Lock and validate availability of each requested asset
                    foreach ($validated['cart'] as $cartItem) {
                        $asset = SerializedAsset::with('item')
                            ->where('id', $cartItem['serialized_asset_id'])
                            ->lockForUpdate()
                            ->first();

                        if (!$asset || $asset->status !== 'Available' || $asset->current_holder_id) {
                            throw new \Exception("Asset #{$cartItem['serialized_asset_id']} is no longer available for issuance.");
                        }

                        $cartKey = (string) $cartItem['key'];
                        $resolvedByKey[$cartKey] = $asset;
                    }

                    // Pass 2: Link attachments and segregate items into PAR (>= 50k) and ICS (< 50k) buckets
                    $parLines = [];
                    $icsLines = [];

                    foreach ($validated['cart'] as $cartItem) {
                        $key = (string) $cartItem['key'];
                        $asset = $resolvedByKey[$key];

                        // Resolve parent attachment property number
                        $attachTo = null;
                        $attachKey = isset($cartItem['attach_to_key']) ? (string) $cartItem['attach_to_key'] : null;
                        if (!empty($attachKey) && isset($resolvedByKey[$attachKey])) {
                            $attachTo = $resolvedByKey[$attachKey]->property_number;
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

                    // Pass 3: Preserve full unit name cleanly without single-letter reduction
                    $recipientUserId = $validated['user_id'] ?? $validated['received_mr_by_id'];
                    $recipient = User::find($recipientUserId);
                    $rawUnitName = trim($recipient?->unit ?? 'OFFICE');

                    // Sanitize unit name to keep alphanumeric characters and dashes/underscores, uppercase it
                    $unitName = strtoupper(preg_replace('/[^A-Za-z0-9-_]/', '', $rawUnitName));
                    if (empty($unitName)) {
                        $unitName = 'OFFICE';
                    }

                    // Robust sequence detection: safely fetch existing document numbers using get() + pluck()
                    $existingReceipts = AccountabilityReceipt::where('document_number', 'like', "{$unitName}-{$year}-%")
                        ->lockForUpdate()
                        ->get()
                        ->pluck('document_number');

                    $maxSeq = 0;
                    foreach ($existingReceipts as $docNum) {
                        $parts = explode('-', $docNum);
                        $seq = intval(end($parts));
                        if ($seq > $maxSeq) {
                            $maxSeq = $seq;
                        }
                    }
                    $nextSeq = $maxSeq + 1;

                    $createdReceipts = [];
                    $buckets = [
                        ['type' => 'PAR', 'lines' => $parLines],
                        ['type' => 'ICS', 'lines' => $icsLines],
                    ];

                    foreach ($buckets as $bucket) {
                        if (empty($bucket['lines'])) continue;

                        $receiptType = $bucket['type'];

                        // Ensure uniqueness: keep unit name fixed, increment only the %04d sequence
                        do {
                            $documentNumber = sprintf("%s-%s-%04d", $unitName, $year, $nextSeq);
                            $exists = AccountabilityReceipt::where('document_number', $documentNumber)->exists();
                            if ($exists) {
                                $nextSeq++;
                            }
                        } while ($exists);

                        $nextSeq++; // Prepare increment for next receipt

                        $receipt = AccountabilityReceipt::create([
                            'receipt_type' => $receiptType,
                            'document_number' => $documentNumber,
                            'user_id' => $recipientUserId,
                            'issued_by_id' => $validated['issued_by_id'],
                            'received_mr_by_id' => $recipient?->findUnitHead()?->id ?? $validated['received_mr_by_id'],
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
                return response()->json(['error' => $e->getMessage()], 422);
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
            'status' => 'required|in:Available,Assigned,Distributed,Under Repair,Condemned',
            'condition_remarks' => 'required_if:status,Under Repair,Condemned|nullable|string|max:1000',
        ]);
 
        return DB::transaction(function () use ($request, $serializedAsset, $validated) {
            $asset = SerializedAsset::whereKey($serializedAsset->id)->lockForUpdate()->first();
 
            $currentStatus = $asset->status;
            $newStatus = $validated['status'];
            $remarks = $validated['condition_remarks'] ?? null;
 
            if ($currentStatus === 'Condemned') {
                return response()->json([
                    'error' => 'This asset is condemned and its status cannot be modified.',
                ], 422);
            }
 
            if ($newStatus === $currentStatus) {
                return response()->json([
                    'error' => "Asset is already '{$currentStatus}'.",
                ], 422);
            }
 
            if ($newStatus === 'Under Repair') {
                // Remember where it came from so it can return to the same status
                $changes = [
                    'status' => 'Under Repair',
                    'pre_repair_status' => $currentStatus,
                    'condition_remarks' => $remarks,
                    'revert_reason' => null,
                ];
                $message = 'Asset marked Under Repair.';
            } elseif ($currentStatus === 'Under Repair') {
                $allowedReturn = $asset->pre_repair_status ?? 'Available';
 
                if ($newStatus !== $allowedReturn && $newStatus !== 'Condemned') {
                    return response()->json([
                        'error' => "This asset was under repair from '{$allowedReturn}' and can only return to '{$allowedReturn}', or be marked Condemned.",
                    ], 422);
                }
 
                $changes = [
                    'status' => $newStatus,
                    'pre_repair_status' => null,
                    'condition_remarks' => $newStatus === 'Condemned' ? $remarks : null,
                ];
                $message = $newStatus === 'Condemned'
                    ? 'Asset marked Condemned.'
                    : "Asset status updated to '{$newStatus}'.";
            } elseif ($newStatus === 'Condemned') {
                $changes = [
                    'status' => 'Condemned',
                    'pre_repair_status' => null,
                    'condition_remarks' => $remarks,
                    'revert_reason' => null,
                ];
                $message = 'Asset marked Condemned.';
            } else {
                return response()->json([
                    'error' => "Cannot change status from '{$currentStatus}' to '{$newStatus}' directly. Use Return/Transfer for assigned or distributed items.",
                ], 422);
            }
 
            $asset->update($changes);
 
            return response()->json([
                'message' => $message,
                'asset'   => $asset->fresh(['item', 'currentHolder']),
            ], 200);
        });
    }
    /**
     * Download receipt as an Excel workbook (secured by data scoping).
     */
    public function downloadExcel(int $id, Request $request, AccountabilityExcelService $excelService)
    {
        $user = $request->user();

        $receipt = AccountabilityReceipt::with([
            'user',
            'issuedBy',
            'receivedMrBy',
            'lines.serializedAsset.item',
            'lines.serializedAsset.currentHolder',
        ])
        ->applyDataScope($user)
        ->findOrFail($id);

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

    public function bulkDownloadTags(Request $request, BulkPropertyTagPdfService $pdfService)
    {
        $request->validate([
            'asset_ids' => 'required|array',
            'asset_ids.*' => 'integer|exists:serialized_assets,id',
        ]);

        $pdf = $pdfService->generate($request->asset_ids);

        return $pdf->download('bulk-property-tags.pdf');
    }

    /**
     * Get available assets eligible for selection in the issuance cart (scoped by unit/division).
     */
    public function availableForCart(Request $request): JsonResponse
    {
        $user = $request->user();

        $available = SerializedAsset::with(['item.category', 'currentHolder'])
            ->applyDataScope($user)
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

    /**
     * Update an existing accountability receipt's MR user, issuer, end users,
     * and remove/return deleted items to the available asset pool.
     */
    public function updateReceipt(Request $request, AccountabilityReceipt $receipt): JsonResponse
    {
        $validated = $request->validate([
            'received_mr_by_id' => 'nullable|exists:users,id',
            'user_id' => 'nullable|exists:users,id',
            'issued_by_id' => 'nullable|exists:users,id',
            'remarks' => 'nullable|string|max:1000',
            'removed_line_ids' => 'nullable|array',
            'removed_line_ids.*' => 'integer',
            'removed_asset_ids' => 'nullable|array',
            'removed_asset_ids.*' => 'integer',
            'lines' => 'nullable|array',
            'lines.*.id' => 'nullable|integer',
            'lines.*.serialized_asset_id' => 'nullable|integer|exists:serialized_assets,id',
            'lines.*.end_user_id' => 'nullable|exists:users,id',
        ]);

        try {
            return DB::transaction(function () use ($request, $validated, $receipt) {
                $user = $request->user();

                $scopedReceipt = AccountabilityReceipt::with([
                    'lines.serializedAsset',
                    'user',
                    'issuedBy',
                    'receivedMrBy',
                ])
                    ->applyDataScope($user)
                    ->lockForUpdate()
                    ->findOrFail($receipt->id);

                // 1. Update receipt-level fields (MR user, end user if sent, issuer, remarks)
                $receiptUpdates = [];
                if (array_key_exists('received_mr_by_id', $validated) && !empty($validated['received_mr_by_id'])) {
                    $receiptUpdates['received_mr_by_id'] = $validated['received_mr_by_id'];
                }
                if (array_key_exists('user_id', $validated) && !empty($validated['user_id'])) {
                    $receiptUpdates['user_id'] = $validated['user_id'];
                }
                if (array_key_exists('issued_by_id', $validated) && !empty($validated['issued_by_id'])) {
                    $receiptUpdates['issued_by_id'] = $validated['issued_by_id'];
                }
                if (array_key_exists('remarks', $validated)) {
                    $receiptUpdates['remarks'] = $validated['remarks'];
                }

                if (!empty($receiptUpdates)) {
                    $scopedReceipt->update($receiptUpdates);
                }

                // 2. Determine which lines/assets are being removed
                $removedLineIds = collect($validated['removed_line_ids'] ?? [])->map(fn($id) => (int) $id);
                $removedAssetIds = collect($validated['removed_asset_ids'] ?? [])->map(fn($id) => (int) $id);

                $linesToDelete = $scopedReceipt->lines->filter(function ($line) use ($removedLineIds, $removedAssetIds) {
                    return $removedLineIds->contains((int) $line->id)
                        || ($line->serialized_asset_id && $removedAssetIds->contains((int) $line->serialized_asset_id));
                });

                $releasedAssets = collect();

                foreach ($linesToDelete as $line) {
                    if ($line->serializedAsset) {
                        $releasedAssets->push($line->serializedAsset);
                    }
                    $line->delete();
                }

                // Release removed serialized assets back to Available
                foreach ($releasedAssets as $asset) {
                    $lockedAsset = SerializedAsset::whereKey($asset->id)->lockForUpdate()->first();
                    if (!$lockedAsset) continue;

                    // Detach any child peripherals still attached to this asset's property number
                    if (!empty($lockedAsset->property_number)) {
                        SerializedAsset::where('attached_to', $lockedAsset->property_number)
                            ->update(['attached_to' => null]);
                    }

                    $lockedAsset->update([
                        'status' => 'Available',
                        'current_holder_id' => null,
                        'attached_to' => null,
                    ]);
                }

                // 3. Update end users on remaining lines
                $submittedLines = collect($validated['lines'] ?? []);
                foreach ($submittedLines as $lineInput) {
                    if (empty($lineInput['end_user_id'])) continue;

                    $lineModel = null;
                    if (!empty($lineInput['id'])) {
                        $lineModel = AccountabilityReceiptLine::where('accountability_receipt_id', $scopedReceipt->id)
                            ->whereKey($lineInput['id'])
                            ->first();
                    } elseif (!empty($lineInput['serialized_asset_id'])) {
                        $lineModel = AccountabilityReceiptLine::where('accountability_receipt_id', $scopedReceipt->id)
                            ->where('serialized_asset_id', $lineInput['serialized_asset_id'])
                            ->first();
                    }

                    if ($lineModel && $lineModel->serialized_asset_id) {
                        SerializedAsset::whereKey($lineModel->serialized_asset_id)
                            ->lockForUpdate()
                            ->update([
                                'current_holder_id' => $lineInput['end_user_id'],
                            ]);
                    }
                }

                $updatedReceipt = $scopedReceipt->fresh([
                    'lines.serializedAsset.item',
                    'lines.serializedAsset.currentHolder',
                    'user',
                    'issuedBy',
                    'receivedMrBy',
                ]);

                return response()->json([
                    'message' => 'Accountability receipt updated successfully.',
                    'receipt' => $updatedReceipt,
                ], 200);
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Receipt not found or outside your scope.'], 404);
        } catch (\Exception $e) {
            Log::error('Failed to update receipt #' . $receipt->id . ': ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update receipt: ' . $e->getMessage()], 500);
        }
    }
}