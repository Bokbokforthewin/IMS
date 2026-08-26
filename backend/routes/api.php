<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\AccountabilityController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\AssetTransferController;
use App\Http\Controllers\ConsumablesController;

Route::get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('v1')->group(function () {
    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);

    // Items
    Route::post('/items', [ItemController::class, 'store']);
    Route::get('/items', [ItemController::class, 'index']);

    // Serialized Assets
    Route::get('/serialized-assets', [AccountabilityController::class, 'index']);
    Route::get('/serialized_assets', [AccountabilityController::class, 'index']);

    // Inventory & Stock Management
    Route::post('/stocks/receive', [InventoryController::class, 'storeStock']);
    Route::get('/stock-batches', [InventoryController::class, 'indexStockBatches']);

    // Consumables issuance & stock levels
    Route::post('/consumables/issue', [ConsumablesController::class, 'issueConsumables']);
    Route::get('/consumables/stock-status', [ConsumablesController::class, 'getStockStatus']);
    Route::get('/consumables/issuances', [ConsumablesController::class, 'indexIssuances']);

    // Property Accountability & Issuances (PAR / ICS)
    Route::post('/accountability/issue-asset', [AccountabilityController::class, 'issueAsset']);
    Route::get('/accountability/receipts', [AccountabilityController::class, 'getReceipts']);

    // Return & Transfer Assets (Moved inside v1 prefix group)
    Route::get('/asset-transfers', [AssetTransferController::class, 'index']);
    Route::post('/asset-transfers', [AssetTransferController::class, 'store']);
});