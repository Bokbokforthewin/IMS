<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetTransfer extends Model
{

    protected $table = 'asset_transfer'; // <--- Add this line
    
    protected $fillable = [
        'document_number', 'transfer_type', 'serialized_asset_id',
        'from_office', 'to_office', 'reason', 'transfer_date', 'remarks'
    ];

    public function serializedAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class, 'serialized_asset_id');
    }
}