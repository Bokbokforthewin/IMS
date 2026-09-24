<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use App\Models\StockBatch;
use App\Models\SerializedAsset;
use App\Models\StockIssuance;
use App\Models\AccountabilityReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $now = Carbon::now();
        $thisMonthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonthNoOverflow()->endOfMonth();

        return response()->json([
            'kpis' => $this->buildKpis($thisMonthStart, $lastMonthStart, $lastMonthEnd),
            'monthly_trend' => $this->buildMonthlyTrend($now->year),
            'asset_status_distribution' => $this->buildAssetStatusDistribution(),
            'category_breakdown' => $this->buildCategoryBreakdown(),
            'low_stock_items' => $this->buildLowStockItems(),
            'recent_activity' => $this->buildRecentActivity(),
        ], 200);
    }

    private function pctChange($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function buildKpis($thisMonthStart, $lastMonthStart, $lastMonthEnd)
    {
        // Current portfolio value (live snapshot, not month-scoped)
        $assetValue = (float) SerializedAsset::sum(DB::raw('unit_cost * quantity_on_hand'));
        $consumableValue = (float) StockBatch::sum(DB::raw('unit_cost * quantity_on_hand'));

        // Value RECEIVED this month vs last month — this is what "growth" means here
        $assetValueThisMonth = (float) SerializedAsset::where('created_at', '>=', $thisMonthStart)
            ->sum(DB::raw('unit_cost * quantity_on_hand'));
        $assetValueLastMonth = (float) SerializedAsset::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->sum(DB::raw('unit_cost * quantity_on_hand'));

        $consumableValueThisMonth = (float) StockBatch::where('received_date', '>=', $thisMonthStart)
            ->sum(DB::raw('unit_cost * quantity_on_hand'));
        $consumableValueLastMonth = (float) StockBatch::whereBetween('received_date', [$lastMonthStart, $lastMonthEnd])
            ->sum(DB::raw('unit_cost * quantity_on_hand'));

        $statusCounts = SerializedAsset::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $issuancesThisMonth = StockIssuance::where('issuance_date', '>=', $thisMonthStart)->count();
        $issuancesLastMonth = StockIssuance::whereBetween('issuance_date', [$lastMonthStart, $lastMonthEnd])->count();

        $receiptsThisMonth = AccountabilityReceipt::where('date_issued', '>=', $thisMonthStart);
        $parCountThisMonth = (clone $receiptsThisMonth)->where('receipt_type', 'PAR')->count();
        $icsCountThisMonth = (clone $receiptsThisMonth)->where('receipt_type', 'ICS')->count();
        $totalReceiptsThisMonth = $parCountThisMonth + $icsCountThisMonth;

        $receiptsLastMonth = AccountabilityReceipt::whereBetween('date_issued', [$lastMonthStart, $lastMonthEnd])->count();

        $lowStockCount = Item::where('tracking_type', 'consumable')
            ->get()
            ->filter(function ($item) {
                $stock = StockBatch::where('item_id', $item->id)->sum('quantity_on_hand');
                return $stock <= $item->reorder_level;
            })
            ->count();

        return [
            'total_inventory_value' => round($assetValue + $consumableValue, 2),
            'asset_value' => round($assetValue, 2),
            'consumable_value' => round($consumableValue, 2),
            'asset_value_change_pct' => $this->pctChange($assetValueThisMonth, $assetValueLastMonth),
            'consumable_value_change_pct' => $this->pctChange($consumableValueThisMonth, $consumableValueLastMonth),

            'total_assets' => SerializedAsset::count(),
            'assets_available' => (int) ($statusCounts['Available'] ?? 0),
            'assets_assigned' => (int) ($statusCounts['Assigned'] ?? 0),
            'assets_repair' => (int) ($statusCounts['Under Repair'] ?? 0),
            'assets_condemned' => (int) ($statusCounts['Condemned'] ?? 0),

            'total_categories' => Category::count(),
            'total_items' => Item::count(),
            'low_stock_count' => $lowStockCount,

            'issuances_this_month' => $issuancesThisMonth,
            'issuances_change_pct' => $this->pctChange($issuancesThisMonth, $issuancesLastMonth),

            'receipts_this_month' => $totalReceiptsThisMonth,
            'receipts_change_pct' => $this->pctChange($totalReceiptsThisMonth, $receiptsLastMonth),
            'par_count_this_month' => $parCountThisMonth,
            'ics_count_this_month' => $icsCountThisMonth,
        ];
    }

    private function buildMonthlyTrend($year)
    {
        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $start = Carbon::create($year, $m, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $assetValue = (float) SerializedAsset::whereBetween('created_at', [$start, $end])
                ->sum(DB::raw('unit_cost * quantity_on_hand'));

            $consumableValue = (float) StockBatch::whereBetween('received_date', [$start, $end])
                ->sum(DB::raw('unit_cost * quantity_on_hand'));

            $issuances = StockIssuance::whereBetween('issuance_date', [$start, $end])->count();
            $receipts = AccountabilityReceipt::whereBetween('date_issued', [$start, $end])->count();

            $months[] = [
                'month' => $start->format('M'),
                'asset_value' => round($assetValue, 2),
                'consumable_value' => round($consumableValue, 2),
                'issuances' => $issuances,
                'receipts' => $receipts,
            ];
        }
        return $months;
    }

    private function buildAssetStatusDistribution()
    {
        return SerializedAsset::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])
            ->values();
    }

    private function buildCategoryBreakdown()
    {
        return Category::withCount('items')
            ->get()
            ->map(function ($category) {
                $itemIds = Item::where('category_id', $category->id)->pluck('id');

                $assetValue = SerializedAsset::whereIn('item_id', $itemIds)
                    ->sum(DB::raw('unit_cost * quantity_on_hand'));
                $consumableValue = StockBatch::whereIn('item_id', $itemIds)
                    ->sum(DB::raw('unit_cost * quantity_on_hand'));

                return [
                    'category' => $category->name,
                    'item_count' => $category->items_count,
                    'value' => round((float) $assetValue + (float) $consumableValue, 2),
                ];
            })
            ->sortByDesc('value')
            ->take(6)
            ->values();
    }

    private function buildLowStockItems()
    {
        return Item::where('tracking_type', 'consumable')
            ->get()
            ->map(function ($item) {
                $stock = StockBatch::where('item_id', $item->id)->sum('quantity_on_hand');
                return [
                    'item_name' => $item->name,
                    'item_code' => $item->item_code,
                    'total_stock' => (int) $stock,
                    'reorder_level' => $item->reorder_level,
                    'deficit' => $item->reorder_level - $stock,
                ];
            })
            ->filter(fn ($row) => $row['total_stock'] <= $row['reorder_level'])
            ->sortByDesc('deficit')
            ->take(6)
            ->values();
    }

    private function buildRecentActivity()
    {
        $issuances = StockIssuance::with('lines.item')
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($i) => [
                'type' => 'issuance',
                'description' => "RIS {$i->document_number} issued",
                'date' => $i->created_at,
            ]);

        $receipts = AccountabilityReceipt::with('user')
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($r) => [
                'type' => strtolower($r->receipt_type),
                'description' => "{$r->receipt_type} {$r->document_number} issued to " . ($r->user->name ?? 'N/A'),
                'date' => $r->created_at,
            ]);

        return $issuances->concat($receipts)
            ->sortByDesc('date')
            ->take(8)
            ->values();
    }
}