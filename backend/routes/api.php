<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\AccountabilityController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\AssetTransferController;
use App\Http\Controllers\ConsumablesController;
use App\Http\Controllers\PermissionMatrixController;
use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\UserController;
use App\Services\AccountabilityExcelService;

Route::get('/app-config', [AppConfigController::class, 'index']);

Route::get('/user', function (Request $request) {
    return response()->json([
        'message' => 'Centralized auth mode active.'
        // 'user' => $request->user(),
        // 'roles' => $request->user()?->getRoleNames() ?? [],
        // 'permissions' => $request->user()?->getAllPermissions()->pluck('name') ?? [],
    ]);
});
// ->middleware('auth:sanctum');

Route::prefix('v1')
// ->middleware(['auth:sanctum'])
->group(function () {

    Route::get('/users', [UserController::class, 'index']);
    // Categories (Restricted to Admin / Supply Officer)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        // ->middleware('permission:manage items');

    // Items
    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::put('/items/{item}', [ItemController::class, 'update']);
    Route::delete('/items/{item}', [ItemController::class, 'destroy']);
        // ->middleware('permission:manage items');

    // Serialized Assets
    Route::get('/serialized-assets', [AccountabilityController::class, 'index']);
    // Route::get('/serialized_assets', [AccountabilityController::class, 'index']);

    // Inventory & Stock Management
    Route::post('/stocks/receive', [InventoryController::class, 'storeStock']);
        // ->middleware('permission:receive stock');
    Route::get('/stock-batches', [InventoryController::class, 'indexStockBatches']);
    Route::get('/inventory/received-history', [InventoryController::class, 'receivedHistory']);
    Route::put('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'updateStockBatch']);
    Route::delete('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'deleteStockBatch']);
    Route::put('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'updateSerializedAsset']);
    Route::delete('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'deleteSerializedAsset']);
    Route::put('/inventory/serialized-assets/{serializedAsset}/status', [InventoryController::class, 'updateAssetStatus']);

    // Consumables issuance & stock levels
    Route::post('/consumables/issue', [ConsumablesController::class, 'issueConsumables']);
        // ->middleware('permission:issue consumables');
    Route::get('/consumables/stock-status', [ConsumablesController::class, 'getStockStatus']);
    Route::get('/consumables/issuances', [ConsumablesController::class, 'indexIssuances']);

    // Property Accountability & Issuances (PAR / ICS)
    Route::post('/accountability/issue-asset', [AccountabilityController::class, 'issueAsset']);
        // ->middleware('permission:issue consumables');
    Route::get('/accountability/receipts', [AccountabilityController::class, 'getReceipts']);
    Route::get('/accountability/receipts/{receipt}/download-excel', [AccountabilityController::class, 'downloadExcel']);
    
    // Return & Transfer Assets
    Route::get('/asset-transfers', [AssetTransferController::class, 'index']);
    Route::post('/asset-transfers', [AssetTransferController::class, 'store']);
        // ->middleware('permission:receive stock');

    // Permission Matrix Routes
    Route::get('/permissions-matrix', [PermissionMatrixController::class, 'index']);
    Route::put('/permissions-matrix', [PermissionMatrixController::class, 'update']);
});