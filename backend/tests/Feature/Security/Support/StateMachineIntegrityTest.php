<?php

declare(strict_types=1);

use App\Models\Asset;
use App\Models\Department;
use Tests\Feature\Security\Support\Endpoints;

/*
|--------------------------------------------------------------------------
| Vector 5 — State Machine & Workflow Integrity Bypass
|--------------------------------------------------------------------------
| Legal transitions assumed by the suite (edit Endpoints::STATUS_* if yours differ):
|
|     available ──distribute──▶ distributed ──revert──▶ available
|     available ──────────────▶ retired (terminal)
|
| Everything else MUST be rejected with 422 (409 tolerated), leave the row
| untouched (no partial writes, not even updated_at) and add no ledger rows.
*/

beforeEach(function () {
    $this->dept = Department::factory()->create();
    $this->manager = $this->userWithRole('manager', $this->dept);
    $this->recipient = $this->userWithRole('end_user', $this->dept);

    /** Build an asset in the requested state through legitimate means. */
    $this->arrange = function (string $state): Asset {
        if ($state === Endpoints::STATUS_RETIRED) {
            return $this->makeAsset($this->dept, ['status' => Endpoints::STATUS_RETIRED]);
        }

        $asset = $this->makeAsset($this->dept);

        if ($state === Endpoints::STATUS_DISTRIBUTED) {
            $this->distributeAsset($this->manager, $asset, $this->recipient)->assertSuccessful();
        }

        return $asset;
    };
});

// ---------------------------------------------------------------------------
// Skipped prerequisites
// ---------------------------------------------------------------------------

it('rejects reverting an asset that was never distributed', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);
    $before = $this->rowSnapshot($asset);

    $response = $this->revertAsset($this->manager, $asset);

    $this->assertTransitionRejected($response, 'revert of never-distributed asset.');
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe(0);
});

it('rejects distributing without a recipient, and with a non-existent recipient', function (?int $recipientId) {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);
    $before = $this->rowSnapshot($asset);

    $payload = $recipientId === null ? [] : ['recipient_id' => $recipientId];
    $response = $this->callAs($this->manager, 'POST', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_DISTRIBUTE), $payload);

    $response->assertUnprocessable();
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe(0);
})->with([
    'missing recipient'      => [null],
    'non-existent recipient' => [987654321],
]);

it('rejects jumping to "distributed" through the status endpoint without a recipient', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);
    $before = $this->rowSnapshot($asset);

    $response = $this->setAssetStatus($this->manager, $asset, Endpoints::STATUS_DISTRIBUTED);

    $this->assertTransitionRejected($response, 'status jump skipping the distribution workflow.');
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe(0);
});

it('cannot bypass the workflow with a generic update carrying a status field', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);

    $response = $this->callAs($this->manager, 'PUT', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_ITEM), [
        'name'   => 'Renamed',
        'status' => Endpoints::STATUS_DISTRIBUTED,
    ]);

    $this->assertNotServerError($response, 'generic update with status');
    expect($this->rawValue($asset, 'status'))->toBe(Endpoints::STATUS_AVAILABLE);
    expect($this->historyCount($asset))->toBe(0);
});

// ---------------------------------------------------------------------------
// Illegal transitions
// ---------------------------------------------------------------------------

it('rejects the illegal transition :dataset via the status endpoint and corrupts nothing', function (string $from, string $to) {
    $asset = ($this->arrange)($from);
    $before = $this->rowSnapshot($asset);
    $historyBefore = $this->historyCount($asset);

    $response = $this->setAssetStatus($this->manager, $asset, $to);

    $this->assertTransitionRejected($response, "$from -> $to.");
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe($historyBefore);
})->with([
    'retired -> available'     => [Endpoints::STATUS_RETIRED, Endpoints::STATUS_AVAILABLE],
    'retired -> distributed'   => [Endpoints::STATUS_RETIRED, Endpoints::STATUS_DISTRIBUTED],
    'distributed -> retired (must revert first)' => [Endpoints::STATUS_DISTRIBUTED, Endpoints::STATUS_RETIRED],
    'distributed -> distributed' => [Endpoints::STATUS_DISTRIBUTED, Endpoints::STATUS_DISTRIBUTED],
]);

it('rejects distributing or reverting a retired (terminal) asset', function (string $action) {
    $asset = ($this->arrange)(Endpoints::STATUS_RETIRED);
    $before = $this->rowSnapshot($asset);

    $response = $action === 'distribute'
        ? $this->distributeAsset($this->manager, $asset, $this->recipient)
        : $this->revertAsset($this->manager, $asset);

    $this->assertTransitionRejected($response, "$action on retired asset.");
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe(0);
})->with(['distribute', 'revert']);

it('rejects distributing an asset that is already distributed and keeps the original holder', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_DISTRIBUTED);
    $otherRecipient = $this->userWithRole('end_user', $this->dept);
    $before = $this->rowSnapshot($asset);

    $response = $this->distributeAsset($this->manager, $asset, $otherRecipient);

    $this->assertTransitionRejected($response, 'double distribution.');
    expect($this->rowSnapshot($asset))->toEqual($before);
    expect($this->historyCount($asset))->toBe(1);
});

it('allows exactly one revert when the same request is replayed', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_DISTRIBUTED);

    $first = $this->revertAsset($this->manager, $asset);
    $first->assertSuccessful();
    expect($this->rawValue($asset, 'status'))->toBe(Endpoints::STATUS_AVAILABLE);
    $afterFirst = $this->rowSnapshot($asset);
    $ledgerAfterFirst = $this->historyCount($asset);

    $second = $this->revertAsset($this->manager, $asset);

    $this->assertTransitionRejected($second, 'replayed revert.');
    expect($this->rowSnapshot($asset))->toEqual($afterFirst);
    expect($this->historyCount($asset))->toBe($ledgerAfterFirst);
});

it('records exactly one ledger entry when a distribute request is double-submitted', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);

    $first = $this->distributeAsset($this->manager, $asset, $this->recipient);
    $second = $this->distributeAsset($this->manager, $asset, $this->recipient);

    $first->assertSuccessful();
    $this->assertTransitionRejected($second, 'duplicate distribute submission.');
    expect($this->historyCount($asset))->toBe(1);
    expect($this->rawValue($asset, 'status'))->toBe(Endpoints::STATUS_DISTRIBUTED);
});

// ---------------------------------------------------------------------------
// Status value validation
// ---------------------------------------------------------------------------

it('rejects invalid status value :dataset with 422 and changes nothing', function (mixed $status) {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);
    $before = $this->rowSnapshot($asset);

    $response = $this->setAssetStatus($this->manager, $asset, $status);

    $response->assertUnprocessable();
    $this->assertNoInternalLeak($response);
    expect($this->rowSnapshot($asset))->toEqual($before);
})->with([
    'unknown value'      => ['teleported'],
    'empty string'       => [''],
    'null'               => [null],
    'integer'            => [1],
    'array'              => [[Endpoints::STATUS_AVAILABLE]],
    'wrong case'         => ['AVAILABLE'],
    'padded whitespace'  => [' available'],
    'sql payload'        => ["available'; DROP TABLE assets; --"],
]);

// ---------------------------------------------------------------------------
// Data integrity of serialized assets
// ---------------------------------------------------------------------------

it('keeps the serial number immutable while an asset is distributed', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_DISTRIBUTED);
    $serial = $this->rawValue($asset, 'serial_number');

    $response = $this->callAs($this->manager, 'PUT', str_replace('{asset}', (string) $asset->getKey(), Endpoints::ASSET_ITEM), [
        'name'          => 'Renamed',
        'serial_number' => 'SN-REWRITTEN-IN-FLIGHT',
    ]);

    $this->assertNotServerError($response, 'serial rewrite on distributed asset');
    expect($this->rawValue($asset, 'serial_number'))->toBe($serial);
});

it('refuses to distribute a soft-deleted asset', function () {
    $asset = ($this->arrange)(Endpoints::STATUS_AVAILABLE);
    $asset->delete();

    $response = $this->distributeAsset($this->manager, $asset, $this->recipient);

    expect($response->status())->toBeIn([404, 422]);
    expect($this->historyCount($asset))->toBe(0);
});