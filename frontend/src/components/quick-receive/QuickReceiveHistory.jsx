import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/api/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, RotateCcw, Calendar as CalendarIcon, Package, Eye, History } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

function groupHistory(history) {
  if (!Array.isArray(history)) return [];

  const byReference = {};
  history.forEach((row) => {
    if (row.type === 'Asset' && row.reference_no) {
      byReference[row.reference_no] = row;
    }
  });

  const childIds = new Set();
  history.forEach((row) => {
    if (row.type === 'Asset' && row.attached_to && byReference[row.attached_to]) {
      childIds.add(`${row.type}-${row.id}`);
    }
  });

  const primaries = history.filter((row) => !childIds.has(`${row.type}-${row.id}`));

  return primaries.map((primary) => ({
    primary,
    children:
      primary.type === 'Asset' && primary.reference_no
        ? history.filter(
            (r) => r.type === 'Asset' && r.attached_to === primary.reference_no
          )
        : [],
  }));
}

export default function QuickReceiveHistory({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState(undefined);

  const [detailsGroup, setDetailsGroup] = useState(null);
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

  const openDetails = (group) => {
    setDetailsGroup(group);
    setIsDetailsOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setDateRange(undefined);
  };

  const grouped = groupHistory(history);

  const filteredGrouped = grouped.filter(({ primary, children }) => {
    if (typeFilter !== 'ALL') {
      const isTypeMatch = (row) => {
        if (typeFilter === 'Asset') return row.type === 'Asset';
        if (typeFilter === 'Consumable') return row.type !== 'Asset';
        return true;
      };

      if (!isTypeMatch(primary) && !children.some(isTypeMatch)) return false;
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
      const matchesQuery = (row) => {
        const formattedDate = row.received_at
          ? new Date(row.received_at).toLocaleDateString()
          : '';
        return (
          row.item_name?.toLowerCase().includes(query) ||
          row.item_code?.toLowerCase().includes(query) ||
          row.reference_no?.toLowerCase().includes(query) ||
          row.serial_number?.toLowerCase().includes(query) ||
          formattedDate.toLowerCase().includes(query)
        );
      };

      return matchesQuery(primary) || children.some(matchesQuery);
    }

    return true;
  });

  const hasActiveFilters =
    searchQuery || typeFilter !== 'ALL' || Boolean(dateRange?.from || dateRange?.to);
  const allDetailRows = detailsGroup
    ? [detailsGroup.primary, ...detailsGroup.children]
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Task Title Header */}
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
            placeholder="Search name, code, ref, date..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGrouped.map(({ primary, children }) => {
            const isBundled = children.length > 0;
            const imageUrl = primary.item_image_url || primary.image_url || primary.item?.image_url;
            const isAsset = primary.type === 'Asset';

            return (
              <Card
                key={`${primary.type}-${primary.id}`}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-2xs transition-all hover:shadow-sm"
              >
                {/* Hero Image Header Section */}
                <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b border-border flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={primary.item_name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                      <Package className="size-8 stroke-[1.5]" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">No Preview</span>
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                        isAsset
                          ? 'bg-info-soft text-info-text border-info-border'
                          : 'bg-success-soft text-success-text border-success-border'
                      }`}
                    >
                      {primary.type}
                    </span>
                    {isBundled && (
                      <Badge variant="outline" className="bg-card/90 backdrop-blur-xs text-[10px] px-1.5 py-0 border-border">
                        Bundled ({children.length})
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-sm font-semibold line-clamp-1 text-foreground">
                    {primary.item_name}
                  </CardTitle>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {primary.item_code} &middot; Ref: {primary.reference_no || 'N/A'}
                  </p>
                </CardHeader>

                <CardContent className="px-3.5 py-1.5 flex-1 space-y-2">
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Received Date</dt>
                    <dd className="text-right font-medium text-foreground">
                      {primary.received_at ? new Date(primary.received_at).toLocaleDateString() : 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right font-medium text-foreground">
                      {primary.quantity} {primary.unit_of_measure || ''}
                    </dd>

                    <dt className="text-muted-foreground font-medium pt-1 border-t border-border/50">Total Cost</dt>
                    <dd className="text-right font-semibold text-xs text-foreground pt-1 border-t border-border/50">
                      {money(primary.total_cost)}
                    </dd>
                  </dl>

                  {isBundled && (
                    <p className="text-[11px] text-muted-foreground truncate border-t border-border/60 pt-2">
                      <span className="font-semibold text-foreground">Includes:</span> {children.map(c => c.item_name).join(', ')}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="p-3.5 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs h-8"
                    onClick={() => openDetails({ primary, children })}
                  >
                    <Eye className="size-3.5" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              {detailsGroup?.primary?.item_name}
              {detailsGroup?.children.length > 0 && ` + ${detailsGroup.children.length} bundled item(s)`}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-2">
            {allDetailRows.map((row) => {
              const rowImageUrl = row.item_image_url || row.image_url || row.item?.image_url;
              const isAsset = row.type === 'Asset';

              return (
                <div key={`${row.type}-${row.id}`} className="border border-border rounded-lg bg-muted/30 p-3.5 space-y-3">
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
                        Item Code: <span className="text-xs text-muted-foreground font-medium">{row.item_code}</span>
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <dt className="text-muted-foreground">Reference No.</dt>
                    <dd className="text-right font-medium text-foreground">{row.reference_no || 'N/A'}</dd>

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-medium text-foreground">{row.serial_number}</dd>
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
                        <dd className="text-right text-foreground">{row.manufacturer_name}</dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right text-foreground">{row.country_of_origin}</dd>
                      </>
                    )}

                    {row.estimated_useful_life && (
                      <>
                        <dt className="text-muted-foreground">Estimated Useful Life</dt>
                        <dd className="text-right text-foreground">{row.estimated_useful_life}</dd>
                      </>
                    )}

                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right text-foreground">{row.quantity} {row.unit_of_measure || ''}</dd>

                    <dt className="text-muted-foreground">Unit Cost</dt>
                    <dd className="text-right text-foreground">{money(row.unit_cost)}</dd>

                    <dt className="text-muted-foreground font-medium">Total Cost</dt>
                    <dd className="text-right font-semibold text-foreground">{money(row.total_cost)}</dd>

                    <dt className="text-muted-foreground">Date Received</dt>
                    <dd className="text-right text-foreground">
                      {row.received_at ? new Date(row.received_at).toLocaleDateString() : 'N/A'}
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter className="pt-2 border-t border-border">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}