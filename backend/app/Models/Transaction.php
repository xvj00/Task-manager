<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = ['user_id', 'amount', 'type', 'description', 'task_id', 'created_by'];

    public function user() { return $this->belongsTo(User::class); }
    public function task() { return $this->belongsTo(Task::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
