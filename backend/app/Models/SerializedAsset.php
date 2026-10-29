<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\Auditable;

class SerializedAsset extends Model
{
    use Auditable;

    protected $fillable = [
        'item_id',
        'serial_number',
        'property_number',
        'model',
        'manufacturer_name',
        'country_of_origin',
        'unit_cost',
        'quantity_on_hand',
        'attached_to',
        'status',
        'current_holder_id',
        'condition_remarks',
        'pre_repair_status',
        'revert_reason',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function currentHolder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'current_holder_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AccountabilityReceiptLine::class);
    }

    /**
     * Get all peripherals attached to this asset's property_number.
     */
    public function peripherals(): HasMany
    {
        return $this->hasMany(SerializedAsset::class, 'attached_to', 'property_number');
    }

    /**
     * Get the parent asset this peripheral is attached to via property_number.
     */
    public function parentAsset(): BelongsTo
    {
        return $this->belongsTo(SerializedAsset::class, 'attached_to', 'property_number');
    }

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
        return $query->where(function ($q) use ($division) {
            $q->whereHas('currentHolder', fn($sub) => $sub->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]))
              ->orWhere('status', 'Available');
        });
    }

    // 3. Unit Head / Property Custodian
    if ($user->hasRole(['property_custodian', 'unit_head', 'end_user']) || ($user->is_head && !empty($unit))) {
        return $query->where(function ($q) use ($unit) {
            $q->whereHas('currentHolder', fn($sub) => $sub->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]))
              ->orWhere('status', 'Available');
        });
    }

    // 4. Regular End-User
    return $query->where('current_holder_id', $user->id);
}
}