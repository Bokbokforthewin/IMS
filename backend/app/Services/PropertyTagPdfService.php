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

        // Pulls directly from your .env APP_URL (the single source of truth)
        $baseUrl = config('app.url');
        
        // Combines base URL with the relative route path (e.g., /property-tag/5)
        $qrUrl = $baseUrl . route('property-tag.show', $line->id, false);

        // Generate QR as SVG
        $qrSvg = QrCode::format('svg')
            ->size(140)
            ->margin(1)
            ->generate($qrUrl);

        // Convert SVG to a data URI
        $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        $pdf = Pdf::loadView('pdfs.property-tag', [
            'propertyNumber' => $asset->property_number,
            'recipientName' => $recipient->name ?? 'N/A',
            'qrDataUri' => $qrDataUri,
        ]);

        // 3 × 2 inch landscape
        $pdf->setPaper([0, 0, 216, 144], 'landscape');

        return $pdf;
    }
}