<?php

namespace App\Console\Commands;

use App\Models\AccountabilityReceipt;
use App\Models\AssetTransfer;
use App\Models\Category;
use App\Models\Item;
use App\Models\SerializedAsset;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * One-time import of legacy inventory data.
 *
 *  - devices.csv   = receiving log (every physical asset)
 *  - Inventory.csv = who holds what (end-user, memorandum receipt holder, PTR)
 *
 * "Sticker No." (the property number) is the true shared key. The two files'
 * "Item No." columns are independent counters and do NOT line up.
 *
 * Where each record goes:
 *  - Every asset                    -> serialized_assets
 *  - Every distributed asset        -> exactly ONE accountability_receipts line
 *                                      (grouped per end-user + date). A PAR/ICS is
 *                                      never issued twice for the same asset.
 *  - Distributed asset WITH a PTR   -> ALSO one asset_transfer row (the PTR number
 *                                      is the document). The transfer only changes
 *                                      serialized_assets.current_holder_id; the
 *                                      receipt itself is never touched.
 *  - Available asset                -> serialized_assets only (never has a PTR)
 *
 * Limitation: the CSV only records who holds an asset NOW. For PTR-tagged
 * assets the receipt therefore uses that person and date, and the transfer's
 * "from" is a clearly-labelled placeholder user.
 *
 * Every recorded value is kept as written, including "CPU Clone", "Unknown"
 * and "N/A" - those are real encoder entries, not missing data.
 *
 * Usage:
 *   php artisan import:legacy-inventory devices.csv Inventory.csv --dry-run
 *   php artisan import:legacy-inventory devices.csv Inventory.csv
 */
class ImportLegacyInventory extends Command
{
    protected $signature = 'import:legacy-inventory
        {devices : Path to devices.csv}
        {inventory : Path to Inventory.csv}
        {--dry-run : Show what would be imported without writing anything}';

    protected $description = 'Import legacy inventory (devices.csv + Inventory.csv) into categories, items, assets, receipts and transfers';

    // Placeholder-looking serial text is kept verbatim, but suffixed with the
    // asset's own unique property number because serial_number is unique().
    private const PLACEHOLDER_SERIALS = ['cpu clone', 'unknown', 'n/a', 'na', 'none'];

    // The CSV never records who held an asset BEFORE a PTR transfer, but
    // asset_transfer.user_id (from) is required. One clearly-labelled
    // placeholder user stands in for "previous holder unknown".
    private const UNKNOWN_HOLDER_EMAIL = 'legacy-unknown-holder@doh-nir.local';
    private const UNKNOWN_HOLDER_NAME = 'Legacy Import - Previous Holder Unknown';

    private array $stats = [
        'categories_created' => 0,
        'items_created' => 0,
        'assets_created' => 0,
        'receipts_created' => 0,
        'lines_created' => 0,
        'transfers_created' => 0,
        'users_created' => 0,
        'warnings' => [],
    ];

    /** normalized lowercase name => user id */
    private ?array $userMap = null;

    public function handle(): int
    {
        $devicesPath = $this->argument('devices');
        $inventoryPath = $this->argument('inventory');
        $dryRun = $this->option('dry-run');

        if (!file_exists($devicesPath) || !file_exists($inventoryPath)) {
            $this->error('One or both CSV files were not found at the given paths.');
            return self::FAILURE;
        }

        $devices = $this->readCsv($devicesPath);
        $inventory = $this->readCsv($inventoryPath);

        $this->info('Read ' . count($devices) . ' rows from devices.csv');
        $this->info('Read ' . count($inventory) . ' rows from Inventory.csv');

        // --- Step 1: merge by Sticker No. ---
        $merged = [];
        foreach ($devices as $row) {
            $sticker = trim($row['Sticker No.']);
            if ($sticker === '') continue;
            $merged[$sticker] = $this->normalizeDeviceRow($row);
        }
        foreach ($inventory as $row) {
            $sticker = trim($row['Sticker No.']);
            if ($sticker === '') continue;
            $norm = $this->normalizeInventoryRow($row);
            if (isset($merged[$sticker])) {
                // Inventory.csv wins wherever it has a value (more current record)
                foreach ($norm as $k => $v) {
                    if ($v !== null && $v !== '') {
                        $merged[$sticker][$k] = $v;
                    }
                }
            } else {
                $merged[$sticker] = $norm;
            }
        }

        // devices.csv's "PTR No." column holds spilled serial/accessory text on
        // some rows (e.g. "Mouse - FCYRV0AHD6971Y"). A real PTR only ever comes
        // from Inventory.csv, so anything left over is kept as a note instead.
        foreach ($merged as $sticker => &$row) {
            if ($row['ptr_no'] === '' && $row['ptr_spill'] !== '') {
                $row['notes'] = trim($row['notes'] . ' | PTR column text: ' . $row['ptr_spill'], ' |');
            }
        }
        unset($row);

        $this->info('Merged into ' . count($merged) . ' unique physical assets (by Sticker No.)');

        // --- Step 2: categories ---
        $categoryMap = $this->buildCategoryMap($merged);
        $this->line('');
        $this->info('Categories to be used (' . count($categoryMap) . '):');
        foreach ($categoryMap as $info) {
            $this->line("  - {$info['label']}  (from: " . implode(', ', array_unique($info['original_casings'])) . ')');
        }

        // --- Step 3: catalog items, grouped by (category, brand, model) ---
        $itemGroups = [];
        foreach ($merged as $sticker => $row) {
            $categoryLabel = $categoryMap[Str::lower(trim($row['category_raw']))]['label'];
            $brand = $this->trimOrNull($row['brand']);
            $model = $this->trimOrNull($row['model']);
            $itemKey = Str::lower($categoryLabel . '|' . ($brand ?? '') . '|' . ($model ?? ''));

            if (!isset($itemGroups[$itemKey])) {
                $itemGroups[$itemKey] = [
                    'category_label' => $categoryLabel,
                    'brand' => $brand,
                    'model' => $model,
                    'name' => trim(($brand ?? '') . ' ' . ($model ?? '')) ?: $categoryLabel,
                    'assets' => [],
                ];
            }
            $itemGroups[$itemKey]['assets'][] = $sticker;
        }

        $this->line('');
        $this->info('Catalog items to be created (' . count($itemGroups) . '):');
        foreach ($itemGroups as $group) {
            $this->line("  - [{$group['category_label']}] {$group['name']} (" . count($group['assets']) . ' unit(s))');
        }

        // --- Step 4: every distributed asset gets exactly ONE receipt line;
        //     those that also carry a PTR additionally get a transfer record ---
        $transferStickers = [];
        $receiptGroups = [];
        foreach ($merged as $sticker => $row) {
            if ($row['status'] !== 'Assigned') continue;

            // Use management_receipt as the primary user if present, otherwise fall back to end_user
            $primaryUser = $row['management_receipt'] !== '' ? $row['management_receipt'] : $row['end_user'];
            if ($primaryUser === '') continue;

            $key = Str::lower($primaryUser) . '|' . $row['date_issued'];
            $receiptGroups[$key]['end_user'] ??= $primaryUser;
            // "Management Receipt" = the memorandum receipt holder (unit head)
            $receiptGroups[$key]['mr_holder'] ??= $row['management_receipt'];
            $receiptGroups[$key]['date'] ??= $row['date_issued'];
            $receiptGroups[$key]['assets'][] = $sticker;

            if ($row['ptr_no'] !== '') {
                $transferStickers[] = $sticker;
            }
        }

        $this->line('');
        $this->info('Asset transfers (PTR) to be created (' . count($transferStickers) . '):');
        $ptrCounts = [];
        foreach ($transferStickers as $s) {
            $ptrCounts[$merged[$s]['ptr_no']] = ($ptrCounts[$merged[$s]['ptr_no']] ?? 0) + 1;
        }
        foreach ($ptrCounts as $ptr => $count) {
            $this->line("  - {$ptr}  ({$count} asset(s))");
        }

        $this->line('');
        $this->info('Accountability receipts to be created (' . count($receiptGroups) . '):');
        foreach ($receiptGroups as $group) {
            $this->line("  - {$group['end_user']} on {$group['date']} (" . count($group['assets']) . ' item(s))');
        }

        if ($dryRun) {
            $this->line('');
            $this->warn('DRY RUN - nothing was written. Re-run without --dry-run to import for real.');
            $this->printWarnings();
            $this->printCostWarning();
            return self::SUCCESS;
        }

        if (!$this->confirm('Write ' . count($merged) . ' assets, ' . count($transferStickers) . ' transfers and ' . count($receiptGroups) . ' receipts to the database?')) {
            $this->warn('Cancelled.');
            return self::SUCCESS;
        }

        // --- Step 5: write everything in one transaction ---
        $usedSerials = [];

        DB::transaction(function () use ($categoryMap, $itemGroups, $merged, $receiptGroups, $transferStickers, &$usedSerials) {
            $categoryIds = [];
            foreach ($categoryMap as $info) {
                $category = Category::firstOrCreate(
                    ['name' => $info['label']],
                    ['description' => 'Imported from legacy system']
                );
                $categoryIds[$info['label']] = $category->id;
                if ($category->wasRecentlyCreated) $this->stats['categories_created']++;
            }

            $itemIds = [];
            foreach ($itemGroups as $itemKey => $group) {
                $item = Item::firstOrCreate(
                    [
                        'category_id' => $categoryIds[$group['category_label']],
                        'name' => $group['name'],
                        'brand' => $group['brand'],
                    ],
                    [
                        'item_code' => $this->generateItemCode($group['category_label']),
                        'specifications' => null,
                        'type' => null,
                        'unit_of_measure' => 'unit',
                        'reorder_level' => 5,
                        'tracking_type' => 'asset',
                        'estimated_useful_life' => null,
                    ]
                );
                $itemIds[$itemKey] = $item->id;
                if ($item->wasRecentlyCreated) $this->stats['items_created']++;
            }

            $assetBySticker = [];
            $itemNameBySticker = [];
            foreach ($merged as $sticker => $row) {
                $categoryLabel = $categoryMap[Str::lower(trim($row['category_raw']))]['label'];
                $brand = $this->trimOrNull($row['brand']);
                $model = $this->trimOrNull($row['model']);
                $itemKey = Str::lower($categoryLabel . '|' . ($brand ?? '') . '|' . ($model ?? ''));

                $holderId = null;
                if ($row['status'] === 'Assigned') {
                    if ($row['end_user'] !== '') {
                        $holderId = $this->resolveUserId($row['end_user']);
                    } else {
                        $this->stats['warnings'][] = "{$sticker} is marked Distributed but has no end-user - imported with no holder.";
                    }
                }

                $remarksParts = [];
                if ($row['notes'] !== '') $remarksParts[] = 'Legacy notes: ' . $row['notes'];
                $remarksParts[] = 'Imported from legacy system - unit_cost unknown, defaulted to 0.';

                $createdAt = $this->parseDate($row['received_date']) ?? $this->parseDate($row['date_issued']) ?? now();

                $asset = SerializedAsset::create([
                    'item_id' => $itemIds[$itemKey],
                    'serial_number' => $this->resolveSerial($row['serial'], $sticker, $usedSerials),
                    'property_number' => $sticker,
                    'model' => $model,
                    'manufacturer_name' => null,
                    'country_of_origin' => null,
                    'unit_cost' => 0,
                    'status' => $row['status'],
                    'current_holder_id' => $holderId,
                    'quantity_on_hand' => 1,
                    'condition_remarks' => implode(' | ', $remarksParts),
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $assetBySticker[$sticker] = $asset;
                $itemNameBySticker[$sticker] = $itemGroups[$itemKey]['name'];
                $this->stats['assets_created']++;
            }

         // --- Receipts: original issuance, one per (end-user, date) ---
            foreach ($receiptGroups as $group) {
                $userId = $this->resolveUserId($group['end_user']);
                $dateIssued = $this->parseDate($group['date']) ?? now();

                // Fetch the user record to extract their unit
                $user = User::find($userId);
                $unitPrefix = ($user && !empty($user->unit)) 
                    ? strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $user->unit)) 
                    : 'LEGACY';

                $mrHolderId = $this->findUserId($group['mr_holder']);
                if ($mrHolderId === null && $group['mr_holder'] !== '') {
                    $this->stats['warnings'][] = "Memorandum receipt holder '{$group['mr_holder']}' not found in users - left empty.";
                }

                $receipt = AccountabilityReceipt::create([
                    'receipt_type' => 'ICS', // cost unknown for every legacy row - see warning
                    'document_number' => $this->nextLegacyDocNumber($unitPrefix, $dateIssued->format('Y')),
                    'user_id' => $userId,
                    'issued_by_id' => null, // not recorded in the legacy data
                    'received_mr_by_id' => $mrHolderId,
                    'date_issued' => $dateIssued,
                    'remarks' => 'Imported from legacy system.',
                ]);
                $this->stats['receipts_created']++;

                foreach ($group['assets'] as $sticker) {
                    $asset = $assetBySticker[$sticker];
                    $receipt->lines()->create([
                        'serialized_asset_id' => $asset->id,
                        'item_id' => $asset->item_id,
                        'quantity' => 1,
                    ]);
                    $this->stats['lines_created']++;
                }
            }

            // --- Transfers come AFTER issuance: one asset_transfer row per
            //     PTR-tagged asset. Receipts are never modified by a transfer. ---
            if (!empty($transferStickers)) {
                $fromUserId = $this->legacyUnknownHolderId();

                foreach ($transferStickers as $sticker) {
                    $row = $merged[$sticker];
                    $this->recordTransfer(
                        $assetBySticker[$sticker],
                        $row['ptr_no'],
                        $fromUserId,
                        $this->resolveUserId($row['end_user']),
                        $this->parseDate($row['date_issued']) ?? now(),
                        $itemNameBySticker[$sticker]
                    );
                }
            }
        });

        $this->line('');
        $this->info('Import complete.');
        $this->table(['Metric', 'Count'], [
            ['Categories created', $this->stats['categories_created']],
            ['Catalog items created', $this->stats['items_created']],
            ['Serialized assets created', $this->stats['assets_created']],
            ['Asset transfers created', $this->stats['transfers_created']],
            ['Accountability receipts created', $this->stats['receipts_created']],
            ['Receipt lines created', $this->stats['lines_created']],
            ['Users created (placeholders)', $this->stats['users_created']],
        ]);
        $this->printWarnings();
        $this->printCostWarning();

        return self::SUCCESS;
    }

    /**
     * Creates the transfer record AND enforces the rule that a transfer moves
     * the asset to whoever it was transferred to. Only serialized_assets
     * .current_holder_id changes - the receipt's user and issuer stay as issued.
     */
    private function recordTransfer(
        SerializedAsset $asset,
        string $ptrNo,
        int $fromUserId,
        int $toUserId,
        Carbon $date,
        string $itemName
    ): void {
        AssetTransfer::create([
            'document_number' => $ptrNo, // original PTR number, verbatim
            'transfer_type' => 'TRANSFER',
            'serialized_asset_id' => $asset->id,
            'user_id' => $fromUserId,
            'transfered_to' => $toUserId,
            'description' => "Legacy transfer - {$itemName}",
            'reason' => ' ', // required column, nothing recorded in the legacy data
            'transfer_date' => $date,
            'remarks' => 'Imported from legacy system. Previous holder was not recorded.',
        ]);

        $asset->update([
            'current_holder_id' => $toUserId,
            'status' => 'Assigned',
        ]);

        $this->stats['transfers_created']++;
    }

    private function printWarnings(): void
    {
        if (empty($this->stats['warnings'])) return;

        $this->line('');
        $this->warn('Notes from the import (' . count($this->stats['warnings']) . '):');
        foreach (array_unique($this->stats['warnings']) as $w) {
            $this->line('  - ' . $w);
        }
    }

    private function printCostWarning(): void
    {
        $this->line('');
        $this->warn('IMPORTANT: Neither source file contains cost data.');
        $this->warn('Every imported asset has unit_cost = 0 and any receipt was classified as ICS,');
        $this->warn('since 0 is below the 50,000 PAR threshold. Many of these (desktops, laptops,');
        $this->warn('servers) are almost certainly worth more. Correct unit_cost and reclassify');
        $this->warn('receipts to PAR where appropriate.');
    }

    /**
     * fgetcsv (not a stricter CSV package) so malformed rows - extra commas
     * from unescaped Notes text - can be repaired instead of dropped.
     */
    private function readCsv(string $path): array
    {
        $rows = [];
        $handle = fopen($path, 'r');
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") rewind($handle);

        $header = fgetcsv($handle);
        $headerCount = count($header);

        while (($fields = fgetcsv($handle)) !== false) {
            if (count($fields) === $headerCount) {
                $rows[] = array_combine($header, $fields);
                continue;
            }

            if (count($fields) > $headerCount) {
                // First 9 columns map normally (Item No. .. Status), the overflow
                // is rejoined as Notes, and the last field is Received.
                $fixed = array_slice($fields, 0, 9);
                $overflowCount = count($fields) - $headerCount;
                $notesParts = array_slice($fields, 9, 1 + $overflowCount);
                $fixed[] = implode(', ', array_map('trim', $notesParts));
                $fixed[] = end($fields);
                $rows[] = array_combine($header, $fixed);
                $this->stats['warnings'][] = 'Repaired malformed row (extra commas): ' . implode(',', $fields);
                continue;
            }

            $rows[] = array_combine($header, array_pad($fields, $headerCount, ''));
            $this->stats['warnings'][] = 'Padded short row: ' . implode(',', $fields);
        }

        fclose($handle);
        return $rows;
    }

    private function normalizeDeviceRow(array $row): array
    {
        return [
            'category_raw' => $row['Device'] ?? '',
            'brand' => $row['Brand'] ?? '',
            'model' => $row['Model'] ?? '',
            'serial' => $row['Serial No.'] ?? '',
            'status' => $this->normalizeStatus($row['Status'] ?? ''),
            'notes' => trim($row['Notes'] ?? ''),
            'received_date' => trim($row['Received'] ?? ''),
            'ptr_no' => '', // never trusted from devices.csv
            'ptr_spill' => $this->normalizeWhitespace($row['PTR No.'] ?? ''),
            'end_user' => '',
            'management_receipt' => '',
            'date_issued' => '',
        ];
    }

    private function normalizeInventoryRow(array $row): array
    {
        return [
            'category_raw' => $row['Item'] ?? '',
            'brand' => $row['Brand'] ?? '',
            'model' => $row['Model'] ?? '',
            'serial' => $row['Serial No.'] ?? '',
            'status' => $this->normalizeStatus($row['Status'] ?? ''),
            'notes' => '',
            'received_date' => '',
            'ptr_no' => $this->normalizeWhitespace($row['PTR No.'] ?? ''),
            'ptr_spill' => '',
            'end_user' => $this->normalizeWhitespace($row['End-user'] ?? ''),
            'management_receipt' => $this->normalizeWhitespace($row['Management Receipt'] ?? ''),
            'date_issued' => trim($row['Date'] ?? ''),
        ];
    }

    private function normalizeStatus(string $status): string
    {
        return match (strtolower(trim($status))) {
            'distributed' => 'Assigned',
            default => 'Available',
        };
    }

    private function normalizeWhitespace(string $s): string
    {
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    // Only truly empty fields become NULL - "N/A" and "Unknown" are kept as written.
    private function trimOrNull(string $value): ?string
    {
        $value = $this->normalizeWhitespace($value);
        return $value === '' ? null : $value;
    }

    private function resolveSerial(string $rawValue, string $propertyNumber, array &$usedSerials): ?string
    {
        $trimmed = $this->normalizeWhitespace($rawValue);
        if ($trimmed === '') {
            return null;
        }

        $lower = Str::lower($trimmed);

        if (in_array($lower, self::PLACEHOLDER_SERIALS, true)) {
            return "{$trimmed} - {$propertyNumber}";
        }

        if (isset($usedSerials[$lower])) {
            return "{$trimmed} - {$propertyNumber}";
        }

        $usedSerials[$lower] = true;
        return $trimmed;
    }

    private function parseDate(?string $value): ?Carbon
    {
        $value = trim((string) $value);
        if ($value === '') return null;
        try {
            return Carbon::parse($value);
        } catch (\Exception $e) {
            return null;
        }
    }

    // "Ipad" + "iPad" -> "Ipad/iPad" (whatever casings actually appear)
    private function buildCategoryMap(array $merged): array
    {
        $byLower = [];
        foreach ($merged as $row) {
            $raw = trim($row['category_raw']);
            if ($raw === '') continue;
            $byLower[Str::lower($raw)]['original_casings'][] = $raw;
        }

        foreach ($byLower as &$info) {
            $uniqueCasings = array_values(array_unique($info['original_casings']));
            $info['label'] = count($uniqueCasings) > 1
                ? implode('/', $uniqueCasings)
                : $uniqueCasings[0];
        }
        unset($info);

        return $byLower;
    }

    private array $generatedItemCodes = [];

    private function generateItemCode(string $categoryLabel): string
    {
        $cleaned = preg_replace('/[^a-zA-Z]/', '', $categoryLabel);
        $prefix = strtoupper(substr($cleaned, 0, 3));
        if (strlen($prefix) < 3) $prefix = str_pad($prefix, 3, 'X', STR_PAD_RIGHT);

        $pattern = sprintf('DOH-NIR-%s-%s-%s-', $prefix, date('Y'), date('m'));
        $last = Item::where('item_code', 'LIKE', $pattern . '%')->orderBy('id', 'desc')->first();
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->item_code);
            $seq = intval(end($parts)) + 1;
        }
        do {
        $candidateCode = sprintf('%s%03d', $pattern, $seq);
        $seq++;
            } while (
                in_array($candidateCode, $this->generatedItemCodes) ||
                Item::where('item_code', $candidateCode)->exists()
            );
        $this->generatedItemCodes[] = $candidateCode;
        return $candidateCode;
    }

    private function nextLegacyDocNumber(string $prefix, string $year): string
    {
        $last = AccountabilityReceipt::where('document_number', 'like', "{$prefix}-{$year}-%")
            ->orderBy('id', 'desc')->first();
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->document_number);
            $seq = intval(end($parts)) + 1;
        }
        return sprintf('%s-%s-%04d', $prefix, $year, $seq);
    }

    /**
     * Name lookup against all users, loaded once. Matching happens in PHP
     * (whitespace-collapsed, case-insensitive) so it doesn't depend on any
     * database regex function.
     */
    private function loadUserMap(): void
    {
        if ($this->userMap !== null) return;

        $this->userMap = [];
        foreach (User::query()->get(['id', 'name']) as $user) {
            $this->userMap[Str::lower($this->normalizeWhitespace($user->name))] = $user->id;
        }
    }

    // Lookup only - returns null instead of creating anything.
    private function findUserId(string $name): ?int
    {
        $name = $this->normalizeWhitespace($name);
        if ($name === '') return null;

        $this->loadUserMap();
        return $this->userMap[Str::lower($name)] ?? null;
    }

    // Lookup, falling back to a placeholder user (for required recipient columns).
    private function resolveUserId(string $name): ?int
    {
        $name = $this->normalizeWhitespace($name);
        if ($name === '') return null;

        $found = $this->findUserId($name);
        if ($found !== null) return $found;

        $this->stats['warnings'][] = "No matching user for '{$name}' - created a placeholder user.";
        $this->stats['users_created']++;

        $placeholder = User::create([
            'name' => $name,
            'unit' => ' ',
            'division' => ' ',
            'designation' => ' ',
            'email' => 'legacy-' . Str::slug($name) . '-' . Str::random(4) . '@doh-nir.local',
            'password' => Str::random(40),
        ]);

        $this->userMap[Str::lower($name)] = $placeholder->id;
        return $placeholder->id;
    }

    private function legacyUnknownHolderId(): int
    {
        $user = User::firstOrCreate(
            ['email' => self::UNKNOWN_HOLDER_EMAIL],
            [
                'name' => self::UNKNOWN_HOLDER_NAME,
                'unit' => ' ',
                'division' => ' ',
                'designation' => ' ',
                'password' => Str::random(40),
            ]
        );

        if ($user->wasRecentlyCreated) $this->stats['users_created']++;

        return $user->id;
    }
}
