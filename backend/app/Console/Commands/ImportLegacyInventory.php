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

class ImportLegacyInventory extends Command
{
    protected $signature = 'import:legacy-inventory
        {devices : Path to devices.csv}
        {inventory : Path to Inventory.csv}
        {--dry-run : Show what would be imported without writing anything}';

    protected $description = 'Import legacy inventory (devices.csv + Inventory.csv) using official Seeder categories.';

    private const PLACEHOLDER_SERIALS = ['cpu clone', 'unknown', 'n/a', 'na', 'none'];
    private const UNKNOWN_HOLDER_EMAIL = 'legacy-unknown-holder@doh-nir.local';
    private const UNKNOWN_HOLDER_NAME = 'Legacy Import - Previous Holder Unknown';

    private array $stats = [
        'items_created' => 0,
        'assets_created' => 0,
        'receipts_created' => 0,
        'lines_created' => 0,
        'transfers_created' => 0,
        'users_created' => 0,
        'warnings' => [],
    ];

    private ?array $userMap = null;
    private array $generatedItemCodes = [];
    private array $generatedPpeNumbers = [];

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
                foreach ($norm as $k => $v) {
                    if ($v !== null && $v !== '') {
                        $merged[$sticker][$k] = $v;
                    }
                }
            } else {
                $merged[$sticker] = $norm;
            }
        }

        foreach ($merged as $sticker => &$row) {
            if ($row['ptr_no'] === '' && $row['ptr_spill'] !== '') {
                $row['notes'] = trim($row['notes'] . ' | PTR column text: ' . $row['ptr_spill'], ' |');
            }
        }
        unset($row);

        $this->info('Merged into ' . count($merged) . ' unique physical assets (by Sticker No.)');

        $itemGroups = [];
        foreach ($merged as $sticker => $row) {
            $categoryName = $this->matchSeederCategory($row['category_raw']);
            $brand = $this->trimOrNull($row['brand']);
            $model = $this->trimOrNull($row['model']);
            $itemKey = Str::lower($categoryName . '|' . ($brand ?? '') . '|' . ($model ?? ''));

            if (!isset($itemGroups[$itemKey])) {
                $itemGroups[$itemKey] = [
                    'category_name' => $categoryName,
                    'brand' => $brand,
                    'model' => $model,
                    'name' => trim(($brand ?? '') . ' ' . ($model ?? '')) ?: $categoryName,
                    'assets' => [],
                ];
            }
            $itemGroups[$itemKey]['assets'][] = $sticker;
        }

        $transferStickers = [];
        $receiptGroups = [];
        foreach ($merged as $sticker => $row) {
            if ($row['status'] !== 'Assigned') continue;

            $primaryUser = $row['management_receipt'] !== '' ? $row['management_receipt'] : $row['end_user'];
            if ($primaryUser === '') continue;

            $key = Str::lower($primaryUser) . '|' . $row['date_issued'];
            $receiptGroups[$key]['end_user'] ??= $primaryUser;
            $receiptGroups[$key]['mr_holder'] ??= $row['management_receipt'];
            $receiptGroups[$key]['date'] ??= $row['date_issued'];
            $receiptGroups[$key]['assets'][] = $sticker;

            if ($row['ptr_no'] !== '') {
                $transferStickers[] = $sticker;
            }
        }

        if ($dryRun) {
            $this->warn('DRY RUN - nothing was written.');
            return self::SUCCESS;
        }

        if (!$this->confirm('Write ' . count($merged) . ' assets to the database?')) {
            $this->warn('Cancelled.');
            return self::SUCCESS;
        }

        $usedSerials = [];

        DB::transaction(function () use ($itemGroups, $merged, $receiptGroups, $transferStickers, &$usedSerials) {
            $itemIds = [];
            foreach ($itemGroups as $itemKey => $group) {
                $categoryName = $group['category_name'];
                $category = Category::where('name', $categoryName)->first();

                if (!$category) {
                    $category = Category::first() ?? Category::create([
                        'name' => $categoryName,
                        'sub_major_account_code' => '05',
                        'gl_account_code' => '03',
                        'semi_expendable_gl_code' => '03',
                        'description' => 'Default Category'
                    ]);
                }

                $item = Item::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'name' => $group['name'],
                        'brand' => $group['brand'],
                    ],
                    [
                        'item_code' => $this->generateItemCode($categoryName),
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
                $categoryName = $this->matchSeederCategory($row['category_raw']);
                $category = Category::where('name', $categoryName)->first();
                $brand = $this->trimOrNull($row['brand']);
                $model = $this->trimOrNull($row['model']);
                $itemKey = Str::lower($categoryName . '|' . ($brand ?? '') . '|' . ($model ?? ''));

                $holderId = null;
                if ($row['status'] === 'Assigned') {
                    if ($row['end_user'] !== '') {
                        $holderId = $this->resolveUserId($row['end_user']);
                    }
                }

                $createdAt = $this->parseDate($row['received_date']) ?? $this->parseDate($row['date_issued']) ?? now();

                // Format: YEAR-SUB_MAJOR-GL-SEQUENCE(4 digits)-NIR CHD
                $ppeNumber = $this->generatePpeNumber($category, $createdAt->format('Y'));

                $asset = SerializedAsset::create([
                    'item_id' => $itemIds[$itemKey],
                    'serial_number' => $this->resolveSerial($row['serial'], $sticker, $usedSerials),
                    'property_number' => $sticker,
                    'ppe_number' => $ppeNumber,
                    'model' => $model,
                    'manufacturer_name' => null,
                    'country_of_origin' => null,
                    'unit_cost' => 0,
                    'status' => $row['status'],
                    'current_holder_id' => $holderId,
                    'quantity_on_hand' => 1,
                    'condition_remarks' => 'Imported from legacy system.',
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $assetBySticker[$sticker] = $asset;
                $itemNameBySticker[$sticker] = $itemGroups[$itemKey]['name'];
                $this->stats['assets_created']++;
            }

            foreach ($receiptGroups as $group) {
                $userId = $this->resolveUserId($group['end_user']);
                $dateIssued = $this->parseDate($group['date']) ?? now();

                $user = User::find($userId);
                $unitPrefix = ($user && !empty($user->unit)) 
                    ? strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $user->unit)) 
                    : 'LEGACY';

                $mrHolderId = $this->findUserId($group['mr_holder']);

                $receipt = AccountabilityReceipt::create([
                    'receipt_type' => 'ICS',
                    'document_number' => $this->nextLegacyDocNumber($unitPrefix, $dateIssued->format('Y')),
                    'user_id' => $userId,
                    'issued_by_id' => null,
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
        return self::SUCCESS;
    }

    private function matchSeederCategory(string $rawName, string $brand = '', string $model = ''): string
    {
        $text = Str::lower($rawName . ' ' . $brand . ' ' . $model);

        // Priority 1: ICT Equipment - Computing Hardware (Matched BEFORE Furniture to prevent 'desktop' matching 'desk')
        if (Str::contains($text, [
            'desktop', 'laptop', 'notebook', 'server', 'system unit', 
            'workstation', 'air purifier', 'ipad', 'tablet'
        ])) {
            return 'ICT Equipment - Computing Hardware';
        }

        // Priority 2: ICT Equipment - Network & Infrastructure
        if (Str::contains($text, [
            'switch', 'router', 'access point', 'access-point', 
            'server rack', 'firewall', 'gateway', 'patch panel'
        ])) {
            return 'ICT Equipment - Network & Infrastructure';
        }

        // Priority 3: ICT Peripherals & Printers (UPS, AVR, Printers, Monitors, Cameras, Keyboards, etc.)
        if (Str::contains($text, [
            'printer', 'scanner', 'monitor', 'keyboard', 'mouse', 
            'ups', 'avr', 'uninterrupted', 'uninterruptible', 'power supply', 
            'camera', 'webcam', 'projector', 'speaker', 'headset', 'tv', 
            'external drive', 'pencil', 'presenter'
        ])) {
            return 'ICT Peripherals & Printers';
        }

        // Priority 4: Communication Equipment
        if (Str::contains($text, [
            'phone', 'cellular', 'smartphone', 'radio', 'pabx', 
            'communication', 'talkie', 'handset', 'voice recorder'
        ])) {
            return 'Communication Equipment';
        }

        // Priority 5: ICT Consumables & Supplies
        if (Str::contains($text, [
            'paper', 'ink', 'toner', 'ribbon', 'rj45', 
            'patch cable', 'connector', 'cartridge', 'supplies'
        ])) {
            return 'ICT Consumables & Supplies';
        }

        // Priority 6: Furniture and Fixtures (Evaluated only after all ICT equipment/peripherals)
        if (Str::contains($text, [
            'chair', 'office desk', 'executive desk', 'table', 
            'cabinet', 'shelf', 'furniture', 'sofa', 'filing'
        ])) {
            return 'Furniture and Fixtures';
        }

        return 'ICT Equipment - Computing Hardware';
    }

    private function generatePpeNumber(Category $category, string $year): string
    {
        $subMajor = $category->sub_major_account_code ?? '05';
        $glCode = $category->gl_account_code ?? '03';

        $prefixPattern = sprintf('%s-%s-%s-', $year, $subMajor, $glCode);

        $last = SerializedAsset::where('ppe_number', 'LIKE', $prefixPattern . '%')->orderBy('id', 'desc')->first();
        $seq = 1;

        if ($last && $last->ppe_number) {
            $parts = explode('-', $last->ppe_number);
            if (isset($parts[3]) && is_numeric($parts[3])) {
                $seq = intval($parts[3]) + 1;
            }
        }

        do {
            $candidate = sprintf('%s%04d-NIR CHD', $prefixPattern, $seq);
            $seq++;
        } while (
            in_array($candidate, $this->generatedPpeNumbers) ||
            SerializedAsset::where('ppe_number', $candidate)->exists()
        );

        $this->generatedPpeNumbers[] = $candidate;
        return $candidate;
    }

    private function recordTransfer(
        SerializedAsset $asset,
        string $ptrNo,
        int $fromUserId,
        int $toUserId,
        Carbon $date,
        string $itemName
    ): void {
        AssetTransfer::create([
            'document_number' => $ptrNo,
            'transfer_type' => 'TRANSFER',
            'serialized_asset_id' => $asset->id,
            'user_id' => $fromUserId,
            'transfered_to' => $toUserId,
            'description' => "Legacy transfer - {$itemName}",
            'reason' => ' ',
            'transfer_date' => $date,
            'remarks' => 'Imported from legacy system.',
        ]);

        $asset->update([
            'current_holder_id' => $toUserId,
            'status' => 'Assigned',
        ]);

        $this->stats['transfers_created']++;
    }

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
                $fixed = array_slice($fields, 0, 9);
                $overflowCount = count($fields) - $headerCount;
                $notesParts = array_slice($fields, 9, 1 + $overflowCount);
                $fixed[] = implode(', ', array_map('trim', $notesParts));
                $fixed[] = end($fields);
                $rows[] = array_combine($header, $fixed);
                continue;
            }

            $rows[] = array_combine($header, array_pad($fields, $headerCount, ''));
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
            'ptr_no' => '',
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

    private function trimOrNull(string $value): ?string
    {
        $value = $this->normalizeWhitespace($value);
        return $value === '' ? null : $value;
    }

    private function resolveSerial(string $rawValue, string $propertyNumber, array &$usedSerials): ?string
    {
        $trimmed = $this->normalizeWhitespace($rawValue);
        if ($trimmed === '') return null;

        $lower = Str::lower($trimmed);

        if (in_array($lower, self::PLACEHOLDER_SERIALS, true) || isset($usedSerials[$lower])) {
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

    private function generateItemCode(string $categoryLabel): string
    {
        $cleaned = preg_replace('/[^a-zA-Z]/', '', $categoryLabel);
        $prefix = strtoupper(substr($cleaned, 0, 3));
        if (strlen($prefix) < 3) $prefix = str_pad($prefix, 3, 'X', STR_PAD_RIGHT);

        $pattern = sprintf('NIR CHD-%s-%s-', $prefix, date('Y'));
        
        $last = Item::where('item_code', 'LIKE', $pattern . '%')->orderBy('id', 'desc')->first();
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->item_code);
            $seq = intval(end($parts)) + 1;
        }
        do {
            $candidateCode = sprintf('%s%05d', $pattern, $seq);
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

    private function loadUserMap(): void
    {
        if ($this->userMap !== null) return;

        $this->userMap = [];
        foreach (User::query()->get(['id', 'name']) as $user) {
            $this->userMap[Str::lower($this->normalizeWhitespace($user->name))] = $user->id;
        }
    }

    private function findUserId(string $name): ?int
    {
        $name = $this->normalizeWhitespace($name);
        if ($name === '') return null;

        $this->loadUserMap();
        return $this->userMap[Str::lower($name)] ?? null;
    }

    private function resolveUserId(string $name): ?int
    {
        $name = $this->normalizeWhitespace($name);
        if ($name === '') return null;

        $found = $this->findUserId($name);
        if ($found !== null) return $found;

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