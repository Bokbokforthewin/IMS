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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
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
  const [pageSize, setPageSize] = useState(10);

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
  }, [searchTerm, typeFilter, pageSize]);

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

      // User Unit, Designation, Division (Direct string columns on User model)
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

  // Calculate pagination bounds
  const totalItems = filteredTransfers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Slice paginated data for display
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(startIndex, startIndex + pageSize);
  }, [filteredTransfers, currentPage, pageSize]);

  return (
    <Card className="shadow-sm border-primary/20 flex flex-col">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Return & Transfer History Logs
            </CardTitle>
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
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by doc no, asset, unit, division, designation, employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[150px] bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="z-50 text-xs">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="RETURN">Return Only</SelectItem>
                <SelectItem value="TRANSFER">Transfer Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {errorMessage && (
          <div className="p-4 m-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3">Doc Number</th>
                <th className="p-3">Type</th>
                <th className="p-3">Item & Serial No.</th>
                <th className="p-3">Route (From ➔ To)</th>
                <th className="p-3">Description</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading transfer records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <span className="font-medium text-foreground">
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
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((t) => {
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
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      {/* Doc Number */}
                      <td className="p-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {t.document_number || `PTR-${t.id}`}
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-semibold ${
                            isReturn
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {t.transfer_type}
                        </Badge>
                      </td>

                      {/* Item & Serial Number */}
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {categoryName}{itemName}
                        </div>
                        <div className="text-[10px] text-muted-foreground space-x-1.5">
                          <span>SN: <strong className="font-mono">{serialNo}</strong></span>
                          {propertyNo && (
                            <span>PN: <strong className="font-mono">{propertyNo}</strong></span>
                          )}
                        </div>
                      </td>

                      {/* Route */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <span className="text-muted-foreground">{fromUser}</span>
                          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                          <span>{toUser}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="p-3 max-w-[180px] truncate text-muted-foreground" title={t.description}>
                        {t.description || '—'}
                      </td>

                      {/* Reason */}
                      <td className="p-3 max-w-[160px] truncate text-muted-foreground" title={t.reason}>
                        {t.reason || '—'}
                      </td>

                      {/* Date */}
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          <span>{t.transfer_date || '—'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Nova Preset Footer / ShadcnUI Pagination Bar */}
      {!isLoading && totalItems > 0 && (
        <CardFooter className="border-t bg-muted/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          {/* Row Count Info */}
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="font-medium text-foreground">
                {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
              </strong>{' '}
              to{' '}
              <strong className="font-medium text-foreground">
                {Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              of <strong className="font-medium text-foreground">{totalItems}</strong> entries
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs bg-background">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent className="z-50 text-xs">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Page Indicator */}
            <div className="flex items-center justify-center font-medium min-w-[80px]">
              Page {currentPage} of {totalPages}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}