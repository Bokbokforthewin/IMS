<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Permissions tailored to your IMS
        Permission::create(['guard_name' => 'sanctum', 'name' => 'manage items']);
        Permission::create(['guard_name' => 'sanctum', 'name' => 'receive stock']);
        Permission::create(['guard_name' => 'sanctum', 'name' => 'issue consumables']);
        Permission::create(['guard_name' => 'sanctum', 'name' => 'view reports']);

        // 2. Create Roles and assign permissions
        $admin = Role::create(['guard_name' => 'sanctum', 'name' => 'Admin']);
        $admin->givePermissionTo(Permission::all());

        $supplyOfficer = Role::create(['guard_name' => 'sanctum', 'name' => 'Supply Officer']);
        $supplyOfficer->givePermissionTo([
            'manage items', 
            'receive stock', 
            'issue consumables'
        ]);

        $staff = Role::create(['guard_name' => 'sanctum', 'name' => 'Staff']);
        $staff->givePermissionTo([
            'issue consumables'
        ]);
    }
}
