<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceiptLine;
use App\Services\PropertyTagPdfService;

class PropertyTagController extends Controller
{
    /**
     * Generate and download the property tag PDF for a receipt line.
     */
    public function downloadTagPdf(AccountabilityReceiptLine $line, PropertyTagPdfService $pdfService)
    {
        $pdf = $pdfService->generate($line);

        $propertyNumber = $line->serializedAsset->property_number ?? 'tag';
        
        return $pdf->download("property-tag-{$propertyNumber}.pdf");
    }

    /**
     * Public-facing details page shown when someone scans the QR code
     */
    public function show(AccountabilityReceiptLine $line)
    {
        $line->load([
            'receipt.user',
            'receipt.issuedBy',
            'receipt.receivedMrBy',
            'serializedAsset.item',
            'serializedAsset.currentHolder',
        ]);

        return view('property-tag.show', ['line' => $line]);
    }
}