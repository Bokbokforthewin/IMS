<?php

declare(strict_types=1);

use App\Models\Department;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 6 — Input Fuzzing & Parameter Pollution
|--------------------------------------------------------------------------
| Contract for ANY hostile input: never a 5xx, never a stack trace / SQL /
| filesystem path in the body, never data from outside the caller's scope,
| never a sensitive attribute in the payload.
|
| APP_DEBUG is forced off by SecurityTestCase, so a leak here is a leak in
| production.
*/

beforeEach(function () {
    $this->dept = Department::factory()->create();
    $this->manager = $this->userWithRole('manager', $this->dept);
    $this->admin = $this->userWithRole('admin');

    $this->makeAsset($this->dept);
    $this->makeAsset(null, ['serial_number' => 'SN-FOREIGN-FUZZ']);
});

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

it('survives hostile query string :dataset on the asset list without 5xx or leaks', function (string $query) {
    $response = $this->callAs($this->manager, 'GET', Endpoints::ASSETS . '?' . $query);

    $this->assertNotServerError($response, $query);
    expect($response->status())->toBeIn([200, 400, 422]);
    $this->assertNoInternalLeak($response);
    $this->assertNoSensitiveKeys($response);
    $this->assertStringNotContainsString('SN-FOREIGN-FUZZ', (string) $response->getContent());
})->with('hostile_queries');

it('survives hostile query string :dataset on the admin user list without 5xx or leaks', function (string $query) {
    $response = $this->callAs($this->admin, 'GET', Endpoints::USERS . '?' . $query);

    $this->assertNotServerError($response, $query);
    expect($response->status())->toBeIn([200, 400, 422]);
    $this->assertNoInternalLeak($response);
    $this->assertNoSensitiveKeys($response);
})->with('hostile_queries');

it('answers 401 (never 5xx) for hostile query string :dataset when unauthenticated', function (string $query) {
    $response = $this->callAs(null, 'GET', Endpoints::ASSETS . '?' . $query);

    $response->assertUnauthorized();
    $this->assertNoInternalLeak($response);
})->with('hostile_queries');

it('does not let a bounded page size be bypassed', function () {
    $response = $this->callAs($this->manager, 'GET', Endpoints::ASSETS . '?per_page=2147483647');

    $this->assertNotServerError($response, 'per_page DoS');
    if ($response->status() === 200) {
        expect(count($this->rowsOf($response)))->toBeLessThanOrEqual(500);
    }
});

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

it('handles hostile field values :dataset on asset create without 5xx or leaks', function (array $fields) {
    $response = $this->callAs($this->manager, 'POST', Endpoints::ASSETS, array_merge(Endpoints::assetPayload(), $fields));

    $this->assertNotServerError($response, 'create with ' . substr(json_encode($fields) ?: '', 0, 120));
    expect($response->status())->toBeIn([201, 403, 422]);
    $this->assertNoInternalLeak($response);

    if ($response->status() === 422) {
        $response->assertJsonStructure(['message', 'errors']);
    }
})->with('hostile_bodies');

it('handles hostile field values :dataset on asset update without 5xx or leaks', function (array $fields) {
    $asset = $this->makeAsset($this->dept);

    $response = $this->callAs($this->manager, 'PUT', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_ITEM), $fields);

    $this->assertNotServerError($response, 'update with ' . substr(json_encode($fields) ?: '', 0, 120));
    expect($response->status())->toBeIn([200, 403, 422]);
    $this->assertNoInternalLeak($response);
})->with('hostile_bodies');

it('answers malformed :dataset bodies with a 4xx and no leak', function (string $contentType, string $body) {
    $this->flushHeaders();
    $this->app['auth']->forgetGuards();

    $response = $this->call('POST', Endpoints::ASSETS, [], [], [], [
        'CONTENT_TYPE'       => $contentType,
        'HTTP_ACCEPT'        => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $this->tokenFor($this->manager),
    ], $body);

    $this->assertNotServerError($response, "$contentType body");
    expect($response->status())->toBeIn([400, 403, 415, 422]);
    $this->assertNoInternalLeak($response);
    $this->assertStringNotContainsString('root:x:', (string) $response->getContent()); // XXE canary
})->with('malformed_raw_bodies');

// ---------------------------------------------------------------------------
// Route parameters & verbs
// ---------------------------------------------------------------------------

it('treats hostile route parameter :dataset as not-found/invalid, never as a 5xx', function (string $param) {
    $response = $this->callAs($this->manager, 'GET', Endpoints::ASSETS . '/' . $param);

    $this->assertNotServerError($response, "GET /assets/$param");
    expect($response->status())->toBeIn([400, 403, 404, 422]);
    $this->assertNoInternalLeak($response);
})->with('hostile_route_params');

it('rejects unexpected HTTP verb :dataset with a 4xx and never echoes the request', function (string $verb) {
    $response = $this->callAs($this->manager, $verb, Endpoints::ASSETS);

    $this->assertNotServerError($response, "$verb /assets");
    expect($response->status())->toBeIn([403, 404, 405]);
})->with(['TRACE', 'PROPFIND', 'PURGE', 'DELETE']);

it('answers unknown routes with a clean 404 that leaks no internals', function () {
    $response = $this->callAs($this->manager, 'GET', '/api/definitely-not-a-route/../../.env');

    expect($response->status())->toBeIn([400, 404]);
    $this->assertNoInternalLeak($response);
    $this->assertStringNotContainsString('APP_KEY', (string) $response->getContent());
});

// ---------------------------------------------------------------------------
// Response hygiene
// ---------------------------------------------------------------------------

it('never exposes sensitive attributes in profile or user responses', function () {
    foreach ([Endpoints::PROFILE, Endpoints::USERS] as $uri) {
        $response = $this->callAs($this->admin, 'GET', $uri)->assertOk();

        $this->assertNoSensitiveKeys($response);
        $this->assertNoInternalLeak($response);
    }
});