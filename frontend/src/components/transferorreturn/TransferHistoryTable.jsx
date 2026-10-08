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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

  // Filtered transfers based on search input & type dropdown
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Type filter
      if (typeFilter !== 'ALL' && t.transfer_type !== typeFilter) {
        return false;
      }

      // Search term filter
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      const docNo = (t.document_number || '').toLowerCase();
      const type = (t.transfer_type || '').toLowerCase();
      const itemName = (t.serialized_asset?.item?.name || '').toLowerCase();
      const serialNo = (t.serialized_asset?.serial_number || '').toLowerCase();
      const propNo = (t.serialized_asset?.property_number || '').toLowerCase();
      const fromName = (t.transferred_from?.name || t.user?.name || '').toLowerCase();
      const toName = (t.transferred_to?.name || t.recipient?.name || '').toLowerCase();
      const description = (t.description || '').toLowerCase();
      const reason = (t.reason || '').toLowerCase();

      return (
        docNo.includes(term) ||
        type.includes(term) ||
        itemName.includes(term) ||
        serialNo.includes(term) ||
        propNo.includes(term) ||
        fromName.includes(term) ||
        toName.includes(term) ||
        description.includes(term) ||
        reason.includes(term)
      );
    });
  }, [transfers, searchTerm, typeFilter]);

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Return & Transfer History Logs
            </CardTitle>
            <CardDescription className="text-xs">
              Audit trails and transaction records for all equipment returns and property transfers.
            </CardDescription>
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
              placeholder="Search by doc no, asset, serial no, employee name..."
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

      <CardContent className="p-0">
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
              ) : filteredTransfers.length === 0 ? (
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
                filteredTransfers.map((t) => {
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
                            <span>• PN: <strong className="font-mono">{propertyNo}</strong></span>
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
    </Card>
  );
}