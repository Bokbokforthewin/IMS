<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class PermissionMatrixController extends Controller
{
    /**
     * Get all roles (with their current Spatie permissions) and the master list.
     */
   public function index()
    {
        return response()->json([
            'roles' => Role::with('permissions:id,name')->get(['id', 'name']),
            'allPermissions' => Permission::all(['id', 'name']) // Removed 'description'
        ]);
    }

    /**
     * Bulk sync the updated permissions checkboxes from the React frontend matrix payload.
     */
    public function update(Request $request)
    {
        $request->validate([
            'matrix' => 'required|array',
            'matrix.*.role_id' => 'required|integer',
            'matrix.*.permission_ids' => 'present|array',
        ]);

        foreach ($request->input('matrix') as $row) {
            $role = Role::findById($row['role_id']); // Spatie built-in locator
            
            if ($role) {
                // ◄ SWAP: Use Spatie's built-in sync method
                // It automatically accepts an array of permission IDs, names, or models
                $role->syncPermissions($row['permission_ids']); 
            }
        }

        return response()->json(['message' => 'DOH security guardrails updated successfully via Spatie.']);
    }
}
