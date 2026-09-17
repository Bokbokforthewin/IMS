<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0;
            size: 612pt 792pt;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 24pt;
            width: 612pt;
            height: 792pt;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #1f2a45;
        }

        .cutting-guide {
            position: relative;
            width: 163.67pt;
            height: 97.67pt;
            border: 0.8pt dashed #64748b;
            background: #ffffff;
        }

        .wrapper {
            position: absolute;
            top: 4pt;
            left: 4pt;
            width: 141.33pt;
            height: 80pt;
            overflow: hidden;
            border: 1.2pt solid #1f2a45;
            background: #ffffff;
            padding: 4pt 6pt;
        }

        .header {
            width: 100%;
            height: 24pt;
            display: table;
            padding-bottom: 3pt;
            border-bottom: 0.5pt solid #cbd5e1;
        }

        .header-logo {
            display: table-cell;
            width: 20pt;
            vertical-align: middle;
        }

        .header-logo img {
            display: block;
            width: 16pt;
            height: 16pt;
        }

        .header-text {
            display: table-cell;
            vertical-align: middle;
            padding-left: 3pt;
            text-align: center;
        }

        .country {
            font-size: 3.2pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.15pt;
            line-height: 1;
            margin-bottom: 1pt;
            text-align: center;
        }

        .organization {
            font-size: 5.6pt;
            font-weight: bold;
            color: #1f2a45;
            text-transform: uppercase;
            letter-spacing: 0.1pt;
            line-height: 1;
            text-align: center;
        }

        .region {
            font-size: 3.8pt;
            font-weight: bold;
            color: #365175;
            text-transform: uppercase;
            letter-spacing: 0.05pt;
            line-height: 1.1;
            margin-top: 1pt;
            text-align: center;
        }

        .content {
            width: 100%;
            height: 44pt;
            display: table;
            padding-top: 4pt;
        }

        .info-col {
            display: table-cell;
            width: 62%;
            vertical-align: middle;
            padding-right: 4pt;
        }

        .field-label {
            font-size: 3.6pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            line-height: 1;
            margin-bottom: 1.5pt;
        }

        .property-number {
            font-size: 8pt;
            font-weight: bold;
            color: #1f2a45;
            letter-spacing: 0.2pt;
            line-height: 1.05;
            white-space: nowrap;
        }

        .divider {
            width: 92%;
            height: 0.5pt;
            margin: 3.5pt 0;
            background: #dbe3ea;
        }

        .recipient-name {
            font-size: 6pt;
            font-weight: bold;
            color: #334155;
            text-transform: uppercase;
            line-height: 1.15;
            max-height: 12pt;
            overflow: hidden;
            margin-top: 3pt;
        }

        .qr-col {
            display: table-cell;
            width: 30%;
            vertical-align: middle;
            text-align: center;
            border-left: 0.5pt solid #dbe3ea;
            padding-left: 4pt;
        }

        .qr-container {
            background: #ffffff;
        }

        .qr-container img {
            display: block;
            width: 50pt;
            height: 50pt;
            margin: 0 auto;
        }

        .system-name {
            position: absolute;
            left: 6pt;
            bottom: 3pt;
            font-size: 2.8pt;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.15pt;
            line-height: 1;
        }
    </style>
</head>
<body>

    <div class="cutting-guide">
        <div class="wrapper">
            <div class="header">
                <div class="header-logo">
                    @if(!empty($logoDataUri))
                        <img src="{{ $logoDataUri }}" alt="{{ config('app.organization') }}">
                    @endif
                </div>
                <div class="header-text">
                    <div class="country">{{ config('app.country') }}</div>
                    <div class="organization">{{ config('app.organization') }}</div>
                    <div class="region">{{ config('app.region') }} Center of Health Development</div>
                </div>
                <div class="header-logo">
                    @if(!empty($bagongPilipinasDataUri))
                        <img src="{{ $bagongPilipinasDataUri }}" alt="{{ config('app.organization') }}">
                    @endif
                </div>
            </div>

            <div class="content">
                <div class="info-col">
                    <div class="field-label">Property Number</div>
                    <div class="property-number">{{ $propertyNumber }}</div>
                    <div class="divider"></div>
                    <div class="recipient-name">{{ $recipientName }}</div>
                </div>

                <div class="qr-col">
                    @if(!empty($qrDataUri))
                        <div class="qr-container">
                            <img src="{{ $qrDataUri }}" alt="Property QR Code">
                        </div>
                    @endif
                </div>
            </div>

            <div class="system-name">{{ config('app.name') }}</div>
        </div>
    </div>

</body>
</html>