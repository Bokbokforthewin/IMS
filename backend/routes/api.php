<?php

use Illuminate\Support\Facades\Route;

// Controller Imports
use App\Http\Controllers\AccountabilityController;
use App\Http\Controllers\AppConfigController;
use App\Http\Controllers\AssetTransferController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ConsumablesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\PermissionMatrixController;
use App\Http\Controllers\QuickReceiveController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AssetDistributionController;

/*
|--------------------------------------------------------------------------
| Public Routes (Unauthenticated)
|--------------------------------------------------------------------------
*/

Route::get('/app-config', [AppConfigController::class, 'index']);

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->middleware('throttle:login')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/check-email', [AuthController::class, 'checkEmail']);
    });
});

/*
|--------------------------------------------------------------------------
| Authenticated API v1 Routes (Sanctum + General API Rate Limiting)
|--------------------------------------------------------------------------
*/
Route::prefix('v1')
    ->middleware(['auth:sanctum', 'throttle:api'])
    ->group(function () {

        /*
        |------------------------------------------------------------------
        | Session & Identity
        |------------------------------------------------------------------
        */
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });

        /*
        |------------------------------------------------------------------
        | System Settings
        |------------------------------------------------------------------
        */
        Route::get('/settings', [SystemSettingController::class, 'index']);

        Route::middleware('permission:action:manage roles')->group(function () {
            Route::put('/settings', [SystemSettingController::class, 'update']);
        });

        /*
        |------------------------------------------------------------------
        | Dashboard
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:dashboard_page')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index']);
        });

        /*
        |------------------------------------------------------------------
        | User Management
        |------------------------------------------------------------------
        */
        // Dropdown helper: make sure UserController@options returns only id + name
        Route::get('/users/options', [UserController::class, 'options']);

        Route::middleware('permission:action:manage users')->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::get('/users/{user}', [UserController::class, 'show']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);

            Route::get('/roles', [UserController::class, 'getRoles']);
            Route::patch('/users/{user}/roles', [UserController::class, 'updateRoles']);
            Route::patch('/users/{user}/permissions', [UserController::class, 'updatePermissions']);
        });

        /*
        |------------------------------------------------------------------
        | Audit Trail (page permission, not manage users)
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:audit_trail_page')->group(function () {
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
        });

        /*
        |------------------------------------------------------------------
        | Role & Permission Matrix
        |------------------------------------------------------------------
        */
        Route::middleware('permission:action:manage roles')->group(function () {
            Route::get('/permissions-matrix', [PermissionMatrixController::class, 'index']);
            Route::put('/permissions-matrix', [PermissionMatrixController::class, 'update']);
            Route::post('/roles', [PermissionMatrixController::class, 'storeRole']);
            Route::post('/permissions', [PermissionMatrixController::class, 'storePermission']);
        });

        /*
        |------------------------------------------------------------------
        | Quick Receive
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:quick_receive_page')->group(function () {
            Route::post('/quick-receive', [QuickReceiveController::class, 'store']);
            Route::post('/quick-receive-bundle', [QuickReceiveController::class, 'storeBundle']);
        });

        /*
        |------------------------------------------------------------------
        | Shared Stock Read Routes
        | /stock-batches is loaded by App.jsx and used by Dashboard and
        | Consumables, so every page that needs it must be allowed.
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:receiving_page|view:quick_receive_page|view:consumables_page|view:dashboard_page')
            ->group(function () {
                Route::get('/stock-batches', [InventoryController::class, 'indexStockBatches']);
            });

        Route::middleware('permission:view:receiving_page|view:quick_receive_page')->group(function () {
            Route::get('/inventory/received-history', [InventoryController::class, 'receivedHistory']);
        });

        /*
        |------------------------------------------------------------------
        | Catalog (Categories & Items)
        |------------------------------------------------------------------
        */
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/items', [ItemController::class, 'index']);

        // Create: Catalog page OR Quick Receive
        Route::middleware('permission:view:catalog_page|view:quick_receive_page')->group(function () {
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::post('/items', [ItemController::class, 'store']);
        });

        // Edit / delete: Catalog page only
        Route::middleware('permission:view:catalog_page')->group(function () {
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

            Route::put('/items/{item}', [ItemController::class, 'update']);
            Route::delete('/items/{item}', [ItemController::class, 'destroy']);
        });

        /*
        |------------------------------------------------------------------
        | Receiving & Stock Management
        |------------------------------------------------------------------
        */
        // Create: Receiving page OR Quick Receive
        Route::middleware('permission:view:receiving_page|view:quick_receive_page')->group(function () {
            Route::post('/stocks/receive', [InventoryController::class, 'storeStock']);
            Route::post('/stocks/receive-bundle', [InventoryController::class, 'storeBundleStock']);
        });

        // Edit / delete: Receiving page only
        Route::middleware('permission:view:receiving_page')->group(function () {
            Route::put('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'updateStockBatch']);
            Route::delete('/inventory/stock-batches/{stockBatch}', [InventoryController::class, 'deleteStockBatch']);
            Route::put('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'updateSerializedAsset']);
            Route::delete('/inventory/serialized-assets/{serializedAsset}', [InventoryController::class, 'deleteSerializedAsset']);
        });

        /*
        |------------------------------------------------------------------
        | Consumables
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:consumables_page')->group(function () {
            Route::post('/consumables/issue', [ConsumablesController::class, 'issueConsumables']);
            Route::get('/consumables/stock-status', [ConsumablesController::class, 'getStockStatus']);
            Route::get('/consumables/issuances', [ConsumablesController::class, 'indexIssuances']);
        });

        /*
        |------------------------------------------------------------------
        | Serialized Assets, Accountability & Transfers
        |------------------------------------------------------------------
        */
        Route::get('/serialized-assets', [AccountabilityController::class, 'index']);
        Route::get('/accountability/available-for-cart', [AccountabilityController::class, 'availableForCart']);
        Route::get('/accountability/serialized-assets/{serializedAsset}/attached', [AccountabilityController::class, 'attachedItems']);

        Route::middleware('permission:view:assets_page')->group(function () {
            Route::post('/accountability/issue-asset', [AccountabilityController::class, 'issueAsset']);
            Route::get('/accountability/receipts', [AccountabilityController::class, 'getReceipts']);
            Route::get('/accountability/receipts/{receipt}/download-excel', [AccountabilityController::class, 'downloadExcel']);
            Route::get('/accountability/serialized-assets/{serializedAsset}/download-tag-pdf', [AccountabilityController::class, 'downloadPropertyTagPdf']);
            Route::post('/accountability/bulk-tags-pdf', [AccountabilityController::class, 'bulkDownloadTags']);

            Route::post('/accountability/receipts/{receipt}/distribute', [AssetDistributionController::class, 'distribute']);
            Route::post('/accountability/serialized-assets/{serializedAsset}/request-revert', [AssetDistributionController::class, 'requestRevert']);

            Route::get('/asset-transfers', [AssetTransferController::class, 'index']);
            Route::post('/asset-transfers', [AssetTransferController::class, 'store']);
        });

        Route::middleware('permission:action:manage asset status')->group(function () {
            Route::post('/accountability/serialized-assets/{serializedAsset}/revert-distribution', [AssetDistributionController::class, 'revert']);
            Route::post('/accountability/serialized-assets/{serializedAsset}/decline-revert', [AssetDistributionController::class, 'declineRevert']);
            Route::put('inventory/serialized-assets/{serializedAsset}/status', [AccountabilityController::class, 'updateAssetStatus']);
        });

        /*
        |------------------------------------------------------------------
        | Reports
        |------------------------------------------------------------------
        */
        Route::middleware('permission:view:reports_page')->group(function () {
            Route::get('/reports', [ReportController::class, 'generateReport']);
        });
    });