<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SerializedAsset extends Model
{
    protected $fillable = [
        'item_id', 'serial_number', 'property_number', 
        'brand', 'model', 'unit_cost', 'status'
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function accountabilityReceipts(): HasMany
    {
        return $this->hasMany(AccountabilityReceipt::class);
    }
}
