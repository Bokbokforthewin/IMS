<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\AssetTransfer;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AssetTransferController extends Controller
{
    private const ICTU_PERMISSION = 'action:manage asset status';

    public function index(Request $request)
    {
        try {
            $transfers = AssetTransfer::with([
                'serializedAsset.item.category',
                'transferredFrom',
                'transferredTo',
            ])
                ->latest()
                ->get();

            return response()->json([
                'data' => $transfers,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to fetch asset transfers: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to load asset transfers.',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'serialized_asset_id' => ['required', 'exists:serialized_assets,id'],
            'transfer_type'       => ['required', 'in:RETURN,TRANSFER'],
            'user_id'             => ['required', 'exists:users,id'],
            'transfered_to'       => ['required', 'exists:users,id'],
            'current_mr_id'       => ['nullable', 'exists:users,id'],
            'new_mr_id'           => ['nullable', 'required_if:transfer_type,TRANSFER', 'exists:users,id'],
            'received_by_mr_id'   => ['nullable', 'exists:users,id'],
            'received_mr_by_id'   => ['nullable', 'exists:users,id'],
            'description'         => ['required', 'string', 'max:255'],
            'reason'              => ['required', 'string', 'max:255'],
            'transfer_date'       => ['required', 'date'],
            'remarks'             => ['nullable', 'string'],
        ]);

        try {
            return DB::transaction(function () use ($validated) {
                $asset = SerializedAsset::with('item')
                    ->lockForUpdate()
                    ->findOrFail($validated['serialized_asset_id']);

                $latestReceipt = AccountabilityReceipt::whereHas('lines', function ($query) use ($asset) {
                    $query->where('serialized_asset_id', $asset->id);
                })
                    ->latest('id')
                    ->first();

                $latestReceiptMrId = $latestReceipt?->received_by_mr_id
                    ?? $latestReceipt?->received_mr_by_id;

                // Explicitly use the MR chosen in the form (new_mr_id on TRANSFER; existing/current MR on RETURN)
                // Never fall back to transfered_to (end user) or the authenticated user.
                $chosenMrId = $validated['transfer_type'] === 'TRANSFER'
                    ? ($validated['new_mr_id']
                        ?? $validated['received_by_mr_id']
                        ?? $validated['received_mr_by_id']
                        ?? null)
                    : ($validated['current_mr_id']
                        ?? $validated['received_by_mr_id']
                        ?? $validated['received_mr_by_id']
                        ?? $latestReceiptMrId
                        ?? null);

                $prefix = $validated['transfer_type'] === 'RETURN' ? 'PTR' : 'PTR';
                $documentNumber = sprintf(
                    '%s-%s-%s',
                    $prefix,
                    now()->format('Ymd'),
                    strtoupper(Str::random(6))
                );

                $transfer = AssetTransfer::create([
                    'document_number'     => $documentNumber,
                    'serialized_asset_id' => $asset->id,
                    'transfer_type'       => $validated['transfer_type'],
                    'user_id'             => $validated['user_id'],
                    'transfered_to'       => $validated['transfered_to'],
                    'issued_by_id'        => $chosenMrId,
                    'received_by_mr_id'   => $chosenMrId,
                    'received_mr_by_id'   => $chosenMrId,
                    'description'         => $validated['description'],
                    'reason'              => $validated['reason'],
                    'transfer_date'       => $validated['transfer_date'],
                    'remarks'             => $validated['remarks'] ?? null,
                ]);

                $createdReceipt = null;

                if ($validated['transfer_type'] === 'RETURN') {
                    $asset->update([
                        'status'            => 'available',
                        'current_holder_id' => null,
                    ]);
                } else {
                    $asset->update([
                        'status'            => 'Assigned',
                        'current_holder_id' => $validated['transfered_to'],
                    ]);

                    $unitCost = (float) ($asset->unit_cost ?? $asset->item?->unit_cost ?? 0);
                    $receiptType = $unitCost >= 50000 ? 'PAR' : 'ICS';
                    $receiptDocNumber = sprintf(
                        '%s-%s-%s',
                        $receiptType,
                        now()->format('Ymd'),
                        strtoupper(Str::random(6))
                    );

                    $createdReceipt = AccountabilityReceipt::create([
                        'document_number'   => $receiptDocNumber,
                        'receipt_type'      => $receiptType,
                        'user_id'           => $validated['transfered_to'], // End user receiving the asset
                        'issued_by_id'      => $chosenMrId,                 // Same as chosen MR
                        'received_by_mr_id' => $chosenMrId,                 // Chosen MR
                        'received_mr_by_id' => $chosenMrId,                 // Chosen MR alias if used
                        'date_issued'       => $validated['transfer_date'],
                        'remarks'           => $validated['remarks'] ?? $validated['description'],
                    ]);

                    $createdReceipt->lines()->create([
                        'serialized_asset_id' => $asset->id,
                        'item_id'             => $asset->item_id,
                        'user_id'             => $validated['transfered_to'],
                        'quantity'            => 1,
                        'unit_cost'           => $unitCost,
                        'accessories_notes'   => $validated['remarks'] ?? null,
                    ]);
                }

                return response()->json([
                    'message' => 'Asset transfer processed successfully.',
                    'data'    => [
                        'transfer' => $transfer->load(['serializedAsset.item.category', 'transferredFrom', 'transferredTo']),
                        'receipt'  => $createdReceipt?->load(['lines.serializedAsset.item', 'user']),
                    ],
                ], 201);
            });
        } catch (\Throwable $e) {
            Log::error('Failed to process asset transfer: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to process asset transfer.',
            ], 500);
        }
    }
}
