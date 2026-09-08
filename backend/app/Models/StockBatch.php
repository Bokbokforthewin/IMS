<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// app/Models/StockBatch.php
class StockBatch extends Model
{
    protected $fillable = ['item_id', 'iar_number', 'received_date', 'quantity_on_hand', 'unit_cost'];

    protected $casts = [
        'received_date' => 'date',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function issuanceBatches(): HasMany
    {
        return $this->hasMany(StockIssuanceBatch::class);
    }
}
