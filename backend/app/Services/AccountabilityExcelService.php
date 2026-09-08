<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountabilityExcelService
{
    public function generate($receipt)
    {
        $isICS = $receipt->receipt_type === 'ICS';

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->getPageSetup()->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE);

        // Styling arrays
        $borderStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ];

        $centerBold = [
            'font' => ['bold' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
        ];

        // Header Section
        $sheet->setCellValue('A2', 'ENTITY NAME: Department of Health - Negros Island Region');
        $sheet->setCellValue('A3', 'FUND CLUSTER: ________________________');
        
        $sheet->setCellValue('E2', $isICS ? 'INVENTORY CUSTODIAN SLIP (ICS)' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT (PAR)');
        $sheet->getStyle('E2')->getFont()->setBold(true)->setSize(14);

        $sheet->setCellValue('E4', 'Document No.: ' . $receipt->document_number);
        $sheet->setCellValue('E5', 'Date: ' . date('F d, Y', strtotime($receipt->date_issued)));

        // Table Headers (Dynamic columns for ICS vs PAR)
        $row = 7;
        if ($isICS) {
            $headers = ['Quantity', 'Unit', 'Description / Item Details', 'Property Number', 'Unit Cost', 'Total Cost', 'Estimated Useful Life'];
            $columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        } else {
            $headers = ['Quantity', 'Unit', 'Description / Item Details', 'Property Number', 'Date Acquired', 'Unit Cost', 'Total Cost'];
            $columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        }

        foreach ($columns as $index => $col) {
            $sheet->setCellValue($col . $row, $headers[$index]);
        }
        $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($centerBold);
        $sheet->getStyle("A{$row}:G{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFEFEF');
        $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($borderStyle);

        // Populate Lines / Items
        $row++;
        $grandTotal = 0;

        foreach ($receipt->lines as $line) {
            $asset = $line->serializedAsset;
            $item = $asset->item;

            $unitCost = (float) $asset->unit_cost;
            $totalCost = $unitCost * 1; 
            $grandTotal += $totalCost;

            $description = $item->name;
            if ($asset->brand || $asset->model) {
                $description .= " - " . trim("{$asset->brand} {$asset->model}");
            }
            if ($asset->serial_number) {
                $description .= " (S/N: {$asset->serial_number})";
            }
            if (!empty($line->accessories_notes)) {
                $description .= "\nAccessories: " . $line->accessories_notes;
            }

            $sheet->setCellValue('A' . $row, 1);
            $sheet->setCellValue('B' . $row, $item->unit_of_measure ?? 'unit');
            $sheet->setCellValue('C' . $row, $description);
            $sheet->setCellValue('D' . $row, $asset->property_number);

            if ($isICS) {
                $sheet->setCellValue('E' . $row, $unitCost);
                $sheet->setCellValue('F' . $row, $totalCost);
                $sheet->setCellValue('G' . $row, $item->estimated_useful_life ?? 'N/A');
            } else {
                $sheet->setCellValue('E' . $row, $receipt->date_issued);
                $sheet->setCellValue('F' . $row, $unitCost);
                $sheet->setCellValue('G' . $row, $totalCost);
            }

            $costColLetter = $isICS ? 'E' : 'F';
            $totColLetter = $isICS ? 'F' : 'G';
            $sheet->getStyle("{$costColLetter}{$row}:{$totColLetter}{$row}")->getNumberFormat()->setFormatCode('#,##0.00');

            $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($borderStyle);
            $sheet->getStyle('C' . $row)->getAlignment()->setWrapText(true);
            
            $row++;
        }

        // Total Row
        $sheet->setCellValue('A' . $row, 'TOTAL');
        $sheet->mergeCells("A{$row}:" . ($isICS ? 'E' : 'F') . $row);
        $sheet->getStyle('A' . $row)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        
        $totalLetter = $isICS ? 'F' : 'G';
        $sheet->setCellValue("{$totalLetter}{$row}", $grandTotal);
        $sheet->getStyle("{$totalLetter}{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("{$totalLetter}{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($borderStyle);

        // Signatures Section
        $row += 3;
        $sheet->setCellValue('A' . $row, 'Received From:');
        $sheet->setCellValue('E' . $row, 'Received By:');
        
        $row += 3;
        $sheet->setCellValue('A' . $row, strtoupper($receipt->issuedBy->name ?? ''));
        $sheet->setCellValue('E' . $row, strtoupper($receipt->recipient->name ?? ''));
        
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $sheet->getStyle("E{$row}")->getFont()->setBold(true);

        $row++;
        $sheet->setCellValue('A' . $row, $receipt->issuedBy->designation ?? 'Signature Over Printed Name');
        $sheet->setCellValue('E' . $row, $receipt->recipient->designation ?? 'Signature Over Printed Name');

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

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
}