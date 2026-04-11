<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username')->nullable()->unique()->after('name');
            });
        }

        // Заполняем username из email для существующих записей
        \DB::table('users')->get()->each(function ($user) {
            $base     = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $user->email)[0]));
            $username = $base ?: 'user' . $user->id;
            $i = 0;
            $try = $username;
            while (\DB::table('users')->where('username', $try)->where('id', '!=', $user->id)->exists()) {
                $try = $username . (++$i);
            }
            \DB::table('users')->where('id', $user->id)->update(['username' => $try]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable(false)->change();
        });

        // MySQL/MariaDB: расширяем ENUM, чтобы принимал и старые и новые значения (SQLite хранит role как строку)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('creator','executor','admin','user') NOT NULL DEFAULT 'user'");
        }

        // Меняем значения роли: creator → admin, executor → user
        \DB::table('users')->where('role', 'creator')->update(['role' => 'admin']);
        \DB::table('users')->where('role', 'executor')->update(['role' => 'user']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
        \DB::table('users')->where('role', 'admin')->update(['role' => 'creator']);
        \DB::table('users')->where('role', 'user')->update(['role' => 'executor']);
    }
};
