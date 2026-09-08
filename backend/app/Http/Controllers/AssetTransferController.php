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
            $transfers = AssetTransfer::with(['serializedAsset.item.category', 'transferredFrom', 'transferredTo'])
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
        $validatedData = $request->validate([
            'serialized_asset_id' => 'required|exists:serialized_assets,id',
            'transfer_type' => 'required|in:RETURN,TRANSFER',
            'user_id' => 'required|exists:users,id', // transferring FROM (current holder)
            'transfered_to' => 'required|exists:users,id', // transferring TO
            'description' => 'required|string|max:255',
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

                $transfer = AssetTransfer::create([
                    'document_number' => $documentNumber,
                    'transfer_type' => $validatedData['transfer_type'],
                    'serialized_asset_id' => $asset->id,
                    'user_id' => $validatedData['user_id'],
                    'transfered_to' => $validatedData['transfered_to'],
                    'description' => $validatedData['description'],
                    'reason' => $validatedData['reason'],
                    'transfer_date' => $validatedData['transfer_date'],
                    'remarks' => $validatedData['remarks'] ?? null,
                ]);

                if ($validatedData['transfer_type'] === 'RETURN') {
                    $asset->update(['status' => 'Available']);
                } else {
                    // TRANSFER keeps the asset assigned, just to a different person
                    $asset->update(['status' => 'Assigned']);
                }

                $transfer->load(['serializedAsset.item.category', 'transferredFrom', 'transferredTo']);

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