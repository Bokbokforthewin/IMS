<?php

namespace App\Http\Controllers;

use App\Models\AssetTransfer;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssetTransferController extends Controller
{
    public function index()
    {
        try {
            $transfers = AssetTransfer::with(['serializedAsset.item.category'])
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json($transfers, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch asset transfers: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve transfer logs: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        // Allow to_office to be dynamically filled from frontend for both Return and Transfer
        $validatedData = $request->validate([
            'serialized_asset_id' => 'required|exists:serialized_assets,id',
            'transfer_type' => 'required|in:RETURN,TRANSFER',
            'from_office' => 'nullable|string|max:255',
            'to_office' => 'required|string|max:255', // Now required for both so user choice dictates destination
            'reason' => 'required|string|max:255',
            'transfer_date' => 'required|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $date = $validatedData['transfer_date'];
        $year = date('Y', strtotime($date));
        $month = date('m', strtotime($date));
        $prefix = $validatedData['transfer_type'] === 'RETURN' ? 'RET' : 'PTR';

        try {
            return DB::transaction(function () use ($validatedData, $year, $month, $prefix) {
                $asset = SerializedAsset::where('id', $validatedData['serialized_asset_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                // Generate sequential document number
                $lastRecord = AssetTransfer::where('transfer_type', $validatedData['transfer_type'])
                    ->whereYear('transfer_date', $year)
                    ->whereMonth('transfer_date', $month)
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextSeq = 1;
                if ($lastRecord && $lastRecord->document_number) {
                    $parts = explode('-', $lastRecord->document_number);
                    $nextSeq = intval(end($parts)) + 1;
                }

                $documentNumber = sprintf("%s-%s-%s-%03d", $prefix, $year, $month, $nextSeq);

                // Use the exact user-submitted 'to_office' instead of hardcoding it
                $transfer = AssetTransfer::create([
                    'document_number' => $documentNumber,
                    'transfer_type' => $validatedData['transfer_type'],
                    'serialized_asset_id' => $asset->id,
                    'from_office' => $validatedData['from_office'] ?? 'Main Office',
                    'to_office' => $validatedData['to_office'], 
                    'reason' => $validatedData['reason'],
                    'transfer_date' => $validatedData['transfer_date'],
                    'remarks' => $validatedData['remarks'] ?? null,
                ]);

                // Update asset status based on action
                if ($validatedData['transfer_type'] === 'RETURN') {
                    $asset->update([
                        'status' => 'Available', 
                        'remarks' => 'Returned to ' . $validatedData['to_office'] . ': ' . $validatedData['reason']
                    ]);
                } else {
                    $asset->update([
                        'remarks' => 'Transferred to ' . $validatedData['to_office']
                    ]);
                }

                $transfer->load('serializedAsset.item.category');

                return response()->json([
                    'message' => "Asset successfully processed under {$documentNumber}",
                    'document_number' => $documentNumber,
                    'transfer' => $transfer
                ], 201);
            });

        } catch (\Exception $e) {
            Log::error('Failed to process asset transfer/return: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process transaction: ' . $e->getMessage()], 500);
        }
    }
}