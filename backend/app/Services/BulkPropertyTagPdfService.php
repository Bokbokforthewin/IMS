<?php

namespace App\Services;

use App\Models\SerializedAsset;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class BulkPropertyTagPdfService
{
    public function generate(array $assetIds)
    {
        $assets = SerializedAsset::with(['item', 'currentHolder'])
            ->whereIn('id', $assetIds)
            ->get();

        $baseUrl = config('app.url');
        $tagData = [];

        // Pre-encode logos once to save processing time
        $logoDataUri = $this->getLogoDataUri('DOH_Logo.png');
        $bagongPilipinasDataUri = $this->getLogoDataUri('Bagong_PilipinasTransparent.png');

        foreach ($assets as $asset) {
            $qrUrl = rtrim($baseUrl, '/') . '/property-tag/' . $asset->id;
            
            $qrSvg = QrCode::format('svg')
                ->size(110)
                ->margin(1)
                ->generate($qrUrl);

            $tagData[] = [
                'asset' => $asset,
                'propertyNumber' => $asset->property_number ?? 'N/A',
                'recipientName' => $asset->currentHolder->name ?? 'N/A',
                'qrDataUri' => 'data:image/svg+xml;base64,' . base64_encode($qrSvg),
            ];
        }

        $pdf = Pdf::loadView('pdfs.bulk-property-tags', [
            'tags' => $tagData,
            'logoDataUri' => $logoDataUri,
            'bagongPilipinasDataUri' => $bagongPilipinasDataUri,
        ]);

        // Standard A4 paper size, portrait orientation
        $pdf->setPaper('a4', 'portrait');

        return $pdf;
    }

    private function getLogoDataUri($filename)
    {
        $possiblePaths = [
            public_path($filename),
            public_path('backend/public/' . $filename),
            base_path('public/' . $filename),
            base_path('../backend/public/' . $filename),
            public_path('images/' . $filename),
            base_path('../backend/public/images/' . $filename),
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                return 'data:image/png;base64,' . base64_encode(file_get_contents($path));
            }
        }
        return '';
    }
}