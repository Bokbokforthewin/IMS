<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\Auditable;

class Category extends Model
{
    use Auditable;
    
    protected $fillable = ['name', 'description', 'sub_major_account_code', 'gl_account_code', 'semi_expendable_gl_code'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}