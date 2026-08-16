<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Creates the admin account once; change the password after first login.
        User::firstOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@thewinehouse.gr')],
            [
                'name' => 'Admin',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'change-me-immediately')),
            ],
        );

        // Seed default site settings if none exist
        if (Setting::count() === 0) {
            foreach (Setting::defaults() as $key => $value) {
                Setting::set($key, $value);
            }
        }
    }
}
