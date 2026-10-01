<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Validation\Rule;

class PermissionMatrixController extends Controller
{
    protected string $guard = 'sanctum';

    /**
     * Get the complete role/permission matrix.
     */
    public function index()
    {
        $roles = Role::query()
            ->where('guard_name', $this->guard)
            ->with(['permissions:id,name,guard_name'])
            ->orderBy('name')
            ->get();

        $permissions = Permission::query()
            ->where('guard_name', $this->guard)
            ->orderBy('name')
            ->pluck('name');

        $matrix = $roles->mapWithKeys(
            fn ($role) => [
                $role->name => $role->permissions->pluck('name')->values(),
            ]
        );

        return response()->json([
            'roles' => $roles->pluck('name')->values(),
            'permissions' => $permissions->values(),
            'matrix' => $matrix,
        ]);
    }

    /**
     * Replace all permissions belonging to a role.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'exists:roles,name'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::query()
            ->where('name', $validated['role'])
            ->where('guard_name', $this->guard)
            ->firstOrFail();

        $permissions = $validated['permissions'] ?? [];

        // Safety check to prevent lockout
        if ($role->name === 'super_admin' && !in_array('manage roles', $permissions, true)) {
            return response()->json([
                'error' => "Cannot remove 'manage roles' from the admin role.",
            ], 422);
        }

        $role->syncPermissions($permissions);

        // Reset Spatie Cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => "Role '{$role->name}' updated.",
            'role' => $role->name,
            'permissions' => $role->fresh()->permissions->pluck('name')->values(),
        ]);
    }

    /**
     * Store a new role dynamically.
     */
    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required', 'string',
                Rule::unique('roles')->where('guard_name', $this->guard),
            ],
        ]);

        $role = Role::create([
            'name' => strtolower(trim($validated['name'])),
            'guard_name' => $this->guard,
        ]);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Role created successfully.', 'data' => $role], 201);
    }

    /**
     * Store a new permission dynamically (e.g., 'print reports').
     */
    public function storePermission(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required', 'string',
                Rule::unique('permissions')->where('guard_name', $this->guard),
            ],
        ]);

        $permission = Permission::create([
            'name' => strtolower(trim($validated['name'])),
            'guard_name' => $this->guard,
        ]);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Permission created successfully.', 'data' => $permission], 201);
    }
}