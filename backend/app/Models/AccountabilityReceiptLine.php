<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// AccountabilityReceiptLine
class AccountabilityReceiptLine extends Model
{
    protected $fillable = [
        'accountability_receipt_id', 'item_id', 'serialized_asset_id',
        'quantity', 'accessories_notes'
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(AccountabilityReceipt::class, 'accountability_receipt_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function serializedAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class);
    }
}