<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prize extends Model
{
    protected $fillable = ['name', 'description', 'cost_points', 'quantity', 'created_by', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function requests() { return $this->hasMany(PrizeRequest::class); }
}
