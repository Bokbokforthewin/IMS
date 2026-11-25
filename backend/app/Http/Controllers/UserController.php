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
    protected string $guard = 'sanctum';

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
                $user->all_permissions = $user->getAllPermissions()->pluck('name');
                return $user;
            });

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

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
                ->where('guard_name', $this->guard)
                ->orderBy('name')
                ->get(['id', 'name']),
            'permissions' => Permission::query()
                ->where('guard_name', $this->guard)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function getRoles()
    {
        $roles = Role::query()
            ->where('guard_name', $this->guard)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'status' => 'success',
            'data' => $roles,
        ]);
    }

    public function options(): \Illuminate\Http\JsonResponse
    {
        try {
            $users = User::select([
                    'id',
                    'name',
                    'email',
                    'unit',
                    'division',
                    'designation',
                ])
                ->orderBy('name', 'asc')
                ->get();

            return response()->json($users, 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to fetch user options: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load user options.'], 500);
        }
    }

    protected function isLastSuperAdmin(User $targetUser): bool
    {
        if (!$targetUser->hasRole('super_admin')) {
            return false;
        }

        $superAdminCount = User::role('super_admin', $this->guard)->count();
        return $superAdminCount <= 1;
    }

    public function updateRoles(Request $request, User $user)
    {
        $validated = $request->validate([
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $actor = $request->user();
        $newRoles = array_values(array_unique($validated['roles'] ?? []));

        if ($actor && !$actor->hasRole('super_admin')) {
            $actorRoleNames = $actor->getRoleNames()->toArray();
            $disallowedRoles = array_diff($newRoles, $actorRoleNames);
            if (!empty($disallowedRoles)) {
                return response()->json([
                    'error' => 'You cannot assign roles that you do not hold yourself.',
                ], 403);
            }
        }

        if ($actor && (int) $actor->id === (int) $user->id) {
            $currentRoles = $user->getRoleNames()->toArray();
            if (sort($currentRoles) !== sort($newRoles) || $currentRoles !== $newRoles) {
                return response()->json([
                    'error' => 'You cannot modify or demote your own roles.',
                ], 403);
            }
        }

        if ($user->hasRole('super_admin') && !in_array('super_admin', $newRoles, true) && $this->isLastSuperAdmin($user)) {
            return response()->json([
                'error' => 'Cannot remove the super_admin role from the last super_admin user.',
            ], 422);
        }

        $user->syncRoles($newRoles);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'User roles updated successfully.',
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function updatePermissions(Request $request, User $user)
    {
        $validated = $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $actor = $request->user();
        $newPermissions = array_values(array_unique($validated['permissions'] ?? []));

        if ($actor && !$actor->hasRole('super_admin')) {
            $actorPermissions = $actor->getAllPermissions()->pluck('name')->toArray();
            $disallowedPermissions = array_diff($newPermissions, $actorPermissions);
            if (!empty($disallowedPermissions)) {
                return response()->json([
                    'error' => 'You cannot grant permissions that you do not possess yourself.',
                ], 403);
            }
        }

        // Strip any permissions already granted by the user's assigned roles so only true direct overrides remain
        $roleGrantedPermissions = $user->getPermissionsViaRoles()->pluck('name')->toArray();
        $directOnlyPermissions = array_values(array_diff($newPermissions, $roleGrantedPermissions));

        $user->syncPermissions($directOnlyPermissions);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'User direct permissions updated successfully.',
            'all_permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

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
            'role' => 'nullable|string|exists:roles,name',
        ]);

        $actor = $request->user();
        $requestedRole = $validated['role'] ?? 'end_user';

        if ($actor && !$actor->hasRole('super_admin')) {
            $actorRoles = $actor->getRoleNames()->toArray();
            if (!in_array($requestedRole, $actorRoles, true)) {
                return response()->json([
                    'error' => 'You cannot assign a role that you do not hold yourself.',
                ], 403);
            }
        }

        $userData = collect($validated)->except('role')->toArray();
        $userData['password'] = bcrypt($userData['password']);
        $userData['unit'] = $userData['unit'] ?? '';
        $userData['division'] = $userData['division'] ?? '';
        $userData['designation'] = $userData['designation'] ?? '';

        $user = User::create($userData);

        $defaultRole = Role::where('name', $requestedRole)->where('guard_name', $this->guard)->first()
            ?? Role::where('name', 'end_user')->where('guard_name', $this->guard)->first();

        if ($defaultRole) {
            $user->assignRole($defaultRole);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user->load(['roles', 'permissions']),
        ], 201);
    }

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

    public function destroy(Request $request, User $user)
    {
        $actor = $request->user();

        if ($actor && (int) $actor->id === (int) $user->id) {
            return response()->json([
                'error' => 'You cannot delete your own account.',
            ], 403);
        }

        if ($this->isLastSuperAdmin($user)) {
            return response()->json([
                'error' => 'Cannot delete the last super_admin account.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}