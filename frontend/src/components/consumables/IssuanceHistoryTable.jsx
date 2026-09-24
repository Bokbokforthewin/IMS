import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  PackageOpen,
  Layers,
} from 'lucide-react';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function IssuanceHistoryTable({ refreshKey }) {
  const [issuances, setIssuances] = useState([]);
  const [expandedLineId, setExpandedLineId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIssuances = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/consumables/issuances');
      setIssuances(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load issuance logs:', err);
      setIssuances([]);
    }
  }, []);

  useEffect(() => {
    fetchIssuances();
  }, [fetchIssuances, refreshKey]);

  const toggleExpand = (lineId) => {
    setExpandedLineId((prev) => (prev === lineId ? null : lineId));
  };

  // Flatten each issuance's lines into individual rows, keeping a reference
  // back to the parent document (RIS number, date, purpose) for display.
  const rows = issuances.flatMap((issuance) => {
    const lines = Array.isArray(issuance?.lines) ? issuance.lines : [];
    return lines.map((line, index) => ({
      line,
      issuance,
      isFirstLineOfDoc: index === 0,
      lineCountInDoc: lines.length,
    }));
  });

  // Filter rows by search input (RIS No, Item Name, Recipient Name, or Purpose)
  const filteredRows = rows.filter(({ line, issuance }) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      issuance?.document_number?.toLowerCase().includes(query) ||
      line?.item?.name?.toLowerCase().includes(query) ||
      line?.issued_to?.name?.toLowerCase().includes(query) ||
      issuance?.purpose?.toLowerCase().includes(query)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-xl font-bold tracking-tight">
            Consumable Issuance History (RIS Logs)
          </CardTitle>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search RIS, item, recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="font-semibold">RIS Number</TableHead>
                <TableHead className="font-semibold">Item Name</TableHead>
                <TableHead className="font-semibold text-right">Qty Issued</TableHead>
                <TableHead className="font-semibold">Issued To</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Purpose</TableHead>
                <TableHead className="font-semibold text-center">Batches Drawn</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageOpen className="h-8 w-8 opacity-40" />
                      <p>
                        {searchQuery
                          ? `No issuance records matching "${searchQuery}"`
                          : 'No issuance records found.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map(({ line, issuance, isFirstLineOfDoc, lineCountInDoc }) => {
                  const allocations = Array.isArray(line?.batch_allocations)
                    ? line.batch_allocations
                    : [];
                  const isExpanded = expandedLineId === line.id;
                  const isMultiBatch = allocations.length > 1;
                  const isMultiLineDoc = lineCountInDoc > 1;

                  return (
                    <React.Fragment key={line.id}>
                      <TableRow
                        className={`${
                          isMultiLineDoc && !isFirstLineOfDoc ? 'bg-muted/10' : ''
                        } transition-colors hover:bg-muted/50`}
                      >
                        {/* Expand Toggle Column */}
                        <TableCell className="p-2 text-center">
                          {allocations.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => toggleExpand(line.id)}
                              aria-label={
                                isExpanded
                                  ? 'Collapse batch details'
                                  : 'Expand batch details'
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>

                        {/* RIS Number */}
                        <TableCell className="font-medium">
                          {isFirstLineOfDoc ? (
                            <div className="flex items-center gap-2">
                              <span>{issuance?.document_number || 'N/A'}</span>
                              {isMultiLineDoc && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {lineCountInDoc} recipients
                                </Badge>
                              )}
                            </div>
                          ) : null}
                        </TableCell>

                        {/* Item Name */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{line?.item?.name || 'Item'}</span>
                            {isMultiBatch && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300">
                                <Layers className="mr-1 h-3 w-3" />
                                Multi-batch
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Qty Issued */}
                        <TableCell className="text-right font-mono font-semibold">
                          {line?.quantity_issued ?? 0}
                        </TableCell>

                        {/* Issued To */}
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">
                              {line?.issued_to?.name || 'N/A'}
                            </div>
                            {line?.issued_to && (
                              <div className="text-xs text-muted-foreground">
                                {[
                                  line.issued_to.designation,
                                  line.issued_to.unit || line.issued_to.division,
                                ]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {isFirstLineOfDoc ? issuance?.issuance_date || 'N/A' : ''}
                        </TableCell>

                        {/* Purpose */}
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={issuance?.purpose}>
                          {isFirstLineOfDoc ? issuance?.purpose || 'N/A' : ''}
                        </TableCell>

                        {/* Batches Drawn Count */}
                        <TableCell className="text-center">
                          <Badge variant={allocations.length > 0 ? 'secondary' : 'outline'} className="font-mono text-xs">
                            {allocations.length || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Batch Allocations Sub-row */}
                      {isExpanded && allocations.length > 0 && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={7} className="p-3">
                            <div className="rounded-lg border bg-background p-3 shadow-sm">
                              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Batch Allocation Breakdown
                              </h4>
                              <Table className="text-xs">
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="h-8 font-medium">IAR Number</TableHead>
                                    <TableHead className="h-8 font-medium text-right">Qty Deducted</TableHead>
                                    <TableHead className="h-8 font-medium text-right">Unit Cost (at issuance)</TableHead>
                                    <TableHead className="h-8 font-medium text-right">Line Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {allocations.map((a) => (
                                    <TableRow key={a.id} className="hover:bg-muted/40">
                                      <TableCell className="font-mono py-2">
                                        {a?.stock_batch?.iar_number || 'N/A'}
                                      </TableCell>
                                      <TableCell className="text-right font-mono py-2">
                                        {a.quantity_deducted}
                                      </TableCell>
                                      <TableCell className="text-right py-2">
                                        {money(a.unit_cost_at_issuance)}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold py-2">
                                        {money(a.unit_cost_at_issuance * a.quantity_deducted)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}