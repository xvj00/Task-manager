<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = ['name', 'username', 'email', 'password', 'role', 'balance', 'last_seen_at'];
    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'last_seen_at' => 'datetime'];
    }

    public function isAdmin(): bool   { return $this->role === 'admin'; }
    /** @deprecated используй isAdmin() */
    public function isCreator(): bool { return $this->isAdmin(); }

    public function tasks()        { return $this->hasMany(Task::class, 'assignee_id'); }
    public function createdTasks() { return $this->hasMany(Task::class, 'creator_id'); }
    public function transactions() { return $this->hasMany(Transaction::class); }
    public function notifications(){ return $this->hasMany(Notification::class); }
    public function prizeRequests(){ return $this->hasMany(PrizeRequest::class); }
    public function projects()     { return $this->belongsToMany(Project::class, 'project_user')->withPivot('role'); }
    public function folders()      { return $this->belongsToMany(Folder::class, 'folder_user')->withPivot('role'); }
}
