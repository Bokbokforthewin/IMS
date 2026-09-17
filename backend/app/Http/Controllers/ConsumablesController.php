<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\StockBatch;
use App\Models\StockIssuance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConsumablesController extends Controller
{
    public function getStockStatus()
    {
        try {
            $items = Item::with(['stockBatches' => function ($q) {
                    $q->orderBy('received_date', 'asc');
                }])
                ->where('tracking_type', 'Consumable')
                ->get()
                ->map(function ($item) {
                    $totalStock = $item->stockBatches->sum('quantity_on_hand');
                    $reorderLevel = $item->reorder_level ?? 5;
                    $nextBatch = $item->stockBatches->firstWhere('quantity_on_hand', '>', 0);

                    $status = 'In Stock';
                    if ($totalStock <= 0) {
                        $status = 'Out of Stock';
                    } elseif ($totalStock <= $reorderLevel) {
                        $status = 'Low on Stock';
                    }

                    return [
                        'id' => $item->id,
                        'item_code' => $item->item_code,
                        'name' => $item->name,
                        'unit_of_measure' => $item->unit_of_measure,
                        'item_brand' => $item->brand,
                        'item_specifications' => $item->specifications,
                        'item_type' => $item->type,
                        'cost' => $nextBatch ? $nextBatch->unit_cost : 0,
                        'total_stock' => $totalStock,
                        'reorder_level' => $reorderLevel,
                        'status' => $status,
                    ];
                });

            return response()->json($items, 200);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve stock status: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve stock status.'], 500);
        }
    }

    /**
     * Issue consumables using true FIFO, ordered by actual arrival date.
     * Records every batch drawn from via stock_issuance_batches.
     */
    public function issueConsumables(Request $request)
{
    $validatedData = $request->validate([
        'item_id' => 'required|exists:items,id',
        'quantity_requested' => 'required|integer|min:1',
        'issued_to_id' => 'required|exists:users,id',
        'issuance_date' => 'required|date',
        'purpose' => 'nullable|string|max:255',
    ]);

    $date = $validatedData['issuance_date'];
    $prefix = sprintf(
        "RIS-%s-%s-%s-",
        date('Y', strtotime($date)),
        date('m', strtotime($date)),
        date('d', strtotime($date))
    );

    $maxAttempts = 5;

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        try {
            return DB::transaction(function () use ($validatedData, $prefix) {
                $requestedQty = $validatedData['quantity_requested'];

                $batches = StockBatch::where('item_id', $validatedData['item_id'])
                    ->where('quantity_on_hand', '>', 0)
                    ->orderBy('received_date', 'asc')
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->get();

                $totalAvailable = $batches->sum('quantity_on_hand');

                if ($totalAvailable < $requestedQty) {
                    return response()->json([
                        'error' => "Insufficient stock. Only {$totalAvailable} available on hand."
                    ], 422);
                }

                $qtyToDeduct = $requestedQty;
                $allocations = [];

                foreach ($batches as $batch) {
                    if ($qtyToDeduct <= 0) break;

                    $take = min($batch->quantity_on_hand, $qtyToDeduct);
                    $batch->update(['quantity_on_hand' => $batch->quantity_on_hand - $take]);

                    $allocations[] = [
                        'stock_batch_id' => $batch->id,
                        'quantity_deducted' => $take,
                        'unit_cost_at_issuance' => $batch->unit_cost,
                    ];

                    $qtyToDeduct -= $take;
                }

                $latestIssuance = StockIssuance::where('document_number', 'like', "{$prefix}%")
                    ->orderBy('document_number', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextSeq = 1;
                if ($latestIssuance) {
                    $parts = explode('-', $latestIssuance->document_number);
                    $nextSeq = intval(end($parts)) + 1;
                }

                $documentNumber = $prefix . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);

                $issuance = StockIssuance::create([
                    'document_number' => $documentNumber,
                    'issuance_date' => $validatedData['issuance_date'],
                    'purpose' => $validatedData['purpose'] ?? 'General Use',
                ]);

                $line = $issuance->lines()->create([
                    'item_id' => $validatedData['item_id'],
                    'issued_to_id' => $validatedData['issued_to_id'],
                    'quantity_issued' => $requestedQty,
                ]);

                foreach ($allocations as $alloc) {
                    $line->batchAllocations()->create($alloc);
                }

                $remainingStock = StockBatch::where('item_id', $validatedData['item_id'])->sum('quantity_on_hand');
                $item = Item::find($validatedData['item_id']);
                $reorderLevel = $item->reorder_level ?? 5;

                $message = "Consumables successfully issued under {$documentNumber}.";
                if ($remainingStock <= $reorderLevel) {
                    $message .= " WARNING: Stock is low ({$remainingStock} left). Time to reorder!";
                }

                return response()->json([
                    'message' => $message,
                    'document_number' => $documentNumber,
                    'issuance' => $issuance->load('lines.batchAllocations.stockBatch', 'lines.issuedTo', 'lines.item'),
                    'remaining_stock' => $remainingStock
                ], 200);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error code 1062 = duplicate key. Another request grabbed the
            // same document_number first — retry with a freshly computed sequence.
            $isDuplicateKey = $e->errorInfo[1] ?? null;
            if ($isDuplicateKey == 1062 && $attempt < $maxAttempts) {
                continue;
            }

            Log::error('Failed to issue consumables: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to issue consumables: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            Log::error('Failed to issue consumables: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to issue consumables: ' . $e->getMessage()], 500);
        }
    }

    return response()->json(['error' => 'Failed to generate a unique document number after several attempts.'], 500);
}

    public function indexIssuances()
    {
        try {
            $issuances = StockIssuance::with(['lines.item', 'lines.issuedTo', 'lines.batchAllocations.stockBatch'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($issuances, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch issuance logs: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve logs.'], 500);
        }
    }
    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'reorder_level' => 'required|integer|min:0',
        ]);

        try {
            $item->update($validated);

            return response()->json([
                'message' => 'Reorder level updated successfully.',
                'item' => $item,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update item: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Item $item)
    {
        try {
            $hasStock = $item->stockBatches()->where('quantity_on_hand', '>', 0)->exists();
            if ($hasStock) {
                return response()->json([
                    'error' => 'Cannot delete this item — it still has stock on hand. Issue out or zero out the stock first.'
                ], 422);
            }

            $hasIssuanceHistory = \App\Models\StockIssuance::where('item_id', $item->id)->exists();
            if ($hasIssuanceHistory) {
                return response()->json([
                    'error' => 'Cannot delete this item — it has issuance history (RIS records). Deleting it would erase that audit trail.'
                ], 422);
            }

            $item->delete();

            return response()->json(['message' => 'Item deleted successfully.'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete item: ' . $e->getMessage()], 500);
        }
    }
}