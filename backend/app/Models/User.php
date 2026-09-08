<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'unit',
        'division',
        'designation',
        'is_head',
        'email',
        'password',
    ];
    /**
     * Find the head of this user's unit — the other user in the same
     * unit flagged is_head = true. Returns null if none exists (including
     * when this user IS the head, or when no head has been designated yet).
     */
    public function findUnitHead(): ?User
    {
        return User::where('unit', $this->unit)
            ->where('id', '!=', $this->id)
            ->where('is_head', true)
            ->first();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
