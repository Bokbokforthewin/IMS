<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::all(), 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:categories,name',
            'description' => 'nullable|string',
        ]);

        $category = Category::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'message' => 'Category created successfully!',
            'category' => $category,
        ], 201);
    }

    public function update(Request $request, Category $category)
    {
        $request->validate([
            'name' => [
                'required',
                'string',
                Rule::unique('categories', 'name')->ignore($category->id),
            ],
            'description' => 'nullable|string',
        ]);

        $category->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'message' => 'Category updated successfully!',
            'category' => $category,
        ], 200);
    }
    
    public function destroy(Category $category)
    {
        // Optional safety check: Prevent deletion if category still has items
        if ($category->items()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete category because it has active catalog items assigned to it.'
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully!',
        ], 200);
    }
}