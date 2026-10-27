<?php

namespace App\Services;

use App\Models\SerializedAsset;
use Barryvdh\DomPDF\Facade\Pdf;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class BulkPropertyTagPdfService
{
    public function generate(array $assetIds)
    {
        Log::info('BulkPropertyTagPdfService: Starting PDF generation for ' . count($assetIds) . ' asset IDs.');

        $assets = SerializedAsset::with(['item', 'currentHolder'])
            ->whereIn('id', $assetIds)
            ->get();

        $baseUrl = config('app.url');
        $tagData = [];

        // Ensure temporary SVG QR directory exists
        $qrDir = public_path('storage/qrs');
        if (!File::exists($qrDir)) {
            File::makeDirectory($qrDir, 0755, true);
        }

        // Get absolute local file paths for logos
        $logoPath = $this->getLocalLogoPath('DOH_Logo.png');
        $bagongPilipinasPath = $this->getLocalLogoPath('Bagong_PilipinasTransparent.png');

        foreach ($assets as $asset) {
            $qrUrl = rtrim($baseUrl, '/') . '/property-tag/' . $asset->id;
            $qrFilePath = $qrDir . '/qr_' . $asset->id . '.svg';
            
            try {
                // Generate QR code as an SVG file
                $renderer = new ImageRenderer(
                    new RendererStyle(110, 1),
                    new SvgImageBackEnd()
                );
                $writer = new Writer($renderer);
                $writer->writeFile($qrUrl, $qrFilePath);
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
                'logoPath' => $logoPath,
                'bagongPilipinasPath' => $bagongPilipinasPath,
            ]);

            ini_set('memory_limit', '512M');
            set_time_limit(180);

            $pdf->setPaper('a4', 'portrait');

            Log::info('BulkPropertyTagPdfService: PDF successfully rendered using local SVG files.');
            return $pdf;
        } catch (\Exception $e) {
            Log::error('BulkPropertyTagPdfService: DomPDF rendering failed: ' . $e->getMessage());
            throw $e;
        }
    }

    private function getLocalLogoPath($filename)
    {
        $possiblePaths = [
            public_path('images/' . $filename),
            public_path($filename),
            base_path('public/images/' . $filename),
            base_path('public/' . $filename),
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }
        
        return '';
    }
}