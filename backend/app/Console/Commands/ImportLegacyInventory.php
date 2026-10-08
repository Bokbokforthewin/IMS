<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Item;
use App\Models\SerializedAsset;
use App\Models\User;
use App\Models\AccountabilityReceipt;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * One-time import of legacy inventory data from two CSV exports of a
 * previous system (devices.csv = receiving log, Inventory.csv = who
 * currently holds what). Both files use "Sticker No." (the property
 * number) as the true shared key — their "Item No." columns are two
 * independent counters and do NOT line up between files.
 *
 * Usage:
 *   php artisan import:legacy-inventory devices.csv Inventory.csv --dry-run
 *   php artisan import:legacy-inventory devices.csv Inventory.csv
 */
class ImportLegacyInventory extends Command
{
    protected $signature = 'import:legacy-inventory
        {devices? : "C:\Users\Administrator\Downloads\devices.csv"}
        {inventory? : "C:\Users\Administrator\Downloads\Inventory.csv"}
        {--dry-run : Show what would be imported without writing anything}';

    protected $description = 'Import legacy inventory data (devices.csv + Inventory.csv) into categories, items, and serialized_assets';

    // Values that mean "no real serial was recorded" — stored as NULL,
    // never preserved as a fake-unique string (serial_number is unique()).
    private const PLACEHOLDER_SERIALS = ['', 'n/a', 'na', 'cpu clone', 'unknown', 'none'];

    private array $stats = [
        'categories_created' => 0,
        'items_created' => 0,
        'assets_created' => 0,
        'receipts_created' => 0,
        'lines_created' => 0,
        'users_created' => 0,
        'warnings' => [],
    ];

    public function handle(): int
    {
        $devicesPath = $this->argument('devices') ?? 'C:/Users/Administrator/Downloads/devices.csv';
        $inventoryPath = $this->argument('inventory') ?? 'C:/Users/Administrator/Downloads/Inventory.csv';
        $dryRun = $this->option('dry-run');

        if (!file_exists($devicesPath) || !file_exists($inventoryPath)) {
            $this->error('One or both CSV files were not found at the given paths.');
            return self::FAILURE;
        }

        $devices = $this->readCsv($devicesPath);
        $inventory = $this->readCsv($inventoryPath, 13); // Inventory.csv is well-formed, no repair needed

        $this->info('Read ' . count($devices) . ' rows from devices.csv');
        $this->info('Read ' . count($inventory) . ' rows from Inventory.csv');

        // --- Step 1: merge by Sticker No. (the true shared key) ---
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
                // Inventory.csv fields win when present (it's the more current record)
                foreach ($norm as $k => $v) {
                    if ($v !== null && $v !== '') {
                        $merged[$sticker][$k] = $v;
                    }
                }
            } else {
                $merged[$sticker] = $norm;
            }
        }

        $this->info('Merged into ' . count($merged) . ' unique physical assets (by Sticker No.)');

        // --- Step 2: build category map (normalized, casing-merged) ---
        $categoryMap = $this->buildCategoryMap($merged);
        $this->line('');
        $this->info('Categories to be used (' . count($categoryMap) . '):');
        foreach ($categoryMap as $label => $info) {
            $this->line("  - {$label}  (from: " . implode(', ', array_unique($info['original_casings'])) . ')');
        }

        // --- Step 3: build item (catalog) map, grouped by (category, brand, model) ---
        $itemGroups = [];
        foreach ($merged as $sticker => $row) {
            $categoryLabel = $categoryMap[Str::lower(trim($row['category_raw']))]['label'];
            $brand = $this->cleanOrNull($row['brand']);
            $model = $this->cleanOrNull($row['model']);
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

        // --- Step 4: build receipt groups: (end-user, date) for Distributed rows ---
        $receiptGroups = [];
        foreach ($merged as $sticker => $row) {
            if ($row['status'] !== 'Assigned' || empty($row['end_user'])) continue;
            $key = Str::lower($row['end_user']) . '|' . $row['date_issued'];
            $receiptGroups[$key]['end_user'] ??= $row['end_user'];
            $receiptGroups[$key]['issued_by'] ??= $row['management_receipt'];
            $receiptGroups[$key]['date'] ??= $row['date_issued'];
            $receiptGroups[$key]['ptr_refs'][] = $row['ptr_no'];
            $receiptGroups[$key]['assets'][] = $sticker;
        }

        $this->line('');
        $this->info('Accountability receipts to be created (' . count($receiptGroups) . '):');
        $unmatchedUsers = [];
        foreach ($receiptGroups as $group) {
            $count = count($group['assets']);
            $this->line("  - {$group['end_user']} on {$group['date']} ({$count} item(s))");
        }

        if ($dryRun) {
            $this->line('');
            $this->warn('DRY RUN — nothing was written. Re-run without --dry-run to import for real.');
            $this->printCostWarning();
            return self::SUCCESS;
        }

        if (!$this->confirm('Proceed with writing ' . count($merged) . ' assets and ' . count($receiptGroups) . ' receipts to the database?')) {
            $this->warn('Cancelled.');
            return self::SUCCESS;
        }

        // --- Step 5: actually write everything, inside one transaction ---
        DB::transaction(function () use ($categoryMap, $itemGroups, $merged, $receiptGroups) {
            $categoryIds = [];
            foreach ($categoryMap as $info) {
                $category = Category::firstOrCreate(
                    ['name' => $info['label']],
                    ['description' => 'Imported from legacy system']
                );
                $categoryIds[$info['label']] = $category->id;
                if ($category->wasRecentlyCreated) $this->stats['categories_created']++;
            }

            $itemIds = []; // itemKey => Item id
            foreach ($itemGroups as $itemKey => $group) {
                $categoryId = $categoryIds[$group['category_label']];

                $item = Item::firstOrCreate(
                    [
                        'category_id' => $categoryId,
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

            $assetIdBySticker = [];
            foreach ($merged as $sticker => $row) {
                $categoryLabel = $categoryMap[Str::lower(trim($row['category_raw']))]['label'];
                $brand = $this->cleanOrNull($row['brand']);
                $model = $this->cleanOrNull($row['model']);
                $itemKey = Str::lower($categoryLabel . '|' . ($brand ?? '') . '|' . ($model ?? ''));
                $itemId = $itemIds[$itemKey];

                $holderId = null;
                if ($row['status'] === 'Assigned' && !empty($row['end_user'])) {
                    $holderId = $this->resolveUserId($row['end_user']);
                }

                $remarksParts = [];
                if (!empty($row['notes'])) $remarksParts[] = 'Legacy notes: ' . $row['notes'];
                $remarksParts[] = 'Imported from legacy system — unit_cost unknown, defaulted to 0.';
                if (!empty($row['ptr_no'])) $remarksParts[] = 'Legacy PTR ref: ' . $row['ptr_no'];

                $createdAt = $this->parseDate($row['received_date']) ?? $this->parseDate($row['date_issued']) ?? now();

                $asset = SerializedAsset::create([
                    'item_id' => $itemId,
                    'serial_number' => $this->cleanSerial($row['serial']),
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
                $assetIdBySticker[$sticker] = $asset;
                $this->stats['assets_created']++;
            }

            foreach ($receiptGroups as $group) {
                $userId = $this->resolveUserId($group['end_user']);
                $issuedById = $this->resolveUserId($group['issued_by']) ?? $userId;
                $dateIssued = $this->parseDate($group['date']) ?? now();

                // 1. Fetch user model
                $user = $userId ? User::find($userId) : null;

                // 2. Case-insensitive unit resolution
                $rawUnit = strtoupper(trim($user?->unit ?? ''));
                $unitAcronym = (empty($rawUnit) || $rawUnit === 'LEGACY' || $rawUnit === 'N/A') 
                    ? 'NIR' 
                    : $rawUnit;

                $documentNumber = $this->nextLegacyDocNumber($unitAcronym, $dateIssued->format('Y'));

                $ptrRefs = array_unique(array_filter($group['ptr_refs']));
                $remarks = 'Imported from legacy system.';
                if (!empty($ptrRefs)) {
                    $remarks .= ' Legacy PTR ref(s): ' . implode(', ', $ptrRefs) . '.';
                }

                $receipt = AccountabilityReceipt::create([
                    'receipt_type' => 'ICS',
                    'document_number' => $documentNumber,
                    'user_id' => $userId,
                    'issued_by_id' => $issuedById,
                    'received_mr_by_id' => null,
                    'date_issued' => $dateIssued,
                    'remarks' => $remarks,
                ]);
                $this->stats['receipts_created']++;

                foreach ($group['assets'] as $sticker) {
                    $asset = $assetIdBySticker[$sticker];
                    $receipt->lines()->create([
                        'serialized_asset_id' => $asset->id,
                        'item_id' => $asset->item_id,
                        'quantity' => 1,
                    ]);
                    $this->stats['lines_created']++;
                }
            }
        });

        $this->line('');
        $this->info('Import complete.');
        $this->table(['Metric', 'Count'], [
            ['Categories created', $this->stats['categories_created']],
            ['Catalog items created', $this->stats['items_created']],
            ['Serialized assets created', $this->stats['assets_created']],
            ['Users created (fallback)', $this->stats['users_created']],
            ['Accountability receipts created', $this->stats['receipts_created']],
            ['Receipt lines created', $this->stats['lines_created']],
        ]);
        $this->printCostWarning();

        return self::SUCCESS;
    }

    private function printCostWarning(): void
    {
        $this->line('');
        $this->warn('IMPORTANT: Neither source file contains cost data.');
        $this->warn('Every imported asset has unit_cost = 0 and was classified as ICS by default,');
        $this->warn('since $0 is below the ₱50,000 PAR threshold. Many of these (desktops, laptops,');
        $this->warn('servers) are almost certainly worth more in reality. Review and correct unit_cost');
        $this->warn('on these records, and reclassify any receipt that should actually be a PAR.');
    }

    /**
     * Reads a CSV with fgetcsv (not Laravel's stricter CSV packages) so we
     * can repair malformed rows (extra commas from unescaped Notes fields)
     * instead of failing on them.
     */
    private function readCsv(string $path, ?int $expectedColumns = null): array
    {
        $rows = [];
        $handle = fopen($path, 'r');
        // Strip UTF-8 BOM if present
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
                // Extra commas inside what should have been one "Notes" field.
                // First 9 columns map normally (Item No. .. Status), the
                // overflow gets rejoined as Notes, the last field is Received.
                $fixed = array_slice($fields, 0, 9);
                $overflowCount = count($fields) - $headerCount;
                $notesParts = array_slice($fields, 9, 1 + $overflowCount);
                $fixed[] = implode(', ', array_map('trim', $notesParts));
                $fixed[] = end($fields);
                $rows[] = array_combine($header, $fixed);
                $this->stats['warnings'][] = 'Repaired malformed row (extra commas): ' . implode(',', $fields);
                continue;
            }

            // Fewer fields than expected — pad with blanks rather than drop the row.
            $fixed = array_pad($fields, $headerCount, '');
            $rows[] = array_combine($header, $fixed);
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
            'ptr_no' => trim($row['PTR No.'] ?? ''),
            'notes' => trim($row['Notes'] ?? ''),
            'received_date' => trim($row['Received'] ?? ''),
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
            'ptr_no' => trim($row['PTR No.'] ?? ''),
            'notes' => '',
            'received_date' => '',
            'end_user' => $this->normalizeWhitespace($row['End-user'] ?? ''),
            'management_receipt' => $this->normalizeWhitespace($row['Management Receipt'] ?? ''),
            'date_issued' => trim($row['Date'] ?? ''),
        ];
    }

    private function normalizeStatus(string $status): string
    {
        $status = trim($status);
        return match (strtolower($status)) {
            'distributed' => 'Assigned',
            'available' => 'Available',
            default => 'Available',
        };
    }

    private function normalizeWhitespace(string $s): string
    {
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function cleanOrNull(string $value): ?string
    {
        $value = trim($value);
        if ($value === '' || strtolower($value) === 'n/a' || strtolower($value) === 'unknown') {
            return null;
        }
        return $value;
    }

    private function cleanSerial(string $value): ?string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, self::PLACEHOLDER_SERIALS, true) ? null : trim($value);
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

    /**
     * Groups category names case-insensitively, producing a merged label
     * like "Ipad/iPad" from whatever original casings actually appear —
     * exactly the normalization the person asked for.
     */
    private function buildCategoryMap(array $merged): array
    {
        $byLower = [];
        foreach ($merged as $row) {
            $raw = trim($row['category_raw']);
            if ($raw === '') continue;
            $lower = Str::lower($raw);
            $byLower[$lower]['original_casings'][] = $raw;
        }

        foreach ($byLower as $lower => &$info) {
            $uniqueCasings = array_values(array_unique($info['original_casings']));
            $info['label'] = count($uniqueCasings) > 1
                ? implode('/', $uniqueCasings)
                : $uniqueCasings[0];
        }

        return $byLower;
    }

    private function generateItemCode(string $categoryLabel): string
    {
        $year = date('Y');
        $month = date('m');
        $cleaned = preg_replace('/[^a-zA-Z]/', '', $categoryLabel);
        $prefix = strtoupper(substr($cleaned, 0, 3));
        if (strlen($prefix) < 3) $prefix = str_pad($prefix, 3, 'X', STR_PAD_RIGHT);

        $pattern = sprintf('%s-%s-%s-', $prefix, $year, $month);
        $last = Item::where('item_code', 'LIKE', $pattern . '%')->orderBy('id', 'desc')->first();
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->item_code);
            $seq = intval(end($parts)) + 1;
        }
        return sprintf('%s%03d', $pattern, $seq);
    }

    private function nextLegacyDocNumber(string $unitAcronym, string $year): string
    {
        // Extra safeguard: Force uppercase and fallback if still invalid
        $unit = strtoupper(trim($unitAcronym));
        if (empty($unit) || $unit === 'LEGACY' || $unit === 'N/A') {
            $unit = 'NIR';
        }

        $last = AccountabilityReceipt::where('document_number', 'like', "{$unit}-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->document_number);
            $seq = intval(end($parts)) + 1;
        }

        return sprintf('%s-%s-%04d', $unit, $year, $seq);
    }

    /**
     * Matches a name against users.name using normalized (whitespace-collapsed,
     * case-insensitive) comparison. Creates a placeholder user — matching the
     * style already used in populate_users.sql — if genuinely no match exists,
     * rather than failing the whole import over one bad name.
     */
    private function resolveUserId(string $name): ?int
    {
        $name = $this->normalizeWhitespace($name);
        if ($name === '') return null;

        $user = User::whereRaw('LOWER(TRIM(REGEXP_REPLACE(name, "\\\\s+", " "))) = ?', [Str::lower($name)])->first();
        if ($user) return $user->id;

        // Fallback: case-insensitive exact match without the regex (in case the DB lacks REGEXP_REPLACE)
        $user = User::whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();
        if ($user) return $user->id;

        $this->stats['warnings'][] = "No matching user for '{$name}' — created placeholder.";
        $this->stats['users_created']++;

        $placeholder = User::create([
            'name' => $name,
            'unit' => ' ',
            'division' => ' ',
            'designation' => ' ',
            'email' => 'legacy-' . Str::slug($name) . '-' . Str::random(4) . '@doh-nir.local',
            'password' => '',
        ]);

        return $placeholder->id;
    }
}