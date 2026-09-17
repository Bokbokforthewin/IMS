<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    protected $fillable = [
        'category_id', 
        'item_code', 
        'name', 
        'brand', 
        'specifications', 
        'type', 
        'unit_of_measure', 
        'reorder_level', 
        'tracking_type',
        'estimated_useful_life',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    // Helper methods for clean type checks
    public function isSerialized(): bool
    {
        return $this->tracking_type === 'serialized';
    }

    public function isNonSerialized(): bool
    {
        return $this->tracking_type === 'non-serialized';
    }

    public function isConsumable(): bool
    {
        return $this->tracking_type === 'consumable';
    }
}