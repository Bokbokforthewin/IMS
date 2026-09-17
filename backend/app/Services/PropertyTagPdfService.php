<?php

namespace App\Services;

use App\Models\AccountabilityReceiptLine;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class PropertyTagPdfService
{
    public function generate(AccountabilityReceiptLine $line)
    {
        $line->load([
            'serializedAsset',
            'receipt.user',
        ]);

        $asset = $line->serializedAsset;
        $recipient = $line->receipt->user;

        $baseUrl = config('app.url');
        $qrUrl = $baseUrl . route('property-tag.show', $line->id, false);
        // Generate QR as SVG
        $qrSvg = QrCode::format('svg')
            ->size(110)
            ->margin(1)
            ->generate($qrUrl);

        // Convert SVG to a data URI
        $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        // 1. Load DOH Logo (Left) as PNG Base64 with safe fallback paths
        $logoDataUri = '';
        $possibleLogoPaths = [
            base_path('../backend/public/images/DOH_Logo.png'),
            public_path('DOH_Logo.png'),
            public_path('..backend/public/images/DOH_Logo.png'),
            public_path('backend/public/images/DOH_Logo.png'),
        ];

        foreach ($possibleLogoPaths as $path) {
            if (file_exists($path)) {
                $logoDataUri = 'data:image/png;base64,' . base64_encode(file_get_contents($path));
                break;
            }
        }

        // 2. Load Bagong Pilipinas Logo (Right) as PNG Base64 with safe fallback paths
        $bagongPilipinasDataUri = '';
        $possibleBagongPaths = [
            base_path('../backend/public/images/Bagong_PilipinasTransparent.png'),
            public_path('Bagong_PilipinasTransparent.png'),
            public_path('..backend/public/images/Bagong_PilipinasTransparent.png'),
            public_path('backend/public/images/Bagong_PilipinasTransparent.png'),
        ];

        foreach ($possibleBagongPaths as $path) {
            if (file_exists($path)) {
                $bagongPilipinasDataUri = 'data:image/png;base64,' . base64_encode(file_get_contents($path));
                break;
            }
        }

        $pdf = Pdf::loadView('pdfs.property-tag', [
            'line' => $line, // Passed your full $line object so the view variables match
            'propertyNumber' => $asset->property_number ?? 'N/A',
            'recipientName' => $recipient->name ?? 'N/A',
            'qrDataUri' => $qrDataUri,
            'logoDataUri' => $logoDataUri,
            'bagongPilipinasDataUri' => $bagongPilipinasDataUri, // <--- Added this to view
        ]);

        // 3 × 2 inch landscape
        $pdf->setPaper([0, 0, 216, 144], 'landscape');

        return $pdf;
    }
}