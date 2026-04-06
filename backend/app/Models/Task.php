<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'description', 'deadline', 'priority', 'status',
        'creator_id', 'assignee_id', 'reward_points', 'category', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return ['deadline' => 'datetime'];
    }

    public function creator() { return $this->belongsTo(User::class, 'creator_id'); }
    public function assignee() { return $this->belongsTo(User::class, 'assignee_id'); }
    public function logs() { return $this->hasMany(TaskLog::class)->orderBy('created_at'); }
    public function transactions() { return $this->hasMany(Transaction::class); }
}
