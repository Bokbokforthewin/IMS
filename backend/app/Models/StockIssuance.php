<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockIssuance extends Model
{
    protected $fillable = ['document_number', 'issuance_date', 'purpose', 'issued_by_id'];

    public function lines(): HasMany
    {
        return $this->hasMany(StockIssuanceLine::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_id');
    }
}