<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ItemController extends Controller
{
    public function index()
    {
        try {
            $items = Item::with('category')->orderBy('created_at', 'desc')->get();
            return response()->json($items, 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch items: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to retrieve inventory items.'], 500);
        }
    }

    public function store(Request $request)
    {
        Log::info('Store Request Inputs:', $request->all());

        // Default reorder_level to 0/5 if not provided for assets
        if (!$request->has('reorder_level') || $request->input('reorder_level') === '') {
            $request->merge(['reorder_level' => 5]);
        }

        $validatedData = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'specifications' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'tracking_type' => 'required|in:asset,consumable',
            'estimated_useful_life' => 'nullable|string|max:255',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        try {
            return DB::transaction(function () use ($request, $validatedData) {
                $category = Category::findOrFail($validatedData['category_id']);
                $year = date('Y');

                $cleanedName = preg_replace('/[^a-zA-Z]/', '', $category->name);
                $catPrefix = strtoupper(substr($cleanedName, 0, 3));
                if (strlen($catPrefix) < 3) {
                    $catPrefix = str_pad($catPrefix, 3, 'X', STR_PAD_RIGHT);
                }

                // Format: NIR CHD-{Category}-{Year}-
                $prefixPattern = sprintf("NIR CHD-%s-%s-", $catPrefix, $year);

                $lastItem = Item::where('item_code', 'LIKE', $prefixPattern . '%')
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextSeq = 1;
                if ($lastItem && $lastItem->item_code) {
                    $parts = explode('-', $lastItem->item_code);
                    $nextSeq = intval(end($parts)) + 1;
                }

                // 5-digit zero-padded sequence (e.g., 00001)
                $itemCode = sprintf('%s%05d', $prefixPattern, $nextSeq);

                $imagePath = null;
                if ($request->hasFile('image')) {
                    $imagePath = $request->file('image')->store('items', 'public');
                }

                $item = Item::create([
                    'category_id' => $validatedData['category_id'],
                    'item_code' => $itemCode,
                    'name' => $validatedData['name'],
                    'brand' => $validatedData['brand'] ?? null,
                    'specifications' => $validatedData['specifications'] ?? null,
                    'type' => $validatedData['type'] ?? null,
                    'unit_of_measure' => $validatedData['unit_of_measure'],
                    'reorder_level' => $validatedData['reorder_level'] ?? 5,
                    'tracking_type' => $validatedData['tracking_type'],
                    'estimated_useful_life' => $validatedData['estimated_useful_life'] ?? null,
                    'image_path' => $imagePath,
                ]);

                return response()->json([
                    'message' => 'Catalog item successfully created',
                    'item' => $item->load('category')
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error('Failed to create catalog item: ' . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while generating the item code. Please try again.'
            ], 500);
        }
    }

    public function update(Request $request, Item $item)
    {
        $validatedData = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'specifications' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'tracking_type' => 'required|in:asset,consumable',
            'estimated_useful_life' => 'nullable|string|max:255',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        try {
            if ($request->hasFile('image')) {
                if ($item->image_path && Storage::disk('public')->exists($item->image_path)) {
                    Storage::disk('public')->delete($item->image_path);
                }

                $validatedData['image_path'] = $request->file('image')->store('items', 'public');
            }

            $item->update($validatedData);

            return response()->json([
                'message' => 'Catalog item successfully updated!',
                'item' => $item->load('category')
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to update catalog item: ' . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while updating the item.'
            ], 500);
        }
    }

    public function destroy(Item $item)
    {
        try {
            if ($item->image_path && Storage::disk('public')->exists($item->image_path)) {
                Storage::disk('public')->delete($item->image_path);
            }

            $item->delete();
            return response()->json(['message' => 'Catalog item successfully deleted!'], 200);
        } catch (\Exception $e) {
            Log::error('Failed to delete catalog item: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting the item.'], 500);
        }
    }
}