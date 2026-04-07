<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'title', 'description', 'deadline', 'priority', 'status',
        'creator_id', 'assignee_id', 'reward_points', 'category', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return ['deadline' => 'datetime'];
    }

    public function project()     { return $this->belongsTo(Project::class); }
    public function creator()     { return $this->belongsTo(User::class, 'creator_id'); }
    public function assignee()    { return $this->belongsTo(User::class, 'assignee_id'); }
    public function logs()        { return $this->hasMany(TaskLog::class)->orderBy('created_at'); }
    public function transactions(){ return $this->hasMany(Transaction::class); }
    public function subtasks()    { return $this->hasMany(Subtask::class)->orderBy('order'); }
    public function comments()    { return $this->hasMany(TaskComment::class)->orderBy('created_at'); }
    public function attachments() { return $this->hasMany(TaskAttachment::class); }
}
