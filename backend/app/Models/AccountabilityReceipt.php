<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountabilityReceipt extends Model
{
    protected $fillable = [
        'receipt_type', 'document_number', 'user_id',
        'issued_by_id', 'received_mr_by_id', 'date_issued', 'remarks'
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(AccountabilityReceiptLine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_id');
    }

    public function receivedMrBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_mr_by_id');
    }
}