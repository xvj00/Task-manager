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
        // Создатель (администратор)
        User::create([
            'name'     => 'Создатель',
            'email'    => 'creator@artem.ru',
            'password' => bcrypt('creator123'),
            'role'     => 'creator',
            'balance'  => 0,
        ]);

        // Исполнители
        User::create([
            'name'     => 'Иван Исполнитель',
            'email'    => 'ivan@artem.ru',
            'password' => bcrypt('ivan123'),
            'role'     => 'executor',
            'balance'  => 150,
        ]);

        User::create([
            'name'     => 'Мария Работник',
            'email'    => 'maria@artem.ru',
            'password' => bcrypt('maria123'),
            'role'     => 'executor',
            'balance'  => 80,
        ]);
    }
}
