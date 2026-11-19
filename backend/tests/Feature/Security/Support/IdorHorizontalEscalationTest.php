<?php

declare(strict_types=1);

use App\Models\Asset;
use App\Models\Department;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 4 — IDOR & Horizontal Privilege Escalation
|--------------------------------------------------------------------------
| Fixture: a manager in Department A, plus an asset (and recipient) that
| belong to Department B. The manager holds every permission needed for the
| action; the ONLY thing that may stop them is the department boundary.
|
| 403 and 404 are both acceptable "denied" answers (404 additionally hides
| existence). Anything 2xx, 422 or 5xx is a finding.
*/

beforeEach(function () {
    $this->deptA = Department::factory()->create();
    $this->deptB = Department::factory()->create();

    $this->managerA = $this->userWithRole('manager', $this->deptA);
    $this->recipientB = $this->userWithRole('end_user', $this->deptB);

    $this->assetA = $this->makeAsset($this->deptA);
    $this->assetB = $this->makeAsset($this->deptB, ['serial_number' => 'SN-FOREIGN-0001']);

    $this->uriFor = fn (Asset $asset, string $template = Endpoints::ASSET_ITEM): string => str_replace('{asset}', (string) $asset->getKey(), $template);
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

it('lets the manager read assets inside their own department (control)', function () {
    $this->callAs($this->managerA, 'GET', ($this->uriFor)($this->assetA))->assertOk();
});

it('denies reading a single asset from another department without leaking its data', function () {
    $response = $this->callAs($this->managerA, 'GET', ($this->uriFor)($this->assetB));

    expect($response->status())->toBeIn([403, 404]);
    $this->assertStringNotContainsString('SN-FOREIGN-0001', (string) $response->getContent());
    $this->assertNoInternalLeak($response);
});

it('excludes other departments\' assets from list responses', function () {
    $response = $this->callAs($this->managerA, 'GET', Endpoints::ASSETS)->assertOk();

    $this->assertStringNotContainsString('SN-FOREIGN-0001', (string) $response->getContent());
    foreach ($this->rowsOf($response) as $row) {
        if (array_key_exists('department_id', $row)) {
            expect((int) $row['department_id'])->toBe((int) $this->deptA->getKey());
        }
    }
});

it('cannot widen the visible scope with filter/include tricks (:dataset)', function (string $query) {
    $query = str_replace(['{A}', '{B}'], [(string) $this->deptA->getKey(), (string) $this->deptB->getKey()], $query);

    $response = $this->callAs($this->managerA, 'GET', Endpoints::ASSETS . '?' . $query);

    $this->assertNotServerError($response, $query);
    $this->assertStringNotContainsString('SN-FOREIGN-0001', (string) $response->getContent());
    foreach ($this->rowsOf($response) as $row) {
        if (array_key_exists('department_id', $row)) {
            expect((int) $row['department_id'])->toBe((int) $this->deptA->getKey());
        }
    }
})->with('scope_bypass_queries');

it('denies the nested department route for a department the manager does not belong to', function () {
    $uri = str_replace('{department}', (string) $this->deptB->getKey(), Endpoints::DEPARTMENT_ASSETS);

    $response = $this->callAs($this->managerA, 'GET', $uri);

    expect($response->status())->toBeIn([403, 404]);
    $this->assertStringNotContainsString('SN-FOREIGN-0001', (string) $response->getContent());
});

it('does not let sequential ID enumeration reach foreign records', function () {
    $max = (int) Asset::withoutGlobalScopes()->max('id') + 5;

    for ($id = 1; $id <= $max; $id++) {
        $response = $this->callAs($this->managerA, 'GET', Endpoints::ASSETS . '/' . $id);

        $this->assertNotServerError($response, "GET asset #$id");
        expect($response->status())->toBeIn([200, 403, 404]);

        if ($response->status() === 200) {
            $this->assertSame((int) $this->deptA->getKey(), (int) $response->json('data.department_id', $response->json('department_id')), "Asset #$id is outside the caller's department yet was returned.");
        }
    }
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

it('denies :dataset on a foreign asset and leaves the row byte-for-byte unchanged', function (string $method, string $uriTemplate, array $payload, string $requiredState) {
    $dept = $this->deptB;
    $asset = $this->makeAsset($dept, ['status' => $requiredState]);
    $before = $this->rowSnapshot($asset);
    $historyBefore = $this->historyCount($asset);

    array_walk_recursive($payload, function (&$value) {
        if ($value === '__recipient__') {
            $value = $this->recipientB->getKey();
        }
    });

    $response = $this->callAs($this->managerA, $method, ($this->uriFor)($asset, $uriTemplate), $payload);

    // 403/404 ONLY: a 422 here would mean the workflow ran before the scope check.
    expect($response->status())->toBeIn([403, 404]);
    $this->assertNoInternalLeak($response);

    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe($historyBefore);
})->with('foreign_asset_mutations');

it('refuses to move an owned asset into another department', function () {
    $before = $this->rawValue($this->assetA, 'department_id');

    $response = $this->callAs($this->managerA, 'PUT', ($this->uriFor)($this->assetA), [
        'name'          => 'Smuggled',
        'department_id' => $this->deptB->getKey(),
    ]);

    $this->assertNotServerError($response, 'cross-department transfer');
    expect($this->rawValue($this->assetA, 'department_id'))->toEqual($before);
});

it('refuses to distribute an owned asset to a recipient in another department', function () {
    $before = $this->rowSnapshot($this->assetA);

    $response = $this->distributeAsset($this->managerA, $this->assetA, $this->recipientB);

    expect($response->status())->toBeIn([403, 404, 422]);
    expect($this->rowSnapshot($this->assetA))->toEqual($before);
    expect($this->historyCount($this->assetA))->toBe(0);
});

it('does not mutate foreign assets smuggled into a bulk request', function () {
    if (Endpoints::ASSET_BULK_DISTRIBUTE === null) {
        $this->markTestSkipped('No bulk endpoint configured.');
    }

    $recipientA = $this->userWithRole('end_user', $this->deptA);
    $beforeB = $this->rowSnapshot($this->assetB);

    $response = $this->callAs($this->managerA, 'POST', Endpoints::ASSET_BULK_DISTRIBUTE, [
        'asset_ids'    => [$this->assetA->getKey(), $this->assetB->getKey()],
        'recipient_id' => $recipientA->getKey(),
    ]);

    $this->assertNotServerError($response, 'bulk distribute');
    expect($this->rowSnapshot($this->assetB))->toEqual($beforeB);
    expect($this->historyCount($this->assetB))->toBe(0);

    // Atomicity: a request that includes a forbidden ID must not half-apply.
    if ($response->status() >= 400) {
        expect($this->historyCount($this->assetA))->toBe(0);
    }
});

// ---------------------------------------------------------------------------
// Control: legitimate cross-scope access still works for a global administrator
// ---------------------------------------------------------------------------

it('still lets a global administrator read the foreign asset (control for the denials above)', function () {
    $admin = $this->userWithRole('admin');

    $response = $this->callAs($admin, 'GET', ($this->uriFor)($this->assetB));

    expect($response->status())->toBe(200);
});