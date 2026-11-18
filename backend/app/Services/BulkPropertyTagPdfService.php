<?php

// Save as: app/Services/BulkPropertyTagPdfService.php

namespace App\Services;

use App\Models\SerializedAsset;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;

class BulkPropertyTagPdfService
{
    public function __construct(private TagAssets $assets)
    {
    }

    public function generate(array $assetIds)
    {
        // Raise the limits before the heavy work starts, not after
        ini_set('memory_limit', '512M');
        set_time_limit(180);

        Log::info('BulkPropertyTagPdfService: Starting PDF generation for ' . count($assetIds) . ' asset IDs.');

        $assets = SerializedAsset::with(['item', 'currentHolder'])
            ->whereIn('id', $assetIds)
            ->get();

        $this->assets->pruneOldQrFiles();

        $tagData = [];
        foreach ($assets as $asset) {
            try {
                $qrFilePath = $this->assets->qrSvgFile($this->assets->tagUrl($asset->id));
            } catch (\Exception $e) {
                Log::error("Failed to generate SVG QR file for asset ID {$asset->id}: " . $e->getMessage());
                $qrFilePath = '';
            }

            $tagData[] = [
                'asset' => $asset,
                'propertyNumber' => $asset->property_number ?? 'N/A',
                'recipientName' => $asset->currentHolder->name ?? 'N/A',
                'qrFilePath' => $qrFilePath,
            ];
        }

        try {
            $pdf = Pdf::loadView('pdfs.bulk-property-tags', [
                'tags' => $tagData,
                'logoPath' => $this->assets->logoPath('DOH_Logo.png'),
                'bagongPilipinasPath' => $this->assets->logoPath('Bagong_PilipinasTransparent.png'),
            ]);

            $pdf->setPaper('a4', 'portrait');

            Log::info('BulkPropertyTagPdfService: PDF successfully prepared using local SVG files.');

            return $pdf;
        } catch (\Exception $e) {
            Log::error('BulkPropertyTagPdfService: DomPDF rendering failed: ' . $e->getMessage());
            throw $e;
        }
    }
}