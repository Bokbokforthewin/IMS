<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetTransfer extends Model
{
    protected $table = 'asset_transfer';

    protected $fillable = [
        'document_number', 'transfer_type', 'serialized_asset_id',
        'user_id', 'transfered_to', 'description', 'reason',
        'transfer_date', 'remarks'
    ];

    public function serializedAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class, 'serialized_asset_id');
    }

    // The employee the asset is currently held by / being transferred FROM
    public function transferredFrom(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // The employee the asset is being transferred/returned TO
    public function transferredTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transfered_to');
    }
}