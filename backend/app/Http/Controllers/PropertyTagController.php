<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceiptLine;
use App\Services\PropertyTagPdfService;
use App\Models\SerializedAsset;

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
    public function show(SerializedAsset $serializedAsset)
    {
        $serializedAsset->load(['item', 'currentHolder']);
        $attached = SerializedAsset::with('item')->where('attached_to', $serializedAsset->property_number)->get();

        return view('property-tag.show', ['asset' => $serializedAsset, 'attached' => $attached]);
    }
}