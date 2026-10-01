<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\Auditable;

class Category extends Model
{
    use Auditable;
    
    protected $fillable = ['name', 'description'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}