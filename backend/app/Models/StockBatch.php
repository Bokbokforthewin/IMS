<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBatch extends Model
{
    protected $fillable = ['item_id', 'iar_number', 'quantity_on_hand', 'unit_cost','brand', 'specifications'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
