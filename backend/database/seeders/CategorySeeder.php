<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // ==========================================
            // ICT EQUIPMENT & HARDWARE
            // Sub-Major: 05 (Machinery & Equipment)
            // GL: 03 (ICT Equipment)
            // ==========================================
            [
                'name'                     => 'ICT Equipment - Computing Hardware',
                'sub_major_account_code'   => '05',
                'gl_account_code'          => '03', 
                'semi_expendable_gl_code'  => '03',
                'description'              => 'Official category for Laptops, Desktops, Workstations, and System Units.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
            [
                'name'                     => 'ICT Equipment - Network & Infrastructure',
                'sub_major_account_code'   => '05',
                'gl_account_code'          => '03',
                'semi_expendable_gl_code'  => '03',
                'description'              => 'Official category for Switches, Routers, Access Points, and Server Racks.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
            [
                'name'                     => 'ICT Peripherals & Printers',
                'sub_major_account_code'   => '05',
                'gl_account_code'          => '03',
                'semi_expendable_gl_code'  => '03',
                'description'              => 'Official category for Monitors, Keyboards, Mice, UPS, and Printers.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],

            // ==========================================
            // COMMUNICATION EQUIPMENT
            // Sub-Major: 05 (Machinery & Equipment)
            // GL: 07 (Communication Equipment)
            // ==========================================
            [
                'name'                     => 'Communication Equipment',
                'sub_major_account_code'   => '05',
                'gl_account_code'          => '07',
                'semi_expendable_gl_code'  => '07',
                'description'              => 'Official category for IP Phones, Smartphones, PABX Systems, and Two-Way Radios.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],

            // ==========================================
            // COMPUTER SOFTWARE
            // Sub-Major: 09 (Intangible Assets)
            // GL: 02 (Computer Software)
            // ==========================================
            // [
            //     'name'                     => 'Computer Software & Licenses',
            //     'sub_major_account_code'   => '09',
            //     'gl_account_code'          => '02',
            //     'semi_expendable_gl_code'  => null, // Under 50k software is expensed directly, no ICS
            //     'description'              => 'Enterprise systems, perpetual database licenses, and ERP software over ₱50,000.',
            //     'created_at'               => now(),
            //     'updated_at'               => now(),
            // ],

            // ==========================================
            // FURNITURE & FIXTURES
            // Sub-Major: 07 (Furniture, Fixtures & Books Group)
            // GL: 01 (Furniture & Fixtures)
            // ==========================================
            [
                'name'                     => 'Furniture and Fixtures',
                'sub_major_account_code'   => '07',
                'gl_account_code'          => '01',
                'semi_expendable_gl_code'  => '01',
                'description'              => 'Official category for Ergonomic Chairs, Office Desks, and Filing Cabinets.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],

            // ==========================================
            // CONSUMABLE SUPPLIES (RIS)
            // Major/Sub-Group: 04 (Office Supplies Inventory)
            // GL: 01 (Office Supplies)
            // ==========================================
            [
                'name'                     => 'ICT Consumables & Supplies',
                'sub_major_account_code'   => '04', // Corrected UACS mapping for Office Supplies Inventory
                'gl_account_code'          => '01', // 10404010 (Office Supplies)
                'semi_expendable_gl_code'  => null, 
                'description'              => 'Official category for RJ45 connectors, patch cables, printer ink, and paper.',
                'created_at'               => now(),
                'updated_at'               => now(),
            ],
        ];

        DB::table('categories')->upsert(
            $categories,
            ['name'],
            ['sub_major_account_code', 'gl_account_code', 'semi_expendable_gl_code', 'description', 'updated_at']
        );
    }
}
