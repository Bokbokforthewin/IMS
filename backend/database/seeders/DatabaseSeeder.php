<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'unit' => 'Information and Communications Technology Unit',
            'division' => 'Management Support Division',
            'designation' => 'Computer Programmer I'
        ]);

        $testUser = User::where('email', 'test@example.com')->first();
        $testUser->assignRole('end_user');
    }
}
