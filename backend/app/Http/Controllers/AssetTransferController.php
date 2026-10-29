<?php

namespace App\Http\Controllers;

use App\Models\AssetTransfer;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssetTransferController extends Controller
{
    // Must match the permission name in the seeder exactly.
    private const ICTU_PERMISSION = 'action:manage asset status';

    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $transfers = AssetTransfer::with([
                'serializedAsset.item.category',
                'transferredFrom',
                'transferredTo',
            ])
            ->applyDataScope($user) // 🔒 Enforces Division/Unit scoping on transfer logs
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
        // Returns and transfers change who is accountable for an item, so ICTU records them
        // (the MR requests, ICTU processes). Remove this block if MRs should file them directly.
        if (!$request->user()->can(self::ICTU_PERMISSION)) {
            return response()->json(['error' => 'Only ICTU can process transfers and returns.'], 403);
        }

        $validatedData = $request->validate([
            'serialized_asset_id' => 'required|exists:serialized_assets,id',
            'transfer_type'       => 'required|in:RETURN,TRANSFER',
            'user_id'             => 'required|exists:users,id', // transferring FROM
            'transfered_to'       => 'required|exists:users,id', // transferring TO
            'description'         => 'required|string|max:255',
            'reason'              => 'required|string|max:255',
            'transfer_date'       => 'required|date',
            'remarks'             => 'nullable|string|max:1000',
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

                // Only items that are out with someone can be transferred or returned.
                // (Without this, a Condemned item could be "transferred" back to Assigned.)
                if (!in_array($asset->status, ['Assigned', 'Distributed'], true)) {
                    return response()->json([
                        'error' => "Only Assigned or Distributed items can be transferred or returned (this item is {$asset->status}).",
                    ], 422);
                }

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

                $documentNumber = sprintf("%s-%s-%s-%04d", $prefix, $year, $month, $nextSeq);

                $transfer = AssetTransfer::create([
                    'document_number'     => $documentNumber,
                    'transfer_type'       => $validatedData['transfer_type'],
                    'serialized_asset_id' => $asset->id,
                    'user_id'             => $validatedData['user_id'],
                    'transfered_to'       => $validatedData['transfered_to'],
                    'description'         => $validatedData['description'],
                    'reason'              => $validatedData['reason'],
                    'transfer_date'       => $validatedData['transfer_date'],
                    'remarks'             => $validatedData['remarks'] ?? null,
                ]);

                if ($validatedData['transfer_type'] === 'RETURN') {
                    // Back in the ICTU office: no holder. ICTU can then mark it
                    // Under Repair or Condemned from the status action.
                    $asset->update([
                        'status'            => 'Available',
                        'current_holder_id' => null,
                        'revert_reason'     => null, // clear any pending revert request
                    ]);
                } else {
                    // A transfer only changes the holder. Assigned stays Assigned and
                    // Distributed stays Distributed, so it can never undo a distribution.
                    $asset->update([
                        'current_holder_id' => $validatedData['transfered_to'],
                    ]);
                }

                $transfer->load([
                    'serializedAsset.item.category',
                    'transferredFrom',
                    'transferredTo'
                ]);

                return response()->json([
                    'message'         => "Asset successfully processed under {$documentNumber}",
                    'document_number' => $documentNumber,
                    'transfer'        => $transfer,
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Failed to process asset transfer/return: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process transaction: ' . $e->getMessage()], 500);
        }
    }
}