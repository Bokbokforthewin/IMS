<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceipt;
use App\Models\SerializedAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Assigned -> Distributed: the MR named on the receipt (or ICTU).
 * Distributed -> Assigned: ICTU only. The MR can only REQUEST it, which stores a reason in
 * serialized_assets.revert_reason (a Distributed item with a revert_reason has a pending request).
 */
class AssetDistributionController extends Controller
{
    private const ICTU_PERMISSION_UNDERSCORE = 'action:manage_asset_status';
    private const ICTU_PERMISSION_SPACE = 'action:manage asset status';

    /**
     * Check if user is ICTU administrator via Spatie permissions or role.
     */
    private function checkIsIctu($user): bool
    {
        return $user->can(self::ICTU_PERMISSION_UNDERSCORE)
            || $user->can(self::ICTU_PERMISSION_SPACE)
            || (method_exists($user, 'hasRole') && $user->hasRole('ICTU'));
    }

    /**
     * Mark items on a receipt as distributed.
     */
    public function distribute(Request $request, AccountabilityReceipt $receipt): JsonResponse
    {
        $validated = $request->validate([
            'asset_ids'   => 'nullable|array|min:1',
            'asset_ids.*' => 'integer',
        ]);

        $user = $request->user();
        $isIctu = $this->checkIsIctu($user);

        if (!$isIctu && (int) $receipt->received_mr_by_id !== (int) $user->id) {
            return response()->json([
                'error' => 'Only the MR named on this receipt can mark its items as distributed.',
            ], 403);
        }

        return DB::transaction(function () use ($receipt, $validated, $user) {
            $receiptAssetIds = DB::table('accountability_receipt_lines')
                ->where('accountability_receipt_id', $receipt->id)
                ->whereNotNull('serialized_asset_id')
                ->pluck('serialized_asset_id')
                ->map(fn ($id) => (int) $id);

            $strict = !empty($validated['asset_ids']);

            $requestedIds = $strict
                ? collect($validated['asset_ids'])->map(fn ($id) => (int) $id)->unique()
                : $receiptAssetIds;

            if ($requestedIds->diff($receiptAssetIds)->isNotEmpty()) {
                return response()->json(['error' => 'Some selected items are not on this receipt.'], 422);
            }

            $assets = SerializedAsset::whereIn('id', $requestedIds->all())->lockForUpdate()->get();
            $eligible = $assets->where('status', 'Assigned');

            if ($strict && $eligible->count() !== $assets->count()) {
                $blocked = $assets->where('status', '!=', 'Assigned')
                    ->map(fn ($a) => $a->property_number ?? "#{$a->id}")
                    ->implode(', ');

                return response()->json([
                    'error' => "These items are not in Assigned status and cannot be distributed: {$blocked}",
                ], 422);
            }

            if ($eligible->isEmpty()) {
                return response()->json([
                    'error' => 'No items on this receipt are waiting to be distributed.',
                ], 422);
            }

            $latestReceiptIds = DB::table('accountability_receipt_lines')
                ->whereIn('serialized_asset_id', $eligible->pluck('id')->all())
                ->groupBy('serialized_asset_id')
                ->selectRaw('serialized_asset_id, MAX(accountability_receipt_id) as latest_receipt_id')
                ->pluck('latest_receipt_id', 'serialized_asset_id');

            $stale = $eligible->filter(
                fn ($a) => (int) ($latestReceiptIds[$a->id] ?? 0) !== (int) $receipt->id
            );

            if ($stale->isNotEmpty()) {
                $list = $stale->map(fn ($a) => $a->property_number ?? "#{$a->id}")->implode(', ');

                return response()->json([
                    'error' => "These items are now on a newer receipt: {$list}",
                ], 422);
            }

            $updatePayload = ['status' => 'Distributed'];
            if (Schema::hasColumn('serialized_assets', 'revert_reason')) {
                $updatePayload['revert_reason'] = null;
            }

            SerializedAsset::whereIn('id', $eligible->pluck('id')->all())
                ->update($updatePayload);

            Log::info('Assets marked as distributed', [
                'receipt_id' => $receipt->id,
                'document_number' => $receipt->document_number,
                'asset_ids' => $eligible->pluck('id')->all(),
                'by_user_id' => $user->id,
            ]);

            return response()->json([
                'message' => "{$eligible->count()} item(s) marked as distributed.",
                'receipt' => $receipt->load([
                    'lines.serializedAsset.item',
                    'lines.serializedAsset.currentHolder',
                    'user',
                    'issuedBy',
                    'receivedMrBy',
                ]),
            ], 200);
        });
    }

    /**
     * MR asks ICTU to revert a Distributed item.
     */
    public function requestRevert(Request $request, SerializedAsset $serializedAsset): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($serializedAsset, $validated, $user) {
            $asset = SerializedAsset::whereKey($serializedAsset->id)->lockForUpdate()->first();

            if ($asset->status !== 'Distributed') {
                return response()->json([
                    'error' => 'A revert can only be requested for items in Distributed status.',
                ], 422);
            }

            $latestReceiptId = DB::table('accountability_receipt_lines')
                ->where('serialized_asset_id', $asset->id)
                ->max('accountability_receipt_id');

            $mrId = $latestReceiptId
                ? DB::table('accountability_receipts')->where('id', $latestReceiptId)->value('received_mr_by_id')
                : null;

            if (!$mrId || (int) $mrId !== (int) $user->id) {
                return response()->json([
                    'error' => "Only the MR named on this item's latest receipt can request a revert.",
                ], 403);
            }

            if (filled($asset->revert_reason)) {
                return response()->json([
                    'error' => 'A revert request is already pending for this item.',
                ], 422);
            }

            $asset->update(['revert_reason' => trim($validated['reason'])]);

            Log::info('Revert requested by MR', [
                'asset_id' => $asset->id,
                'property_number' => $asset->property_number,
                'reason' => $validated['reason'],
                'by_user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Revert requested. ICTU will review it.',
                'asset'   => $asset->fresh(['item', 'currentHolder']),
            ], 200);
        });
    }

    /**
     * ICTU: Distributed -> Assigned.
     */
    public function revert(Request $request, SerializedAsset $serializedAsset): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|min:5|max:1000',
        ]);

        return DB::transaction(function () use ($serializedAsset, $validated, $request) {
            $asset = SerializedAsset::whereKey($serializedAsset->id)->lockForUpdate()->first();

            if ($asset->status !== 'Distributed') {
                return response()->json([
                    'error' => 'Only items in Distributed status can be reverted to Assigned.',
                ], 422);
            }

            $mrReason = $asset->revert_reason;
            $ictuReason = isset($validated['reason']) ? trim($validated['reason']) : null;

            if (blank($mrReason) && blank($ictuReason)) {
                return response()->json([
                    'error' => 'A reason is required when reverting without a request from the MR.',
                ], 422);
            }

            $asset->update(['status' => 'Assigned', 'revert_reason' => null]);

            Log::info('Distribution reverted to Assigned', [
                'asset_id' => $asset->id,
                'property_number' => $asset->property_number,
                'mr_request_reason' => $mrReason,
                'ictu_reason' => $ictuReason,
                'by_user_id' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Item reverted to Assigned.',
                'asset'   => $asset->fresh(['item', 'currentHolder']),
            ], 200);
        });
    }

    /**
     * ICTU declines an MR's revert request.
     */
    public function declineRevert(Request $request, SerializedAsset $serializedAsset): JsonResponse
    {
        return DB::transaction(function () use ($serializedAsset, $request) {
            $asset = SerializedAsset::whereKey($serializedAsset->id)->lockForUpdate()->first();

            if ($asset->status !== 'Distributed' || blank($asset->revert_reason)) {
                return response()->json([
                    'error' => 'There is no pending revert request for this item.',
                ], 422);
            }

            $mrReason = $asset->revert_reason;

            $asset->update(['revert_reason' => null]);

            Log::info('Revert request declined', [
                'asset_id' => $asset->id,
                'property_number' => $asset->property_number,
                'mr_request_reason' => $mrReason,
                'by_user_id' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Revert request declined.',
                'asset'   => $asset->fresh(['item', 'currentHolder']),
            ], 200);
        });
    }
}