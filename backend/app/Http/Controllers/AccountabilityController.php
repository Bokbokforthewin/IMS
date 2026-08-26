<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountabilityController extends Controller
{
    public function index()
    {
        try {
            $assets = SerializedAsset::with('item')
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
            $receipts = AccountabilityReceipt::with(['item', 'serializedAsset.item'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($receipts, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to retrieve receipts.'], 500);
        }
    }

    public function issueAsset(Request $request)
    {
        $validatedData = $request->validate([
            'serialized_asset_id' => 'required|exists:serialized_assets,id',
            'date_issued' => 'required|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $dateIssued = $validatedData['date_issued'];
        $year = date('Y', strtotime($dateIssued));
        $month = date('m', strtotime($dateIssued));

        try {
            return DB::transaction(function () use ($validatedData, $dateIssued, $year, $month) {
                $asset = SerializedAsset::where('id', $validatedData['serialized_asset_id'])
                    ->with('item')
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($asset->status !== 'Available') {
                    return response()->json([
                        'error' => 'This asset has already been issued or is currently unavailable.'
                    ], 422);
                }

                $item = $asset->item;
                // Fallback check across common column names for unit price on both asset and item
                $unitCost = $asset->unit_cost ?? $asset->cost ?? $asset->price ?? 0;
                if (!$unitCost && $asset->item) {
                    $item = $asset->item;
                    $unitCost = $item->unit_cost ?? $item->cost ?? $item->price ?? 0;
                }

                // COA Rule: >= 50,000 is PAR, < 50,000 is ICS
                $receiptType = ($unitCost >= 50000) ? 'PAR' : 'ICS';

                $lastReceipt = AccountabilityReceipt::where('receipt_type', $receiptType)
                    ->whereYear('date_issued', $year)
                    ->whereMonth('date_issued', $month)
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextSeq = 1;
                if ($lastReceipt && $lastReceipt->document_number) {
                    $parts = explode('-', $lastReceipt->document_number);
                    $nextSeq = intval(end($parts)) + 1;
                }

                $documentNumber = sprintf("%s-%s-%s-%03d", $receiptType, $year, $month, $nextSeq);

                $receipt = AccountabilityReceipt::create([
                    'receipt_type' => $receiptType,
                    'document_number' => $documentNumber,
                    'item_id' => $asset->item_id,
                    'serialized_asset_id' => $asset->id,
                    'quantity' => 1,
                    'date_issued' => $dateIssued,
                    'remarks' => $validatedData['remarks'] ?? null,
                ]);

                $asset->update(['status' => 'Assigned']);

                return response()->json([
                    'message' => "Asset successfully issued under {$receiptType} ({$documentNumber}) based on unit cost of ₱" . number_format($unitCost, 2),
                    'document_number' => $documentNumber,
                    'receipt_type' => $receiptType,
                    'receipt' => $receipt
                ], 201);
            });

        } catch (\Exception $e) {
            Log::error('Failed to issue asset: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to issue asset: ' . $e->getMessage()
            ], 500);
        }
    }
}