<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Spatie\Permission\PermissionRegistrar;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define target guard for API / Sanctum routes
        $guard = 'sanctum';

        // Page-level permissions
        $permissions = [
            'view dashboard',
            'view catalog',
            'view receiving',
            'view assets',
            'view consumables',
            'view reports',
            'manage users',
            'manage roles',
            'view audit trail',
            'view quick receive',
        ];

        // $permissions = [
        //     //page-level permissions
        //     'view:dashboard_page',
        //     'view:catalog_page',
        //     'view:receiving_page',
        //     'view:assets_page',
        //     'view:consumables_page',
        //     'view:reports_page',
        //     'view:audit_trail_page',
        //     'view:quick_receive_page',
            
        //     //specific/component permissions
        //     'component:quick_receive_form_widget',
        //     'component:catalog_category_widget',
        //     'component:catalog_item_widget',
        //     'component:receive_single_item_widget',
        //     'component:receive_bulk_item_widget',
        //     'component:receive_history_widget',
        //     'component:issue_consumable_item_widget',
        //     'component:issue_history_widget',
        //     'component:assign_asset_form_widget',
        //     'component:assigned_list_widget',
        //     'component:transfer_return_form_widget',
        //     'component:movement_logs_widget',

        //     //admin actions
        //     'action:manage users',
        //     'action:manage roles',
        //     'action:create_custom_permission',
        //     'action:create_custom_role',

        // ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => $guard,
            ]);
        }

        // 1. Super Admin: Access to EVERYTHING
        $superAdmin = Role::firstOrCreate([
            'name' => 'super_admin',
            'guard_name' => $guard,
        ]);
        $superAdmin->syncPermissions(Permission::where('guard_name', $guard)->get());

        // 2. Supply Officer: Dashboard, Catalog, Receiving, Assets, Consumables
        $supplyOfficer = Role::firstOrCreate([
            'name' => 'supply_officer',
            'guard_name' => $guard,
        ]);
        $supplyOfficer->syncPermissions([
            'view dashboard',
            'view catalog',
            'view receiving',
            'view assets',
            'view consumables',
            'view audit trail',
            'view quick receive',
        ]);

        // 3. Unit Head: Dashboard, Consumables, Assets
        $unitHead = Role::firstOrCreate([
            'name' => 'unit_head',
            'guard_name' => $guard,
        ]);
        $unitHead->syncPermissions([
            'view dashboard',
            'view consumables',
            'view assets',
            'view audit trail',
        ]);

        // 4. Division Chief: Dashboard, Consumables, Assets
        $divisionChief = Role::firstOrCreate([
            'name' => 'division_chief',
            'guard_name' => $guard,
        ]);
        $divisionChief->syncPermissions([
            'view dashboard',
            'view consumables',
            'view assets',
            'view audit trail',
        ]);

        // 5. Property Custodian: Dashboard, Consumables, Assets
        $propertyCustodian = Role::firstOrCreate([
            'name' => 'property_custodian',
            'guard_name' => $guard,
        ]);
        $propertyCustodian->syncPermissions([
            'view dashboard',
            'view consumables',
            'view assets',
        ]);

        // 6. End-User: Dashboard only
        $endUser = Role::firstOrCreate([
            'name' => 'end_user',
            'guard_name' => $guard,
        ]);
        $endUser->syncPermissions([
            'view dashboard',
        ]);

        // Default Super Admin User
        $adminUser = User::firstOrCreate(
            ['email' => 'ldbernardinonirchd@gmail.com'],
            [
                'name' => 'Lowell Rich D. Bernardino',
                'unit' => 'ICTU',
                'division' => 'MSD',
                'designation' => 'Computer Programmer 1',
                'password' => Hash::make('richlylaw ay123'),
            ]
        );

        $adminUser->assignRole($superAdmin);
    }
}