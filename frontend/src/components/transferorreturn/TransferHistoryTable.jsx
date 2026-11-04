import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  ArrowRight,
  History,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import api from '@/api/client';

// Candidate endpoints to prevent Axios baseURL 404 mismatches
const TRANSFER_ENDPOINTS = [
  '/v1/asset-transfers',
  '/asset-transfers',
  '/v1/transfers',
  '/transfers',
];

export default function TransferHistoryTable({ refreshKey }) {
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    for (const endpoint of TRANSFER_ENDPOINTS) {
      try {
        const response = await api.get(endpoint);
        const rawData = response.data;
        const items = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data?.data)
          ? rawData.data.data
          : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.transfers)
          ? rawData.transfers
          : [];

        setTransfers(items);
        setIsLoading(false);
        return; // Success: stop iterating candidate endpoints
      } catch (err) {
        // Silently try next endpoint in candidate list
      }
    }

    console.error('Failed to load transfer/return records from candidate endpoints.');
    setErrorMessage('Could not load transfer history logs. Please check your network connection.');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers, refreshKey]);

  // Reset to first page when search terms or type filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, itemsPerPage]);

  // Cleaned and robust search filter
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Type filter
      if (typeFilter !== 'ALL' && t.transfer_type !== typeFilter) {
        return false;
      }

      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      // Document Number
      const docNo = (t.document_number || `ptr-${t.id}` || '').toLowerCase();
      const type = (t.transfer_type || '').toLowerCase();

      // Asset & Item attributes
      const itemName = (t.serialized_asset?.item?.name || '').toLowerCase();
      const itemBrand = (t.serialized_asset?.item?.brand || '').toLowerCase();
      const serialNo = (t.serialized_asset?.serial_number || '').toLowerCase();
      const propNo = (t.serialized_asset?.property_number || '').toLowerCase();
      const model = (t.serialized_asset?.model || '').toLowerCase();
      const categoryName = (t.serialized_asset?.item?.category?.name || '').toLowerCase();

      // Resolved Sender / Receiver User Objects
      const fromUser = t.transferred_from || t.transferredFrom || t.user;
      const toUser = t.transferred_to || t.transferredTo || t.recipient;

      // User Names
      const fromName = (fromUser?.name || '').toLowerCase();
      const toName = (toUser?.name || '').toLowerCase();

      // User Unit, Designation, Division
      const fromUnit = (fromUser?.unit || '').toLowerCase();
      const toUnit = (toUser?.unit || '').toLowerCase();

      const fromDesignation = (fromUser?.designation || '').toLowerCase();
      const toDesignation = (toUser?.designation || '').toLowerCase();

      const fromDivision = (fromUser?.division || '').toLowerCase();
      const toDivision = (toUser?.division || '').toLowerCase();

      // Transaction Details
      const description = (t.description || '').toLowerCase();
      const reason = (t.reason || '').toLowerCase();
      const remarks = (t.remarks || '').toLowerCase();
      const date = (t.transfer_date || '').toLowerCase();

      return (
        docNo.includes(term) ||
        type.includes(term) ||
        itemName.includes(term) ||
        itemBrand.includes(term) ||
        serialNo.includes(term) ||
        propNo.includes(term) ||
        model.includes(term) ||
        categoryName.includes(term) ||
        fromName.includes(term) ||
        toName.includes(term) ||
        fromUnit.includes(term) ||
        toUnit.includes(term) ||
        fromDesignation.includes(term) ||
        toDesignation.includes(term) ||
        fromDivision.includes(term) ||
        toDivision.includes(term) ||
        description.includes(term) ||
        reason.includes(term) ||
        remarks.includes(term) ||
        date.includes(term)
      );
    });
  }, [transfers, searchTerm, typeFilter]);

  // Dynamic Pagination Calculations
  const safeTransfers = filteredTransfers || [];
  const totalItems = safeTransfers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedTransfers = safeTransfers.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="min-w-0 w-full rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        {/* Prominent Task Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Return & Transfer History Logs
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransfers}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by doc no, asset, unit, division, designation, employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-card border-border w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[150px] bg-card border-border">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="z-50 text-xs border-border">
                <SelectGroup>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="RETURN">Return Only</SelectItem>
                  <SelectItem value="TRANSFER">Transfer Only</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State Banner */}
        {errorMessage && (
          <div className="p-3 text-xs text-destructive-text bg-destructive-soft border border-destructive-border rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Table / Mobile Card Container */}
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading transfer records...</span>
            </div>
          ) : paginatedTransfers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <span className="font-semibold text-foreground">
                  {searchTerm || typeFilter !== 'ALL'
                    ? 'No matching records found'
                    : 'No return or transfer records found'}
                </span>
                <span className="text-[11px]">
                  {searchTerm || typeFilter !== 'ALL'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'Processed transfers and equipment returns will appear here.'}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (Full Table for XL screens) */}
              <div className="hidden xl:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Doc Number</TableHead>
                      <TableHead className="font-semibold text-foreground">Type</TableHead>
                      <TableHead className="font-semibold text-foreground">Item & Serial No.</TableHead>
                      <TableHead className="font-semibold text-foreground">Route (From ➔ To)</TableHead>
                      <TableHead className="font-semibold text-foreground">Description</TableHead>
                      <TableHead className="font-semibold text-foreground">Reason</TableHead>
                      <TableHead className="font-semibold text-foreground whitespace-nowrap">Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedTransfers.map((t) => {
                      const isReturn = t.transfer_type === 'RETURN';
                      const fromUser = t.transferred_from?.name || t.user?.name || 'N/A';
                      const toUser = t.transferred_to?.name || t.recipient?.name || 'N/A';

                      const itemName = t.serialized_asset?.item?.name || 'Unknown Item';
                      const categoryName = t.serialized_asset?.item?.category?.name
                        ? `[${t.serialized_asset.item.category.name}] `
                        : '';
                      const serialNo = t.serialized_asset?.serial_number || 'N/A';
                      const propertyNo = t.serialized_asset?.property_number;

                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                            {t.document_number || `PTR-${t.id}`}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-semibold ${
                                isReturn
                                  ? 'border-warning-border bg-warning-soft text-warning-text'
                                  : 'border-info-border bg-info-soft text-info-text'
                              }`}
                            >
                              {t.transfer_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground">
                              {categoryName}{itemName}
                            </div>
                            <div className="text-[10px] text-muted-foreground space-x-1.5">
                              <span>SN: <strong className="font-mono text-foreground">{serialNo}</strong></span>
                              {propertyNo && (
                                <span>PN: <strong className="font-mono text-foreground">{propertyNo}</strong></span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                              <span className="text-muted-foreground">From: {fromUser}</span>
                              <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                              <span>To: {toUser}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm" title={t.description}>
                            {t.description || '—'}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-muted-foreground text-sm" title={t.reason}>
                            {t.reason || '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                              <span>{t.transfer_date || '—'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* STREAMLINED MOBILE & TABLET VIEW (Only Essential Information) */}
              <div className="divide-y divide-border xl:hidden">
                {paginatedTransfers.map((t) => {
                  const isReturn = t.transfer_type === 'RETURN';
                  const fromUser = t.transferred_from?.name || t.user?.name || 'N/A';
                  const toUser = t.transferred_to?.name || t.recipient?.name || 'N/A';

                  const itemName = t.serialized_asset?.item?.name || 'Unknown Item';
                  const categoryName = t.serialized_asset?.item?.category?.name
                    ? `[${t.serialized_asset.item.category.name}] `
                    : '';
                  const serialNo = t.serialized_asset?.serial_number || 'N/A';
                  const propertyNo = t.serialized_asset?.property_number;

                  return (
                    <div key={`mob-${t.id}`} className="p-4 space-y-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-primary">
                              {t.document_number || `PTR-${t.id}`}
                            </span>
                            <Badge
                              variant="outline"
                              className={`capitalize text-[10px] px-1.5 py-0 ${
                                isReturn
                                  ? 'border-warning-border bg-warning-soft text-warning-text'
                                  : 'border-info-border bg-info-soft text-info-text'
                              }`}
                            >
                              {t.transfer_type}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground break-words">
                            {categoryName}{itemName}
                          </h4>
                        </div>
                      </div>

                      {/* Streamlined Key Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Serial No.</span>
                          <span className="font-mono text-foreground font-medium">{serialNo}</span>
                        </div>
                        {propertyNo && (
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Property No.</span>
                            <span className="font-mono text-foreground">{propertyNo}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Route</span>
                          <div className="flex items-center gap-1.5 text-foreground font-medium pt-0.5">
                            <span className="text-muted-foreground">From: {fromUser}</span>
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span>To: {toUser}</span>
                          </div>
                        </div>
                        {t.description && (
                          <div className="col-span-2">
                            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Description</span>
                            <span className="text-muted-foreground truncate block">{t.description}</span>
                          </div>
                        )}
                        {t.reason && (
                          <div className="col-span-2">
                            <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Reason</span>
                            <span className="text-muted-foreground truncate block">{t.reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{t.transfer_date || '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        {!isLoading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Field orientation="horizontal" className="w-fit flex items-center gap-2">
              <FieldLabel htmlFor="select-rows-per-page" className="text-xs text-muted-foreground">
                Rows per page
              </FieldLabel>
              <Select value={String(itemsPerPage)} onValueChange={handleRowsPerPageChange}>
                <SelectTrigger className="w-20 h-8 text-xs bg-card border-border" id="select-rows-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="border-border z-50">
                  <SelectGroup>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
              </span>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                      }}
                      className={validPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                      }}
                      className={validPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}