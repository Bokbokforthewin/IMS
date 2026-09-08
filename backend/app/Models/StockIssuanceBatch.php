<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;


class StockIssuanceBatch extends Model
{
    protected $fillable = ['stock_issuance_line_id', 'stock_batch_id', 'quantity_deducted', 'unit_cost_at_issuance'];

    public function stockBatch(): BelongsTo
    {
        return $this->belongsTo(StockBatch::class);
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(StockIssuanceLine::class, 'stock_issuance_line_id');
    }
}
