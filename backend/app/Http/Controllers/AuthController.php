<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use App\Services\AuditLogger;

class AuthController extends Controller
{
    /**
     * Format user response payload with roles and inherited permissions.
     */
    private function formatUser(User $user): array
    {
        return array_merge($user->toArray(), [
            'roles' => $user->roles,
            'permissions' => $user->getAllPermissions()->map(fn($p) => ['name' => $p->name]),
        ]);
    }

    public function checkEmail(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email'
        ]);

        $exists = User::where('email', $validated['email'])->exists();

        return response()->json([
            'available' => !$exists,
            'message'   => $exists ? 'Email is already registered.' : 'Email is available.'
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'unit'        => 'required|string|max:255',
            'division'    => 'required|string|max:255',
            'designation' => 'required|string|max:255',
            'email'       => 'required|string|email|max:255|unique:users,email',
            'password'    => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name'        => $validated['name'],
            'unit'        => $validated['unit'],
            'division'    => $validated['division'],
            'designation' => $validated['designation'],
            'email'       => $validated['email'],
            'password'    => Hash::make($validated['password']),
        ]);

        $user->assignRole('end_user');

        AuditLogger::log('register', $user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'user'    => $this->formatUser($user),
            'token'   => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            // Log failed attempt before returning
            AuditLogger::log('failed_login');
            
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        // Log successful login before returning
        AuditLogger::log('login', $user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully.',
            'user'    => $this->formatUser($user),
            'token'   => $token,
        ], 200);
    }

    public function logout(Request $request)
    {
        AuditLogger::log('logout', $request->user()); // Log first
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.'], 200);
    }

    public function me(Request $request)
    {
        return response()->json($this->formatUser($request->user()), 200);
    }
}