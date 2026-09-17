<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SerializedAsset extends Model
{
    protected $fillable = [
        'item_id',
        'serial_number',
        'property_number',
        'model',
        'manufacturer_name',
        'country_of_origin',
        'unit_cost',
        'quantity_on_hand',
        'attached_to',
        'status',
        'current_holder_id',
        'condition_remarks',
        'pre_repair_status',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function currentHolder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'current_holder_id');
    }

    public function receiptLines(): HasMany
    {
        return $this->hasMany(AccountabilityReceiptLine::class);
    }

    /**
     * Get all peripherals attached to this asset's property_number.
     */
    public function peripherals(): HasMany
    {
        return $this->hasMany(SerializedAsset::class, 'attached_to', 'property_number');
    }

    /**
     * Get the parent asset this peripheral is attached to via property_number.
     */
    public function parentAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class, 'attached_to', 'property_number');
    }
}