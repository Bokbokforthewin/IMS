<?php

declare(strict_types=1);

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 2 — RBAC & Vertical Privilege Escalation
|--------------------------------------------------------------------------
| Adversary goal: use a low-privilege account to reach administrative
| functions, or keep access after it has been taken away.
|
| NOTE: the revocation tests deliberately never flush Spatie's permission
| cache by hand. If the application fails to invalidate it, they fail —
| which is the finding.
*/

// ---------------------------------------------------------------------------
// Vertical escalation
// ---------------------------------------------------------------------------

it('blocks :dataset from administrative endpoints with 403 and changes nothing', function (string $role, string $method, string $uri, array $payload) {
    $actor = $this->userWithRole($role);
    $uri = $this->resolveUri($uri);
    $before = $this->authorizationSnapshot();

    $response = $this->callAs($actor, $method, $uri, $payload);

    $response->assertForbidden();
    $this->assertNoInternalLeak($response);
    expect($this->authorizationSnapshot())->toBe($before);
})->with(['end_user', 'manager'])->with('admin_surface');

it('lets an administrator reach the read-only admin endpoints (control for the 403 tests)', function (string $uri) {
    $admin = $this->userWithRole('admin');

    $response = $this->callAs($admin, 'GET', $uri);

    // If this fails, the 403 tests above may be passing for the wrong reason (e.g. broken route).
    expect($response->status())->toBeIn([200]);
})->with([
    'users'       => [Endpoints::USERS],
    'roles'       => [Endpoints::ROLES],
    'permissions' => ['/api/permissions'],
    'settings'    => [Endpoints::SETTINGS],
]);

it('cannot be bypassed with HTTP method override (_method / X-HTTP-Method-Override)', function (string $technique) {
    $actor = $this->userWithRole('end_user');
    $target = User::factory()->create();
    $uri = Endpoints::USERS . '/' . $target->getKey();

    $response = match ($technique) {
        'body _method'   => $this->callAs($actor, 'POST', $uri, ['_method' => 'DELETE']),
        'query _method'  => $this->callAs($actor, 'POST', $uri . '?_method=DELETE'),
        'override header' => $this->callAs($actor, 'POST', $uri, [], ['X-HTTP-Method-Override' => 'DELETE']),
    };

    expect($response->status())->toBeIn([403, 404, 405]);
    $this->assertNotServerError($response, $technique);
    $this->assertDatabaseHas('users', ['id' => $target->getKey()]);
})->with(['body _method', 'query _method', 'override header']);

it('stops a low-privilege user from promoting themselves via the role-assignment endpoint', function () {
    $actor = $this->userWithRole('end_user');

    $this->callAs($actor, 'POST', Endpoints::USERS . "/{$actor->getKey()}/roles", ['roles' => ['admin']])->assertForbidden();

    $this->assertNotPrivileged($actor, 'end_user');
});

it('stops a low-privilege user from granting permissions to their own role via the matrix', function () {
    $actor = $this->userWithRole('end_user');
    $ownRole = Role::findByName('end_user', Endpoints::GUARD);
    $before = $ownRole->permissions->pluck('name')->sort()->values()->all();

    $this->callAs($actor, 'PUT', Endpoints::ROLES . "/{$ownRole->getKey()}/permissions", [
        'permissions' => ['users.manage', 'roles.manage', 'settings.manage'],
    ])->assertForbidden();

    expect($ownRole->fresh()->permissions->pluck('name')->sort()->values()->all())->toBe($before);
});

it('stops a manager from editing the admin role, even though they hold broad asset permissions', function () {
    $manager = $this->userWithRole('manager');
    $adminRole = Role::findByName('admin', Endpoints::GUARD);
    $before = $adminRole->permissions->count();

    $this->callAs($manager, 'PUT', Endpoints::ROLES . "/{$adminRole->getKey()}/permissions", ['permissions' => []])->assertForbidden();
    $this->callAs($manager, 'DELETE', Endpoints::ROLES . "/{$adminRole->getKey()}")->assertForbidden();

    expect($adminRole->fresh()->permissions->count())->toBe($before);
});

// ---------------------------------------------------------------------------
// Dynamic permission revocation (mid-session)
// ---------------------------------------------------------------------------

it('denies the very next request after a role loses a permission', function () {
    $user = $this->userWithRole('manager');
    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk(); // same token reused below

    Role::findByName('manager', Endpoints::GUARD)->revokePermissionTo('assets.view');

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();
});

it('denies the very next request after an administrator edits the permission matrix through the API', function () {
    $admin = $this->userWithRole('admin');
    $user = $this->userWithRole('manager');
    $managerRole = Role::findByName('manager', Endpoints::GUARD);

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk(); // victim session established

    $remaining = $managerRole->permissions->pluck('name')->reject(fn (string $p) => $p === 'assets.view')->values()->all();
    $this->callAs($admin, 'PUT', Endpoints::ROLES . "/{$managerRole->getKey()}/permissions", ['permissions' => $remaining])
        ->assertSuccessful();

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();
});

it('denies the very next request after a direct (user-level) permission is revoked', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findByName('assets.view', Endpoints::GUARD));

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk();

    $user->revokePermissionTo('assets.view');

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();
});

it('denies the very next request after the user is removed from their role', function () {
    $user = $this->userWithRole('manager');
    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk();

    $user->removeRole('manager');

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();
});

it('denies the very next request after the user\'s role is deleted outright', function () {
    $user = $this->userWithRole('manager');
    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk();

    Role::findByName('manager', Endpoints::GUARD)->delete();

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();
});

it('revokes access on every concurrent session (token) the user holds', function () {
    $user = $this->userWithRole('manager');
    $secondDevice = $user->createToken('second-device')->plainTextToken;

    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertOk();

    Role::findByName('manager', Endpoints::GUARD)->revokePermissionTo('assets.view');

    // First session
    $this->callAs($user, 'GET', Endpoints::ASSETS)->assertForbidden();

    // Second session, different token
    $this->flushHeaders();
    $this->app['auth']->forgetGuards();
    $this->withToken($secondDevice)->getJson(Endpoints::ASSETS)->assertForbidden();
});

it('strips administrator access immediately when an admin is demoted', function () {
    $admin = $this->userWithRole('admin');
    $this->callAs($admin, 'GET', Endpoints::USERS)->assertOk();

    $admin->syncRoles([Role::findByName('end_user', Endpoints::GUARD)]);

    $this->callAs($admin, 'GET', Endpoints::USERS)->assertForbidden();
    $this->callAs($admin, 'PUT', Endpoints::SETTINGS, ['maintenance_mode' => true])->assertForbidden();
});

it('keeps unrelated users\' access intact when one user\'s permission is revoked', function () {
    $victim = User::factory()->create();
    $bystander = $this->userWithRole('manager');
    $victim->givePermissionTo('assets.view');

    $victim->revokePermissionTo('assets.view');

    $this->callAs($victim, 'GET', Endpoints::ASSETS)->assertForbidden();
    $this->callAs($bystander, 'GET', Endpoints::ASSETS)->assertOk();
});