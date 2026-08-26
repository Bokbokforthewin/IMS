<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountabilityReceipt extends Model
{
    protected $fillable = [
        'receipt_type', 'document_number', 'item_id', 
        'serialized_asset_id', 'quantity', 'date_issued', 'remarks'
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function serializedAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class);
    }
}