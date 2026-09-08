<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockIssuanceLine extends Model
{
    protected $fillable = ['stock_issuance_id', 'item_id', 'issued_to_id', 'quantity_issued'];

    public function issuance(): BelongsTo
    {
        return $this->belongsTo(StockIssuance::class, 'stock_issuance_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function issuedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_to_id');
    }

    public function batchAllocations(): HasMany
    {
        return $this->hasMany(StockIssuanceBatch::class);
    }
}