<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// app/Models/AccountabilityReceiptLine.php
class AccountabilityReceiptLine extends Model
{
    protected $fillable = ['accountability_receipt_id', 'serialized_asset_id', 'accessories_notes'];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(AccountabilityReceipt::class, 'accountability_receipt_id');
    }

    public function serializedAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class);
    }
}