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

    // Alias for 'user' to ensure compatibility with generic frontend lookups
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
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

    /**
     * Scope query to restrict asset transfers based on user role and division/unit.
     */
    public function scopeApplyDataScope($query, User $user)
    {
        // 1. Super Admin & Supply Officer see everything
        if ($user->hasRole(['super_admin', 'supply_officer']) || $user->email === 'ldbernardinonirchd@gmail.com') {
            return $query;
        }

        $unit = trim($user->unit ?? '');
        $division = trim($user->division ?? '');

        // 2. Division Chief / Head
        if ($user->hasRole('division_chief') || ($user->is_head && !empty($division) && (empty($unit) || $unit === ''))) {
            return $query->where(function ($mainQ) use ($division) {
                $mainQ->whereHas('transferredFrom', fn($q) => $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]))
                      ->orWhereHas('transferredTo', fn($q) => $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]));
            });
        }

        // 3. Unit Head / Property Custodian
        if ($user->hasRole(['property_custodian', 'unit_head', 'end_user']) || ($user->is_head && !empty($unit))) {
            return $query->where(function ($mainQ) use ($unit) {
                $mainQ->whereHas('transferredFrom', fn($q) => $q->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]))
                      ->orWhereHas('transferredTo', fn($q) => $q->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]));
            });
        }

        // 4. Regular End-User sees only their own transfers
        return $query->where('user_id', $user->id)
                     ->orWhere('transfered_to', $user->id);
    }
}