<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subtask extends Model
{
    protected $fillable = ['task_id', 'title', 'is_done', 'order'];

    protected function casts(): array
    {
        return ['is_done' => 'boolean'];
    }

    public function task() { return $this->belongsTo(Task::class); }
}
