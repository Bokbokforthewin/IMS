<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountabilityExcelService
{
    // Page geometry, used ONLY to estimate how many item rows fit on a page.
    // Letter portrait is the smallest common paper, so the estimate stays safe for A4/Legal too.
    protected const PAPER_WIDTH_IN = 8.5;
    protected const PAPER_HEIGHT_IN = 11.0;
    protected const MARGIN_LEFT_IN = 0.4;
    protected const MARGIN_RIGHT_IN = 0.4;
    protected const MARGIN_TOP_IN = 0.5;
    protected const MARGIN_BOTTOM_IN = 0.6;
    protected const FOOTER_MARGIN_IN = 0.25;

    // Only fill this fraction of the estimated page. The cushion stops Excel from
    // inserting its own automatic break just ahead of ours (which would leave a near-empty page).
    protected const PAGE_FILL_RATIO = 0.92;

    // Fixed row heights in points, so the page estimate is exact rather than guessed.
    protected const PAR_TOP_BLOCK_HEIGHT = 130;  // rows 1-8: appendix, title, entity, fund cluster, description
    protected const PAR_HEADER_HEIGHT = 24;      // column heading row (repeats on every page)
    protected const PAR_TAIL_HEIGHT = 150;       // total row + signature block

    protected const ICS_TOP_BLOCK_HEIGHT = 100;  // rows 1-6
    protected const ICS_HEADER_HEIGHT = 40;      // two merged heading rows (repeat on every page)
    protected const ICS_TAIL_HEIGHT = 165;       // total row + signature block

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

    protected function calculateWrappedLines(string $text, int $columnCharWidth): int
    {
        $totalLines = 0;
        foreach (explode("\n", $text) as $segment) {
            $len = mb_strlen($segment);
            $totalLines += max(1, (int) ceil($len / max(1, $columnCharWidth)));
        }
        return $totalLines;
    }

    protected function calculateRowHeight(string $text, int $columnCharWidth): float
    {
        $lineCount = $this->calculateWrappedLines($text, $columnCharWidth);
        return (float) max(30, ($lineCount * 15) + 10);
    }

    /**
     * Estimates how many points of sheet content fit on one printed page, based on
     * the actual column widths. Because the sheet is fit-to-width, wider columns shrink
     * the print scale, which lets MORE rows fit vertically, so this adapts if you tweak widths.
     */
    protected function calculatePageBudget(array $columnWidths): float
    {
        // Excel column width (characters) -> pixels -> points
        $contentWidthPt = array_sum(array_map(fn ($w) => (7 * $w + 5) * 0.75, $columnWidths));
        $printableWidthPt = (self::PAPER_WIDTH_IN - self::MARGIN_LEFT_IN - self::MARGIN_RIGHT_IN) * 72;
        $scale = min(1.0, $printableWidthPt / $contentWidthPt);

        $printableHeightPt = (self::PAPER_HEIGHT_IN - self::MARGIN_TOP_IN - self::MARGIN_BOTTOM_IN) * 72;

        return floor(($printableHeightPt / $scale) * self::PAGE_FILL_RATIO);
    }

    /**
     * Splits item rows into pages.
     *
     * @param float[] $rowHeights  height of each item row, in order
     * @return int[][]             list of pages; each page is a list of item indexes
     */
    protected function planPages(
        array $rowHeights,
        float $budget,
        float $firstPageOverhead,
        float $otherPageOverhead,
        float $tailHeight
    ): array {
        $pages = [];
        $current = [];
        $used = 0.0;
        $capacity = $budget - $firstPageOverhead;

        foreach ($rowHeights as $i => $height) {
            if (!empty($current) && $used + $height > $capacity) {
                $pages[] = $current;
                $current = [];
                $used = 0.0;
                $capacity = $budget - $otherPageOverhead;
            }
            $current[] = $i;
            $used += $height;
        }
        if (!empty($current)) {
            $pages[] = $current;
        }
        if (empty($pages)) {
            return [[]];
        }

        // The total row + signature block must never be split from the items or stranded alone.
        // If they don't fit under the last item row, move that last item onto a fresh page with them.
        $lastKey = array_key_last($pages);
        $lastPage = $pages[$lastKey];
        $lastCapacity = ($lastKey === 0) ? $budget - $firstPageOverhead : $budget - $otherPageOverhead;
        $lastUsed = array_sum(array_map(fn ($i) => $rowHeights[$i], $lastPage));

        if ($lastUsed + $tailHeight > $lastCapacity && count($lastPage) > 1) {
            $moved = array_pop($lastPage);
            $pages[$lastKey] = $lastPage;
            $pages[] = [$moved];
        }

        return $pages;
    }

    /**
     * Applies manual page breaks, repeating column headings, and the page-number footer.
     * The footer and repeated headings only apply when the document spans more than one page.
     */
    protected function applyPrintLayout(
        Worksheet $sheet,
        array $pages,
        array $lineRows,
        int $repeatFromRow,
        int $repeatToRow,
        string $documentNumber
    ): void {
        $pageCount = count($pages);

        // Break AFTER the last item row of every page except the final one.
        for ($p = 0; $p < $pageCount - 1; $p++) {
            $page = $pages[$p];
            $lastIndexOnPage = $page[array_key_last($page)];
            $sheet->setBreak('A' . $lineRows[$lastIndexOnPage], Worksheet::BREAK_ROW);
        }

        if ($pageCount > 1) {
            $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd($repeatFromRow, $repeatToRow);

            // '&' is a control character in header/footer strings, so literal ampersands are doubled.
            $doc = str_replace('&', '&&', $documentNumber);
            $sheet->getHeaderFooter()->setOddFooter('&L' . $doc . '&CPage &P of &N');
        }
    }

    protected function buildLineDescription($line, $index, $totalLines): string
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
        if (!empty($item->specifications)) {
            $lines[] = $item->specifications;
        }

        $secondaryUser = $asset->currentHolder ?? $asset->secondaryUser ?? null;
        if ($secondaryUser && !empty($secondaryUser->name)) {
            $lines[] = "End User: {$secondaryUser->name}";
        }

        if (!empty($asset->attached_to)) {
            $lines[] = "Bundled with property no.: {$asset->attached_to}";
        }

        return implode("\n", $lines);
    }

    protected function buildPar($receipt): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $sheet->getPageMargins()
            ->setLeft(self::MARGIN_LEFT_IN)->setRight(self::MARGIN_RIGHT_IN)
            ->setTop(self::MARGIN_TOP_IN)->setBottom(self::MARGIN_BOTTOM_IN)
            ->setFooter(self::FOOTER_MARGIN_IN);

        // Change column widths here — the page estimate below follows automatically.
        $widths = ['A' => 14, 'B' => 14, 'C' => 45, 'D' => 20, 'E' => 14, 'F' => 16];
        foreach ($widths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

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
        $sheet->getRowDimension($headerRow)->setRowHeight(self::PAR_HEADER_HEIGHT);
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle("A{$headerRow}:F{$headerRow}")->applyFromArray($this->thinBorder);

        // --- Plan the pages before writing rows, so every row height is known up front ---
        $lines = $receipt->lines->values();
        $totalLines = $lines->count();

        $descriptions = [];
        $rowHeights = [];
        foreach ($lines as $index => $line) {
            $descriptions[$index] = $this->buildLineDescription($line, $index, $totalLines);
            $rowHeights[$index] = $this->calculateRowHeight($descriptions[$index], $widths['C']);
        }

        $pages = $this->planPages(
            $rowHeights,
            $this->calculatePageBudget($widths),
            self::PAR_TOP_BLOCK_HEIGHT + self::PAR_HEADER_HEIGHT,
            self::PAR_HEADER_HEIGHT,
            self::PAR_TAIL_HEIGHT
        );

        $row = $headerRow + 1;
        $grandTotal = 0;
        $lineRows = [];

        foreach ($lines as $index => $line) {
            $asset = $line->serializedAsset;
            $unitCost = (float) $asset->unit_cost * $line->quantity;
            $grandTotal += $unitCost;
            $lineRows[$index] = $row;

            $sheet->setCellValue("A{$row}", $line->quantity);
            $sheet->setCellValue("B{$row}", $asset->item->unit_of_measure ?? 'Unit');
            $sheet->setCellValue("C{$row}", $descriptions[$index]);
            $sheet->setCellValue("D{$row}", $asset->property_number ?? 'N/A');
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
            $sheet->getRowDimension($row)->setRowHeight($rowHeights[$index]);

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

        $sheet->getStyle("A{$designationRow}:C{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("D{$designationRow}:F{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $sheet->getPageSetup()->setPrintArea("A1:F{$row}");
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        $this->applyPrintLayout($sheet, $pages, $lineRows, $headerRow, $headerRow, $receipt->document_number);

        return $spreadsheet;
    }

    protected function buildIcs($receipt): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_PORTRAIT);
        $sheet->getPageMargins()
            ->setLeft(self::MARGIN_LEFT_IN)->setRight(self::MARGIN_RIGHT_IN)
            ->setTop(self::MARGIN_TOP_IN)->setBottom(self::MARGIN_BOTTOM_IN)
            ->setFooter(self::FOOTER_MARGIN_IN);

        // Change column widths here — the page estimate below follows automatically.
        $widths = ['A' => 14, 'B' => 14, 'C' => 12, 'D' => 12, 'E' => 38, 'F' => 16, 'G' => 14];
        foreach ($widths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

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
        $sheet->getRowDimension($headerTop)->setRowHeight(self::ICS_HEADER_HEIGHT / 2);
        $sheet->getRowDimension($headerSub)->setRowHeight(self::ICS_HEADER_HEIGHT / 2);

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

        // --- Plan the pages before writing rows, so every row height is known up front ---
        $lines = $receipt->lines->values();
        $totalLines = $lines->count();

        $descriptions = [];
        $rowHeights = [];
        foreach ($lines as $index => $line) {
            $descriptions[$index] = $this->buildLineDescription($line, $index, $totalLines);
            $rowHeights[$index] = $this->calculateRowHeight($descriptions[$index], $widths['E']);
        }

        $pages = $this->planPages(
            $rowHeights,
            $this->calculatePageBudget($widths),
            self::ICS_TOP_BLOCK_HEIGHT + self::ICS_HEADER_HEIGHT,
            self::ICS_HEADER_HEIGHT,
            self::ICS_TAIL_HEIGHT
        );

        $row = $headerSub + 1;
        $grandTotal = 0;
        $lineRows = [];

        foreach ($lines as $index => $line) {
            $asset = $line->serializedAsset;
            $item = $asset->item;
            $unitCost = (float) $asset->unit_cost;
            $totalCost = $unitCost * $line->quantity;
            $grandTotal += $totalCost;
            $lineRows[$index] = $row;

            $sheet->setCellValue("A{$row}", $line->quantity);
            $sheet->setCellValue("B{$row}", $item->unit_of_measure ?? 'Unit');
            $sheet->setCellValue("C{$row}", $unitCost);
            $sheet->setCellValue("D{$row}", $totalCost);
            $sheet->setCellValue("E{$row}", $descriptions[$index]);
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
            $sheet->getRowDimension($row)->setRowHeight($rowHeights[$index]);

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

        $sheet->getStyle("A{$sigCaptionRow}:D{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("E{$sigCaptionRow}:G{$dateLabelRow}")->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN);

        $sheet->getPageSetup()->setPrintArea("A1:G{$row}");
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        $this->applyPrintLayout($sheet, $pages, $lineRows, $headerTop, $headerSub, $receipt->document_number);

        return $spreadsheet;
    }
}