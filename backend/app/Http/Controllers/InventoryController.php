<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\StockBatch;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryController extends Controller
{
    /**
     * Store inbound stock deliveries (Handles both Serialized Assets and Bulk/Consumables).
     */
    public function storeStock(Request $request)
    {
        $validatedData = $request->validate([
            'item_id' => 'required|exists:items,id',
            'unit_cost' => 'required|numeric|min:0',
            'arrival_date' => 'nullable|date',
            'is_serialized' => 'required|boolean',
        ]);

        $arrivalDate = $validatedData['arrival_date'] ?? date('Y-m-d');
        $year = date('Y', strtotime($arrivalDate));
        $month = date('m', strtotime($arrivalDate));
        $day = date('d', strtotime($arrivalDate));

        try {
            return DB::transaction(function () use ($request, $validatedData, $year, $month, $day, $arrivalDate) {
                if ($validatedData['is_serialized']) {
                    $serializedData = $request->validate([
                        'serial_number' => 'nullable|string|max:255|unique:serialized_assets,serial_number',
                        'model' => 'nullable|string|max:255',
                    ]);

                    $lastProperty = SerializedAsset::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->orderBy('id', 'desc')
                        ->lockForUpdate()
                        ->first();

                    $nextSeq = 1;
                    if ($lastProperty && $lastProperty->property_number) {
                        $parts = explode('-', $lastProperty->property_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }

                    $propertyNumber = sprintf("DOH NIR-%s-%s-%05d", $year, $month, $nextSeq);

                    $asset = SerializedAsset::create([
                        'item_id' => $validatedData['item_id'],
                        'serial_number' => $serializedData['serial_number'],
                        'property_number' => $propertyNumber,
                        'model' => $serializedData['model'] ?? null,
                        'unit_cost' => $validatedData['unit_cost'],
                        'status' => 'Available',
                    ]);

                    return response()->json([
                        'message' => 'Serialized asset successfully recorded',
                        'property_number' => $propertyNumber,
                        'asset' => $asset
                    ], 201);
                } else {
                    $batchData = $request->validate([
                        'quantity' => 'required|integer|min:1',
                    ]);

                    $lastBatch = StockBatch::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereDay('created_at', $day)
                        ->orderBy('id', 'desc')
                        ->lockForUpdate()
                        ->first();

                    $nextSeq = 1;
                    if ($lastBatch && $lastBatch->iar_number) {
                        $parts = explode('-', $lastBatch->iar_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }

                    $iarNumber = sprintf("IAR-%s-%s-%s-%03d", $year, $month, $day, $nextSeq);

                    $batch = StockBatch::create([
                        'item_id' => $validatedData['item_id'],
                        'iar_number' => $iarNumber,
                        'received_date' => $arrivalDate,   // now a real column
                        'quantity_on_hand' => $batchData['quantity'],
                        'unit_cost' => $validatedData['unit_cost'],
                    ]);

                    return response()->json([
                        'message' => 'Stock batch successfully received',
                        'iar_number' => $iarNumber,
                        'batch' => $batch
                    ], 201);
                }
            });
        } catch (\Exception $e) {
            Log::error('Failed to save inbound stock: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save stock: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fetch all stock batches that still have available inventory.
     */
    public function indexStockBatches()
    {
        try {
            $batches = StockBatch::where('quantity_on_hand', '>', 0)
                ->with('item')
                ->orderBy('received_date', 'asc')
                ->get();

            return response()->json($batches, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch stock batches: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve stock batches.'], 500);
        }
    }
      public function receivedHistory(Request $request)
    {
        $request->validate([
            'type' => 'nullable|in:Consumable,Asset',
            'item_id' => 'nullable|exists:items,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        try {
            $type = $request->input('type');
            $itemId = $request->input('item_id');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            $perPage = (int) $request->input('per_page', 20);

            // --- Consumables (stock batches) ---
            $batchesQuery = StockBatch::with('item:id,name,item_code,unit_of_measure');

            if ($itemId) {
                $batchesQuery->where('item_id', $itemId);
            }
            if ($dateFrom) {
                $batchesQuery->whereDate('created_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $batchesQuery->whereDate('created_at', '<=', $dateTo);
            }

            $batches = (!$type || $type === 'Consumable')
                ? $batchesQuery->get()->map(function ($b) {
                    return [
                        'type' => 'Consumable',
                        'id' => $b->id,
                        'item_id' => $b->item_id,
                        'item_name' => $b->item->name ?? 'N/A',
                        'item_code' => $b->item->item_code ?? 'N/A',
                        'unit_of_measure' => $b->item->unit_of_measure ?? null,
                        'reference_no' => $b->iar_number,
                        'quantity' => $b->quantity_on_hand,
                        'unit_cost' => (float) $b->unit_cost,
                        'total_cost' => round((float) $b->quantity_on_hand * (float) $b->unit_cost, 2),
                        'received_at' => $b->created_at,
                    ];
                })
                : collect();

            // --- Serialized Assets ---
            $assetsQuery = SerializedAsset::with('item:id,name,item_code,unit_of_measure');

            if ($itemId) {
                $assetsQuery->where('item_id', $itemId);
            }
            if ($dateFrom) {
                $assetsQuery->whereDate('created_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $assetsQuery->whereDate('created_at', '<=', $dateTo);
            }

            $assets = (!$type || $type === 'Asset')
                ? $assetsQuery->get()->map(function ($a) {
                    return [
                        'type' => 'Asset',
                        'id' => $a->id,
                        'item_id' => $a->item_id,
                        'item_name' => $a->item->name ?? 'N/A',
                        'item_code' => $a->item->item_code ?? 'N/A',
                        'unit_of_measure' => $a->item->unit_of_measure ?? null,
                        'reference_no' => $a->property_number,
                        'quantity' => 1,
                        'unit_cost' => (float) $a->unit_cost,
                        'total_cost' => (float) $a->unit_cost,
                        'received_at' => $a->created_at,
                    ];
                })
                : collect();

            // --- Merge, sort, paginate manually (since these come from two tables) ---
            $merged = $batches->concat($assets)
                ->sortByDesc('received_at')
                ->values();

            $page = (int) $request->input('page', 1);
            $total = $merged->count();
            $items = $merged->slice(($page - 1) * $perPage, $perPage)->values();

            return response()->json([
                'data' => $items,
                'meta' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => (int) ceil($total / $perPage) ?: 1,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch received stock history: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve received stock history.'], 500);
        }
    }
        /**
     * Update an existing consumable stock batch (correction, not a new receipt).
     */
    public function updateStockBatch(Request $request, StockBatch $stockBatch)
    {
        $validated = $request->validate([
            'iar_number' => 'required|string|max:255',
            'received_date' => 'required|date',
            'quantity_on_hand' => 'required|integer|min:0',
            'unit_cost' => 'required|numeric|min:0',
        ]);

        try {
            $stockBatch->update($validated);

            return response()->json([
                'message' => 'Stock batch updated successfully.',
                'batch' => $stockBatch->fresh('item'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to update stock batch: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update stock batch.'], 500);
        }
    }

    /**
     * Delete a stock batch — only allowed if it has never been drawn from.
     * Deleting a batch that issuances reference would corrupt FIFO/cost history.
     */
    public function deleteStockBatch(StockBatch $stockBatch)
    {
        try {
            if ($stockBatch->issuanceBatches()->exists()) {
                return response()->json([
                    'error' => 'Cannot delete this batch — it has already been issued against. Deleting it would break issuance history.'
                ], 422);
            }

            $stockBatch->delete();

            return response()->json(['message' => 'Stock batch deleted successfully.'], 200);
        } catch (\Exception $e) {
            Log::error('Failed to delete stock batch: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete stock batch.'], 500);
        }
    }

    /**
     * Update an existing serialized asset (correction, not a new receipt).
     * Status is intentionally NOT editable here — status changes go through
     * AccountabilityController's issuance/return workflow instead.
     */
    public function updateSerializedAsset(Request $request, SerializedAsset $serializedAsset)
    {
        $validated = $request->validate([
            'serial_number' => 'nullable|string|max:255|unique:serialized_assets,serial_number,' . $serializedAsset->id,
            'model' => 'nullable|string|max:255',
            'unit_cost' => 'required|numeric|min:0',
        ]);

        try {
            $serializedAsset->update($validated);

            return response()->json([
                'message' => 'Serialized asset updated successfully.',
                'asset' => $serializedAsset->fresh('item'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to update serialized asset: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update serialized asset.'], 500);
        }
    }

    /**
     * Delete a serialized asset — only allowed while it's still 'Available'
     * (never been issued out via ICS/PAR).
     */
    public function deleteSerializedAsset(SerializedAsset $serializedAsset)
    {
        try {
            if ($serializedAsset->status !== 'Available') {
                return response()->json([
                    'error' => "Cannot delete this asset — its current status is '{$serializedAsset->status}'. Only assets still marked 'Available' can be deleted."
                ], 422);
            }

            $serializedAsset->delete();

            return response()->json(['message' => 'Serialized asset deleted successfully.'], 200);
        } catch (\Exception $e) {
            Log::error('Failed to delete serialized asset: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete serialized asset.'], 500);
        }
    }
}
