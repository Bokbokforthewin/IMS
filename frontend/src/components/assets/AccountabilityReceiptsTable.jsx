import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client'; // Import configured Axios client with auth headers
import {
  Download,
  FileSpreadsheet,
  Search,
  PackageOpen,
  FileText,
  User,
  UserCheck,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDistribution, AssetStatusCell, ReceiptDistributeButtons, DistributionDialogs } from './DistributionControls';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Helper to resolve the secondary receiver (current holder) for an asset line.
 */
function getSecondaryReceiver(line, defaultPrimaryUser) {
  const holder =
    line.serialized_asset?.current_holder ||
    line.serialized_asset?.currentHolder;

  if (holder?.name) return holder.name;
  if (line.user?.name) return line.user.name;
  return defaultPrimaryUser?.name || 'Primary Receiver';
}

/**
 * Groups lines into primary assets and their attached child peripherals.
 */
function groupLines(lines) {
  const byPropertyNumber = {};
  lines.forEach((line) => {
    const pn = line.serialized_asset?.property_number;
    if (pn) byPropertyNumber[pn] = line;
  });

  const primaries = lines.filter((line) => {
    const attachedTo = line.serialized_asset?.attached_to;
    if (attachedTo && byPropertyNumber[attachedTo]) {
      return false;
    }
    return true;
  });

  return primaries.map((primary) => ({
    primary,
    children: lines.filter(
      (l) =>
        l.serialized_asset?.attached_to &&
        l.serialized_asset.attached_to === primary.serialized_asset?.property_number
    ),
  }));
}

/**
 * Groups individual database receipts (PAR & ICS) created in the same
 * issuance transaction into a single bundled card object.
 */
function groupReceiptsIntoBundles(receipts) {
  const bundleMap = new Map();

  receipts.forEach((receipt) => {
    // 🔍 Safely check camelCase, snake_case, and nested object or fallback name
    const mrUser = 
      receipt.receivedMrBy || 
      receipt.received_mr_by || 
      (receipt.received_mr_by_id ? { id: receipt.received_mr_by_id, name: `MR ID #${receipt.received_mr_by_id}` } : null) || 
      receipt.user;

    const primaryUserId = mrUser?.id || receipt.received_mr_by_id || receipt.user_id;
    const key = `mr_${primaryUserId}_issued_${receipt.issued_by_id}_date_${receipt.date_issued}_${receipt.remarks || ''}`;

    if (!bundleMap.has(key)) {
      bundleMap.set(key, {
        key,
        user: mrUser, // ✅ Correctly displays the MR at the header
        issuedBy: receipt.issuedBy,
        date_issued: receipt.date_issued,
        remarks: receipt.remarks,
        receipts: [],
        allLines: [],
      });
    }

    const bundle = bundleMap.get(key);
    bundle.receipts.push(receipt);

    if (receipt.lines && Array.isArray(receipt.lines)) {
      bundle.allLines.push(...receipt.lines);
    }
  });

  return Array.from(bundleMap.values());
}

export default function AccountabilityReceiptsTable({ refreshKey }) {
  const [receipts, setReceipts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // Set initial/minimum pagination to 5

  // Fetch receipts using the authenticated api instance
  const fetchReceipts = useCallback(async () => {
    try {
      const response = await api.get('/v1/accountability/receipts');
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load accountability receipts:', err);
      setReceipts([]);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts, refreshKey]);

  // Fetch distribution status for each receipt
  const dist = useDistribution(fetchReceipts);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Authenticated Excel Download
  const handleDownload = async (receiptId, documentNumber) => {
    try {
      const response = await api.get(
        `/v1/accountability/receipts/${receiptId}/download-excel`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${documentNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  // Authenticated PDF Tag Download
  const handleDownloadTagPdf = async (assetId) => {
    try {
      const response = await api.get(
        `/v1/accountability/serialized-assets/${assetId}/download-tag-pdf`,
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to download asset tag PDF:', err);
    }
  };

  // Authenticated Bulk PDF Tag Download
  const handleDownloadBulkTags = async (bundleLines) => {
    try {
      const assetIds = bundleLines
        .map((line) => line.serialized_asset?.id)
        .filter(Boolean);

      if (assetIds.length === 0) return;

      const response = await api.post(
        `/v1/accountability/bulk-tags-pdf`,
        { asset_ids: assetIds },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to download bulk asset tags PDF:', err);
    }
  };

  // Group receipts into transaction bundles
  const bundles = useMemo(() => groupReceiptsIntoBundles(receipts), [receipts]);

  // Filter bundles based on search query
  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return bundles;

    const query = searchQuery.toLowerCase();
    return bundles.filter((bundle) => {
      const primaryUser = bundle.user;
      const primaryUserName = primaryUser?.name?.toLowerCase() || '';
      const primaryUserUnit = (primaryUser?.unit?.name || primaryUser?.unit || '').toLowerCase();
      const primaryUserDesignation = (primaryUser?.designation?.name || primaryUser?.designation || '').toLowerCase();
      const primaryUserDivision = (primaryUser?.division?.name || primaryUser?.division || '').toLowerCase();

      const remarksMatches = bundle.remarks?.toLowerCase().includes(query);
      const dateMatches = bundle.date_issued?.toLowerCase().includes(query);

      const receiptMatches = bundle.receipts.some(
        (rcpt) =>
          rcpt.document_number?.toLowerCase().includes(query) ||
          rcpt.receipt_type?.toLowerCase().includes(query)
      );

      const lineMatches = bundle.allLines.some((line) => {
        const asset = line.serialized_asset;
        const itemName = asset?.item?.name?.toLowerCase() || '';
        const serialNo = asset?.serial_number?.toLowerCase() || '';
        const propertyNo = asset?.property_number?.toLowerCase() || '';

        const holder = asset?.current_holder || asset?.currentHolder || line.user;
        const secondaryReceiverName = (holder?.name || '').toLowerCase();
        const secondaryUnit = (holder?.unit?.name || holder?.unit || '').toLowerCase();
        const secondaryDesignation = (holder?.designation?.name || holder?.designation || '').toLowerCase();
        const secondaryDivision = (holder?.division?.name || holder?.division || '').toLowerCase();

        return (
          itemName.includes(query) ||
          serialNo.includes(query) ||
          propertyNo.includes(query) ||
          secondaryReceiverName.includes(query) ||
          secondaryUnit.includes(query) ||
          secondaryDesignation.includes(query) ||
          secondaryDivision.includes(query)
        );
      });

      return (
        primaryUserName.includes(query) ||
        primaryUserUnit.includes(query) ||
        primaryUserDesignation.includes(query) ||
        primaryUserDivision.includes(query) ||
        remarksMatches ||
        dateMatches ||
        receiptMatches ||
        lineMatches
      );
    });
  }, [bundles, searchQuery]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredBundles.length / pageSize) || 1;
  const paginatedBundles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBundles.slice(start, start + pageSize);
  }, [filteredBundles, currentPage, pageSize]);

  // Ensure current page doesn't exceed total pages if filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <Card className="w-full">
      {/* Header with Title and Search Input */}
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
            Issued Accountability Receipts ({filteredBundles.length})
          </CardTitle>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search receiver, unit, doc #, SN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4 sm:pt-6 space-y-4">
        {filteredBundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {searchQuery
                ? `No accountability receipts matching "${searchQuery}"`
                : 'No accountability receipts generated yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {paginatedBundles.map((bundle) => {
              return (
                <div
                  key={bundle.key}
                  className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden transition-all"
                >
                  {/* TOP MAIN HEADER */}
                  <div className="bg-muted/50 p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm sm:text-base truncate">
                          {bundle.user?.name || 'Unassigned Primary Receiver'}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal shrink-0">
                          ({bundle.date_issued})
                        </span>
                      </div>
                      {bundle.remarks && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Remarks: {bundle.remarks}
                        </p>
                      )}
                    </div>

                    {/* Top Right: ONLY Bulk Tag Download Button */}
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 bg-background shadow-xs hover:bg-accent w-full sm:w-auto"
                        onClick={() => handleDownloadBulkTags(bundle.allLines)}
                        title="Print all asset tags for this bundle"
                      >
                        <PackageOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Print Sticker Bundle</span>
                      </Button>
                    </div>
                  </div>

                  {/* SUB-CARDS CONTAINER */}
                  <div className="p-2 sm:p-4 space-y-3 bg-muted/10">
                    {bundle.receipts.map((rcpt) => {
                      const receiptLines = rcpt.lines || [];
                      const groupedLines = groupLines(receiptLines);

                      return (
                        <div
                          key={rcpt.id}
                          className="rounded-lg border bg-card shadow-2xs overflow-hidden"
                        >
                          {/* Sub-Card Header */}
                          <div className="bg-background px-3 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-xs sm:text-sm">
                                {rcpt.document_number}
                              </span>
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {rcpt.receipt_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({receiptLines.length} item{receiptLines.length === 1 ? '' : 's'})
                              </span>
                            </div>

                         <div className="flex flex-wrap items-center gap-2">
                            <ReceiptDistributeButtons rcpt={rcpt} dist={dist} />
                            {/* Excel Download Button */}
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs w-full sm:w-auto shrink-0 justify-center"
                              onClick={() => handleDownload(rcpt.id, rcpt.document_number)}
                              title={`Download ${rcpt.receipt_type} Excel Form`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Sheet</span>
                            </Button>
                            </div>
                          </div>

                          {/* Desktop Layout: Table View (hidden on small screens) */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/30 text-muted-foreground border-b">
                                <tr>
                                  <th className="py-2 px-3 font-medium">Item Details</th>
                                  <th className="py-2 px-3 font-medium">Property No. / SN</th>
                                  <th className="py-2 px-3 font-medium">End User</th>
                                  <th className="py-2 px-3 font-medium text-right">Unit Cost</th>
                                  <th className="py-2 px-3 font-medium">Status</th>
                                  <th className="py-2 px-3 font-medium text-center w-[70px]">Tag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {groupedLines.map(({ primary, children }) => {
                                  const primarySecondaryHolder = getSecondaryReceiver(
                                    primary,
                                    bundle.user
                                  );

                                  return (
                                    <React.Fragment key={primary.id}>
                                      <tr className="hover:bg-muted/20">
                                        <td className="py-2 px-3 font-medium">
                                          {primary.serialized_asset?.item?.name || 'N/A'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-muted-foreground">
                                          {primary.serialized_asset?.property_number || 'N/A'}
                                          {primary.serialized_asset?.serial_number && (
                                            <span className="block text-[10px] text-muted-foreground/80">
                                              SN: {primary.serialized_asset.serial_number}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="inline-flex items-center gap-1 text-primary font-medium">
                                            <UserCheck className="h-3 w-3 shrink-0" />
                                            {primarySecondaryHolder}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono">
                                          {money(primary.serialized_asset?.unit_cost)}
                                        </td>
                                           <td className="py-2 px-3"><AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />
                                           </td>
                                        <td className="py-2 px-3 text-center">
                                          {primary.serialized_asset?.id && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-[10px] px-2"
                                              onClick={() => handleDownloadTagPdf(primary.serialized_asset.id)}
                                            >
                                              Print Sticker
                                            </Button>
                                          )}
                                        </td>
                                      </tr>

                                      {children.map((child) => {
                                        const childSecondaryHolder = getSecondaryReceiver(
                                          child,
                                          bundle.user
                                        );

                                        return (
                                          <tr key={child.id} className="bg-muted/10 hover:bg-muted/20">
                                            <td className="py-1.5 px-3 pl-6 text-muted-foreground">
                                              <span className="inline-flex items-center gap-1">
                                                <Paperclip className="h-3 w-3 text-primary/70 shrink-0" />
                                                {child.serialized_asset?.item?.name || 'N/A'} (Attached)
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-mono text-muted-foreground text-[11px]">
                                              {child.serialized_asset?.property_number || 'N/A'}
                                              {child.serialized_asset?.serial_number && (
                                                <span className="block text-[10px]">
                                                  SN: {child.serialized_asset.serial_number}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-1.5 px-3 text-[11px]">
                                              <span className="text-muted-foreground">
                                                {childSecondaryHolder}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-mono text-[11px]">
                                              {money(child.serialized_asset?.unit_cost)}
                                            </td>
                                               <td className="py-1.5 px-3"><AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
                                               </td>
                                            <td className="py-1.5 px-3 text-center">
                                              {child.serialized_asset?.id && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 text-[10px] px-2"
                                                  onClick={() => handleDownloadTagPdf(child.serialized_asset.id)}
                                                >
                                                  Print Sticker
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Layout: Compact Card View (shown on mobile, hidden on desktop) */}
                          <div className="block md:hidden divide-y">
                            {groupedLines.map(({ primary, children }) => {
                              const primarySecondaryHolder = getSecondaryReceiver(
                                primary,
                                bundle.user
                              );

                              return (
                                <div key={primary.id} className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-xs text-foreground">
                                        {primary.serialized_asset?.item?.name || 'N/A'}
                                      </p>
                                      <p className="text-[11px] font-mono text-muted-foreground">
                                        Prop #{primary.serialized_asset?.property_number || 'N/A'}
                                      </p>
                                    </div>
                                    {primary.serialized_asset?.id && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-2 shrink-0"
                                        onClick={() => handleDownloadTagPdf(primary.serialized_asset.id)}
                                      >
                                        Print Sticker
                                      </Button>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] pt-1">
                                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                                      <UserCheck className="h-3 w-3 shrink-0" />
                                      {primarySecondaryHolder}
                                    </span>
                                    <span className="font-mono font-medium text-foreground">
                                      {money(primary.serialized_asset?.unit_cost)}
                                    </span>
                                  </div>

                                  <AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />

                                  {/* Mobile Attached Peripherals */}
                                  {children.map((child) => {
                                    const childSecondaryHolder = getSecondaryReceiver(
                                      child,
                                      bundle.user
                                    );

                                    return (
                                      <div key={child.id} className="ml-2 pl-2 border-l-2 border-primary/30 pt-1 space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-muted-foreground flex items-center gap-1">
                                            <Paperclip className="h-2.5 w-2.5 text-primary shrink-0" />
                                            {child.serialized_asset?.item?.name}
                                          </span>
                                          <span className="font-mono text-muted-foreground">
                                            {money(child.serialized_asset?.unit_cost)}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          User: {childSecondaryHolder}
                                        </p>
                                        <AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer with Minimum of 5 Rows */}
        {filteredBundles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-1 pt-4 border-t gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[65px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-1">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredBundles.length)} of {filteredBundles.length}
              </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-xs text-muted-foreground font-medium">
                Page <span className="text-foreground font-semibold">{currentPage}</span> of{' '}
                <span className="text-foreground font-semibold">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <DistributionDialogs dist={dist} />
    </Card>
  );
}