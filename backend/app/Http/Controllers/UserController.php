<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class UserController extends Controller
{
    /**
     * Get all users with their assigned roles and direct permissions.
     */
    public function index()
    {
        $users = User::with([
                'roles:id,name',
                'permissions:id,name',
            ])
            ->select([
                'id',
                'name',
                'email',
                'unit',
                'division',
                'designation',
                'is_head',
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                // Include aggregated permissions (Role permissions + Direct user permissions)
                $user->all_permissions = $user->getAllPermissions()->pluck('name');
                return $user;
            });

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    /**
     * Get a single user together with all available roles and permissions.
     */
    public function show(User $user)
    {
        $user->load([
            'roles:id,name',
            'permissions:id,name',
        ]);

        return response()->json([
            'user' => $user,
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
            'roles' => Role::query()
                ->where('guard_name', 'sanctum')
                ->orderBy('name')
                ->get(['id', 'name']),
            'permissions' => Permission::query()
                ->where('guard_name', 'sanctum')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Update user roles.
     */
    public function updateRoles(Request $request, User $user)
    {
        $validated = $request->validate([
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user->syncRoles($validated['roles'] ?? []);

        // Reset Spatie Cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'User roles updated successfully.',
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * Update direct user permissions.
     */
    public function updatePermissions(Request $request, User $user)
    {
        $validated = $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $user->syncPermissions($validated['permissions'] ?? []);

        // Reset Spatie Cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'User direct permissions updated successfully.',
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * Create a new user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users,email',
            'password' => 'required|string|min:8',
            'unit' => 'nullable|string|max:255',
            'division' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'is_head' => 'sometimes|boolean',
        ]);

        $validated['password'] = bcrypt($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user->load(['roles', 'permissions']),
        ], 201);
    }

    /**
     * Update basic user information.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'unit' => 'nullable|string|max:255',
            'division' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'is_head' => 'sometimes|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        // Ensure non-nullable columns get empty strings instead of null
        $validated['unit'] = $validated['unit'] ?? '';
        $validated['division'] = $validated['division'] ?? '';
        $validated['designation'] = $validated['designation'] ?? '';

        if (!empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User information updated successfully.',
            'user' => $user->fresh(['roles', 'permissions']),
        ]);
    }
    /**
     * Delete a user.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}