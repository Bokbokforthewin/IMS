<?php

declare(strict_types=1);

use App\Models\Asset;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 3 — Mass Assignment & Attribute Injection
|--------------------------------------------------------------------------
| Adversary goal: smuggle guarded attributes (is_admin, roles, permissions,
| ownership, workflow status) into create/update payloads.
|
| Acceptable outcomes: the request is rejected (403/422) OR it succeeds with
| the injected attributes silently ignored. Unacceptable: any persisted effect.
*/

// ---------------------------------------------------------------------------
// Privilege attributes on user-facing endpoints
// ---------------------------------------------------------------------------

it('ignores privilege-bearing attributes on self-service profile update', function (array $injection) {
    $user = $this->userWithRole('end_user');

    $response = $this->callAs($user, Endpoints::PROFILE_UPDATE_METHOD, Endpoints::PROFILE_UPDATE, array_merge(['name' => 'Legit Rename'], $injection));

    expect($response->status())->toBeIn([200, 403, 422]);
    $this->assertNoInternalLeak($response);
    $this->assertNotPrivileged($user, 'end_user');

    // The response must not echo back an elevated state either.
    expect($response->json('data.is_admin') ?? $response->json('is_admin'))->not->toBeTrue();
})->with('privilege_injections');

it('ignores privilege-bearing attributes on public registration', function (array $injection) {
    if (Endpoints::REGISTER === null) {
        $this->markTestSkipped('API has no public registration endpoint.');
    }

    $email = 'registrant-' . uniqid() . '@example.test';
    $payload = array_merge([
        'name'                  => 'Eve',
        'email'                 => $email,
        'password'              => 'Str0ng!Passw0rd#1',
        'password_confirmation' => 'Str0ng!Passw0rd#1',
    ], $injection);

    $response = $this->callAs(null, 'POST', Endpoints::REGISTER, $payload);

    $this->assertNotServerError($response, 'register + ' . json_encode($injection));

    $created = User::where('email', $email)->first();
    if ($created === null) {
        expect($response->status())->toBeIn([403, 404, 422]); // rejected outright: fine

        return;
    }

    expect($created->hasRole('admin'))->toBeFalse();
    expect($created->getDirectPermissions())->toBeEmpty();
    expect($created->getAllPermissions()->pluck('name')->intersect(['users.manage', 'roles.manage', 'settings.manage']))->toBeEmpty();
    foreach (['is_admin', 'is_superuser'] as $flag) {
        if (Schema::hasColumn('users', $flag)) {
            expect((bool) $created->getAttribute($flag))->toBeFalse();
        }
    }
})->with('privilege_injections');

it('refuses client-chosen primary keys and token fields when an admin creates a user', function () {
    $admin = $this->userWithRole('admin');
    $email = 'created-' . uniqid() . '@example.test';

    $response = $this->callAs($admin, 'POST', Endpoints::USERS, [
        'name'                  => 'Created User',
        'email'                 => $email,
        'password'              => 'Str0ng!Passw0rd#1',
        'password_confirmation' => 'Str0ng!Passw0rd#1',
        'id'                    => 987654,
        'remember_token'        => 'attacker-known-token',
        'two_factor_secret'     => 'attacker-known-secret',
    ]);

    $this->assertNotServerError($response, 'admin create user');

    $created = User::where('email', $email)->first();
    if ($created !== null) {
        expect($created->getKey())->not->toBe(987654);
        expect($created->remember_token)->not->toBe('attacker-known-token');
        if (Schema::hasColumn('users', 'two_factor_secret')) {
            expect($created->two_factor_secret)->not->toBe('attacker-known-secret');
        }
    }
});

it('never serialises sensitive attributes in user responses', function () {
    $admin = $this->userWithRole('admin');
    $other = User::factory()->create();

    foreach ([Endpoints::PROFILE, Endpoints::USERS, Endpoints::USERS . '/' . $other->getKey()] as $uri) {
        $response = $this->callAs($admin, 'GET', $uri)->assertOk();
        $this->assertNoSensitiveKeys($response);
        $this->assertStringNotContainsString($other->password, (string) $response->getContent());
    }
});

// ---------------------------------------------------------------------------
// Asset create / update
// ---------------------------------------------------------------------------

it('forces server-side ownership and initial state when an asset is created', function () {
    $dept = Department::factory()->create();
    $foreign = Department::factory()->create();
    $manager = $this->userWithRole('manager', $dept);
    $foreignCountBefore = Asset::where('department_id', $foreign->getKey())->count();

    $response = $this->callAs($manager, 'POST', Endpoints::ASSETS, Endpoints::assetPayload([
        'id'            => 999999,
        'department_id' => $foreign->getKey(),
        'status'        => Endpoints::STATUS_RETIRED,
        'created_by'    => 999999,
        'deleted_at'    => '2000-01-01 00:00:00',
    ]));

    $this->assertNotServerError($response, 'asset create with injected columns');
    expect($response->status())->toBeIn([201, 403, 422]);

    // Nothing may have landed in the foreign department, whatever the response was.
    expect(Asset::where('department_id', $foreign->getKey())->count())->toBe($foreignCountBefore);
    $this->assertDatabaseMissing('assets', ['id' => 999999]);

    if ($response->status() === 201) {
        $created = Asset::latest('id')->firstOrFail();
        expect($created->department_id)->toBe($dept->getKey());
        expect($created->status)->toBe(Endpoints::STATUS_AVAILABLE);
        expect($created->deleted_at ?? null)->toBeNull();
        if (Schema::hasColumn('assets', 'created_by')) {
            expect($created->created_by)->toBe($manager->getKey());
        }
    }
});

it('leaves protected asset column :dataset untouched on a plain update', function (string $column, mixed $value) {
    if (! Schema::hasColumn('assets', $column)) {
        $this->markTestSkipped("assets.$column does not exist.");
    }

    $dept = Department::factory()->create();
    $foreign = Department::factory()->create();
    $manager = $this->userWithRole('manager', $dept);
    $asset = $this->makeAsset($dept);

    $value = $value === '__foreign_department__' ? $foreign->getKey() : $value;
    $before = $this->rawValue($asset, $column);

    $response = $this->callAs($manager, 'PUT', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_ITEM), [
        'name'  => 'Legit Rename',
        $column => $value,
    ]);

    $this->assertNotServerError($response, "asset update injecting $column");
    expect($response->status())->toBeIn([200, 403, 422]);

    expect($this->rawValue($asset, $column))->toEqual($before);
    $this->assertDatabaseHas('assets', [$asset->getKeyName() => $asset->getKey()]);
    $this->assertDatabaseMissing('assets', ['id' => 999999]);
})->with('protected_asset_fields');

it('ignores privilege-style injections smuggled into asset payloads', function (array $injection) {
    $dept = Department::factory()->create();
    $manager = $this->userWithRole('manager', $dept);
    $asset = $this->makeAsset($dept);
    $rolesBefore = DB::table(config('permission.table_names.model_has_roles'))->count();
    $permsBefore = DB::table(config('permission.table_names.model_has_permissions'))->count();

    $response = $this->callAs($manager, 'PUT', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_ITEM), array_merge(['name' => 'Rename'], $injection));

    $this->assertNotServerError($response, 'asset update + ' . json_encode($injection));
    $this->assertNoInternalLeak($response);
    $this->assertNotPrivileged($manager, 'manager');

    expect(DB::table(config('permission.table_names.model_has_roles'))->count())->toBe($rolesBefore);
    expect(DB::table(config('permission.table_names.model_has_permissions'))->count())->toBe($permsBefore);
})->with('privilege_injections');