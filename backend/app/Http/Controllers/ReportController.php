<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SerializedAsset;
use App\Models\StockIssuanceLine;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function generateReport(Request $request)
    {
        $validated = $request->validate([
            'report_type' => 'required|string|in:assets,consumables,both',
            'filter_mode' => 'required|string|in:year,month,year_range,custom_range',
            'year'        => 'nullable|required_if:filter_mode,year,month|integer|min:2000|max:2099',
            'month'       => 'nullable|required_if:filter_mode,month|integer|min:1|max:12',
            'start_year'  => 'nullable|required_if:filter_mode,year_range|integer|min:2000|max:2099',
            'end_year'    => 'nullable|required_if:filter_mode,year_range|integer|min:2000|max:2099|gte:start_year',
            'start_date'  => 'nullable|required_if:filter_mode,custom_range|date',
            'end_date'    => 'nullable|required_if:filter_mode,custom_range|date|after_or_equal:start_date',
        ]);

        $reportType = $validated['report_type'];
        $filterMode = $validated['filter_mode'];

        $items = collect();

        // 1. Fetch Assets if requested
        if (in_array($reportType, ['assets', 'both'])) {
            $assetsQuery = SerializedAsset::with([
                'item.category', 
                'currentHolder', 
                'lines.receipt.issuedBy', 
                'lines.receipt.receivedMrBy'
            ]);
            
            $assetsQuery->whereHas('lines.receipt', function ($q) use ($filterMode, $validated) {
                if ($filterMode === 'year') {
                    $q->whereYear('date_issued', $validated['year']);
                } elseif ($filterMode === 'month') {
                    $q->whereYear('date_issued', $validated['year'])
                      ->whereMonth('date_issued', $validated['month']);
                } elseif ($filterMode === 'year_range') {
                    $startDate = Carbon::createFromDate($validated['start_year'], 1, 1)->startOfDay();
                    $endDate = Carbon::createFromDate($validated['end_year'], 12, 31)->endOfDay();
                    $q->whereBetween('date_issued', [$startDate, $endDate]);
                } elseif ($filterMode === 'custom_range') {
                    $startDate = Carbon::parse($validated['start_date'])->startOfDay();
                    $endDate = Carbon::parse($validated['end_date'])->endOfDay();
                    $q->whereBetween('date_issued', [$startDate, $endDate]);
                }
            });

            $assets = $assetsQuery->get()->map(function ($asset) {
                $latestReceipt = $asset->lines
                    ->map(fn($line) => $line->receipt)
                    ->filter()
                    ->sortByDesc('date_issued')
                    ->first();

                $dateIssued = optional($latestReceipt)->date_issued;

                return [
                    'id'                  => $asset->id,
                    'type'                => 'asset',
                    'item_name'           => $asset->item->name ?? 'N/A',
                    'brand'               => $asset->item->brand ?? 'N/A',
                    'category'            => $asset->item->category->name ?? 'N/A',
                    'code_or_serial'      => $asset->property_number ?? $asset->serial_number ?? 'N/A',
                    'quantity'            => 1,
                    'unit_cost'           => (float) ($asset->unit_cost ?? 0),
                    'total_cost'          => (float) ($asset->unit_cost ?? 0),
                    'date'                => $dateIssued ? Carbon::parse($dateIssued)->format('Y-m-d') : ($asset->created_at ? $asset->created_at->format('Y-m-d') : null),
                    'recipient_or_holder' => $asset->currentHolder->name ?? 'N/A',
                    'management_receipt'  => optional($latestReceipt?->receivedMrBy)->name ?? 'N/A',
                    'issued_by'           => optional($latestReceipt?->issuedBy)->name ?? 'N/A',
                    'remarks'             => optional($latestReceipt)->remarks ?? $asset->condition_remarks ?? 'N/A',
                ];
            });

            $items = $items->concat($assets);
        }

        // 2. Fetch Consumables
        if (in_array($reportType, ['consumables', 'both'])) {
            $consumablesQuery = StockIssuanceLine::with([
                'item.category', 
                'issuedTo', 
                'issuance.issuedBy', 
                'batchAllocations.stockBatch'
            ]);
            
            $this->applyDateFilters($consumablesQuery, $filterMode, $validated, 'created_at');

            $consumables = $consumablesQuery->get()->map(function ($line) {
                $qty = (int) ($line->quantity_issued ?? 1);
                $firstBatch = $line->batchAllocations->first()?->stockBatch;
                $unitCost = (float) ($firstBatch->unit_cost ?? $line->item->unit_cost ?? 0);

                return [
                    'id'                  => $line->id,
                    'type'                => 'consumable',
                    'item_name'           => $line->item->name ?? 'N/A',
                    'brand'               => $line->item->brand ?? 'N/A',
                    'category'            => $line->item->category->name ?? 'N/A',
                    'code_or_serial'      => $line->issuance->document_number ?? $line->item->item_code ?? 'N/A',
                    'quantity'            => $qty,
                    'unit_cost'           => $unitCost,
                    'total_cost'          => $unitCost * $qty,
                    'date'                => $line->created_at ? $line->created_at->format('Y-m-d') : null,
                    'recipient_or_holder' => $line->issuedTo->name ?? 'N/A',
                    'management_receipt'  => 'N/A',
                    'issued_by'           => optional($line->issuance?->issuedBy)->name ?? 'N/A',
                    'remarks'             => optional($line->issuance)->remarks ?? 'N/A',
                ];
            });

            $items = $items->concat($consumables);
        }

        $sortedItems = $items->sortByDesc('date')->values();

        $summary = [
            'total_items_count' => $sortedItems->count(),
            'total_quantity'    => $sortedItems->sum('quantity'),
            'total_value'       => $sortedItems->sum('total_cost'),
            'total_assets'      => $sortedItems->where('type', 'asset')->count(),
            'total_consumables' => $sortedItems->where('type', 'consumable')->count(),
        ];

        return response()->json([
            'success' => true,
            'filters' => $validated,
            'summary' => $summary,
            'data'    => $sortedItems,
        ]);
    }

    private function applyDateFilters($query, string $mode, array $validated, string $dateColumn = 'created_at')
    {
        if ($mode === 'year') {
            $query->whereYear($dateColumn, $validated['year']);
        } elseif ($mode === 'month') {
            $query->whereYear($dateColumn, $validated['year'])
                  ->whereMonth($dateColumn, $validated['month']);
        } elseif ($mode === 'year_range') {
            $startDate = Carbon::createFromDate($validated['start_year'], 1, 1)->startOfDay();
            $endDate = Carbon::createFromDate($validated['end_year'], 12, 31)->endOfDay();
            $query->whereBetween($dateColumn, [$startDate, $endDate]);
        } elseif ($mode === 'custom_range') {
            $startDate = Carbon::parse($validated['start_date'])->startOfDay();
            $endDate = Carbon::parse($validated['end_date'])->endOfDay();
            $query->whereBetween($dateColumn, [$startDate, $endDate]);
        }
    }
}