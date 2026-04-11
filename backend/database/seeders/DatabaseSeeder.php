<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::create([
            'name'     => 'Администратор',
            'username' => 'admin',
            'email'    => 'admin@example.com',
            'password' => bcrypt('admin123'),
            'role'     => 'admin',
            'balance'  => 0,
        ]);

        User::create([
            'name'     => 'Иван Исполнитель',
            'username' => 'ivan',
            'email'    => 'ivan@example.com',
            'password' => bcrypt('ivan123'),
            'role'     => 'user',
            'balance'  => 150,
        ]);

        User::create([
            'name'     => 'Мария Работник',
            'username' => 'maria',
            'email'    => 'maria@example.com',
            'password' => bcrypt('maria123'),
            'role'     => 'user',
            'balance'  => 80,
        ]);
    }
}
