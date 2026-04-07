<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Folder extends Model
{
    protected $fillable = ['name', 'description', 'owner_id'];

    public function owner()    { return $this->belongsTo(User::class, 'owner_id'); }
    public function projects() { return $this->hasMany(Project::class); }
    public function members()  { return $this->belongsToMany(User::class, 'folder_user')->withPivot('role')->withTimestamps(); }

    public function userRole(int $userId): ?string
    {
        if ($this->owner_id === $userId) return 'owner';
        $member = $this->members()->where('user_id', $userId)->first();
        return $member?->pivot->role;
    }
}
