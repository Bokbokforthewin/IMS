import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import {
  Download,
  FileSpreadsheet,
  Search,
  PackageOpen,
  FileText,
  User,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Filter,
  Printer,
  Pencil,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDistribution,
  AssetStatusCell,
  ReceiptDistributeButtons,
  DistributionDialogs,
} from './DistributionControls';
import AccountabilityDetailsModal from './AccountabilityDetailsModal';
import EditDetailsModal, {
  getUserDesignation,
  getUserUnit,
  formatUserLabel,
} from './EditDetailsModal';

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
      (receipt.received_mr_by_id
        ? { id: receipt.received_mr_by_id, name: 'Unassigned MR User' }
        : null) ||
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
  const holder =
    line.endUser ||
    line.end_user ||
    asset?.current_holder ||
    asset?.currentHolder ||
    line.user;

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
    getUserUnit(holder),
    getUserDesignation(holder),
    holder?.division?.name || holder?.division,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => textBlob.includes(token));
}

export default function AccountabilityReceiptsTable({ refreshKey, onUpdated }) {
  const [receipts, setReceipts] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingReceiptContext, setEditingReceiptContext] = useState(null);
  const [openMenuReceiptId, setOpenMenuReceiptId] = useState(null);
  const [activeDetails, setActiveDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMatchingItems, setShowOnlyMatchingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loadingMap, setLoadingMap] = useState({});
  const [selectedStickerAssetIds, setSelectedStickerAssetIds] = useState(() => new Set());

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

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/v1/users').catch(() => null);
      const raw = response?.data;
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users for MR editor:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
    fetchUsers();
  }, [fetchReceipts, fetchUsers, refreshKey]);

  const handleAfterSave = useCallback(async () => {
    await fetchReceipts();
    if (typeof onUpdated === 'function') {
      await onUpdated();
    }
  }, [fetchReceipts, onUpdated]);

  const dist = useDistribution(handleAfterSave);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleStickerSelection = (e, assetId) => {
    e?.stopPropagation?.();
    if (!assetId) return;
    const key = String(assetId);
    setSelectedStickerAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePrintSelectedStickers = async () => {
    const assetIds = Array.from(selectedStickerAssetIds)
      .map((id) => Number(id))
      .filter(Boolean);
    if (assetIds.length === 0) return;

    const key = 'selected_stickers';
    startLoading(key);

    try {
      const response = await api.post(
        '/v1/accountability/bulk-tags-pdf',
        { asset_ids: assetIds },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to print selected stickers:', err);
    } finally {
      stopLoading(key);
    }
  };

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
      const primaryUserUnit = getUserUnit(primaryUser).toLowerCase();
      const primaryUserDesignation = getUserDesignation(primaryUser).toLowerCase();

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

  const isPrintingSelected = Boolean(loadingMap.selected_stickers);

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
          {selectedStickerAssetIds.size > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isPrintingSelected}
                onClick={handlePrintSelectedStickers}
                className="h-9 text-xs gap-1.5"
              >
                {isPrintingSelected ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPrintingSelected
                    ? 'Generating...'
                    : `Print Selected (${selectedStickerAssetIds.size})`}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStickerAssetIds(new Set())}
                className="h-9 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            </>
          )}

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
                          {formatUserLabel(bundle.user, 'Unassigned Primary Receiver')}
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
                        <span>
                          {isBulkTagLoading ? 'Generating Stickers...' : 'Print Sticker Bundle'}
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* SUB-CARDS CONTAINER */}
                  <div className="p-2 sm:p-4 space-y-3 bg-muted/10">
                    {bundle.receipts.map((rcpt) => {
                      const receiptLines = rcpt.lines || [];
                      let groupedLines = groupLines(receiptLines);

                      if (cleanQuery && showOnlyMatchingItems) {
                        groupedLines = groupedLines.filter(
                          ({ primary, children }) =>
                            isLineMatched(primary, cleanQuery) ||
                            children.some((child) => isLineMatched(child, cleanQuery))
                        );
                      }

                      if (groupedLines.length === 0) return null;

                      const isExcelLoading = loadingMap[`excel_${rcpt.id}`];
                      const isMenuOpen = openMenuReceiptId === rcpt.id;

                      return (
                        <div
                          key={rcpt.id}
                          className="rounded-lg border border-border bg-muted/90 shadow-2xs overflow-hidden"
                        >
                          <div className="bg-muted/70 px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                              <FileSpreadsheet className="w-4 h-4 text-success-text shrink-0" />
                              <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                {rcpt.document_number}
                              </span>
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px] border border-border"
                              >
                                {rcpt.receipt_type}
                              </Badge>
                            </div>

                            <Popover
                              open={isMenuOpen}
                              onOpenChange={(nextOpen) =>
                                setOpenMenuReceiptId(nextOpen ? rcpt.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 border-border bg-card shadow-2xs"
                                  aria-label={`Receipt actions for ${rcpt.document_number}`}
                                >
                                  {isExcelLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-48 p-1.5 border-border bg-card shadow-md space-y-1"
                              >
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors text-left"
                                  onClick={() => {
                                    setOpenMenuReceiptId(null);
                                    setEditingReceiptContext({
                                      receipt: rcpt,
                                      bundleUser: bundle.user,
                                    });
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span>Edit MR</span>
                                </button>

                                <div
                                  className="w-full [&>button]:w-full [&>button]:justify-start [&>button]:border-0 [&>button]:bg-transparent [&>button]:shadow-none [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:h-auto [&>button]:text-xs [&>button]:font-normal [&>button]:hover:bg-accent"
                                  onClick={() => setOpenMenuReceiptId(null)}
                                >
                                  <ReceiptDistributeButtons rcpt={rcpt} dist={dist} />
                                </div>

                                <button
                                  type="button"
                                  disabled={isExcelLoading}
                                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-success-text hover:bg-accent transition-colors text-left disabled:opacity-50"
                                  onClick={async () => {
                                    setOpenMenuReceiptId(null);
                                    await handleDownload(rcpt.id, rcpt.document_number);
                                  }}
                                >
                                  {isExcelLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5 shrink-0" />
                                  )}
                                  <span>
                                    {isExcelLoading ? 'Generating...' : 'Download Sheet'}
                                  </span>
                                </button>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Mobile Layout (Card Based Details) */}
                          <div className="block md:hidden divide-y divide-border/60">
                            {groupedLines.map(({ primary, children }) => {
                              const isPrimaryMatched = isLineMatched(primary, cleanQuery);
                              const primaryItemName =
                                primary.item?.name || primary.serialized_asset?.item?.name || 'N/A';
                              const primaryAssetId = primary.serialized_asset?.id;
                              const primaryChecked =
                                primaryAssetId &&
                                selectedStickerAssetIds.has(String(primaryAssetId));

                              return (
                                <div
                                  key={primary.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    setActiveDetails({ line: primary, receipt: rcpt, mr: bundle.user })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      setActiveDetails({
                                        line: primary,
                                        receipt: rcpt,
                                        mr: bundle.user,
                                      });
                                    }
                                  }}
                                  className={`cursor-pointer p-3 space-y-2.5 transition-colors hover:bg-accent/50 ${
                                    isPrimaryMatched ? 'bg-primary/10' : 'bg-secondary/40'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      {primaryAssetId && (
                                        <input
                                          type="checkbox"
                                          checked={Boolean(primaryChecked)}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            toggleStickerSelection(e, primaryAssetId)
                                          }
                                          aria-label={`Select sticker for ${primaryItemName}`}
                                          className="mt-0.5 size-4 rounded border-input accent-primary shrink-0"
                                        />
                                      )}
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-xs text-foreground">
                                            {primaryItemName}
                                          </span>
                                          {isPrimaryMatched && (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] px-1 py-0 bg-primary/20 border-primary/30"
                                            >
                                              Match
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="font-mono text-[11px] text-muted-foreground">
                                          {primary.serialized_asset?.property_number || 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
                                    <div onClick={(event) => event.stopPropagation()}>
                                      <AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />
                                    </div>
                                  </div>

                                  {children.length > 0 && (
                                    <div className="pl-3 mt-2 space-y-2 border-l-2 border-primary/20">
                                      {children.map((child) => {
                                        const isChildMatched = isLineMatched(child, cleanQuery);
                                        const childItemName =
                                          child.item?.name ||
                                          child.serialized_asset?.item?.name ||
                                          'N/A';
                                        const childAssetId = child.serialized_asset?.id;
                                        const childChecked =
                                          childAssetId &&
                                          selectedStickerAssetIds.has(String(childAssetId));

                                        return (
                                          <div
                                            key={child.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setActiveDetails({
                                                line: child,
                                                receipt: rcpt,
                                                mr: bundle.user,
                                              });
                                            }}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setActiveDetails({
                                                  line: child,
                                                  receipt: rcpt,
                                                  mr: bundle.user,
                                                });
                                              }
                                            }}
                                            className={`cursor-pointer p-2.5 rounded-md space-y-2 transition-colors hover:bg-accent/50 ${
                                              isChildMatched ? 'bg-primary/10' : 'bg-muted/30'
                                            }`}
                                          >
                                            <div className="flex items-start gap-2 min-w-0">
                                              {childAssetId && (
                                                <input
                                                  type="checkbox"
                                                  checked={Boolean(childChecked)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) =>
                                                    toggleStickerSelection(e, childAssetId)
                                                  }
                                                  aria-label={`Select sticker for ${childItemName}`}
                                                  className="mt-0.5 size-4 rounded border-input accent-primary shrink-0"
                                                />
                                              )}
                                              <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <Paperclip className="h-3 w-3 text-primary/70 shrink-0" />
                                                  <span className="font-semibold text-xs text-foreground">
                                                    {childItemName}{' '}
                                                    <span className="text-[10px] font-normal text-muted-foreground">
                                                      (Attached)
                                                    </span>
                                                  </span>
                                                  {isChildMatched && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[9px] px-1 py-0 bg-primary/20 border-primary/30"
                                                    >
                                                      Match
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="font-mono text-[11px] text-muted-foreground">
                                                  {child.serialized_asset?.property_number || 'N/A'}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
                                              <div onClick={(event) => event.stopPropagation()}>
                                                <AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
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
                                  <th className="w-9 py-2 pl-3 pr-1 font-medium">Sticker</th>
                                  <th className="py-2 px-3 font-medium">Item</th>
                                  <th className="py-2 px-3 font-medium">Property No.</th>
                                  <th className="py-2 px-3 font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {groupedLines.map(({ primary, children }) => {
                                  const isPrimaryMatched = isLineMatched(primary, cleanQuery);
                                  const primaryItemName =
                                    primary.item?.name ||
                                    primary.serialized_asset?.item?.name ||
                                    'N/A';
                                  const primaryAssetId = primary.serialized_asset?.id;
                                  const primaryChecked =
                                    primaryAssetId &&
                                    selectedStickerAssetIds.has(String(primaryAssetId));

                                  return (
                                    <React.Fragment key={primary.id}>
                                      <tr
                                        tabIndex={0}
                                        onClick={() =>
                                          setActiveDetails({
                                            line: primary,
                                            receipt: rcpt,
                                            mr: bundle.user,
                                          })
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setActiveDetails({
                                              line: primary,
                                              receipt: rcpt,
                                              mr: bundle.user,
                                            });
                                          }
                                        }}
                                        className={`cursor-pointer transition-colors ${
                                          isPrimaryMatched
                                            ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                                            : 'hover:bg-muted/20'
                                        }`}
                                      >
                                        <td
                                          className="py-2 pl-3 pr-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {primaryAssetId ? (
                                            <input
                                              type="checkbox"
                                              checked={Boolean(primaryChecked)}
                                              onChange={(e) =>
                                                toggleStickerSelection(e, primaryAssetId)
                                              }
                                              aria-label={`Select sticker for ${primaryItemName}`}
                                              className="size-4 rounded border-input accent-primary cursor-pointer"
                                            />
                                          ) : null}
                                        </td>
                                        <td className="py-2 px-3 text-foreground">
                                          {primaryItemName}
                                          {isPrimaryMatched && (
                                            <Badge
                                              variant="outline"
                                              className="ml-2 text-[9px] px-1 py-0 bg-primary/20 border-primary/30"
                                            >
                                              Match
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-muted-foreground">
                                          {primary.serialized_asset?.property_number || 'N/A'}
                                        </td>
                                        <td
                                          className="py-2 px-3"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <AssetStatusCell line={primary} rcpt={rcpt} dist={dist} />
                                        </td>
                                      </tr>

                                      {children.map((child) => {
                                        const isChildMatched = isLineMatched(child, cleanQuery);
                                        const childItemName =
                                          child.item?.name ||
                                          child.serialized_asset?.item?.name ||
                                          'N/A';
                                        const childAssetId = child.serialized_asset?.id;
                                        const childChecked =
                                          childAssetId &&
                                          selectedStickerAssetIds.has(String(childAssetId));

                                        return (
                                          <tr
                                            key={child.id}
                                            tabIndex={0}
                                            onClick={() =>
                                              setActiveDetails({
                                                line: child,
                                                receipt: rcpt,
                                                mr: bundle.user,
                                              })
                                            }
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setActiveDetails({
                                                  line: child,
                                                  receipt: rcpt,
                                                  mr: bundle.user,
                                                });
                                              }
                                            }}
                                            className={`cursor-pointer transition-colors ${
                                              isChildMatched
                                                ? 'bg-primary/10 hover:bg-primary/15 font-medium'
                                                : 'bg-muted/10 hover:bg-muted/20'
                                            }`}
                                          >
                                            <td
                                              className="py-1.5 pl-3 pr-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {childAssetId ? (
                                                <input
                                                  type="checkbox"
                                                  checked={Boolean(childChecked)}
                                                  onChange={(e) =>
                                                    toggleStickerSelection(e, childAssetId)
                                                  }
                                                  aria-label={`Select sticker for ${childItemName}`}
                                                  className="size-4 rounded border-input accent-primary cursor-pointer"
                                                />
                                              ) : null}
                                            </td>
                                            <td className="py-1.5 px-3 pl-6 text-muted-foreground">
                                              <span className="inline-flex items-center gap-1">
                                                <Paperclip className="h-3 w-3 text-primary/70 shrink-0" />
                                                {childItemName} (Attached)
                                                {isChildMatched && (
                                                  <Badge
                                                    variant="outline"
                                                    className="ml-2 text-[9px] px-1 py-0 bg-primary/20 border-primary/30"
                                                  >
                                                    Match
                                                  </Badge>
                                                )}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-mono text-muted-foreground text-[11px]">
                                              {child.serialized_asset?.property_number || 'N/A'}
                                            </td>
                                            <td
                                              className="py-1.5 px-3"
                                              onClick={(event) => event.stopPropagation()}
                                            >
                                              <AssetStatusCell line={child} rcpt={rcpt} dist={dist} />
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

      {editingReceiptContext && (
        <EditDetailsModal
          receipt={editingReceiptContext.receipt}
          bundleUser={editingReceiptContext.bundleUser}
          users={users}
          onClose={() => setEditingReceiptContext(null)}
          onSaved={handleAfterSave}
        />
      )}

      <AccountabilityDetailsModal
        open={!!activeDetails}
        onClose={() => setActiveDetails(null)}
        details={activeDetails}
        onPrintTag={handleDownloadTagPdf}
      />
      <DistributionDialogs dist={dist} />
    </Card>
  );
}