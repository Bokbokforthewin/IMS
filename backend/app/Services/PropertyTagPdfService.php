<?php

namespace App\Services;

use App\Models\SerializedAsset;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Http\Request;

class PropertyTagPdfService
{
    public function generate(
        SerializedAsset $asset,
        Request $request
    ) {
        /*
         * Load the asset information needed by the PDF.
         */
        $asset->load([
            'item',
            'currentHolder',
        ]);

        // FIX: Pull the base URL directly from the .env APP_URL variable
        // If your frontend runs on a different URL than the backend, you can change this to env('FRONTEND_URL') and add that to your .env
        $baseUrl = config('app.url');

        $qrUrl = rtrim($baseUrl, '/') .
            '/property-tag/' .
            $asset->id;

        $qrSvg = QrCode::format('svg')
            ->size(110)
            ->margin(1)
            ->generate($qrUrl);

        $qrDataUri =
            'data:image/svg+xml;base64,' .
            base64_encode($qrSvg);

        $logoDataUri = '';

        $possibleLogoPaths = [
            public_path('DOH_Logo.png'),
            public_path('backend/public/DOH_Logo.png'),
            base_path('public/DOH_Logo.png'),
            base_path('../backend/public/DOH_Logo.png'),
            public_path('images/DOH_Logo.png'),
            base_path('../backend/public/images/DOH_Logo.png'),
        ];

        foreach ($possibleLogoPaths as $path) {
            if (file_exists($path)) {
                $logoDataUri =
                    'data:image/png;base64,' .
                    base64_encode(
                        file_get_contents($path)
                    );
                break;
            }
        }

        $bagongPilipinasDataUri = '';

        $possibleBagongPaths = [
            public_path('Bagong_PilipinasTransparent.png'),
            public_path('backend/public/Bagong_PilipinasTransparent.png'),
            base_path('public/Bagong_PilipinasTransparent.png'),
            base_path('../backend/public/Bagong_PilipinasTransparent.png'),
            public_path('images/Bagong_PilipinasTransparent.png'),
            base_path('../backend/public/images/Bagong_PilipinasTransparent.png'),
        ];

        foreach ($possibleBagongPaths as $path) {
            if (file_exists($path)) {
                $bagongPilipinasDataUri =
                    'data:image/png;base64,' .
                    base64_encode(
                        file_get_contents($path)
                    );
                break;
            }
        }

        $pdf = Pdf::loadView('pdfs.property-tag', [
            'asset' => $asset,
            'propertyNumber' => $asset->property_number ?? 'N/A',
            'recipientName' => $asset->currentHolder->name ?? 'N/A',
            'qrDataUri' => $qrDataUri,
            'logoDataUri' => $logoDataUri,
            'bagongPilipinasDataUri' => $bagongPilipinasDataUri,
        ]);

        $pdf->setPaper(
            [0, 0, 216, 144],
            'landscape'
        );

        return $pdf;
    }
}