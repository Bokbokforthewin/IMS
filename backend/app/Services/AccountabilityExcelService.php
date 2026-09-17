<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountabilityExcelService
{
    protected array $thinBorder = [
        'borders' => [
            'allBorders' => [
                'borderStyle' => Border::BORDER_THIN,
                'color' => ['argb' => 'FF000000'],
            ],
        ],
    ];

    public function generate($receipt)
    {
        $spreadsheet = $receipt->receipt_type === 'ICS'
            ? $this->buildIcs($receipt)
            : $this->buildPar($receipt);

        $filename = "{$receipt->receipt_type}-{$receipt->document_number}.xlsx";

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment;filename="' . $filename . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Estimates how many visual lines a text block will wrap into given a
     * column's approximate character width — counting only literal "\n"
     * breaks undercounts long unbroken lines that wrap on their own.
     */
    protected function calculateWrappedLines(string $text, int $columnCharWidth): int
    {
        $totalLines = 0;
        foreach (explode("\n", $text) as $segment) {
            $len = mb_strlen($segment);
            $totalLines += max(1, (int) ceil($len / max(1, $columnCharWidth)));
        }
        return $totalLines;
    }

    protected function setRowHeightForText($sheet, int $row, string $text, int $columnCharWidth = 45): void
    {
        $lineCount = $this->calculateWrappedLines($text, $columnCharWidth);
        $sheet->getRowDimension($row)->setRowHeight(max(30, ($lineCount * 15) + 10));
    }

    /**
     * Formats structured accessory data (JSON-encoded array of
     * {name, brand, serial_number}) into clean individual lines.
     * Falls back to treating it as plain legacy text if it isn't valid JSON,
     * so older receipts created before this change still display correctly.
     */
    protected function formatAccessoryLines(?string $accessoriesNotes): array
    {
        if (empty($accessoriesNotes)) {
            return [];
        }

        $decoded = json_decode($accessoriesNotes, true);

        if (!is_array($decoded)) {
            // Legacy plain-text value — show as-is under a single header line.
            return ['Accessories: ' . $accessoriesNotes];
        }

        $lines = ['Accessories:'];
        foreach ($decoded as $item) {
            $name = trim($item['name'] ?? '');
            if ($name === '') continue;

            $parts = [$name];
            if (!empty($item['brand'])) {
                $parts[] = "Brand: {$item['brand']}";
            }
            if (!empty($item['serial_number'])) {
                $parts[] = "SN: {$item['serial_number']}";
            }

            $lines[] = '- ' . implode(', ', $parts);
        }

        return $lines;
    }

    protected function buildParDescription($line, $index, $totalLines): string
    {
        $asset = $line->serializedAsset;
        $item = $asset->item;

        $prefix = $totalLines > 1 ? sprintf('%02d. ', $index + 1) : '';
        $lines = [$prefix . $item->name];

        if (!empty($asset->manufacturer_name)) {
            $lines[] = "Name of Manufacturer: {$asset->manufacturer_name}";
        }

        $brandModel = trim(($item->brand ?? '') . '/' . ($asset->model ?? ''), '/ ');
        if ($brandModel !== '') {
            $lines[] = "Brand and Model: {$brandModel}";
        }

        if (!empty($asset->country_of_origin)) {
            $lines[] = "Country of Origin: {$asset->country_of_origin}";
        }
        if (!empty($asset->serial_number)) {
            $lines[] = "SN: {$asset->serial_number}";
        }
        if (!empty($item->estimated_useful_life)) {
            $lines[] = "Estimated Useful Life: {$item->estimated_useful_life}";
        }
            $accessoryLines = $this->formatAccessoryLines($line->accessories_notes);

                // Loop through each accessory and split its details by commas into newlines
                foreach ($accessoryLines as $accessory) {
                    $formattedAccessory = str_replace([', Brand:', ', SN:'], ["\nBrand:", "\nSN:"], $accessory);
                    
                    $formattedAccessory = str_replace('- Mouse,', '- Mouse', $formattedAccessory);
                    
                    $lines[] = $formattedAccessory . "\n";
                }            
                return implode("\n", $lines);
        }

    protected function buildIcsDescription($line, $index, $totalLines): string
    {
        $asset = $line->serializedAsset;
        $item = $asset->item;

        $prefix = $totalLines > 1 ? sprintf('%02d. ', $index + 1) : '';
        $lines = [$prefix . $item->name];

        if (!empty($item->brand)) {
            $lines[] = "Brand: {$item->brand}";
        }
        if (!empty($asset->model)) {
            $lines[] = "Model: {$asset->model}";
        }
        if (!empty($item->specifications)) {
            $lines[] = $item->specifications;
        }
        if (!empty($asset->serial_number)) {
            $lines[] = "Serial No.: {$asset->serial_number}";
        }
            $accessoryLines = $this->formatAccessoryLines($line->accessories_notes);

                // Loop through each accessory and split its details by commas into newlines
                foreach ($accessoryLines as $accessory) {
                    $formattedAccessory = str_replace([', Brand:', ', SN:'], ["\nBrand:", "\nSN:"], $accessory);
                    
                    $formattedAccessory = str_replace('- Mouse,', '- Mouse', $formattedAccessory);
                    
                    $lines[] = $formattedAccessory . "\n";
                }            
                return implode("\n", $lines);
        }

    protected function buildPar($receipt): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $sheet->getPageMargins()->setLeft(0.4)->setRight(0.4)->setTop(0.5)->setBottom(0.5);

        $sheet->getColumnDimension('A')->setWidth(14);
        $sheet->getColumnDimension('B')->setWidth(14);
        $sheet->getColumnDimension('C')->setWidth(45);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(14);
        $sheet->getColumnDimension('F')->setWidth(16);

        $sheet->setCellValue('F1', 'Appendix 71');
        $sheet->getStyle('F1')->getFont()->setItalic(true);
        $sheet->getStyle('F1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->mergeCells('A2:F2');
        $sheet->setCellValue('A2', 'PROPERTY ACKNOWLEDGEMENT RECEIPT');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A4', 'Entity Name:');
        $sheet->mergeCells('B4:F4');
        $sheet->setCellValue('B4', 'DOH NIR CHD');

        $sheet->setCellValue('A5', 'Fund Cluster:');
        $sheet->mergeCells('B5:D5');
        $sheet->setCellValue('B5', '');
        $sheet->setCellValue('E5', 'PAR No.');
        $sheet->setCellValue('F5', $receipt->document_number);
        $sheet->getStyle('E5')->getFont()->setBold(true);

        $sheet->setCellValue('A7', 'Description:');
        $sheet->mergeCells('B7:F7');
        $sheet->setCellValue('B7', '');

        $headerRow = 9;
        $headers = ['Quantity', 'Unit', 'Description', 'Property Number', 'Date Acquired', 'Amount'];
        foreach (['A', 'B', 'C', 'D', 'E', 'F'] as $i => $col) {
            $sheet->setCellValue("{$col}{$headerRow}", $headers[$i]);
        }
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->applyFromArray($this->thinBorder);

        $row = $headerRow + 1;
        $grandTotal = 0;
        $lines = $receipt->lines;
        $totalLines = $lines->count();

        foreach ($lines as $index => $line) {
            $asset = $line->serializedAsset;
            $unitCost = (float) $asset->unit_cost;
            $grandTotal += $unitCost;

            $description = $this->buildParDescription($line, $index, $totalLines);

            $sheet->setCellValue("A{$row}", 1);
            $sheet->setCellValue("B{$row}", $asset->item->unit_of_measure ?? 'Unit');
            $sheet->setCellValue("C{$row}", $description);
            $sheet->setCellValue("D{$row}", $asset->property_number);
            $sheet->setCellValue("E{$row}", $asset->created_at?->format('n/j/Y'));
            $sheet->setCellValue("F{$row}", $unitCost);
            $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('#,##0.00');

            $sheet->getStyle("C{$row}")->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
            foreach (['A', 'B', 'D', 'E', 'F'] as $col) {
                $sheet->getStyle("{$col}{$row}")->getAlignment()
                    ->setVertical(Alignment::VERTICAL_TOP)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }

            $sheet->getStyle("A{$row}:F{$row}")->applyFromArray($this->thinBorder);
            $this->setRowHeightForText($sheet, $row, $description, 45);

            $row++;
        }

        $sheet->mergeCells("A{$row}:E{$row}");
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);

        $sheet->setCellValue("F{$row}", $grandTotal);
        $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("F{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:F{$row}")->applyFromArray($this->thinBorder);

                $row += 2;
        $labelRow = $row;
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->mergeCells("D{$row}:F{$row}");
        $sheet->setCellValue("A{$row}", 'Received by:');
        $sheet->setCellValue("D{$row}", 'Issued by:');

        $row += 3;
        $nameRow = $row;
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->mergeCells("D{$row}:F{$row}");
        $sheet->setCellValue("A{$row}", strtoupper($receipt->user->name ?? ''));
        $sheet->setCellValue("D{$row}", strtoupper($receipt->issuedBy->name ?? ''));
        $sheet->getStyle("A{$row}:F{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // TOP boxes: label row through name row
        $sheet->getStyle("A{$labelRow}:C{$nameRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("D{$labelRow}:F{$nameRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $row++;
        $designationRow = $row;
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->mergeCells("D{$row}:F{$row}");
        $sheet->setCellValue("A{$row}", $receipt->user->designation ?? '');
        $sheet->setCellValue("D{$row}", $receipt->issuedBy->designation ?? '');
        $sheet->getStyle("A{$row}:F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $row++;
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->mergeCells("D{$row}:F{$row}");
        $dateStr = $receipt->date_issued ? date('n/j/Y', strtotime($receipt->date_issued)) : '';
        $sheet->setCellValue("A{$row}", $dateStr);
        $sheet->setCellValue("D{$row}", $dateStr);
        $sheet->getStyle("A{$row}:F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $row++;
        $dateLabelRow = $row;
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->mergeCells("D{$row}:F{$row}");
        $sheet->setCellValue("A{$row}", 'DATE');
        $sheet->setCellValue("D{$row}", 'DATE');
        $sheet->getStyle("A{$row}:F{$row}")->getFont()->setSize(9);
        $sheet->getStyle("A{$row}:F{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // BOTTOM boxes: designation row through the "DATE" label row
        $sheet->getStyle("A{$designationRow}:C{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("D{$designationRow}:F{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $sheet->getPageSetup()->setPrintArea("A1:F{$row}");
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        return $spreadsheet;
    }

    protected function buildIcs($receipt): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $sheet->getPageMargins()->setLeft(0.4)->setRight(0.4)->setTop(0.5)->setBottom(0.5);

        $sheet->getColumnDimension('A')->setWidth(14);
        $sheet->getColumnDimension('B')->setWidth(14);
        $sheet->getColumnDimension('C')->setWidth(12);
        $sheet->getColumnDimension('D')->setWidth(12);
        $sheet->getColumnDimension('E')->setWidth(38);
        $sheet->getColumnDimension('F')->setWidth(16);
        $sheet->getColumnDimension('G')->setWidth(14);

        $sheet->setCellValue('G1', 'Appendix 59');
        $sheet->getStyle('G1')->getFont()->setItalic(true);
        $sheet->getStyle('G1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->mergeCells('A2:G2');
        $sheet->setCellValue('A2', 'INVENTORY CUSTODIAN SLIP');
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A4', 'Entity Name:');
        $sheet->mergeCells('B4:E4');
        $sheet->setCellValue('B4', $receipt->remarks ?? '');
        $sheet->setCellValue('F5', 'NIR ICS No:');
        $sheet->setCellValue('G5', $receipt->document_number);
        $sheet->getStyle('F5')->getFont()->setBold(true);

        $sheet->setCellValue('A5', 'Fund Cluster:');
        $sheet->mergeCells('B5:E5');
        $sheet->setCellValue('B5', '');

        $headerTop = 7;
        $headerSub = 8;

        $sheet->mergeCells("A{$headerTop}:A{$headerSub}");
        $sheet->setCellValue("A{$headerTop}", 'Quantity');

        $sheet->mergeCells("B{$headerTop}:B{$headerSub}");
        $sheet->setCellValue("B{$headerTop}", 'Unit');

        $sheet->mergeCells("C{$headerTop}:D{$headerTop}");
        $sheet->setCellValue("C{$headerTop}", 'Amount');
        $sheet->setCellValue("C{$headerSub}", 'Unit Cost');
        $sheet->setCellValue("D{$headerSub}", 'Total Cost');

        $sheet->mergeCells("E{$headerTop}:E{$headerSub}");
        $sheet->setCellValue("E{$headerTop}", 'Description');

        $sheet->mergeCells("F{$headerTop}:F{$headerSub}");
        $sheet->setCellValue("F{$headerTop}", 'Inventory Item No.');

        $sheet->mergeCells("G{$headerTop}:G{$headerSub}");
        $sheet->setCellValue("G{$headerTop}", 'Estimated Useful Life');

        $sheet->getStyle("A{$headerTop}:G{$headerSub}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerTop}:G{$headerSub}")->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setWrapText(true);
        $sheet->getStyle("A{$headerTop}:G{$headerSub}")->applyFromArray($this->thinBorder);

        $row = $headerSub + 1;
        $grandTotal = 0;
        $lines = $receipt->lines;
        $totalLines = $lines->count();

        foreach ($lines as $index => $line) {
            $asset = $line->serializedAsset;
            $item = $asset->item;
            $unitCost = (float) $asset->unit_cost;
            $totalCost = $unitCost * 1;
            $grandTotal += $totalCost;

            $description = $this->buildIcsDescription($line, $index, $totalLines);

            $sheet->setCellValue("A{$row}", 1);
            $sheet->setCellValue("B{$row}", $item->unit_of_measure ?? 'Unit');
            $sheet->setCellValue("C{$row}", $unitCost);
            $sheet->setCellValue("D{$row}", $totalCost);
            $sheet->setCellValue("E{$row}", $description);
            $sheet->setCellValue("F{$row}", $item->item_code ?? '');
            $sheet->setCellValue("G{$row}", $item->estimated_useful_life ?? 'N/A');

            $sheet->getStyle("C{$row}:D{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("E{$row}")->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);

            foreach (['A', 'B', 'C', 'D', 'F', 'G'] as $col) {
                $sheet->getStyle("{$col}{$row}")->getAlignment()
                    ->setVertical(Alignment::VERTICAL_TOP)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }

            $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($this->thinBorder);
            $this->setRowHeightForText($sheet, $row, $description, 38);

            $row++;
        }

        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->setCellValue("A{$row}", 'Total:');
        $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);

        $sheet->setCellValue("D{$row}", $grandTotal);
        $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("D{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($this->thinBorder);

        // --- Signature block: exactly 4 outline boxes ---
        $row += 2;
        $labelRow = $row;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $sheet->setCellValue("A{$row}", 'Received from:');
        $sheet->setCellValue("E{$row}", 'Received by:');

        $row += 3;
        $nameRow = $row;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $sheet->setCellValue("A{$row}", $receipt->issuedBy->name ?? '');
        $sheet->setCellValue("E{$row}", $receipt->user->name ?? '');
        $sheet->getStyle("A{$row}:G{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // TOP boxes: label row through name row — one outer box per side
        $sheet->getStyle("A{$labelRow}:D{$nameRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("E{$labelRow}:G{$nameRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $row++;
        $sigCaptionRow = $row;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $sheet->setCellValue("A{$row}", 'Signature Over Printed Name');
        $sheet->setCellValue("E{$row}", 'Signature Over Printed Name');
        $sheet->getStyle("A{$row}:G{$row}")->getFont()->setSize(9)->setItalic(true);
        $sheet->getStyle("A{$row}:G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $row++;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $sheet->setCellValue("A{$row}", $receipt->issuedBy->designation ?? '');
        $sheet->setCellValue("E{$row}", $receipt->user->designation ?? '');
        $sheet->getStyle("A{$row}:G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $row++;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $dateStr = $receipt->date_issued ? date('F j, Y', strtotime($receipt->date_issued)) : '';
        $sheet->setCellValue("A{$row}", $dateStr);
        $sheet->setCellValue("E{$row}", $dateStr);
        $sheet->getStyle("A{$row}:G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $row++;
        $dateLabelRow = $row;
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->mergeCells("E{$row}:G{$row}");
        $sheet->setCellValue("A{$row}", 'Date');
        $sheet->setCellValue("E{$row}", 'Date');
        $sheet->getStyle("A{$row}:G{$row}")->getFont()->setSize(9)->setItalic(true);
        $sheet->getStyle("A{$row}:G{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // BOTTOM boxes: "Signature Over Printed Name" through final "Date" label — one outer box per side
        $sheet->getStyle("A{$sigCaptionRow}:D{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("E{$sigCaptionRow}:G{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $sheet->getPageSetup()->setPrintArea("A1:G{$row}");
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        return $spreadsheet;
    }
}