<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    protected $fillable = ['task_id', 'user_id', 'filename', 'original_name', 'mime_type', 'size'];

    public function user() { return $this->belongsTo(User::class); }
    public function task() { return $this->belongsTo(Task::class); }
}
