<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['project', 'folder']);
            $table->unsignedBigInteger('entity_id');   // project_id или folder_id
            $table->foreignId('inviter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invitee_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['owner', 'editor', 'member'])->default('member');
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            // Один pending-инвайт на пару (тип + сущность + приглашённый)
            $table->unique(['type', 'entity_id', 'invitee_id', 'status'], 'unique_pending_invite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
