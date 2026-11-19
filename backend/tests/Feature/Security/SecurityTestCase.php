<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Models\Asset;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Feature\Security\Support\Endpoints;
use Tests\TestCase;

/**
 * Base class for the adversarial security suite.
 *
 * Design notes (read these before debugging a failure):
 *
 *  1. REAL BEARER TOKENS, NOT actingAs().  Mid-session revocation, expiry and
 *     tampering can only be proven with real Sanctum tokens. callAs() mints one
 *     token per user and reuses it for every request, exactly like a real client.
 *
 *  2. GUARD CACHE RESET.  Laravel keeps resolved guards alive for the whole
 *     test, so the authenticated user (and its loaded roles) would silently
 *     survive between requests. callAs() calls forgetGuards() so every request
 *     is authenticated and authorized from scratch.
 *
 *  3. NO MANUAL PERMISSION-CACHE FLUSH between requests.  Spatie caches the
 *     permission map; if the application forgets to invalidate it on
 *     revocation, the "mid-session revocation" tests are supposed to fail.
 *
 *  4. SANCTUM GUARD.  Every role/permission is created with guard 'sanctum'.
 *     Your User model must resolve to that guard (either `protected $guard_name
 *     = 'sanctum';` on the model or a 'sanctum' guard registered in
 *     config/auth.php).
 *
 *  5. APP_DEBUG is forced OFF so leaks of stack traces / SQL are real findings.
 */
abstract class SecurityTestCase extends TestCase
{
    use RefreshDatabase;

    /** @var array<int|string, string> plaintext token per user id */
    private array $tokenCache = [];

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.debug' => false]);

        $this->seedRbac();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    /** Seed roles & permissions, all explicitly on the sanctum guard. */
    protected function seedRbac(): void
    {
        foreach (Endpoints::PERMISSIONS as $name) {
            Permission::findOrCreate($name, Endpoints::GUARD);
        }

        foreach (Endpoints::ROLE_PERMISSIONS as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, Endpoints::GUARD);
            $role->syncPermissions(
                $permissions === '*'
                    ? Permission::where('guard_name', Endpoints::GUARD)->get()
                    : $permissions
            );
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function userWithRole(string $role, ?Department $department = null, array $attributes = []): User
    {
        if ($department !== null && Schema::hasColumn('users', 'department_id')) {
            $attributes['department_id'] = $department->getKey();
        }

        $user = User::factory()->create($attributes);
        $user->assignRole(Role::findByName($role, Endpoints::GUARD));

        return $user;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeAsset(?Department $department = null, array $attributes = []): Asset
    {
        $department ??= Department::factory()->create();

        return Asset::factory()->create(array_merge([
            'department_id' => $department->getKey(),
            'status'        => Endpoints::STATUS_AVAILABLE,
        ], $attributes));
    }

    /** Replace {user}/{role}/{asset}/{department} with real, existing records. */
    protected function resolveUri(string $template): string
    {
        return (string) preg_replace_callback('/\{(\w+)\}/', fn (array $m): string => (string) match ($m[1]) {
            'user'       => User::factory()->create()->getKey(),
            'role'       => Role::findOrCreate('throwaway', Endpoints::GUARD)->getKey(),
            'asset'      => $this->makeAsset()->getKey(),
            'department' => Department::factory()->create()->getKey(),
        }, $template);
    }

    // ------------------------------------------------------------------
    // Request helpers
    // ------------------------------------------------------------------

    protected function tokenFor(User $user): string
    {
        return $this->tokenCache[$user->getKey()] ??= $user->createToken('security-suite')->plainTextToken;
    }

    /**
     * Perform a JSON request as $user (null = anonymous) using a REAL bearer token.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $headers
     */
    protected function callAs(?User $user, string $method, string $uri, array $data = [], array $headers = []): TestResponse
    {
        $this->flushHeaders();
        $this->app['auth']->forgetGuards();

        if ($user !== null) {
            $this->withToken($this->tokenFor($user));
        }

        return $this->json($method, $uri, $data, $headers);
    }

    protected function distributeAsset(User $actor, Asset $asset, ?User $recipient = null, array $extra = []): TestResponse
    {
        $payload = $recipient ? ['recipient_id' => $recipient->getKey()] : [];

        return $this->callAs($actor, 'POST', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_DISTRIBUTE), $payload + $extra);
    }

    protected function revertAsset(User $actor, Asset $asset, array $extra = []): TestResponse
    {
        return $this->callAs($actor, 'POST', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_REVERT), $extra);
    }

    protected function setAssetStatus(User $actor, Asset $asset, mixed $status, array $extra = []): TestResponse
    {
        return $this->callAs($actor, 'PATCH', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_STATUS), ['status' => $status] + $extra);
    }

    // ------------------------------------------------------------------
    // State inspection (always raw DB reads, never cached model state)
    // ------------------------------------------------------------------

    /** Hash of every authorization-relevant table, to prove a denied request changed nothing. */
    protected function authorizationSnapshot(): string
    {
        $tables = array_merge(['users'], array_values(config('permission.table_names')));
        $dump = [];

        foreach ($tables as $table) {
            $dump[$table] = DB::table($table)->get()
                ->map(fn ($row) => json_encode($row))
                ->sort()->values()->all();
        }

        return md5(json_encode($dump));
    }

    /** @return array<string, mixed> */
    protected function rowSnapshot(Model $model): array
    {
        return (array) DB::table($model->getTable())->where($model->getKeyName(), $model->getKey())->first();
    }

    protected function rawValue(Model $model, string $column): mixed
    {
        return DB::table($model->getTable())->where($model->getKeyName(), $model->getKey())->value($column);
    }

    protected function historyCount(Asset $asset): int
    {
        if (! Schema::hasTable(Endpoints::HISTORY_TABLE)) {
            return 0;
        }

        return DB::table(Endpoints::HISTORY_TABLE)->where(Endpoints::HISTORY_FK, $asset->getKey())->count();
    }

    // ------------------------------------------------------------------
    // Assertions
    // ------------------------------------------------------------------

    /** The suite's contract: invalid workflow transitions are 422 (409 tolerated), never 2xx/5xx. */
    protected function assertTransitionRejected(TestResponse $response, string $context = ''): void
    {
        $this->assertContains(
            $response->getStatusCode(),
            [409, 422],
            "Invalid transition was not rejected with 422/409. $context Body: " . mb_substr((string) $response->getContent(), 0, 300)
        );
        $this->assertNoInternalLeak($response);
    }

    protected function assertNotServerError(TestResponse $response, string $context = ''): void
    {
        $this->assertLessThan(
            500,
            $response->getStatusCode(),
            "Server error ({$response->getStatusCode()}) for: $context"
        );
    }

    /** Fails if the body exposes stack traces, SQL, or absolute filesystem paths. */
    protected function assertNoInternalLeak(TestResponse $response): void
    {
        $body = (string) $response->getContent();

        foreach (Endpoints::LEAK_MARKERS as $marker) {
            $this->assertStringNotContainsString($marker, $body, "Response leaks internals ('$marker').");
        }

        $this->assertStringNotContainsString(base_path(), $body, 'Response leaks an absolute server path.');

        $json = json_decode($body, true);
        if (is_array($json)) {
            $this->assertArrayNotHasKey('trace', $json);
            $this->assertArrayNotHasKey('exception', $json);
        }
    }

    /** Fails if any (nested) key in the JSON body is a sensitive attribute. */
    protected function assertNoSensitiveKeys(TestResponse $response): void
    {
        $json = json_decode((string) $response->getContent(), true);
        if (! is_array($json)) {
            return;
        }

        $keys = [];
        array_walk_recursive($json, fn () => null); // normalise
        $collect = function (array $data) use (&$collect, &$keys): void {
            foreach ($data as $key => $value) {
                $keys[] = strtolower((string) $key);
                if (is_array($value)) {
                    $collect($value);
                }
            }
        };
        $collect($json);

        foreach (Endpoints::SENSITIVE_KEYS as $sensitive) {
            $this->assertNotContains($sensitive, $keys, "Response exposes sensitive attribute '$sensitive'.");
        }
    }

    /**
     * Prove $user holds exactly $baselineRole's privileges and nothing more.
     */
    protected function assertNotPrivileged(User $user, string $baselineRole): void
    {
        $fresh = User::query()->findOrFail($user->getKey());

        $this->assertEqualsCanonicalizing([$baselineRole], $fresh->roles->pluck('name')->all(), 'Roles changed.');
        $this->assertTrue($fresh->getDirectPermissions()->isEmpty(), 'Direct permissions were injected.');

        $expected = Role::findByName($baselineRole, Endpoints::GUARD)->permissions->pluck('name')->sort()->values()->all();
        $actual = $fresh->getAllPermissions()->pluck('name')->sort()->values()->all();
        $this->assertSame($expected, $actual, 'Effective permission set drifted from the baseline role.');

        foreach (['is_admin', 'is_superuser'] as $flag) {
            if (Schema::hasColumn('users', $flag)) {
                $this->assertFalse((bool) $fresh->getAttribute($flag), "Privilege flag '$flag' was set.");
            }
        }
    }

    /**
     * Rows of a list response regardless of whether it is wrapped in {"data": []}.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function rowsOf(TestResponse $response): array
    {
        $json = $response->json();
        $rows = is_array($json) && array_is_list($json) ? $json : ($json['data'] ?? []);

        return is_array($rows) ? $rows : [];
    }
}