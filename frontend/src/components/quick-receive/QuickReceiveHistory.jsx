import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/api/client';
import EditReceivedItemModal from '@/components/receive/EditReceivedItemModal.jsx';
import DeleteReceivedItemModal from '@/components/receive/DeleteReceivedItemModal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  RotateCcw,
  Calendar as CalendarIcon,
  Package,
  Eye,
  History,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function getRowKey(row) {
  return `${row.type}-${row.id}`;
}

function groupHistory(history) {
  if (!Array.isArray(history)) return [];

  const byReference = {};
  history.forEach((row) => {
    if (row.type === 'Asset' && row.reference_no) {
      byReference[row.reference_no] = row;
    }
  });

  const attachedChildKeys = new Set();
  const attachedByParentKey = {};

  history.forEach((row) => {
    if (row.type === 'Asset' && row.attached_to && byReference[row.attached_to]) {
      const parent = byReference[row.attached_to];
      const pKey = getRowKey(parent);
      attachedChildKeys.add(getRowKey(row));
      if (!attachedByParentKey[pKey]) attachedByParentKey[pKey] = [];
      attachedByParentKey[pKey].push(row);
    }
  });

  const standaloneRows = history.filter((row) => !attachedChildKeys.has(getRowKey(row)));

  const bucketMap = new Map();
  standaloneRows.forEach((row) => {
    const groupKey = `${row.type}-${row.item_id || row.item_code || row.item_name}`;
    if (!bucketMap.has(groupKey)) {
      bucketMap.set(groupKey, []);
    }
    bucketMap.get(groupKey).push(row);
  });

  const groups = [];
  bucketMap.forEach((rows) => {
    const primary = rows[0];
    const primaryKey = getRowKey(primary);
    const siblings = rows.slice(1);
    const attached = attachedByParentKey[primaryKey] || [];

    const totalQuantity = rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalCost = rows.reduce(
      (sum, r) =>
        sum + Number(r.total_cost ?? Number(r.quantity || 0) * Number(r.unit_cost || 0)),
      0
    );

    groups.push({
      key: primaryKey,
      primary,
      children: [...siblings, ...attached],
      siblings,
      attached,
      allRows: [primary, ...siblings, ...attached],
      totalQuantity,
      totalCost,
    });
  });

  return groups;
}

export default function QuickReceiveHistory({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState(undefined);

  // Modal States
  const [editingRow, setEditingRow] = useState(null);
  const [editMode, setEditMode] = useState('single');
  const [editTargetIds, setEditTargetIds] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingRow, setDeletingRow] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [detailsRows, setDetailsRows] = useState([]);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/v1/inventory/received-history?per_page=50');
      const payload = res.data;
      const dataList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];
      setHistory(dataList);
    } catch (err) {
      console.error('Failed to fetch received history:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openSharedEdit = (e, group) => {
    e.stopPropagation();
    const matchingIds = group.allRows
      .filter((r) => r.type === group.primary.type)
      .map((r) => r.id);
    setEditingRow(group.primary);
    setEditMode('shared');
    setEditTargetIds(matchingIds);
    setIsEditOpen(true);
  };

  const openSingleEdit = (e, row) => {
    e.stopPropagation();
    setEditingRow(row);
    setEditMode('single');
    setEditTargetIds([row.id]);
    setIsEditOpen(true);
  };

  const openDelete = (e, row) => {
    e.stopPropagation();
    setDeletingRow(row);
    setIsDeleteOpen(true);
  };

  const openSharedDelete = (e, group) => {
    e.stopPropagation();
    setDeletingRow(group.primary);
    setIsDeleteOpen(true);
  };

  const openSingleDetails = (e, row, index) => {
    e.stopPropagation();
    setDetailsTitle(`${row.item_name} (#${index + 1})`);
    setDetailsRows([row]);
    setIsDetailsOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setDateRange(undefined);
  };

  const grouped = groupHistory(history);

  const filteredGrouped = grouped.filter((group) => {
    const { allRows, primary } = group;

    if (typeFilter !== 'ALL') {
      const matchesType = allRows.some((row) =>
        typeFilter === 'Asset' ? row.type === 'Asset' : row.type !== 'Asset'
      );
      if (!matchesType) return false;
    }

    if (dateRange?.from || dateRange?.to) {
      const rowDateStr = primary.received_at || primary.created_at;
      if (!rowDateStr) return false;
      const itemDate = new Date(rowDateStr);

      if (dateRange.from) {
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }

      if (dateRange.to) {
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return allRows.some((row) => {
        const formattedDate = row.received_at
          ? new Date(row.received_at).toLocaleDateString()
          : '';
        return (
          row.item_name?.toLowerCase().includes(query) ||
          row.item_code?.toLowerCase().includes(query) ||
          row.reference_no?.toLowerCase().includes(query) ||
          row.property_number?.toLowerCase().includes(query) ||
          row.serial_number?.toLowerCase().includes(query) ||
          row.model?.toLowerCase().includes(query) ||
          row.manufacturer_name?.toLowerCase().includes(query) ||
          formattedDate.toLowerCase().includes(query)
        );
      });
    }

    return true;
  });

  const hasActiveFilters =
    searchQuery || typeFilter !== 'ALL' || Boolean(dateRange?.from || dateRange?.to);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Quick Receive Stock & Delivery Logs
          </h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="self-start sm:self-auto text-xs gap-1.5 h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Toolbar Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search name, code, SN, property no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-xs text-foreground shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Item Types</option>
            <option value="Asset">Assets Only</option>
            <option value="Consumable">Consumables / Stocks</option>
          </select>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-9 px-3 text-xs"
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span className="text-muted-foreground">Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border border-border" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loadingHistory && (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Loading history logs...
        </div>
      )}

      {!loadingHistory && grouped.length === 0 && (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No received records found.
        </div>
      )}

      {!loadingHistory && grouped.length > 0 && filteredGrouped.length === 0 && (
        <div className="flex flex-col h-36 items-center justify-center text-center text-xs text-muted-foreground gap-3 border border-dashed border-border rounded-lg bg-muted/20">
          <span>No records match your selected filter criteria.</span>
          <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-8">
            Clear Filters
          </Button>
        </div>
      )}

      {!loadingHistory && filteredGrouped.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-8 py-2.5 pl-3 pr-1"></th>
                <th className="py-2.5 px-3">Item</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3">Date Received</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGrouped.map((group) => {
                const { primary, allRows, totalQuantity, totalCost } = group;
                const isExpanded = expandedKeys.has(group.key);
                const hasSubRows = allRows.length > 1;
                const isAsset = primary.type === 'Asset';
                const imageUrl =
                  primary.item_image_url || primary.image_url || primary.item?.image_url;

                return (
                  <React.Fragment key={group.key}>
                    <tr
                      onClick={() => toggleExpand(group.key)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-muted/40' : 'hover:bg-muted/25'
                      }`}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={primary.item_name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">
                                {primary.item_name}
                              </span>
                              {hasSubRows && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px] font-medium gap-1"
                                >
                                  <Layers className="size-2.5" />
                                  {allRows.length} units
                                </Badge>
                              )}
                            </div>
                            <span className="block text-[11px] text-muted-foreground">
                              {primary.item_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                            isAsset
                              ? 'bg-info-soft text-info-text border-info-border'
                              : 'bg-success-soft text-success-text border-success-border'
                          }`}
                        >
                          {primary.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-foreground">
                        {totalQuantity} {primary.unit_of_measure || ''}
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                        {money(totalCost)}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        {primary.received_at
                          ? new Date(primary.received_at).toLocaleDateString()
                          : 'N/A'}
                      </td>

                      {/* Main row actions: Edit + Delete only */}
                      <td
                        className="py-2.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={(e) => openSharedEdit(e, group)}
                            title={
                              hasSubRows
                                ? `Edit shared fields across ${allRows.length} items`
                                : 'Edit shared item details'
                            }
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-muted/20">
                        <td colSpan={9} className="p-0">
                          <div className="border-t border-border/70 px-4 py-3 pl-11">
                            <div className="overflow-x-auto rounded-md border border-border bg-card">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="py-1.5 px-2.5">#</th>
                                    <th className="py-1.5 px-2.5">Property / Ref No.</th>
                                    <th className="py-1.5 px-2.5">Serial No.</th>
                                    <th className="py-1.5 px-2.5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {allRows.map((subRow, idx) => (
                                    <tr
                                      key={getRowKey(subRow)}
                                      className="hover:bg-muted/30 transition-colors"
                                    >
                                      <td className="py-2 px-2.5 font-mono text-[11px] text-muted-foreground">
                                        #{idx + 1}
                                      </td>
                                      <td className="py-2 px-2.5 font-mono text-[11px] text-foreground">
                                        {subRow.property_number || subRow.reference_no || 'N/A'}
                                      </td>
                                      <td className="py-2 px-2.5 font-mono text-[11px] text-muted-foreground">
                                        {subRow.serial_number || 'N/A'}
                                      </td>
                                      {/* Sub-row actions: Details + Edit + Delete */}
                                      <td className="py-2 px-2.5 text-right">
                                        <div className="inline-flex items-center justify-end gap-1">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => openSingleDetails(e, subRow, idx)}
                                            title="View Details"
                                          >
                                            <Eye className="size-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => openSingleEdit(e, subRow)}
                                            title="Edit Item"
                                          >
                                            <Pencil className="size-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            onClick={(e) => openDelete(e, subRow)}
                                            title="Delete Record"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Dialog */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              {detailsTitle || 'Item Details'}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-2">
            {detailsRows.map((row) => {
              const rowImageUrl =
                row.item_image_url || row.image_url || row.item?.image_url;
              const isAsset = row.type === 'Asset';

              return (
                <div
                  key={getRowKey(row)}
                  className="border border-border rounded-lg bg-muted/30 p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-md border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
                      {rowImageUrl ? (
                        <img
                          src={rowImageUrl}
                          alt={row.item_name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-6 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                            isAsset
                              ? 'bg-info-soft text-info-text border-info-border'
                              : 'bg-success-soft text-success-text border-success-border'
                          }`}
                        >
                          {row.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Item Code: <span className="font-medium">{row.item_code}</span>
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <dt className="text-muted-foreground">Property / Ref No.</dt>
                    <dd className="text-right font-medium text-foreground">
                      {row.property_number || row.reference_no || 'N/A'}
                    </dd>

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-medium text-foreground">
                          {row.serial_number}
                        </dd>
                      </>
                    )}

                    {row.model && (
                      <>
                        <dt className="text-muted-foreground">Model</dt>
                        <dd className="text-right text-foreground">{row.model}</dd>
                      </>
                    )}

                    {row.manufacturer_name && (
                      <>
                        <dt className="text-muted-foreground">Manufacturer</dt>
                        <dd className="text-right text-foreground">
                          {row.manufacturer_name}
                        </dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right text-foreground">
                          {row.country_of_origin}
                        </dd>
                      </>
                    )}

                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right text-foreground">
                      {row.quantity} {row.unit_of_measure || ''}
                    </dd>

                    <dt className="text-muted-foreground">Unit Cost</dt>
                    <dd className="text-right text-foreground">
                      {money(row.unit_cost)}
                    </dd>

                    <dt className="text-muted-foreground font-medium">Total Cost</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {money(row.total_cost)}
                    </dd>

                    <dt className="text-muted-foreground">Date Received</dt>
                    <dd className="text-right text-foreground">
                      {row.received_at
                        ? new Date(row.received_at).toLocaleDateString()
                        : 'N/A'}
                    </dd>
                  </dl>

                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8 gap-1.5"
                      onClick={(e) => {
                        setIsDetailsOpen(false);
                        openSingleEdit(e, row);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit Individual Record
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 text-xs h-8 gap-1.5"
                      onClick={(e) => {
                        setIsDetailsOpen(false);
                        openDelete(e, row);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete Record
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit & Delete Modal Mounts */}
      <EditReceivedItemModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        row={editingRow}
        mode={editMode}
        targetIds={editTargetIds}
        onSaved={fetchHistory}
      />

      <DeleteReceivedItemModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        row={deletingRow}
        onDeleted={fetchHistory}
      />
    </div>
  );
}