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
        'is_serialized',
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

    public function serializedAssets(): HasMany
    {
        return $this->hasMany(SerializedAsset::class);
    }
}
