<?php

declare(strict_types=1);

namespace Tests\Feature\Security\Support;

use Illuminate\Support\Str;

/**
 * Single source of truth for everything the security suite assumes about the
 * application under test.
 *
 * Every route, permission name, status value and payload shape used by the
 * suite lives HERE. If your API differs (route names, field names, enum
 * values), edit this file only — the tests themselves stay untouched.
 *
 * URI templates may contain {user}, {role}, {asset} and {department}
 * placeholders; SecurityTestCase::resolveUri() swaps them for real records so
 * that authorization is exercised against existing resources (a 404 must never
 * be able to mask a missing 403).
 */
final class Endpoints
{
    /** Guard used by every Spatie role / permission in the suite. */
    public const GUARD = 'sanctum';

    /** Every permission the suite seeds (all on the sanctum guard). */
    public const PERMISSIONS = [
        'users.manage',
        'roles.manage',
        'settings.manage',
        'assets.view',
        'assets.create',
        'assets.update',
        'assets.delete',
        'assets.distribute',
        'assets.revert',
    ];

    /** Role => permissions ('*' = everything). */
    public const ROLE_PERMISSIONS = [
        'admin'    => '*',
        'manager'  => ['assets.view', 'assets.create', 'assets.update', 'assets.distribute', 'assets.revert'],
        'end_user' => ['assets.view'],
    ];

    // --- Asset workflow status values -------------------------------------
    public const STATUS_AVAILABLE   = 'available';
    public const STATUS_DISTRIBUTED = 'distributed';
    public const STATUS_RETIRED     = 'retired';

    // --- Auth -------------------------------------------------------------
    public const PROFILE        = '/api/user';
    public const PROFILE_UPDATE = '/api/user';
    public const PROFILE_UPDATE_METHOD = 'PUT';
    public const LOGIN          = '/api/login';
    public const LOGOUT         = '/api/logout';
    /** Set to null if the API has no public self-registration. */
    public const REGISTER       = '/api/register';
    /** Attempts after which the login throttle MUST have kicked in (429). */
    public const LOGIN_MAX_ATTEMPTS = 10;

    // --- Resources --------------------------------------------------------
    public const USERS       = '/api/users';
    public const ROLES       = '/api/roles';
    public const ASSETS      = '/api/assets';
    public const SETTINGS    = '/api/settings';
    public const DEPARTMENT_ASSETS = '/api/departments/{department}/assets';

    public const ASSET_ITEM       = '/api/assets/{asset}';
    public const ASSET_DISTRIBUTE = '/api/assets/{asset}/distribute';
    public const ASSET_REVERT     = '/api/assets/{asset}/revert';
    public const ASSET_STATUS     = '/api/assets/{asset}/status';
    /** Null if no bulk endpoint exists. Body must accept {"asset_ids": [...]}. */
    public const ASSET_BULK_DISTRIBUTE = '/api/assets/bulk-distribute';

    /** Append-only distribution ledger (table + FK) used to detect double-writes. */
    public const HISTORY_TABLE = 'asset_distributions';
    public const HISTORY_FK    = 'asset_id';

    /** Substrings that must never appear in any API response body. */
    public const LEAK_MARKERS = [
        'SQLSTATE',
        'Stack trace',
        'PDOException',
        'QueryException',
        'vendor/laravel',
        'Illuminate\\',
        '.php on line',
    ];

    /** Attribute names that must never be serialised in a response. */
    public const SENSITIVE_KEYS = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'api_token',
    ];

    /**
     * Minimal valid asset-create payload. Extend with whatever your
     * StoreAssetRequest requires.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public static function assetPayload(array $overrides = []): array
    {
        return array_merge([
            'name'          => 'Security Suite Laptop',
            'serial_number' => 'SN-' . Str::upper(Str::random(12)),
        ], $overrides);
    }

    /**
     * Administrative surface: user management, role/permission matrix, system config.
     *
     * @return array<string, array{0: string, 1: string, 2: array<string, mixed>}>
     */
    public static function adminSurface(): array
    {
        $newUser = [
            'name'                  => 'Mallory',
            'email'                 => 'mallory@example.test',
            'password'              => 'Str0ng!Passw0rd#1',
            'password_confirmation' => 'Str0ng!Passw0rd#1',
            'role'                  => 'admin',
        ];

        return [
            'list users'            => ['GET', self::USERS, []],
            'create user'           => ['POST', self::USERS, $newUser],
            'show user'             => ['GET', self::USERS . '/{user}', []],
            'update user'           => ['PUT', self::USERS . '/{user}', ['name' => 'Pwned']],
            'delete user'           => ['DELETE', self::USERS . '/{user}', []],
            'assign role to user'   => ['POST', self::USERS . '/{user}/roles', ['roles' => ['admin']]],
            'list roles'            => ['GET', self::ROLES, []],
            'create role'           => ['POST', self::ROLES, ['name' => 'shadow-admin', 'guard_name' => self::GUARD, 'permissions' => ['users.manage']]],
            'update role'           => ['PUT', self::ROLES . '/{role}', ['name' => 'renamed-role']],
            'delete role'           => ['DELETE', self::ROLES . '/{role}', []],
            'list permissions'      => ['GET', '/api/permissions', []],
            'edit permission matrix' => ['PUT', self::ROLES . '/{role}/permissions', ['permissions' => ['users.manage', 'roles.manage']]],
            'read system config'    => ['GET', self::SETTINGS, []],
            'update system config'  => ['PUT', self::SETTINGS, ['maintenance_mode' => true]],
        ];
    }

    /**
     * Foreign-asset mutations. 4th element = the state the asset must be in so
     * the ONLY reason for rejection can be scope (never workflow state).
     *
     * @return array<string, array{0: string, 1: string, 2: array<string, mixed>, 3: string}>
     */
    public static function assetMutations(): array
    {
        return [
            'update'        => ['PUT', self::ASSET_ITEM, ['name' => 'Hijacked'], self::STATUS_AVAILABLE],
            'delete'        => ['DELETE', self::ASSET_ITEM, [], self::STATUS_AVAILABLE],
            'distribute'    => ['POST', self::ASSET_DISTRIBUTE, ['recipient_id' => '__recipient__'], self::STATUS_AVAILABLE],
            'revert'        => ['POST', self::ASSET_REVERT, [], self::STATUS_DISTRIBUTED],
            'status change' => ['PATCH', self::ASSET_STATUS, ['status' => self::STATUS_RETIRED], self::STATUS_AVAILABLE],
        ];
    }

    /**
     * Every authenticated endpoint the suite knows about.
     *
     * @return array<string, array{0: string, 1: string, 2: array<string, mixed>}>
     */
    public static function protectedSurface(): array
    {
        $surface = self::adminSurface();

        $surface['profile'] = ['GET', self::PROFILE, []];
        $surface['list assets'] = ['GET', self::ASSETS, []];
        $surface['create asset'] = ['POST', self::ASSETS, self::assetPayload()];
        $surface['show asset'] = ['GET', self::ASSET_ITEM, []];

        foreach (self::assetMutations() as $label => [$method, $uri, $payload]) {
            $surface["asset: $label"] = [$method, $uri, $payload];
        }

        return $surface;
    }
}