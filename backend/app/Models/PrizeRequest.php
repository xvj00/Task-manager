<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrizeRequest extends Model
{
    protected $fillable = ['prize_id', 'user_id', 'status', 'rejection_reason'];

    public function prize() { return $this->belongsTo(Prize::class); }
    public function user() { return $this->belongsTo(User::class); }
}
