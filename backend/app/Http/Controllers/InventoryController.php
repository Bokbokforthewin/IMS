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
        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'unit_cost' => 'required|numeric|min:0',
            'arrival_date' => 'nullable|date',
            'quantity' => 'required|integer|min:1',
        ]);

        $item = Item::findOrFail($validated['item_id']);
        $arrivalDate = $validated['arrival_date'] ?? date('Y-m-d');
        $year = date('Y', strtotime($arrivalDate));
        $month = date('m', strtotime($arrivalDate));
        $day = date('d', strtotime($arrivalDate));

        try {
            return DB::transaction(function () use ($request, $validated, $item, $year, $month, $day, $arrivalDate) {
                if ($item->isConsumable()) {
                    $lastBatch = StockBatch::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereDay('created_at', $day)
                        ->orderBy('id', 'desc')->lockForUpdate()->first();

                    $nextSeq = 1;
                    if ($lastBatch && $lastBatch->iar_number) {
                        $parts = explode('-', $lastBatch->iar_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }

                    $iarNumber = sprintf("IAR-%s-%s-%s-%03d", $year, $month, $day, $nextSeq);

                    $batch = StockBatch::create([
                        'item_id' => $validated['item_id'],
                        'iar_number' => $iarNumber,
                        'received_date' => $arrivalDate,
                        'quantity_on_hand' => $validated['quantity'],
                        'unit_cost' => $validated['unit_cost'],
                    ]);

                    return response()->json([
                        'message' => 'Stock batch successfully received',
                        'iar_number' => $iarNumber,
                        'batch' => $batch
                    ], 201);
                }

                // Asset — bulk receive: shared attributes filled once, one serial
                // number per physical unit, property number auto-incremented
                // per unit only when the toggle is on.
                $assetData = $request->validate([
                    'has_property_number' => 'required|boolean',
                    'serial_numbers' => 'required|array|size:' . $validated['quantity'],
                    'serial_numbers.*' => 'required|string|max:255|distinct|unique:serialized_assets,serial_number',
                    'model' => 'nullable|string|max:255',
                    'manufacturer_name' => 'nullable|string|max:255',
                    'country_of_origin' => 'nullable|string|max:255',
                    'estimated_useful_life' => 'nullable|string|max:255',
                ]);

                $nextSeq = 1;
                if ($assetData['has_property_number']) {
                    $lastProperty = SerializedAsset::whereNotNull('property_number')
                        ->whereYear('created_at', $year)
                        ->orderBy('id', 'desc')->lockForUpdate()->first();
                    if ($lastProperty && $lastProperty->property_number) {
                        $parts = explode('-', $lastProperty->property_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }
                }

                $createdAssets = [];
                foreach ($assetData['serial_numbers'] as $serial) {
                    $propertyNumber = null;
                    if ($assetData['has_property_number']) {
                        $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $nextSeq);
                        $nextSeq++;
                    }

                    $createdAssets[] = SerializedAsset::create([
                        'item_id' => $validated['item_id'],
                        'serial_number' => $serial,
                        'property_number' => $propertyNumber,
                        'model' => $assetData['model'] ?? null,
                        'manufacturer_name' => $assetData['manufacturer_name'] ?? null,
                        'country_of_origin' => $assetData['country_of_origin'] ?? null,
                        'unit_cost' => $validated['unit_cost'],
                        'status' => 'Available',
                        'quantity_on_hand' => 1, // every unit is now its own row, regardless of property number
                    ]);
                }

                if (!empty($assetData['estimated_useful_life'])) {
                    $item->update(['estimated_useful_life' => $assetData['estimated_useful_life']]);
                }

                return response()->json([
                    'message' => count($createdAssets) . ' asset unit(s) successfully recorded.',
                    'assets' => $createdAssets,
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Failed to save inbound stock: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save stock: ' . $e->getMessage()], 500);
        }
    }

    public function storeBundleStock(Request $request)
    {
        $validated = $request->validate([
            'sets' => 'required|integer|min:1',
            'arrival_date' => 'nullable|date',
            'main' => 'required|array',
            'main.item_id' => 'required|exists:items,id',
            'main.unit_cost' => 'required|numeric|min:0',
            'main.has_property_number' => 'required|boolean',
            'main.serial_numbers' => 'required|array|size:' . $request->input('sets'),
            'main.serial_numbers.*' => 'required|string|max:255|distinct|unique:serialized_assets,serial_number',
            'main.model' => 'nullable|string|max:255',
            'main.manufacturer_name' => 'nullable|string|max:255',
            'main.country_of_origin' => 'nullable|string|max:255',
            'main.estimated_useful_life' => 'nullable|string|max:255',
            'peripherals' => 'nullable|array',
            'peripherals.*.item_id' => 'required|exists:items,id',
            'peripherals.*.unit_cost' => 'required|numeric|min:0',
            'peripherals.*.has_property_number' => 'required|boolean',
            'peripherals.*.serial_numbers' => 'required|array|size:' . $request->input('sets'),
            'peripherals.*.serial_numbers.*' => 'required|string|max:255|distinct|unique:serialized_assets,serial_number',
            'peripherals.*.model' => 'nullable|string|max:255',
            'peripherals.*.manufacturer_name' => 'nullable|string|max:255',
            'peripherals.*.country_of_origin' => 'nullable|string|max:255',
            'peripherals.*.estimated_useful_life' => 'nullable|string|max:255',
        ]);

        // A bundle only makes sense if the main unit has a property number to
        // attach peripherals to — otherwise there's nothing for them to link.
        if (!empty($validated['peripherals']) && !$validated['main']['has_property_number']) {
            return response()->json([
                'error' => 'A bundle requires the main item to have a property number, so peripherals have something to attach to.'
            ], 422);
        }

        $sets = $validated['sets'];
        $arrivalDate = $validated['arrival_date'] ?? date('Y-m-d');
        $year = date('Y', strtotime($arrivalDate));

        try {
            return DB::transaction(function () use ($validated, $sets, $year) {
                $mainInput = $validated['main'];
                $mainItem = Item::findOrFail($mainInput['item_id']);

                $nextSeq = 1;
                if ($mainInput['has_property_number']) {
                    $lastProperty = SerializedAsset::whereNotNull('property_number')
                        ->whereYear('created_at', $year)
                        ->orderBy('id', 'desc')->lockForUpdate()->first();
                    if ($lastProperty && $lastProperty->property_number) {
                        $parts = explode('-', $lastProperty->property_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }
                }

                $createdMain = [];
                for ($i = 0; $i < $sets; $i++) {
                    $propertyNumber = null;
                    if ($mainInput['has_property_number']) {
                        $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $nextSeq);
                        $nextSeq++;
                    }

                    $createdMain[] = SerializedAsset::create([
                        'item_id' => $mainInput['item_id'],
                        'serial_number' => $mainInput['serial_numbers'][$i],
                        'property_number' => $propertyNumber,
                        'model' => $mainInput['model'] ?? null,
                        'manufacturer_name' => $mainInput['manufacturer_name'] ?? null,
                        'country_of_origin' => $mainInput['country_of_origin'] ?? null,
                        'unit_cost' => $mainInput['unit_cost'],
                        'status' => 'Available',
                        'quantity_on_hand' => 1,
                    ]);
                }
                if (!empty($mainInput['estimated_useful_life'])) {
                    $mainItem->update(['estimated_useful_life' => $mainInput['estimated_useful_life']]);
                }

                $createdPeripherals = [];
                foreach ($validated['peripherals'] ?? [] as $peripheralInput) {
                    $peripheralItem = Item::findOrFail($peripheralInput['item_id']);

                    $pNextSeq = 1;
                    if ($peripheralInput['has_property_number']) {
                        $lastProperty = SerializedAsset::whereNotNull('property_number')
                            ->whereYear('created_at', $year)
                            ->orderBy('id', 'desc')->lockForUpdate()->first();
                        if ($lastProperty && $lastProperty->property_number) {
                            $parts = explode('-', $lastProperty->property_number);
                            $pNextSeq = intval(end($parts)) + 1;
                        }
                    }

                    for ($i = 0; $i < $sets; $i++) {
                        $propertyNumber = null;
                        if ($peripheralInput['has_property_number']) {
                            $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $pNextSeq);
                            $pNextSeq++;
                        }

                        $createdPeripherals[] = SerializedAsset::create([
                            'item_id' => $peripheralInput['item_id'],
                            'serial_number' => $peripheralInput['serial_numbers'][$i],
                            'property_number' => $propertyNumber,
                            'model' => $peripheralInput['model'] ?? null,
                            'manufacturer_name' => $peripheralInput['manufacturer_name'] ?? null,
                            'country_of_origin' => $peripheralInput['country_of_origin'] ?? null,
                            'unit_cost' => $peripheralInput['unit_cost'],
                            'status' => 'Available',
                            'quantity_on_hand' => 1,
                            'attached_to' => $createdMain[$i]->property_number, // index-paired: set #i's peripheral -> set #i's main unit
                        ]);
                    }
                    if (!empty($peripheralInput['estimated_useful_life'])) {
                        $peripheralItem->update(['estimated_useful_life' => $peripheralInput['estimated_useful_life']]);
                    }
                }

                return response()->json([
                    'message' => "{$sets} bundle(s) successfully received.",
                    'main' => $createdMain,
                    'peripherals' => $createdPeripherals,
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Failed to save bundle stock: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save bundle stock: ' . $e->getMessage()], 500);
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
                $assetsQuery = SerializedAsset::with('item:id,name,item_code,unit_of_measure,estimated_useful_life');
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
                    'attached_to' => $a->attached_to,
                    'serial_number' => $a->serial_number,
                    'model' => $a->model,
                    'manufacturer_name' => $a->manufacturer_name,
                    'country_of_origin' => $a->country_of_origin,
                    'estimated_useful_life' => $a->item->estimated_useful_life ?? null,
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

    public function updateAssetStatus(Request $request, SerializedAsset $serializedAsset)
    {
        $validated = $request->validate([
            'status' => 'required|in:Available,Under Repair,Condemned',
            'condition_remarks' => 'required_if:status,Under Repair,Condemned|nullable|string|max:1000',
        ]);

        $currentStatus = $serializedAsset->status;
        $newStatus = $validated['status'];

        // Block manually reversing an active issuance — that must go through
        // the Transfer/Return workflow, which properly logs a RET document
        // and clears current_holder_id.
        if ($currentStatus === 'Assigned' && $newStatus === 'Available') {
            return response()->json([
                'error' => 'This asset is currently assigned to someone. Use the Return/Transfer page to properly return it — that keeps the audit trail correct.'
            ], 422);
        }

        try {
            $serializedAsset->update([
                'status' => $newStatus,
                'condition_remarks' => $validated['condition_remarks'] ?? null,
            ]);

            return response()->json([
                'message' => "Asset status updated to '{$newStatus}'.",
                'asset' => $serializedAsset->fresh(['item', 'currentHolder']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to update asset status: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update asset status.'], 500);
        }
    }
}