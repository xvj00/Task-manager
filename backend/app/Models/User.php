<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = ['name', 'email', 'password', 'role', 'balance'];
    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed'];
    }

    public function isCreator(): bool { return $this->role === 'creator'; }

    public function tasks() { return $this->hasMany(Task::class, 'assignee_id'); }
    public function createdTasks() { return $this->hasMany(Task::class, 'creator_id'); }
    public function transactions() { return $this->hasMany(Transaction::class); }
    public function notifications() { return $this->hasMany(Notification::class); }
    public function prizeRequests() { return $this->hasMany(PrizeRequest::class); }
}
