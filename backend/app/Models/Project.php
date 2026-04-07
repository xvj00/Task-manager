<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'description', 'owner_id', 'folder_id'];

    public function owner()   { return $this->belongsTo(User::class, 'owner_id'); }
    public function folder()  { return $this->belongsTo(Folder::class); }
    public function tasks()   { return $this->hasMany(Task::class); }
    public function members() { return $this->belongsToMany(User::class, 'project_user')->withPivot('role')->withTimestamps(); }

    public function userRole(int $userId): ?string
    {
        if ($this->owner_id === $userId) return 'owner';
        $member = $this->members()->where('user_id', $userId)->first();
        return $member?->pivot->role;
    }
}
