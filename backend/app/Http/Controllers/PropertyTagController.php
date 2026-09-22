<?php

namespace App\Http\Controllers;

use App\Models\AccountabilityReceiptLine;
use App\Services\PropertyTagPdfService;
use App\Models\SerializedAsset;

class PropertyTagController extends Controller
{

    /**
     * Public-facing details page shown when someone scans the QR code
     */
    public function show(\App\Models\SerializedAsset $serializedAsset)
    {
        $serializedAsset->load(['item', 'currentHolder']);

        $attached = \App\Models\SerializedAsset::with('item')
            ->where('attached_to', $serializedAsset->property_number)
            ->get();

        return view('property-tag.show', [
            'asset' => $serializedAsset,
            'attached' => $attached,
        ]);
    }
}