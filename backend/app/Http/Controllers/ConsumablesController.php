<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Item;
use App\Models\StockBatch;
use App\Models\StockIssuance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConsumablesController extends Controller
{
    /**
     * Fetch stock levels and dynamic reorder status for the bottom table.
     */
    public function getStockStatus()
    {
        try {
           $items = Item::with(['stockBatches' => function($q) {
                $q->orderBy('created_at', 'desc'); // To grab latest cost if needed
            }])
            ->where('is_serialized', false)
            ->get()
            ->map(function ($item) {
                $totalStock = $item->stockBatches->sum('quantity_on_hand');
                $reorderLevel = $item->reorder_level ?? 5;
                $latestBatch = $item->stockBatches->first();

                $status = 'Normal';
                if ($totalStock <= 0) {
                    $status = 'Out of Stock';
                } elseif ($totalStock <= $reorderLevel) {
                    $status = 'Low Stock (Reorder)';
                }

                return [
                    'id' => $item->id,
                    'item_code' => $item->item_code,
                    'name' => $item->name,
                    'unit_of_measure' => $item->unit_of_measure,
                    'item_brand' => $item->brand,
                    'item_specifications' => $item->specifications,
                    'item_type' => $item->type,
                    'cost' => $latestBatch ? $latestBatch->unit_cost : 0,
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
     * Issue consumables using FIFO across stock batches.
     */
   public function issueConsumables(Request $request)
    {
        $validatedData = $request->validate([
            'item_id' => 'required|exists:items,id',
            'quantity_requested' => 'required|integer|min:1',
            'issued_to' => 'required|string|max:255',
            'issuance_date' => 'required|date',
            'purpose' => 'nullable|string|max:255',
        ]);

        $date = $validatedData['issuance_date'];
        $year = date('Y', strtotime($date));
        $month = date('m', strtotime($date));
        $day = date('d', strtotime($date));

        // Define the prefix for the chosen issuance date (e.g., RIS-2026-08-27-)
        $prefix = sprintf("RIS-%s-%s-%s-", $year, $month, $day);

        try {
            return DB::transaction(function () use ($validatedData, $prefix) {
                $requestedQty = $validatedData['quantity_requested'];

                // Fetch available batches for this item sorted by oldest first (FIFO)
                $batches = StockBatch::where('item_id', $validatedData['item_id'])
                    ->where('quantity_on_hand', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->lockForUpdate()
                    ->get();

                $totalAvailable = $batches->sum('quantity_on_hand');

                if ($totalAvailable < $requestedQty) {
                    return response()->json([
                        'error' => "Insufficient stock. Only {$totalAvailable} available on hand."
                    ], 422);
                }

                // Deduct from batches using FIFO logic
                $qtyToDeduct = $requestedQty;
                foreach ($batches as $batch) {
                    if ($qtyToDeduct <= 0) break;

                    if ($batch->quantity_on_hand <= $qtyToDeduct) {
                        $qtyToDeduct -= $batch->quantity_on_hand;
                        $batch->update(['quantity_on_hand' => 0]);
                    } else {
                        $batch->update(['quantity_on_hand' => $batch->quantity_on_hand - $qtyToDeduct]);
                        $qtyToDeduct = 0;
                    }
                }

                // Generate RIS Document Number safely by searching existing document numbers for that exact date prefix
                $latestIssuance = StockIssuance::where('document_number', 'like', "{$prefix}%")
                    ->orderBy('document_number', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextSeq = 1;
                if ($latestIssuance && $latestIssuance->document_number) {
                    $parts = explode('-', $latestIssuance->document_number);
                    $nextSeq = intval(end($parts)) + 1;
                }

                $documentNumber = $prefix . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);

                // Create history log entry
                $issuance = StockIssuance::create([
                    'document_number' => $documentNumber,
                    'stock_batch_id' => $batches->first()->id, 
                    'quantity_issued' => $requestedQty,
                    'issued_to' => $validatedData['issued_to'],
                    'issuance_date' => $validatedData['issuance_date'],
                    'purpose' => $validatedData['purpose'] ?? 'General Use',
                ]);

                // Check remaining stock across all batches for reorder alert warning
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
                    'issuance' => $issuance,
                    'remaining_stock' => $remainingStock
                ], 200);
            });

        } catch (\Exception $e) {
            Log::error('Failed to issue consumables: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to issue consumables: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fetch issuance logs for history table.
     */
    public function indexIssuances()
    {
        try {
            $issuances = StockIssuance::with(['stockBatch.item'])
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json($issuances, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch issuance logs: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve logs.'], 500);
        }
    }
}