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
            'lines' => 'required|array|min:1',
            'lines.*.serialized_asset_id' => 'required|exists:serialized_assets,id|distinct',
            'lines.*.accessories_notes' => 'nullable|string|max:1000',
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
                    $assetIds = collect($validated['lines'])->pluck('serialized_asset_id');

                    $assets = SerializedAsset::whereIn('id', $assetIds)
                        ->lockForUpdate()
                        ->get()
                        ->keyBy('id');

                    foreach ($assetIds as $id) {
                        $asset = $assets->get($id);
                        if (!$asset || $asset->status !== 'Available') {
                            return response()->json([
                                'error' => "Asset ID {$id} is not available for issuance."
                            ], 422);
                        }
                    }

                    $maxCost = $assets->max('unit_cost') ?? 0;
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

                    // Fetch recipient to dynamically derive unit name acronym
                    $recipient = User::find($validated['user_id']);
                    $unitHead = $recipient?->findUnitHead();

                    $rawUnitName = trim($recipient->unit ?? $recipient->department ?? 'OFFICE');
                    if (preg_match('/^[A-Za-z0-9]{2,6}$/', $rawUnitName)) {
                        $unitName = strtoupper($rawUnitName);
                    } else {
                        $words = explode(' ', $rawUnitName);
                        $acronym = '';
                        foreach ($words as $word) {
                            $cleanWord = preg_replace('/[^A-Za-z0-9]/', '', $word);
                            if (!empty($cleanWord)) {
                                $acronym .= strtoupper($cleanWord[0]);
                            }
                        }
                        $unitName = !empty($acronym) ? $acronym : 'OFFICE';
                    }

                    $documentNumber = sprintf("%s-%s-%04d", $unitName, $year, $nextSeq);

                    $receipt = AccountabilityReceipt::create([
                        'receipt_type' => $receiptType,
                        'document_number' => $documentNumber,
                        'user_id' => $validated['user_id'],
                        'issued_by_id' => $validated['issued_by_id'],
                        'received_mr_by_id' => $unitHead?->id,
                        'date_issued' => $dateIssued,
                        'remarks' => $validated['remarks'] ?? null,
                    ]);

                    foreach ($validated['lines'] as $lineInput) {
                        $asset = $assets->get($lineInput['serialized_asset_id']);

                        $receipt->lines()->create([
                            'serialized_asset_id' => $asset->id,
                            'accessories_notes' => $lineInput['accessories_notes'] ?? null,
                        ]);

                        $asset->update([
                            'status' => 'Assigned',
                            'current_holder_id' => $validated['user_id'],
                        ]);
                    }

                    $totalCost = $assets->sum('unit_cost');

                    return response()->json([
                        'message' => "Assets successfully issued under {$receiptType} ({$documentNumber}). Total value: ₱" . number_format($totalCost, 2),
                        'document_number' => $documentNumber,
                        'receipt_type' => $receiptType,
                        'receipt' => $receipt->load(['lines.serializedAsset.item', 'user', 'issuedBy', 'receivedMrBy'])
                    ], 201);
                });
            } catch (\Illuminate\Database\QueryException $e) {
                $errorCode = $e->errorInfo[1] ?? null;
                if ($errorCode == 1062 && $attempt < $maxAttempts) {
                    continue; // duplicate document_number race — retry with a fresh sequence
                }
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
}