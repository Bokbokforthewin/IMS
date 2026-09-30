<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define target guard for API / Sanctum routes
        $guard = 'sanctum';

        $permissions = [
            'manage categories',
            'manage items',
            'receive stock',
            'edit stock records',
            'delete stock records',
            'issue consumables',
            'issue assets',
            'edit asset status',
            'transfer assets',
            'return assets',
            'view reports',
            'view dashboard',
            'manage users',
            'manage roles',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => $guard,
            ]);
        }

        // Create Admin Role & assign all permissions
        $admin = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => $guard,
        ]);
        $admin->syncPermissions(Permission::where('guard_name', $guard)->get());

        // Create Supply Officer Role
        $supplyOfficer = Role::firstOrCreate([
            'name' => 'supply_officer',
            'guard_name' => $guard,
        ]);
        $supplyOfficer->syncPermissions([
            'manage categories', 'manage items', 'receive stock', 'edit stock records',
            'delete stock records', 'issue consumables', 'issue assets', 'edit asset status',
            'transfer assets', 'return assets', 'view reports', 'view dashboard',
        ]);

        // Create Employee Role
        $employee = Role::firstOrCreate([
            'name' => 'employee',
            'guard_name' => $guard,
        ]);
        $employee->syncPermissions(['view dashboard']);

        // Create Default Admin User
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@doh.gov.ph'],
            [
                'name' => 'System Administrator',
                'unit' => 'Admin',
                'division' => 'Admin',
                'designation' => 'System Administrator',
                'password' => bcrypt('ChangeMe123!'),
            ]
        );

        $adminUser->assignRole($admin);
    }
}