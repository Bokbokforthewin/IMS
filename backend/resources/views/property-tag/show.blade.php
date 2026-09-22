<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Changed to use $asset as the primary data source -->
    <title>Property Tag — {{ $asset->property_number ?? 'N/A' }}</title>
    <style>
        /* (Keep all your existing CSS exactly the same) */
        * { box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1f2a45; margin: 0; padding: 16px; -webkit-print-color-adjust: exact; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { display: table; width: 100%; padding: 16px 20px; }
        .header-logo { display: table-cell; width: 50px; vertical-align: middle; }
        .header-logo img { display: block; width: 50px; height: 50px; object-fit: contain; }
        .header-text { display: table-cell; vertical-align: middle; text-align: center; padding: 0 10px; }
        .header-logo-right { display: table-cell; width: 50px; vertical-align: middle; text-align: right; }
        .header-logo-right img { display: block; width: 45px; height: 45px; object-fit: contain; margin-left: auto; }
        .country { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .organization { font-size: 11px; font-weight: bold; color: #1f2a45; text-transform: uppercase; letter-spacing: 0.3px; }
        .region { font-size: 9px; font-weight: 600; color: #365175; text-transform: uppercase; margin-top: 2px; }
        .body-content { padding: 24px 20px; }
        .title-section { margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; align-items: center; }
        h1 { font-size: 20px; margin: 0 0 8px 0; color: #0f172a; line-height: 1.3; align-items: center; }
        .property-tag { display: inline-block; background: #eff6ff; color: #333333; padding: 4px 10px; border-radius: 4px; font-size: 15px; font-weight: bold; letter-spacing: 0.4px; }
        .details-table { width: 100%; border-collapse: collapse; }
        .details-table tr th { width: 38%; text-align: left; padding: 12px 10px; font-size: 11px; font-weight: 600; color: #64748b; background: #f8fafc; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.3px; vertical-align: top; }
        .details-table tr td { width: 62%; text-align: left; padding: 12px 10px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-assigned { background: #dbeafe; color: #1e40af; }
        .badge-available { background: #dcfce7; color: #166534; }
        .badge-repair { background: #fef9c3; color: #854d0e; }
        .badge-condemned { background: #fee2e2; color: #991b1b; }
        .footer-meta { margin-top: 24px; text-align: right; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
        .footer-meta button { background: #1f2a45; color: #ffffff; border: none; padding: 6px 12px; margin-top: 8px; border-radius: 4px; font-size: 15px; cursor: pointer; }
    </style>
</head>
<body>
    @php
        // Safely extract the latest receipt line if the controller only passed the $asset
        $line = $line ?? $asset->lines()->latest()->first() ?? null;
        $attached = $attached ?? collect();
    @endphp

    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-logo">
                <img src="{{ asset('images/DOH_Logo.png') }}" alt="DOH Logo">
            </div>
            <div class="header-text">
                <div class="country">{{ config('app.country', 'Republic of the Philippines') }}</div>
                <div class="organization">{{ config('app.organization', 'Department of Health') }}</div>
                <div class="region">{{ config('app.region', 'Regional Office') }}</div>
                <div class="region">Center of Health Development</div>
            </div>
            <div class="header-logo-right">
                <img src="{{ asset('images/Bagong_PilipinasTransparent.png') }}" alt="Bagong Pilipinas">
            </div>
        </div>
        
        <!-- Body Details -->
        <div class="body-content">
            <div class="title-section">
                <h1>{{ $asset->item->name ?? 'Unknown Item' }}</h1>
                <span class="property-tag">Property No: {{ $asset->property_number ?? 'N/A' }}</span>
            </div>

            <table class="details-table">
                @if($line && $line->receipt)
                    <tr>
                        <th>Document Number</th>
                        <td>{{ $line->receipt->document_number }} <span style="color: #64748b; font-size: 17px; font-weight: bold;">({{ $line->receipt->receipt_type }})</span></td>
                    </tr>
                @endif
                <tr>
                    <th>Serial Number</th>
                    <td>{{ $asset->serial_number ?? 'N/A' }}</td>
                </tr>

                <!-- PAR / ICS Specific Details -->
                @if($line && $line->receipt && $line->receipt->receipt_type === 'PAR')
                    <tr>
                        <th>Manufacturer</th>
                        <td>{{ $asset->manufacturer_name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Brand & Model</th>
                        <td>{{ trim(($asset->item->brand ?? '') . '/' . ($asset->model ?? ''), '/ ') ?: 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Country of Origin</th>
                        <td>{{ $asset->country_of_origin ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Date Acquired</th>
                        <td>{{ $asset->created_at ? $asset->created_at->format('F j, Y') : 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Estimated Useful Life</th>
                        <td>{{ $asset->item->estimated_useful_life ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Unit Cost</th>
                        <td>₱{{ number_format($asset->unit_cost, 2) }}</td>
                    </tr>
                @elseif($line && $line->receipt && $line->receipt->receipt_type === 'ICS')
                    <tr>
                        <th>Brand</th>
                        <td>{{ $asset->item->brand ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Model</th>
                        <td>{{ $asset->model ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Specifications</th>
                        <td>{{ $asset->item->specifications ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Inventory Item No.</th>
                        <td>{{ $asset->item->item_code ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Estimated Useful Life</th>
                        <td>{{ $asset->item->estimated_useful_life ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Unit Cost</th>
                        <td>₱{{ number_format($asset->unit_cost, 2) }}</td>
                    </tr>
                @endif

                <tr>
                    <th>Current Status</th>
                    <td>
                        <span class="badge badge-{{ strtolower(str_replace(' ', '', $asset->status ?? 'available')) }}">
                            {{ $asset->status ?? 'Available' }}
                        </span>
                    </td>
                </tr>
                
                <tr>
                    <th>Current User</th>
                    <td>
                        @if($asset->currentUser)
                            <strong style="color: #0f172a;">{{ $asset->currentUser->name }}</strong><br>
                            <span style="color: #64748b; font-size: 12px;">{{ $asset->currentUser->designation }}</span>
                        @else
                            <span style="color: #64748b; font-size: 12px;">Not Assigned / Stock</span>
                        @endif
                    </td>
                </tr>

                @if($line && $line->receipt)
                    <tr>
                        <th>Issued To</th>
                        <td>
                            <strong style="color: #0f172a;">{{ $line->receipt->user->name ?? 'N/A' }}</strong><br>
                            <span style="color: #64748b; font-size: 12px;">{{ $line->receipt->user->designation ?? '' }}</span>
                        </td>
                    </tr>
                    <tr>
                        <th>Issued By</th>
                        <td>{{ $line->receipt->issuedBy->name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Date Issued</th>
                        <td>{{ \Carbon\Carbon::parse($line->receipt->date_issued)->format('F j, Y') }}</td>
                    </tr>
                @endif

                @if($line && $line->accessories_notes)
                <tr>
                    <th>Accessories</th>
                    <td>{{ $line->accessories_notes }}</td>
                </tr>
                @endif
            </table>

            @if($attached && $attached->isNotEmpty())
            <h3 style="margin-top: 24px; font-size: 14px;">Bundled Items</h3>
            <table class="details-table" style="margin-top: 8px;">
                <tr>
                    <th>Item</th>
                    <th>Model</th>
                    <th>Cost</th>
                </tr>
                @foreach($attached as $child)
                <tr>
                    <td>{{ $child->item->name ?? 'Unknown' }}</td>
                    <td>{{ $child->model ?? 'N/A' }}</td>
                    <td>₱{{ number_format($child->unit_cost, 2) }}</td>
                </tr>
                @endforeach
            </table>
            @endif

            <div class="footer-meta">
                {{ config('app.name') }}<br>
                <button onclick="window.print()">Print Details</button>
            </div>
        </div>
    </div>
</body>
</html>