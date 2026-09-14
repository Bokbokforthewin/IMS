<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Property Tag — {{ $line->serializedAsset->property_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; color: #1f2a45; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #6b7280; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e3e8e6; font-size: 14px; }
        th { width: 40%; color: #6b7280; font-weight: 600; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
        .badge-assigned { background: #e8f0fe; color: #1a56db; }
        .badge-available { background: #e6f4ea; color: #1e7e34; }
        .badge-repair { background: #fff3cd; color: #856404; }
        .badge-condemned { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>{{ $line->serializedAsset->item->name }}</h1>
    <div class="subtitle">Property Number: <strong>{{ $line->serializedAsset->property_number }}</strong></div>

    <table>
        <tr><th>Document Number</th><td>{{ $line->receipt->document_number }} ({{ $line->receipt->receipt_type }})</td></tr>
        <tr><th>Serial Number</th><td>{{ $line->serializedAsset->serial_number }}</td></tr>
        <tr>
            <th>Current Status</th>
            <td>
                <span class="badge badge-{{ strtolower(str_replace(' ', '', $line->serializedAsset->status)) }}">
                    {{ $line->serializedAsset->status }}
                </span>
            </td>
        </tr>
        <tr><th>Current Holder</th><td>{{ $line->serializedAsset->currentHolder->name ?? '— (in warehouse)' }}</td></tr>
        <tr><th>Issued To (on this document)</th><td>{{ $line->receipt->user->name }} — {{ $line->receipt->user->designation }}</td></tr>
        <tr><th>Issued By</th><td>{{ $line->receipt->issuedBy->name ?? 'N/A' }}</td></tr>
        <tr><th>Date Issued</th><td>{{ \Carbon\Carbon::parse($line->receipt->date_issued)->format('F j, Y') }}</td></tr>
        @if($line->accessories_notes)
        <tr><th>Accessories</th><td>{{ $line->accessories_notes }}</td></tr>
        @endif
    </table>
</body>
</html>