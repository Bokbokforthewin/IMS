import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
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
  Loader2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDistribution, AssetStatusCell, ReceiptDistributeButtons, DistributionDialogs } from './DistributionControls';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function getSecondaryReceiver(line, defaultPrimaryUser) {
  const holder =
    line.serialized_asset?.current_holder ||
    line.serialized_asset?.currentHolder;

  if (holder?.name) return holder.name;
  if (line.user?.name) return line.user.name;
  return defaultPrimaryUser?.name || 'Primary Receiver';
}

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

function groupReceiptsIntoBundles(receipts) {
  const bundleMap = new Map();

  receipts.forEach((receipt) => {
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
        user: mrUser,
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

/**
 * Checks if an individual asset line matches the active search query.
 */
function isLineMatched(line, query) {
  if (!query) return false;

  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const asset = line.serialized_asset;
  const catalogItem = line.item || asset?.item;
  const holder = asset?.current_holder || asset?.currentHolder || line.user;

  // Aggregate all possible fields for this line into a single text blob
  const textBlob = [
    catalogItem?.name,
    catalogItem?.brand,
    catalogItem?.category?.name,
    catalogItem?.type,
    catalogItem?.item_code,
    asset?.model,
    asset?.property_number,
    asset?.serial_number,
    asset?.ppe_number,
    asset?.status,
    asset?.unit_cost,
    line?.unit_cost,
    holder?.name,
    holder?.unit?.name || holder?.unit,
    holder?.designation?.name || holder?.designation,
    holder?.division?.name || holder?.division,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Every word in the user's query must be present in the text blob
  return tokens.every((token) => textBlob.includes(token));
}

export default function AccountabilityReceiptsTable({ refreshKey }) {
  const [receipts, setReceipts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMatchingItems, setShowOnlyMatchingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [loadingMap, setLoadingMap] = useState({});

  const startLoading = (key) => setLoadingMap((prev) => ({ ...prev, [key]: true }));
  const stopLoading = (key) => setLoadingMap((prev) => ({ ...prev, [key]: false }));

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

  const dist = useDistribution(fetchReceipts);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDownload = async (receiptId, documentNumber) => {
    const key = `excel_${receiptId}`;
    startLoading(key);

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
    } finally {
      stopLoading(key);
    }
  };

  const handleDownloadTagPdf = async (assetId) => {
    const key = `tag_${assetId}`;
    startLoading(key);

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
    } finally {
      stopLoading(key);
    }
  };

  const handleDownloadBulkTags = async (bundleKey, bundleLines) => {
    const key = `bulk_tags_${bundleKey}`;
    startLoading(key);

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
    } finally {
      stopLoading(key);
    }
  };

  const bundles = useMemo(() => groupReceiptsIntoBundles(receipts), [receipts]);

  const cleanQuery = searchQuery.toLowerCase().trim();

  const filteredBundles = useMemo(() => {
    if (!cleanQuery) return bundles;

    return bundles.filter((bundle) => {
      const primaryUser = bundle.user;
      const primaryUserName = (primaryUser?.name || '').toLowerCase();
      const primaryUserUnit = (primaryUser?.unit?.name || primaryUser?.unit || '').toLowerCase();
      const primaryUserDesignation = (primaryUser?.designation?.name || primaryUser?.designation || '').toLowerCase();

      const remarksMatches = (bundle.remarks || '').toLowerCase().includes(cleanQuery);
      const dateMatches = (bundle.date_issued || '').toLowerCase().includes(cleanQuery);

      const receiptMatches = bundle.receipts.some((rcpt) => {
        const docNum = (rcpt.document_number || '').toLowerCase();
        const rcptType = (rcpt.receipt_type || '').toLowerCase();
        return docNum.includes(cleanQuery) || rcptType.includes(cleanQuery);
      });

      const lineMatches = bundle.allLines.some((line) => isLineMatched(line, cleanQuery));

      return (
        primaryUserName.includes(cleanQuery) ||
        primaryUserUnit.includes(cleanQuery) ||
        primaryUserDesignation.includes(cleanQuery) ||
        remarksMatches ||
        dateMatches ||
        receiptMatches ||
        lineMatches
      );
    });
  }, [bundles, cleanQuery]);

  const totalPages = Math.ceil(filteredBundles.length / pageSize) || 1;
  const paginatedBundles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBundles.slice(start, start + pageSize);
  }, [filteredBundles, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <Card className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Issued Accountability Receipts ({filteredBundles.length})
          </h3>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {cleanQuery && (
            <Button
              size="sm"
              variant={showOnlyMatchingItems ? 'default' : 'outline'}
              className="h-9 text-xs gap-1.5"
              onClick={() => setShowOnlyMatchingItems((prev) => !prev)}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showOnlyMatchingItems ? 'Show All Items' : 'Filter Matched Rows'}</span>
            </Button>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search item, PPE #, receiver, doc #, SN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">
            <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
            <p>
              {searchQuery
                ? `No accountability receipts matching "${searchQuery}"`
                : 'No accountability receipts generated yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {paginatedBundles.map((bundle) => {
              const isBulkTagLoading = loadingMap[`bulk_tags_${bundle.key}`];

              return (
                <div
                  key={bundle.key}
                  className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all"
                >
                  {/* TOP MAIN HEADER */}
                  <div className="bg-muted/40 p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
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

                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBulkTagLoading}
                        className="h-8 text-xs gap-1.5 border-border bg-card shadow-2xs w-full sm:w-auto"
                        onClick={() => handleDownloadBulkTags(bundle.key, bundle.allLines)}
                        title="Print all asset tags for this bundle"
                      >
                        {isBulkTagLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-info-text" />
                        ) : (
                          <PackageOpen className="w-3.5 h-3.5 text-info-text" />
                        )}
                        <span>{isBulkTagLoading ? 'Generating Stickers...' : 'Print Sticker Bundle'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* SUB-CARDS CONTAINER */}
                  <div className="p-2 sm:p-4 space-y-3 bg-muted/10">
                    {bundle.receipts.map((rcpt) => {
                      const receiptLines = rcpt.lines || [];
                      let groupedLines = groupLines(receiptLines);

                      // Optional row filter
                      if (cleanQuery && showOnlyMatchingItems) {
                        groupedLines = groupedLines.filter(
                          ({ primary, children }) =>
                            isLineMatched(primary, cleanQuery) ||
                            children.some((child) => isLineMatched(child, cleanQuery))
                        );
                      }

                      if (groupedLines.length === 0) return null;

                      const isExcelLoading = loadingMap[`excel_${rcpt.id}`];

                      return (
                        <div
                          key={rcpt.id}
                          className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden"
                        >
                          <div className="bg-card px-3 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-success-text shrink-0" />
                              <span className="font-semibold text-xs sm:text-sm text-foreground">
                                {rcpt.document_number}
                              </span>
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] border border-border">
                                {rcpt.receipt_type}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <ReceiptDistributeButtons rcpt={rcpt} dist={dist} />
                              <Button
                                size="sm"
                                disabled={isExcelLoading}
                                className="h-7 text-xs gap-1.5 bg-success text-success-foreground hover:bg-success/90 shadow-2xs shrink-0 justify-center"
                                onClick={() => handleDownload(rcpt.id, rcpt.document_number)}
                              >
                                {isExcelLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>{isExcelLoading ? 'Generating...' : 'Download Sheet'}</span>
                              </Button>
                            </div>
                          </div>

                          {/* Mobile Layout (Card Based Details) */}
                          <div className="block md:hidden divide-y divide-border/60">
                            {groupedLines.map(({ primary, children }) => {
                              const primarySecondaryHolder = getSecondaryReceiver(primary, bundle.user);
                              const isPrimaryMatched = isLineMatched(primary, cleanQuery);
                              const primaryItemName = primary.item?.name || primary.serialized_asset?.item?.name || 'N/A';

                              return (
                                <div
                                  key={primary.id}
                                  className={`p-3 space-y-2.5 ${
                                    isPrimaryMatched ? 'bg-primary/10' : 'bg-card'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs text-foreground">
                                          {primaryItemName}
                                        </span>
                                        {isPrimaryMatched && (
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/20 border-primary/30">
                                            Match
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="font-mono text-[11px] text-muted-foreground">
                                        {primary.serialized_asset?.property_number || 'N/A'}
                                        {primary.serialized_asset?.serial_number && (
                                          <span className="block text-[10px] text-muted-foreground/80">
                                            SN: {primary.serialized_asset.serial_number}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="shrink-0 font-mono text-xs font-medium text-foreground">
                                      {money(primary.serialized_asset?.unit_cost || primary.unit_cost)}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
                                    <span className="inline-flex items-center gap-1 text-primary font-medium truncate">
                                      <UserCheck className="h-3 w-3 shrink-0" />
                                      {primarySecondaryHolder}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />
                                      {primary.serialized_asset?.id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={loadingMap[`tag_${primary.serialized_asset.id}`]}
                                          className="h-6 text-[10px] px-2 border-border gap-1"
                                          onClick={() => handleDownloadTagPdf(primary.serialized_asset.id)}
                                        >
                                          <span>Sticker</span>
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Attached Child Items on Mobile */}
                                  {children.length > 0 && (
                                    <div className="pl-3 mt-2 space-y-2 border-l-2 border-primary/20">
                                      {children.map((child) => {
                                        const childSecondaryHolder = getSecondaryReceiver(child, bundle.user);
                                        const isChildMatched = isLineMatched(child, cleanQuery);
                                        const childItemName = child.item?.name || child.serialized_asset?.item?.name || 'N/A';

                                        return (
                                          <div
                                            key={child.id}
                                            className={`p-2.5 rounded-md space-y-2 ${
                                              isChildMatched ? 'bg-primary/10' : 'bg-muted/30'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <Paperclip className="h-3 w-3 text-primary/70 shrink-0" />
                                                  <span className="font-semibold text-xs text-foreground">
                                                    {childItemName}{' '}
                                                    <span className="text-[10px] font-normal text-muted-foreground">(Attached)</span>
                                                  </span>
                                                  {isChildMatched && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/20 border-primary/30">
                                                      Match
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="font-mono text-[11px] text-muted-foreground">
                                                  {child.serialized_asset?.property_number || 'N/A'}
                                                </div>
                                              </div>
                                              <div className="shrink-0 font-mono text-xs font-medium text-foreground">
                                                {money(child.serialized_asset?.unit_cost || child.unit_cost)}
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
                                              <span className="text-muted-foreground truncate">
                                                {childSecondaryHolder}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
                                                {child.serialized_asset?.id && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={loadingMap[`tag_${child.serialized_asset.id}`]}
                                                    className="h-6 text-[10px] px-2 border-border gap-1"
                                                    onClick={() => handleDownloadTagPdf(child.serialized_asset.id)}
                                                  >
                                                    <span>Sticker</span>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                                <tr>
                                  <th className="py-2 px-3 font-medium">Item Name</th>
                                  <th className="py-2 px-3 font-medium">Property No. / SN</th>
                                  <th className="py-2 px-3 font-medium">End User</th>
                                  <th className="py-2 px-3 font-medium text-right">Unit Cost</th>
                                  <th className="py-2 px-3 font-medium">Status</th>
                                  <th className="py-2 px-3 font-medium text-center w-[100px]">Tag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {groupedLines.map(({ primary, children }) => {
                                  const primarySecondaryHolder = getSecondaryReceiver(
                                    primary,
                                    bundle.user
                                  );

                                  const isPrimaryMatched = isLineMatched(primary, cleanQuery);
                                  const primaryItemName = primary.item?.name || primary.serialized_asset?.item?.name || 'N/A';

                                  return (
                                    <React.Fragment key={primary.id}>
                                      <tr
                                        className={`transition-colors ${
                                          isPrimaryMatched
                                            ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                                            : 'hover:bg-muted/20'
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-foreground">
                                          {primaryItemName}
                                          {isPrimaryMatched && (
                                            <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 bg-primary/20 border-primary/30">
                                              Match
                                            </Badge>
                                          )}
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
                                        <td className="py-2 px-3 text-right font-mono text-foreground font-medium">
                                          {money(primary.serialized_asset?.unit_cost || primary.unit_cost)}
                                        </td>
                                        <td className="py-2 px-3">
                                          <AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {primary.serialized_asset?.id && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={loadingMap[`tag_${primary.serialized_asset.id}`]}
                                              className="h-6 text-[10px] px-2 border-border gap-1"
                                              onClick={() => handleDownloadTagPdf(primary.serialized_asset.id)}
                                            >
                                              <span>Print Sticker</span>
                                            </Button>
                                          )}
                                        </td>
                                      </tr>

                                      {children.map((child) => {
                                        const childSecondaryHolder = getSecondaryReceiver(
                                          child,
                                          bundle.user
                                        );
                                        const isChildMatched = isLineMatched(child, cleanQuery);
                                        const childItemName = child.item?.name || child.serialized_asset?.item?.name || 'N/A';

                                        return (
                                          <tr
                                            key={child.id}
                                            className={`transition-colors ${
                                              isChildMatched
                                                ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                                                : 'bg-muted/10 hover:bg-muted/20'
                                            }`}
                                          >
                                            <td className="py-1.5 px-3 pl-6 text-muted-foreground">
                                              <span className="inline-flex items-center gap-1">
                                                <Paperclip className="h-3 w-3 text-primary/70 shrink-0" />
                                                {childItemName} (Attached)
                                                {isChildMatched && (
                                                  <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 bg-primary/20 border-primary/30">
                                                    Match
                                                  </Badge>
                                                )}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-mono text-muted-foreground text-[11px]">
                                              {child.serialized_asset?.property_number || 'N/A'}
                                            </td>
                                            <td className="py-1.5 px-3 text-[11px]">
                                              <span className="text-muted-foreground">
                                                {childSecondaryHolder}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-mono text-[11px] text-foreground font-medium">
                                              {money(child.serialized_asset?.unit_cost || child.unit_cost)}
                                            </td>
                                            <td className="py-1.5 px-3">
                                              <AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                              {child.serialized_asset?.id && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  disabled={loadingMap[`tag_${child.serialized_asset.id}`]}
                                                  className="h-6 text-[10px] px-2 border-border gap-1"
                                                  onClick={() => handleDownloadTagPdf(child.serialized_asset.id)}
                                                >
                                                  <span>Print Sticker</span>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {filteredBundles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-1 pt-4 border-t border-border gap-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[65px] border-border">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent className="border-border">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
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
                  className="h-8 w-8 border-border"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DistributionDialogs dist={dist} />
    </Card>
  );
}