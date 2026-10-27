<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Item extends Model
{
    use Auditable, HasFactory;

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
        'image_path',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function isAsset(): bool
    {
        return $this->tracking_type === 'asset';
    }

    public function isConsumable(): bool
    {
        return $this->tracking_type === 'consumable';
    }

    protected $guarded = [];

    // 1. Tell Eloquent to include 'image_url' whenever the model is converted to JSON
    protected $appends = ['image_url'];

    // 2. Accessor that converts "items/laFMbf..." to "http://YOUR_SERVER_IP:8000/storage/items/laFMbf..."
    public function getImageUrlAttribute()
    {
        if (!$this->image_path) {
            return null;
        }

        if (filter_var($this->image_path, FILTER_VALIDATE_URL)) {
            return $this->image_path;
        }

        return asset('storage/' . $this->image_path);
    }
}