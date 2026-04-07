<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    protected $fillable = ['type', 'entity_id', 'inviter_id', 'invitee_id', 'role', 'status'];

    public function inviter() { return $this->belongsTo(User::class, 'inviter_id'); }
    public function invitee() { return $this->belongsTo(User::class, 'invitee_id'); }
}
