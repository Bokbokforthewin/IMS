import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';

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
      const response = await api.get('/v1/consumables/issuances');
      const data = response.data;

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      }

      setIssuances(list);
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

  // Flatten each issuance's lines into individual rows
  const rows = issuances.flatMap((issuance) => {
    const lines = Array.isArray(issuance?.lines) ? issuance.lines : [];
    return lines.map((line, index) => ({
      line,
      issuance,
      isFirstLineOfDoc: index === 0,
      lineCountInDoc: lines.length,
    }));
  });

  // Filter rows by search input
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
    <Card className="w-full border border-border bg-card shadow-xs rounded-xl">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            Consumable Issuance History (RIS Logs)
          </CardTitle>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search RIS, item, recipient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-card border-border"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col h-36 items-center justify-center text-center text-xs text-muted-foreground gap-3 border border-dashed border-border rounded-lg bg-muted/20">
            <PackageOpen className="h-8 w-8 opacity-40 stroke-[1.5]" />
            <p>
              {searchQuery
                ? `No issuance records matching "${searchQuery}"`
                : 'No issuance records found.'}
            </p>
          </div>
        ) : (
          <>
            {/* ================= DESKTOP TABLE VIEW (md and up) ================= */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b border-border hover:bg-muted/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="font-semibold text-xs">RIS Number</TableHead>
                    <TableHead className="font-semibold text-xs">Item Name</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Qty Issued</TableHead>
                    <TableHead className="font-semibold text-xs">Issued To</TableHead>
                    <TableHead className="font-semibold text-xs">Date</TableHead>
                    <TableHead className="font-semibold text-xs">Purpose</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Batches</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.map(({ line, issuance, isFirstLineOfDoc, lineCountInDoc }, index) => {
                    const allocations = Array.isArray(line?.batch_allocations)
                      ? line.batch_allocations
                      : [];
                    const lineKey = line?.id || `${issuance?.id || 'issuance'}-${index}`;
                    const isExpanded = expandedLineId === lineKey;
                    const isMultiBatch = allocations.length > 1;
                    const isMultiLineDoc = lineCountInDoc > 1;

                    return (
                      <React.Fragment key={lineKey}>
                        <TableRow
                          className={`${
                            isMultiLineDoc && !isFirstLineOfDoc ? 'bg-muted/10' : ''
                          } border-b border-border/60 transition-colors hover:bg-muted/40`}
                        >
                          <TableCell className="p-2 text-center">
                            {allocations.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => toggleExpand(lineKey)}
                                aria-label={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>

                          <TableCell className="font-medium text-xs">
                            {isFirstLineOfDoc ? (
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">{issuance?.document_number || 'N/A'}</span>
                                {isMultiLineDoc && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {lineCountInDoc} items
                                  </Badge>
                                )}
                              </div>
                            ) : null}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{line?.item?.name || 'Item'}</span>
                              {isMultiBatch && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-info-border text-info-text bg-info-soft">
                                  <Layers className="mr-1 h-3 w-3" />
                                  Multi-batch
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                            {line?.quantity_issued ?? 0}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div>
                              <div className="font-medium text-foreground">
                                {line?.issued_to?.name || 'N/A'}
                              </div>
                              {line?.issued_to && (
                                <div className="text-[11px] text-muted-foreground">
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

                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {isFirstLineOfDoc ? issuance?.issuance_date || 'N/A' : ''}
                          </TableCell>

                          <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={issuance?.purpose}>
                            {isFirstLineOfDoc ? issuance?.purpose || 'N/A' : ''}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant={allocations.length > 0 ? 'secondary' : 'outline'} className="font-mono text-[10px]">
                              {allocations.length || 0}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Batch Allocations Sub-row */}
                        {isExpanded && allocations.length > 0 && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                            <TableCell />
                            <TableCell colSpan={7} className="p-3">
                              <div className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-2">
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Batch Allocation Breakdown
                                </h4>
                                <Table className="text-xs">
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-border">
                                      <TableHead className="h-7 font-medium text-xs">IAR Number</TableHead>
                                      <TableHead className="h-7 font-medium text-xs text-right">Qty Deducted</TableHead>
                                      <TableHead className="h-7 font-medium text-xs text-right">Unit Cost</TableHead>
                                      <TableHead className="h-7 font-medium text-xs text-right">Line Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {allocations.map((a, aIdx) => (
                                      <TableRow key={a.id || aIdx} className="hover:bg-muted/40 border-b border-border/50">
                                        <TableCell className="font-mono py-1.5 text-xs">
                                          {a?.stock_batch?.iar_number || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono py-1.5 text-xs">
                                          {a.quantity_deducted}
                                        </TableCell>
                                        <TableCell className="text-right py-1.5 text-xs">
                                          {money(a.unit_cost_at_issuance)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold py-1.5 text-xs text-foreground">
                                          {money((a.unit_cost_at_issuance || 0) * (a.quantity_deducted || 0))}
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
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ================= MOBILE CARD VIEW (below md screens) ================= */}
            <div className="block md:hidden space-y-3">
              {filteredRows.map(({ line, issuance, isFirstLineOfDoc, lineCountInDoc }, index) => {
                const allocations = Array.isArray(line?.batch_allocations)
                  ? line.batch_allocations
                  : [];
                const lineKey = line?.id || `${issuance?.id || 'issuance'}-${index}`;
                const isExpanded = expandedLineId === lineKey;
                const isMultiBatch = allocations.length > 1;
                const isMultiLineDoc = lineCountInDoc > 1; // Fixed: defined for mobile view as well

                return (
                  <div key={`mob-${lineKey}`} className="rounded-lg border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          {isFirstLineOfDoc ? issuance?.document_number || 'N/A' : '—'}
                        </span>
                        {isFirstLineOfDoc && isMultiLineDoc && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {lineCountInDoc} items
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {isFirstLineOfDoc ? issuance?.issuance_date || '' : ''}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-muted-foreground">Item:</span>
                        <div className="text-right font-medium text-foreground">
                          {line?.item?.name || 'Item'}
                          {isMultiBatch && (
                            <span className="block text-[10px] text-info-text">Multi-batch</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Qty Issued:</span>
                        <span className="font-mono font-semibold text-foreground">{line?.quantity_issued ?? 0}</span>
                      </div>

                      <div className="flex justify-between items-start gap-2">
                        <span className="text-muted-foreground">Issued To:</span>
                        <div className="text-right text-foreground">
                          <div className="font-medium">{line?.issued_to?.name || 'N/A'}</div>
                          {line?.issued_to?.designation && (
                            <div className="text-[10px] text-muted-foreground">{line.issued_to.designation}</div>
                          )}
                        </div>
                      </div>

                      {isFirstLineOfDoc && issuance?.purpose && (
                        <div className="flex justify-between items-start gap-2 pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">Purpose:</span>
                          <span className="text-right text-muted-foreground italic">{issuance.purpose}</span>
                        </div>
                      )}
                    </div>

                    {/* Mobile Batch Allocation Toggle & Breakdown */}
                    {allocations.length > 0 && (
                      <div className="pt-2 border-t border-border/60">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(lineKey)}
                          className="w-full text-xs h-7 justify-between gap-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-3 w-3 text-primary" />
                            Batch Allocations ({allocations.length})
                          </span>
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 rounded-md bg-muted/30 p-2.5 border border-border">
                            {allocations.map((a, aIdx) => (
                              <div key={a.id || aIdx} className="text-[11px] space-y-0.5 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                                <div className="flex justify-between font-mono">
                                  <span className="text-muted-foreground">IAR: {a?.stock_batch?.iar_number || 'N/A'}</span>
                                  <span className="font-semibold text-foreground">Qty: {a.quantity_deducted}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Cost: {money(a.unit_cost_at_issuance)}</span>
                                  <span className="font-semibold text-foreground">Total: {money((a.unit_cost_at_issuance || 0) * (a.quantity_deducted || 0))}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}