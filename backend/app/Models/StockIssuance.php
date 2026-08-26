<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockIssuance extends Model
{
    protected $table = 'stock_issuances';

    protected $guarded = [];

    public function stockBatch()
    {
        return $this->belongsTo(StockBatch::class, 'stock_batch_id');
    }
}