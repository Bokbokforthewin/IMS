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

    /**
     * Scope query to restrict stock issuances based on user role and division/unit.
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
            return $query->whereHas('lines.issuedTo', function ($q) use ($division) {
                $q->whereRaw('LOWER(TRIM(division)) = ?', [strtolower($division)]);
            });
        }

        // 3. Unit Head / Property Custodian
        if ($user->hasRole(['property_custodian', 'unit_head', 'end_user']) || ($user->is_head && !empty($unit))) {
            return $query->whereHas('lines.issuedTo', function ($q) use ($unit) {
                $q->whereRaw('LOWER(TRIM(unit)) = ?', [strtolower($unit)]);
            });
        }

        // 4. Regular End-User sees only issuances given to them
        return $query->whereHas('lines', function ($q) use ($user) {
            $q->where('issued_to_id', $user->id);
        });
    }
}