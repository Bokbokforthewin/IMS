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
            $mainQ->whereHas('user', fn($q) => $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]))
                  ->orWhereHas('receivedMrBy', fn($q) => $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]))
                  ->orWhereHas('issuedBy', fn($q) => $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]));
        });
    }

    // 3. Unit Head / Property Custodian
    if ($user->hasRole(['property_custodian', 'unit_head', 'end_user']) || ($user->is_head && !empty($unit))) {
        return $query->where(function ($mainQ) use ($unit) {
            $mainQ->whereHas('user', fn($q) => $q->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]))
                  ->orWhereHas('receivedMrBy', fn($q) => $q->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]))
                  // Also include if the MR username/unit contains the unit code (e.g. GSRICTU contains ICTU)
                  ->orWhereHas('receivedMrBy', fn($q) => $q->whereRaw('LOWER(unit) LIKE ?', ['%' . strtolower($unit) . '%']));
        });
    }

    // 4. Regular End-User sees only their own receipts
    return $query->where('user_id', $user->id)
                 ->orWhere('received_mr_by_id', $user->id);
}
}