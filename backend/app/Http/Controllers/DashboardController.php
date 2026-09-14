<?php

namespace App\Http\Controllers;

use App\Models\SerializedAsset;
use App\Models\AssetTransfer;
use App\Models\Item; // Or whatever model you use for consumables
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Return high-level summary statistics for the frontend dashboard.
     */
    public function statistics()
    {
        // 1. Total Serialized Assets in the system
        $totalAssets = SerializedAsset::count();

        // 2. Assets currently deployed/issued (adjust the status string to match your DB)
        $deployedAssets = SerializedAsset::where('status', 'Issued')->count();

        // 3. Low stock consumables
        // Example: items categorized as 'consumable' where stock is below a reorder point
        $lowStockConsumables = Item::whereHas('category', function ($query) {
                $query->where('name', 'Consumables'); // Adjust based on how you track consumable categories
            })
            ->whereColumn('current_stock', '<=', 'reorder_level') // Adjust your column names
            ->count();

        // 4. Pending Asset Transfers
        $pendingTransfers = AssetTransfer::where('status', 'Pending')->count();

        // Return the exact JSON structure your React state expects
        return response()->json([
            'totalAssets' => $totalAssets,
            'deployedAssets' => $deployedAssets,
            'lowStockConsumables' => $lowStockConsumables,
            'pendingTransfers' => $pendingTransfers,
        ]);
    }
}