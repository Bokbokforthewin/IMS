<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use App\Models\StockBatch;
use App\Models\SerializedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Combined "create catalog item + receive stock" workflow, for use when no
 * dedicated supply/receiving personnel exist to run the two-step process.
 *
 * Deliberately duplicates item-code and stock-record generation logic from
 * ItemController / InventoryController rather than calling into them, so
 * this workflow stays fully independent and those two stay untouched.
 */
class QuickReceiveController extends Controller
{
    public function store(Request $request)
    {
        $envelope = $request->validate([
            'item_mode' => 'required|in:new,existing',
            'item_id' => 'required_if:item_mode,existing|nullable|exists:items,id',
            'category_id' => 'required_if:item_mode,new|nullable|exists:categories,id',
            'name' => 'required_if:item_mode,new|nullable|string|max:255',
            'brand' => 'nullable|string|max:255',
            'specifications' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'unit_of_measure' => 'required_if:item_mode,new|nullable|string|max:50',
            'tracking_type' => 'required_if:item_mode,new|nullable|in:asset,consumable',
            'reorder_level' => 'nullable|integer|min:0',
            'estimated_useful_life' => 'nullable|string|max:255',

            'unit_cost' => 'required|numeric|min:0',
            'arrival_date' => 'nullable|date',
            'quantity' => 'required|integer|min:1',
        ]);

        // Resolve the item + its tracking_type BEFORE the stock-specific
        // validation pass, since that pass branches on tracking_type.
        $item = $envelope['item_mode'] === 'existing'
            ? Item::findOrFail($envelope['item_id'])
            : null;

        $trackingType = $item?->tracking_type ?? $envelope['tracking_type'] ?? null;
        $assetFields = null;

        if ($trackingType === 'asset') {
            $assetFields = $request->validate([
                'has_property_number' => 'required|boolean',
                'serial_numbers' => 'required|array|size:' . $envelope['quantity'],
                'serial_numbers.*' => 'required|string|max:255|distinct|unique:serialized_assets,serial_number',
                'model' => 'nullable|string|max:255',
                'manufacturer_name' => 'nullable|string|max:255',
                'country_of_origin' => 'nullable|string|max:255',
            ]);
        }

        $arrivalDate = $envelope['arrival_date'] ?? date('Y-m-d');
        $year = date('Y', strtotime($arrivalDate));
        $month = date('m', strtotime($arrivalDate));
        $day = date('d', strtotime($arrivalDate));

        try {
            return DB::transaction(function () use ($envelope, $assetFields, $item, $trackingType, $year, $month, $day, $arrivalDate) {

                // Isolate tracking-type specific attributes
                $reorderLevel = ($trackingType === 'consumable') 
                    ? ($envelope['reorder_level'] ?? 5) 
                    : 1;

                $estimatedUsefulLife = ($trackingType === 'asset') 
                    ? ($envelope['estimated_useful_life'] ?? null) 
                    : null;

                // --- Step 1: resolve or create the catalog item ---
                if ($envelope['item_mode'] === 'new') {
                    $category = Category::findOrFail($envelope['category_id']);
                    $item = Item::create([
                        'category_id' => $envelope['category_id'],
                        'item_code' => $this->generateItemCode($category),
                        'name' => $envelope['name'],
                        'brand' => $envelope['brand'] ?? null,
                        'specifications' => $envelope['specifications'] ?? null,
                        'type' => $envelope['type'] ?? null,
                        'unit_of_measure' => $envelope['unit_of_measure'],
                        'reorder_level' => $reorderLevel,
                        'tracking_type' => $envelope['tracking_type'],
                        'estimated_useful_life' => $estimatedUsefulLife,
                    ]);
                }

                // --- Step 2: receive stock against that item ---
                if ($trackingType === 'consumable') {
                    $lastBatch = StockBatch::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->whereDay('created_at', $day)
                        ->orderBy('id', 'desc')->lockForUpdate()->first();

                    $nextSeq = 1;
                    if ($lastBatch && $lastBatch->iar_number) {
                        $parts = explode('-', $lastBatch->iar_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }
                    $iarNumber = sprintf("IAR-%s-%s-%s-%03d", $year, $month, $day, $nextSeq);

                    $batch = StockBatch::create([
                        'item_id' => $item->id,
                        'iar_number' => $iarNumber,
                        'received_date' => $arrivalDate,
                        'quantity_on_hand' => $envelope['quantity'],
                        'unit_cost' => $envelope['unit_cost'],
                    ]);

                    return response()->json([
                        'message' => "Item and stock recorded successfully ({$iarNumber}).",
                        'item' => $item,
                        'batch' => $batch,
                    ], 201);
                }

                // Asset branch
                $nextSeq = 1;
                if ($assetFields['has_property_number'] ?? false) {
                    $lastProperty = SerializedAsset::whereNotNull('property_number')
                        ->whereYear('created_at', $year)
                        ->orderBy('id', 'desc')->lockForUpdate()->first();
                    if ($lastProperty && $lastProperty->property_number) {
                        $parts = explode('-', $lastProperty->property_number);
                        $nextSeq = intval(end($parts)) + 1;
                    }
                }

                $createdAssets = [];
                if (!empty($assetFields['serial_numbers'])) {
                    foreach ($assetFields['serial_numbers'] as $serial) {
                        $propertyNumber = null;
                        if ($assetFields['has_property_number'] ?? false) {
                            $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $nextSeq);
                            $nextSeq++;
                        }

                        $createdAssets[] = SerializedAsset::create([
                            'item_id' => $item->id,
                            'serial_number' => $serial,
                            'property_number' => $propertyNumber,
                            'model' => $assetFields['model'] ?? null,
                            'manufacturer_name' => $assetFields['manufacturer_name'] ?? null,
                            'country_of_origin' => $assetFields['country_of_origin'] ?? null,
                            'unit_cost' => $envelope['unit_cost'],
                            'status' => 'Available',
                            'quantity_on_hand' => 1,
                        ]);
                    }
                }

                if ($envelope['item_mode'] === 'existing' && !empty($estimatedUsefulLife)) {
                    $item->update(['estimated_useful_life' => $estimatedUsefulLife]);
                }

                return response()->json([
                    'message' => count($createdAssets) . ' asset unit(s) recorded under item "' . $item->name . '".',
                    'item' => $item,
                    'assets' => $createdAssets,
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Quick receive failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Mirrors ItemController::store()'s item_code generation logic.
     */
    private function generateItemCode(Category $category): string
    {
        $year = date('Y');
        $month = date('m');
        $day = date('d');

        $cleanedName = preg_replace('/[^a-zA-Z]/', '', $category->name);
        $catPrefix = strtoupper(substr($cleanedName, 0, 3));
        if (strlen($catPrefix) < 3) {
            $catPrefix = str_pad($catPrefix, 3, 'X', STR_PAD_RIGHT);
        }

        $fullPrefix = sprintf("DOH NIR-%s-%s-%s-%s-", $catPrefix, $year, $month, $day);

        $lastItem = Item::where('item_code', 'LIKE', $fullPrefix . '%')
            ->orderBy('id', 'desc')
            ->lockForUpdate()
            ->first();

        $nextSeq = 1;
        if ($lastItem && $lastItem->item_code) {
            $parts = explode('-', $lastItem->item_code);
            $nextSeq = intval(end($parts)) + 1;
        }

        return sprintf('%s%03d', $fullPrefix, $nextSeq);
    }

    public function storeBundle(Request $request)
    {
        $validated = $request->validate([
            'sets' => 'required|integer|min:1',
            'arrival_date' => 'nullable|date',
            'main' => 'required|array',
            'main.item_mode' => 'required|in:new,existing',
            'main.item_id' => 'required_if:main.item_mode,existing|nullable|exists:items,id',
            'main.category_id' => 'required_if:main.item_mode,new|nullable|exists:categories,id',
            'main.name' => 'required_if:main.item_mode,new|nullable|string|max:255',
            'main.brand' => 'nullable|string|max:255',
            'main.specifications' => 'nullable|string|max:255',
            'main.type' => 'nullable|string|max:255',
            'main.unit_of_measure' => 'required_if:main.item_mode,new|nullable|string|max:50',
            'main.estimated_useful_life' => 'nullable|string|max:255',
            'main.unit_cost' => 'required|numeric|min:0',
            'main.has_property_number' => 'required|boolean',
            'main.model' => 'nullable|string|max:255',
            'main.manufacturer_name' => 'nullable|string|max:255',
            'main.country_of_origin' => 'nullable|string|max:255',

            'peripherals' => 'nullable|array',
            'peripherals.*.item_mode' => 'required|in:new,existing',
            'peripherals.*.item_id' => 'required_if:peripherals.*.item_mode,existing|nullable|exists:items,id',
            'peripherals.*.category_id' => 'required_if:peripherals.*.item_mode,new|nullable|exists:categories,id',
            'peripherals.*.name' => 'required_if:peripherals.*.item_mode,new|nullable|string|max:255',
            'peripherals.*.brand' => 'nullable|string|max:255',
            'peripherals.*.specifications' => 'nullable|string|max:255',
            'peripherals.*.type' => 'nullable|string|max:255',
            'peripherals.*.unit_of_measure' => 'required_if:peripherals.*.item_mode,new|nullable|string|max:50',
            'peripherals.*.estimated_useful_life' => 'nullable|string|max:255',
            'peripherals.*.unit_cost' => 'required|numeric|min:0',
            'peripherals.*.has_property_number' => 'required|boolean',
            'peripherals.*.model' => 'nullable|string|max:255',
            'peripherals.*.manufacturer_name' => 'nullable|string|max:255',
            'peripherals.*.country_of_origin' => 'nullable|string|max:255',
        ]);

        // Every asset gets a serial number — validated separately since its
        // 'size' rule depends on sets, which is also in the payload.
        $sets = $validated['sets'];
        $serialRules = $request->validate([
            'main.serial_numbers' => 'required|array|size:' . $sets,
            'main.serial_numbers.*' => 'required|string|max:255|distinct|unique:serialized_assets,serial_number',
            'peripherals.*.serial_numbers' => 'nullable|array|size:' . $sets,
            'peripherals.*.serial_numbers.*' => 'nullable|string|max:255|distinct|unique:serialized_assets,serial_number',
        ]);

        if (!empty($validated['peripherals']) && !$validated['main']['has_property_number']) {
            return response()->json([
                'error' => 'A bundle requires the main item to have a property number, so peripherals have something to attach to.'
            ], 422);
        }

        $arrivalDate = $validated['arrival_date'] ?? date('Y-m-d');
        $year = date('Y', strtotime($arrivalDate));

        try {
            return DB::transaction(function () use ($validated, $serialRules, $sets, $year) {
                $mainInput = $validated['main'];
                $mainItem = $this->resolveItem($mainInput);

                $mainSeq = $this->nextPropertySequence($mainInput['has_property_number'], $year);
                $createdMain = [];

                for ($i = 0; $i < $sets; $i++) {
                    $propertyNumber = null;
                    if ($mainInput['has_property_number']) {
                        $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $mainSeq);
                        $mainSeq++;
                    }

                    $createdMain[] = SerializedAsset::create([
                        'item_id' => $mainItem->id,
                        'serial_number' => $serialRules['main']['serial_numbers'][$i],
                        'property_number' => $propertyNumber,
                        'model' => $mainInput['model'] ?? null,
                        'manufacturer_name' => $mainInput['manufacturer_name'] ?? null,
                        'country_of_origin' => $mainInput['country_of_origin'] ?? null,
                        'unit_cost' => $mainInput['unit_cost'],
                        'status' => 'Available',
                        'quantity_on_hand' => 1,
                    ]);
                }
                if (!empty($mainInput['estimated_useful_life'])) {
                    $mainItem->update(['estimated_useful_life' => $mainInput['estimated_useful_life']]);
                }

                $createdPeripherals = [];
                foreach ($validated['peripherals'] ?? [] as $pIndex => $peripheralInput) {
                    $peripheralItem = $this->resolveItem($peripheralInput);
                    $peripheralSerials = $serialRules['peripherals'][$pIndex]['serial_numbers'] ?? [];

                    $pSeq = $this->nextPropertySequence($peripheralInput['has_property_number'], $year);

                    for ($i = 0; $i < $sets; $i++) {
                        $propertyNumber = null;
                        if ($peripheralInput['has_property_number']) {
                            $propertyNumber = sprintf("DOH NIR-%s-%04d", $year, $pSeq);
                            $pSeq++;
                        }

                        $createdPeripherals[] = SerializedAsset::create([
                            'item_id' => $peripheralItem->id,
                            'serial_number' => $peripheralSerials[$i] ?? null,
                            'property_number' => $propertyNumber,
                            'model' => $peripheralInput['model'] ?? null,
                            'manufacturer_name' => $peripheralInput['manufacturer_name'] ?? null,
                            'country_of_origin' => $peripheralInput['country_of_origin'] ?? null,
                            'unit_cost' => $peripheralInput['unit_cost'],
                            'status' => 'Available',
                            'quantity_on_hand' => 1,
                            'attached_to' => $createdMain[$i]->property_number,
                        ]);
                    }
                    if (!empty($peripheralInput['estimated_useful_life'])) {
                        $peripheralItem->update(['estimated_useful_life' => $peripheralInput['estimated_useful_life']]);
                    }
                }

                return response()->json([
                    'message' => "{$sets} bundle(s) successfully received.",
                    'main' => $createdMain,
                    'peripherals' => $createdPeripherals,
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Quick receive bundle failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to process bundle: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Shared by store() and storeBundle() — resolves an existing item or
     * creates a new one, same item_code generation as generateItemCode().
     */
    private function resolveItem(array $componentInput): Item
    {
        if ($componentInput['item_mode'] === 'existing') {
            return Item::findOrFail($componentInput['item_id']);
        }

        $category = Category::findOrFail($componentInput['category_id']);

        return Item::create([
            'category_id' => $componentInput['category_id'],
            'item_code' => $this->generateItemCode($category),
            'name' => $componentInput['name'],
            'brand' => $componentInput['brand'] ?? null,
            'specifications' => $componentInput['specifications'] ?? null,
            'type' => $componentInput['type'] ?? null,
            'unit_of_measure' => $componentInput['unit_of_measure'],
            'reorder_level' => 5,
            'tracking_type' => 'asset',
            'estimated_useful_life' => $componentInput['estimated_useful_life'] ?? null,
        ]);
    }

    private function nextPropertySequence(bool $hasPropertyNumber, string $year): int
    {
        if (!$hasPropertyNumber) return 1;

        $lastProperty = SerializedAsset::whereNotNull('property_number')
            ->whereYear('created_at', $year)
            ->orderBy('id', 'desc')->lockForUpdate()->first();

        if ($lastProperty && $lastProperty->property_number) {
            $parts = explode('-', $lastProperty->property_number);
            return intval(end($parts)) + 1;
        }
        return 1;
    }
}