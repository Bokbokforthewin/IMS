<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0;
        }

        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 6px 8px;
            box-sizing: border-box;
            background: #ffffff;
        }

        /* Sticker wrapper with a crisp border for cutting/printing */
        .wrapper {
            display: table;
            width: 100%;
            height: 105px;
            border: 1.5px solid #1f2a45;
            border-radius: 4px;
            padding: 4px 6px;
            box-sizing: border-box;
        }

        .info {
            display: table-cell;
            vertical-align: middle;
            width: 62%;
            padding-right: 4px;
        }

        .qr {
            display: table-cell;
            vertical-align: middle;
            width: 38%;
            text-align: right;
        }

        .qr img {
            width: 80px;
            height: 80px;
            display: block;
            margin-left: auto;
        }

        .label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: bold;
            margin-bottom: 1px;
        }

        .property-number {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: 0.3px;
            line-height: 1.1;
        }

        .recipient-name {
            font-size: 15px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: bold;
            margin-bottom: 1px;
        }
    </style>
</head>
<body>

    <div class="wrapper">

        <div class="info">
            <div class="label">Property No.</div>
            <div class="property-number">{{ $propertyNumber }}</div>

            <div class="label" style="margin-top: 6px;"> </div>
            <div class="label">{{ $recipientName }}</div>
        </div>

        <div class="qr">
            <img src="{{ $qrDataUri }}" alt="QR Code">
        </div>

    </div>

</body>
</html>