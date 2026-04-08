<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_blocked')->default(false)->after('balance');
            $table->text('block_reason')->nullable()->after('is_blocked');
            $table->text('appeal_text')->nullable()->after('block_reason');
            $table->timestamp('appeal_at')->nullable()->after('appeal_text');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_blocked', 'block_reason', 'appeal_text', 'appeal_at']);
        });
    }
};
