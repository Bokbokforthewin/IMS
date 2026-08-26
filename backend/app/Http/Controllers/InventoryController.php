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
                        'serial_number' => 'required|string|max:255|unique:serialized_assets,serial_number',
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
                        'quantity_on_hand' => $batchData['quantity'],
                        'unit_cost' => $validatedData['unit_cost'],
                        'received_date' => $arrivalDate,
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
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json($batches, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch stock batches: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve stock batches.'], 500);
        }
    }
}