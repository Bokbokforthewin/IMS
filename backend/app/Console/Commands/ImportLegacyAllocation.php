<?php

namespace App\Console\Commands;

use App\Models\AccountabilityReceipt;
use App\Models\Category;
use App\Models\Item;
use App\Models\SerializedAsset;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportLegacyAllocation extends Command
{
    protected $signature = 'import:bacolod-inventory
        {file : Path to Bacolod_Inventory.csv}
        {--dry-run : Show what would be imported without writing anything}';

    protected $description = 'Import Bacolod inventory and allocation data using official Seeder categories.';

    private const PLACEHOLDER_SERIALS = ['cpu clone', 'unknown', 'n/a', 'na', 'none'];

    private array $stats = [
        'items_created' => 0,
        'assets_created' => 0,
        'receipts_created' => 0,
        'lines_created' => 0,
        'users_created' => 0,
        'skipped_duplicates' => 0,
        'warnings' => [],
    ];

    private ?array $userMap = null;
    private array $generatedItemCodes = [];
    private array $generatedPpeNumbers = [];

    public function handle(): int
    {
        $filePath = $this->argument('file');
        $dryRun = $this->option('dry-run');

        if (!file_exists($filePath)) {
            $this->error("The file was not found at: {$filePath}");
            return self::FAILURE;
        }

        $rows = $this->readCsv($filePath);
        $this->info('Read ' . count($rows) . ' rows from Bacolod inventory file.');

        if ($dryRun) {
            $this->warn('DRY RUN - nothing was written.');
            return self::SUCCESS;
        }

        if (!$this->confirm('Write assets and their receipts to the database? (Duplicates will be skipped)')) {
            $this->warn('Cancelled.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($rows) {
            $validRows = [];
            foreach ($rows as $index => $row) {
                $propertyNumber = trim($row['Property Number'] ?? '');
                $serialNumber = trim($row['Serial Number'] ?? '');
                $lowerSerial = Str::lower($serialNumber);
                $isPlaceholderSerial = in_array($lowerSerial, self::PLACEHOLDER_SERIALS, true);
                
                if ($propertyNumber === '' || Str::lower($propertyNumber) === 'faded sticker') {
                    $generated = 'NIR CHD-BAC-' . date('Y') . '-' . sprintf('%04d', $index + 1);
                    $this->stats['warnings'][] = "Row {$index}: Property Number was '" . ($propertyNumber ?: 'empty') . "'. Assigned unique: {$generated}";
                    $row['Property Number'] = $generated;
                }

                if ($serialNumber !== '' && !$isPlaceholderSerial) {
                    if (SerializedAsset::where('serial_number', $serialNumber)->exists()) {
                        $uniqueSerial = $serialNumber . '-' . ($row['Property Number'] ?? uniqid());
                        $this->stats['warnings'][] = "Row {$index}: Serial Number '{$serialNumber}' already exists. Appended unique suffix: {$uniqueSerial}";
                        $row['Serial Number'] = $uniqueSerial;
                    }
                }

                $validRows[] = $row;
            }

            $receiptGroups = [];

            foreach ($validRows as $index => $row) {
                $rawDesc = trim($row['Item Description'] ?? 'Unknown Item');
                if ($rawDesc === '') {
                    $rawDesc = 'Unknown Item';
                }

                // Strict Category Seeder Mapping
                $categoryName = $this->matchSeederCategory($rawDesc);
                $category = Category::where('name', $categoryName)->first();

                if (!$category) {
                    // Fallback to first available category if seeder hasn't run yet
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
                        'name' => $rawDesc,
                    ],
                    [
                        'item_code' => $this->generateItemCode($categoryName),
                        'specifications' => null,
                        'brand' => null,
                        'type' => null,
                        'unit_of_measure' => 'unit',
                        'reorder_level' => 5,
                        'tracking_type' => 'asset',
                        'estimated_useful_life' => null,
                    ]
                );
                if ($item->wasRecentlyCreated) $this->stats['items_created']++;

                $endUserName = trim($row['End User'] ?? '');
                $mrHolderName = trim($row['Name'] ?? '');

                $endUserId = $endUserName !== '' ? $this->resolveUserId($endUserName) : null;
                $mrHolderId = $mrHolderName !== '' ? $this->resolveUserId($mrHolderName) : $this->resolveUserId('Adrian Hort D. Ramos');

                $physicalHolderId = $endUserId ?? $mrHolderId;

                $propertyNumber = trim($row['Property Number'] ?? '');
                if ($propertyNumber === '') {
                    $propertyNumber = 'NIR CHD-' . uniqid();
                    $this->stats['warnings'][] = "Row {$index}: Missing Property Number. Generated {$propertyNumber}";
                }

                $serialNumber = trim($row['Serial Number'] ?? '');
                $lowerSerial = Str::lower($serialNumber);
                $isPlaceholderSerial = in_array($lowerSerial, self::PLACEHOLDER_SERIALS, true);

                $finalSerialNumber = $serialNumber;
                if ($finalSerialNumber === '') {
                    $finalSerialNumber = null;
                } elseif ($isPlaceholderSerial) {
                    $finalSerialNumber = "{$serialNumber} - {$propertyNumber}";
                }

                $unitCost = floatval(str_replace(',', '', $row['Unit Price'] ?? $row['Amount'] ?? '0'));
                $quantity = intval($row['Quantity'] ?? 1);
                $dateAcquired = $this->parseDate($row['Date Acquired'] ?? null) ?? now();
                $status = ($physicalHolderId !== null || $mrHolderId !== null) ? 'Assigned' : 'Available';

                // Format: YEAR-SUB_MAJOR-GL-SEQUENCE(4 digits)-NIR CHD
                $ppeNumber = $this->generatePpeNumber($category, $dateAcquired->format('Y'));

                $asset = SerializedAsset::create([
                    'item_id' => $item->id,
                    'serial_number' => $finalSerialNumber,
                    'property_number' => $propertyNumber,
                    'ppe_number' => $ppeNumber,
                    'model' => null,
                    'manufacturer_name' => null,
                    'country_of_origin' => null,
                    'unit_cost' => $unitCost,
                    'status' => $status,
                    'current_holder_id' => $physicalHolderId,
                    'quantity_on_hand' => $quantity,
                    'condition_remarks' => 'Imported from Bacolod Inventory file.',
                    'created_at' => $dateAcquired,
                    'updated_at' => $dateAcquired,
                ]);
                $this->stats['assets_created']++;

                if ($mrHolderId !== null || $physicalHolderId !== null) {
                    $dateKey = $dateAcquired->format('Y-m-d');
                    $groupKey = "mr_{$mrHolderId}_end_{$physicalHolderId}_date_{$dateKey}";

                    if (!isset($receiptGroups[$groupKey])) {
                        $receiptGroups[$groupKey] = [
                            'user_id' => $physicalHolderId ?? $mrHolderId,
                            'received_mr_by_id' => $mrHolderId,
                            'date' => $dateAcquired,
                            'unit_cost' => $unitCost,
                            'lines' => [],
                        ];
                    }

                    $receiptGroups[$groupKey]['lines'][] = [
                        'asset_id' => $asset->id,
                        'item_id' => $item->id,
                        'quantity' => $quantity,
                    ];
                }
            }

            foreach ($receiptGroups as $group) {
                $receiptType = $group['unit_cost'] >= 50000 ? 'PAR' : 'ICS';

                $userForPrefix = User::find($group['received_mr_by_id'] ?? $group['user_id']);
                $unitPrefix = ($userForPrefix && !empty($userForPrefix->unit) && trim($userForPrefix->unit) !== '') 
                    ? strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $userForPrefix->unit)) 
                    : 'BACOLOD';

                $receipt = AccountabilityReceipt::create([
                    'receipt_type' => $receiptType,
                    'document_number' => $this->nextLegacyDocNumber($unitPrefix, $group['date']->format('Y')),
                    'user_id' => $group['user_id'],
                    'issued_by_id' => null,
                    'received_mr_by_id' => $group['received_mr_by_id'],
                    'date_issued' => $group['date'],
                    'remarks' => 'Imported from Bacolod inventory.',
                ]);
                $this->stats['receipts_created']++;

                foreach ($group['lines'] as $line) {
                    $receipt->lines()->create([
                        'serialized_asset_id' => $line['asset_id'],
                        'item_id' => $line['item_id'],
                        'quantity' => $line['quantity'],
                    ]);
                    $this->stats['lines_created']++;
                }
            }
        });

        $this->line('');
        $this->info('Import complete.');
        $this->table(['Metric', 'Count'], [
            ['Catalog items created', $this->stats['items_created']],
            ['Serialized assets created', $this->stats['assets_created']],
            ['Accountability receipts created', $this->stats['receipts_created']],
            ['Receipt lines created', $this->stats['lines_created']],
            ['Users created', $this->stats['users_created']],
            ['Duplicates skipped', $this->stats['skipped_duplicates']],
        ]);

        $this->printWarnings();

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

    private function printWarnings(): void
    {
        if (empty($this->stats['warnings'])) return;
        $this->line('');
        $this->warn('Notes from the import (' . count($this->stats['warnings']) . '):');
        foreach (array_slice(array_unique($this->stats['warnings']), 0, 15) as $w) {
            $this->line('  - ' . $w);
        }
    }

    private function readCsv(string $path): array
    {
        $rows = [];
        if (($handle = fopen($path, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") rewind($handle);
            $header = fgetcsv($handle);
            if ($header) {
                while (($data = fgetcsv($handle)) !== false) {
                    if (count($header) === count($data)) {
                        $rows[] = array_combine($header, $data);
                    }
                }
            }
            fclose($handle);
        }
        return $rows;
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
        $last = AccountabilityReceipt::where('document_number', 'like', "{$prefix}-{$year}-%")->orderBy('id', 'desc')->first();
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->document_number);
            $seq = intval(end($parts)) + 1;
        }
        return sprintf('%s-%s-%04d', $prefix, $year, $seq);
    }

    private function normalizeName(string $name): string
    {
        $name = Str::lower($name);
        $name = str_replace(['.', ','], '', $name);
        return trim(preg_replace('/\s+/', ' ', $name));
    }

    private function loadUserMap(): void
    {
        if ($this->userMap !== null) return;
        $this->userMap = [];
        foreach (User::query()->get(['id', 'name']) as $user) {
            $this->userMap[$this->normalizeName($user->name)] = $user->id;
        }
    }

    private function resolveUserId(string $name): ?int
    {
        if (trim($name) === '') return null;

        $this->loadUserMap();

        $normalizedName = $this->normalizeName($name);

        if (isset($this->userMap[$normalizedName])) {
            return $this->userMap[$normalizedName];
        }

        $this->stats['users_created']++;
        $placeholder = User::create([
            'name' => trim($name),
            'unit' => ' ',
            'division' => ' ',
            'designation' => ' ',
            'email' => 'legacy-' . Str::slug($name) . '-' . Str::random(4) . '@doh-nir.local',
            'password' => Str::random(40),
        ]);

        $this->userMap[$normalizedName] = $placeholder->id;
        return $placeholder->id;
    }
}