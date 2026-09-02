<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        $validatedData = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'specifications' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'reorder_level' => 'required|integer|min:0',
            'is_serialized' => 'required|boolean',
        ]);

        try {
            return DB::transaction(function () use ($validatedData) {
                $category = Category::findOrFail($validatedData['category_id']);
                $year = date('Y');
                $month = date('m');

                // Generate a clean 3-letter prefix from category name (e.g., Office Supplies -> OFF)
                $cleanedName = preg_replace('/[^a-zA-Z]/', '', $category->name);
                $catPrefix = strtoupper(substr($cleanedName, 0, 3));

                if (strlen($catPrefix) < 3) {
                    $catPrefix = str_pad($catPrefix, 3, 'X', STR_PAD_RIGHT);
                }

                // Base prefix pattern for this category and month (e.g., OFF-2026-08-)
                $prefixPattern = sprintf("%s-%s-%s-", $catPrefix, $year, $month);

                // Find the latest item matching this specific prefix pattern with a row lock
                $lastItem = Item::where('item_code', 'LIKE', $prefixPattern . '%')
                    ->orderBy('id', 'desc')
                    ->lockForUpdate()
                    ->first();

                // Compute next sequence safely
                $nextSeq = 1;
                if ($lastItem && $lastItem->item_code) {
                    $parts = explode('-', $lastItem->item_code);
                    $lastSeqNum = intval(end($parts));
                    $nextSeq = $lastSeqNum + 1;
                }

                $itemCode = sprintf("%s%03d", $prefixPattern, $nextSeq);

                // Create the item record including brand, specifications, and type
                $item = Item::create([
                    'category_id' => $validatedData['category_id'],
                    'item_code' => $itemCode,
                    'name' => $validatedData['name'],
                    'brand' => $validatedData['brand'] ?? 'N/A',
                    'specifications' => $validatedData['specifications'] ?? null,
                    'type' => $validatedData['type'] ?? null,
                    'unit_of_measure' => $validatedData['unit_of_measure'],
                    'reorder_level' => $validatedData['reorder_level'],
                    'is_serialized' => $validatedData['is_serialized'],
                ]);

                return response()->json([
                    'message' => 'Catalog item successfully created',
                    'item' => $item
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
            'reorder_level' => 'required|integer|min:0',
            'is_serialized' => 'required|boolean',
        ]);

        try {
            $item->update([
                'category_id' => $validatedData['category_id'],
                'name' => $validatedData['name'],
                'brand' => $validatedData['brand'] ?? 'N/A',
                'specifications' => $validatedData['specifications'] ?? null,
                'type' => $validatedData['type'] ?? null,
                'unit_of_measure' => $validatedData['unit_of_measure'],
                'reorder_level' => $validatedData['reorder_level'],
                'is_serialized' => $validatedData['is_serialized'],
            ]);

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
            $item->delete();

            return response()->json([
                'message' => 'Catalog item successfully deleted!',
            ], 200);

        } catch (\Exception $e) {
            Log::error('Failed to delete catalog item: ' . $e->getMessage());
            return response()->json([
                'error' => 'An error occurred while deleting the item.'
            ], 500);
        }
    }
}
