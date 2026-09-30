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
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::get('/app-config', [AppConfigController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Public Auth API v1 Routes
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Authenticated API v1 Routes
|--------------------------------------------------------------------------
*/
Route::prefix('v1')
    ->middleware(['auth:sanctum'])
    ->group(function () {

        // Session & Identity
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Dashboard
        Route::middleware('permission:view dashboard')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index']);
        });

        // User Management
        Route::middleware('permission:manage users')->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);          // Create new user
            Route::get('/users/{user}', [UserController::class, 'show']);     // Get single user
            Route::put('/users/{user}', [UserController::class, 'update']);   // Update user info
            Route::delete('/users/{user}', [UserController::class, 'destroy']);// Delete user

            // Roles & Permissions Management
            Route::get('/roles', [UserController::class, 'getRoles']);        // Get available roles list
            Route::patch('/users/{user}/roles', [UserController::class, 'updateRoles']); // Assign/update roles
            Route::patch('/users/{user}/permissions', [UserController::class, 'updatePermissions']); // Assign/update permissions
        });

        // Role & Permission Matrix
        Route::middleware('permission:manage roles')->group(function () {
            Route::get('/permissions-matrix', [PermissionMatrixController::class, 'index']);
            Route::put('/permissions-matrix', [PermissionMatrixController::class, 'update']);
            Route::post('/roles',[PermissionMatrixController::class, 'storeRole']);      
            Route::post('/permissions',[PermissionMatrixController::class, 'storePermission']);
        });

        // Category Management
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::middleware('permission:manage categories')->group(function () {
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        });

        // Item Catalog Management
        Route::get('/items', [ItemController::class, 'index']);
        Route::middleware('permission:manage items')->group(function () {
            Route::post('/items', [ItemController::class, 'store']);
            Route::put('/items/{item}', [ItemController::class, 'update']);
            Route::delete('/items/{item}', [ItemController::class, 'destroy']);
        });

        // Receiving & Batch Stock Management
        Route::middleware('permission:receive stock')->group(function () {
            Route::post('/stocks/receive', [InventoryController::class, 'storeStock']);
            Route::post('/stocks/receive-bundle', [InventoryController::class, 'storeBundleStock']);
            Route::get('/stock-batches', [InventoryController::class, 'indexStockBatches']);
            Route::get('/inventory/received-history', [InventoryController::class, 'receivedHistory']);
        });

        // Editing Stock Records
        Route::middleware('permission:edit stock records')->group(function () {
            Route::put('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'updateStockBatch']);
            Route::put('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'updateSerializedAsset']);
        });

        // Deleting Stock Records
        Route::middleware('permission:delete stock records')->group(function () {
            Route::delete('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'deleteStockBatch']);
            Route::delete('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'deleteSerializedAsset']);
        });

        // Updating Asset Status
        Route::middleware('permission:edit asset status')->group(function () {
            Route::put('/inventory/serialized-assets/{serializedAsset}/status', [InventoryController::class, 'updateAssetStatus']);
        });

        // Consumables Management
        Route::middleware('permission:issue consumables')->group(function () {
            Route::post('/consumables/issue', [ConsumablesController::class, 'issueConsumables']);
            Route::get('/consumables/stock-status', [ConsumablesController::class, 'getStockStatus']);
            Route::get('/consumables/issuances', [ConsumablesController::class, 'indexIssuances']);
        });

        // Serialized Assets & Issuances (PAR / ICS)
        Route::get('/serialized-assets', [AccountabilityController::class, 'index']);
        Route::get('/accountability/available-for-cart', [AccountabilityController::class, 'availableForCart']);
        Route::get('/accountability/serialized-assets/{serializedAsset}/attached', [AccountabilityController::class, 'attachedItems']);

        Route::middleware('permission:issue assets')->group(function () {
            Route::post('/accountability/issue-asset', [AccountabilityController::class, 'issueAsset']);
            Route::get('/accountability/receipts', [AccountabilityController::class, 'getReceipts']);
            Route::get('/accountability/receipts/{receipt}/download-excel', [AccountabilityController::class, 'downloadExcel']);
            Route::get('/accountability/serialized-assets/{serializedAsset}/download-tag-pdf', [AccountabilityController::class, 'downloadPropertyTagPdf']);
        });

        // Asset Transfers
        Route::middleware('permission:transfer assets')->group(function () {
            Route::get('/asset-transfers', [AssetTransferController::class, 'index']);
            Route::post('/asset-transfers', [AssetTransferController::class, 'store']);
        });
    });