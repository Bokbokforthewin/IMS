<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 1 — Authentication & Token Security
|--------------------------------------------------------------------------
| Adversary goal: reach protected data without a valid identity, or borrow
| someone else's. Every test uses REAL Sanctum bearer tokens.
*/

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

it('rejects unauthenticated requests with 401 on every protected endpoint', function (string $method, string $uri, array $payload) {
    $response = $this->callAs(null, $method, $this->resolveUri($uri), $payload);

    $response->assertUnauthorized();
    $this->assertNoInternalLeak($response);
})->with('protected_surface');

it('answers 401 (not a redirect or a 500) when the client omits the Accept header', function () {
    // Classic Laravel API bug: missing named "login" route => redirect or "Route [login] not defined" 500.
    $this->flushHeaders();

    $response = $this->get(Endpoints::PROFILE, ['Accept' => 'text/html']);

    $response->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Malformed / tampered tokens
// ---------------------------------------------------------------------------

it('rejects malformed bearer tokens with 401', function (string $token) {
    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $response = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson(Endpoints::PROFILE);

    $response->assertUnauthorized();
    $this->assertNoInternalLeak($response);
})->with('malformed_tokens');

it('rejects a genuine token after it has been tampered with', function (Closure $mutate) {
    $user = $this->userWithRole('end_user');
    $genuine = $this->tokenFor($user);

    // Control: the untouched token works, so a 401 below is caused by the mutation.
    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertOk();

    $tampered = $mutate($genuine);
    expect($tampered)->not->toBe($genuine);

    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $this->withHeader('Authorization', 'Bearer ' . $tampered)
        ->getJson(Endpoints::PROFILE)
        ->assertUnauthorized();
})->with('token_mutations');

it('rejects a token whose case has been altered', function () {
    $user = $this->userWithRole('end_user');
    $genuine = $this->tokenFor($user);
    [$id, $secret] = explode('|', $genuine, 2);

    $altered = $id . '|' . strtoupper($secret);
    if ($altered === $genuine) {
        $this->markTestSkipped('Secret has no letters to upper-case.');
    }

    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $this->withHeader('Authorization', 'Bearer ' . $altered)->getJson(Endpoints::PROFILE)->assertUnauthorized();
});

it('rejects token swapping: user A\'s token id combined with user B\'s secret', function () {
    $alice = $this->userWithRole('end_user');
    $bob = $this->userWithRole('admin');

    $aliceToken = $this->tokenFor($alice);
    $bobToken = $this->tokenFor($bob);

    $frankenstein = explode('|', $aliceToken, 2)[0] . '|' . explode('|', $bobToken, 2)[1];

    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $this->withHeader('Authorization', 'Bearer ' . $frankenstein)
        ->getJson(Endpoints::USERS)
        ->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Expiry & revocation
// ---------------------------------------------------------------------------

it('rejects a token whose expires_at is in the past', function () {
    $user = $this->userWithRole('end_user');

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertOk(); // control

    $user->tokens()->update(['expires_at' => now()->subMinute()]);

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertUnauthorized();
});

it('rejects a token once the global sanctum.expiration window has elapsed', function () {
    config(['sanctum.expiration' => 30]);

    $user = $this->userWithRole('end_user');
    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertOk(); // control

    $this->travel(31)->minutes();

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertUnauthorized();
});

it('rejects a revoked (deleted) token immediately', function () {
    $user = $this->userWithRole('end_user');

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertOk(); // control

    $user->tokens()->delete();

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertUnauthorized();
});

it('invalidates the token server-side on logout, not just client-side', function () {
    $user = $this->userWithRole('end_user');

    $this->callAs($user, 'POST', Endpoints::LOGOUT)->assertSuccessful();

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertUnauthorized();
});

it('rejects the token of a user that has been deleted', function () {
    $user = $this->userWithRole('end_user');

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertOk(); // control

    $user->delete();

    $this->callAs($user, 'GET', Endpoints::PROFILE)->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Header / parameter spoofing & token injection
// ---------------------------------------------------------------------------

it('does not authenticate anonymous requests carrying identity-spoofing headers', function (array $headers) {
    $response = $this->callAs(null, 'GET', Endpoints::PROFILE, [], $headers);

    $response->assertUnauthorized();
})->with('spoofed_identity_headers');

it('does not elevate a low-privilege token via identity-spoofing headers', function (array $headers) {
    $user = $this->userWithRole('end_user');

    $profile = $this->callAs($user, 'GET', Endpoints::PROFILE, [], $headers);
    $profile->assertOk();
    expect((int) ($profile->json('data.id') ?? $profile->json('id')))->toBe((int) $user->getKey());

    $this->callAs($user, 'GET', Endpoints::USERS, [], $headers)->assertForbidden();
})->with('spoofed_identity_headers');

it('ignores tokens supplied anywhere other than the Authorization header', function (string $location) {
    $user = $this->userWithRole('end_user');
    $token = $this->tokenFor($user);

    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $response = match ($location) {
        'query api_token'    => $this->getJson(Endpoints::PROFILE . '?api_token=' . urlencode($token)),
        'query access_token' => $this->getJson(Endpoints::PROFILE . '?access_token=' . urlencode($token)),
        'query token'        => $this->getJson(Endpoints::PROFILE . '?token=' . urlencode($token)),
        'body token'         => $this->json('GET', Endpoints::PROFILE, ['token' => $token, 'api_token' => $token]),
        'cookie'             => $this->withUnencryptedCookie('token', $token)->getJson(Endpoints::PROFILE),
        'custom header'      => $this->withHeader('X-Api-Token', $token)->getJson(Endpoints::PROFILE),
    };

    $response->assertUnauthorized();
})->with(['query api_token', 'query access_token', 'query token', 'body token', 'cookie', 'custom header']);

it('rejects non-Bearer authorization schemes carrying a valid token', function (string $scheme) {
    $user = $this->userWithRole('end_user');
    $token = $this->tokenFor($user);

    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $value = $scheme === 'Basic' ? 'Basic ' . base64_encode("{$user->email}:$token") : "$scheme $token";

    $this->withHeader('Authorization', $value)->getJson(Endpoints::PROFILE)->assertUnauthorized();
})->with(['Basic', 'Token', 'Digest', 'Negotiate', 'ApiKey']);

it('keeps the token owner as the identity even when the body claims another user_id', function () {
    $attacker = $this->userWithRole('end_user');
    $victim = $this->userWithRole('admin');

    $response = $this->callAs($attacker, 'GET', Endpoints::PROFILE, ['user_id' => $victim->getKey(), 'id' => $victim->getKey()]);

    $response->assertOk();
    expect((int) ($response->json('data.id') ?? $response->json('id')))->toBe((int) $attacker->getKey());
});

// ---------------------------------------------------------------------------
// Credential endpoints
// ---------------------------------------------------------------------------

it('throttles repeated failed logins with 429', function () {
    $user = User::factory()->create(['password' => Hash::make('Correct-Horse-9!')]);

    $statuses = [];
    for ($i = 0; $i < Endpoints::LOGIN_MAX_ATTEMPTS + 3; $i++) {
        $statuses[] = $this->callAs(null, 'POST', Endpoints::LOGIN, ['email' => $user->email, 'password' => "wrong-$i"])->getStatusCode();
    }

    expect($statuses)->toContain(429);
    expect(max($statuses))->toBeLessThan(500);
});

it('does not reveal whether an account exists (identical response for unknown email vs wrong password)', function () {
    $user = User::factory()->create(['password' => Hash::make('Correct-Horse-9!')]);

    $wrongPassword = $this->callAs(null, 'POST', Endpoints::LOGIN, ['email' => $user->email, 'password' => 'nope-nope-nope']);
    $unknownEmail = $this->callAs(null, 'POST', Endpoints::LOGIN, ['email' => 'ghost@example.test', 'password' => 'nope-nope-nope']);

    expect($unknownEmail->getStatusCode())->toBe($wrongPassword->getStatusCode());
    expect($unknownEmail->json('message'))->toBe($wrongPassword->json('message'));
});

it('never returns a token for a malformed login payload', function (array $payload) {
    $response = $this->callAs(null, 'POST', Endpoints::LOGIN, $payload);

    $this->assertNotServerError($response, 'login payload ' . json_encode($payload));
    expect($response->status())->toBeIn([401, 422, 429]);
    expect($response->json('token'))->toBeNull();
    expect($response->json('data.token'))->toBeNull();
})->with([
    'email as array'      => [['email' => ['a@b.test'], 'password' => 'x']],
    'password as array'   => [['email' => 'a@b.test', 'password' => ['x']]],
    'sql in email'        => [['email' => "' OR 1=1 --", 'password' => 'x']],
    'operator injection'  => [['email' => ['$ne' => null], 'password' => ['$ne' => null]]],
    'null credentials'    => [['email' => null, 'password' => null]],
    'empty payload'       => [[]],
]);