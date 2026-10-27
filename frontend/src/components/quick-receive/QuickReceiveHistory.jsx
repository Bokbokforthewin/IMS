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
import { Search, RotateCcw, Calendar as CalendarIcon, Package, Eye } from 'lucide-react';
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
    <div className="receive-panel space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">Received Stock Logs</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="self-start sm:self-auto text-xs gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            <option value="ALL">All Item Types</option>
            <option value="Asset">Assets Only</option>
            <option value="Consumable">Consumables / Stocks</option>
          </select>

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
            <PopoverContent className="w-auto p-0" align="start">
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
      </div>

      {loadingHistory && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading history logs...
        </p>
      )}

      {!loadingHistory && grouped.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No received records found.
        </p>
      )}

      {!loadingHistory && filteredGrouped.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGrouped.map(({ primary, children }) => {
            const isBundled = children.length > 0;
            const imageUrl = primary.item_image_url || primary.image_url || primary.item?.image_url;

            return (
              <Card
                key={`${primary.type}-${primary.id}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md"
              >
                {/* Large Hero Card Image Header */}
                <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={primary.item_name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                      <Package className="size-10 stroke-[1.5]" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">No Image</span>
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <Badge variant={primary.type === 'Asset' ? 'default' : 'secondary'} className="shadow-xs text-[10px]">
                      {primary.type}
                    </Badge>
                    {isBundled && (
                      <Badge variant="outline" className="bg-background/90 backdrop-blur-xs shadow-xs text-[10px]">
                        Bundled ({children.length})
                      </Badge>
                    )}
                  </div>
                </div>

                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-bold line-clamp-1">{primary.item_name}</CardTitle>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {primary.item_code} &middot; Ref: {primary.reference_no || 'N/A'}
                  </p>
                </CardHeader>

                <CardFooter className="p-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
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
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {detailsGroup?.primary?.item_name}
              {detailsGroup?.children.length > 0 && ` + ${detailsGroup.children.length} bundled item(s)`}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {allDetailRows.map((row) => {
              const rowImageUrl = row.item_image_url || row.image_url || row.item?.image_url;

              return (
                <div key={`${row.type}-${row.id}`} className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {rowImageUrl ? (
                        <img
                          src={rowImageUrl}
                          alt={row.item_name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-8 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm truncate">{row.item_name}</div>
                        <Badge variant={row.type === 'Asset' ? 'default' : 'secondary'}>{row.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{row.item_code}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-t pt-2">
                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right font-mono text-xs">{row.item_code}</dd>

                    <dt className="text-muted-foreground">Reference No.</dt>
                    <dd className="text-right font-mono text-xs">{row.reference_no || 'N/A'}</dd>

                    {row.serial_number && (
                      <>
                        <dt className="text-muted-foreground">Serial Number</dt>
                        <dd className="text-right font-mono text-xs">{row.serial_number}</dd>
                      </>
                    )}

                    {row.model && (
                      <>
                        <dt className="text-muted-foreground">Model</dt>
                        <dd className="text-right">{row.model}</dd>
                      </>
                    )}

                    {row.manufacturer_name && (
                      <>
                        <dt className="text-muted-foreground">Manufacturer</dt>
                        <dd className="text-right">{row.manufacturer_name}</dd>
                      </>
                    )}

                    {row.country_of_origin && (
                      <>
                        <dt className="text-muted-foreground">Country of Origin</dt>
                        <dd className="text-right">{row.country_of_origin}</dd>
                      </>
                    )}

                    {row.estimated_useful_life && (
                      <>
                        <dt className="text-muted-foreground">Estimated Useful Life</dt>
                        <dd className="text-right">{row.estimated_useful_life}</dd>
                      </>
                    )}

                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right">{row.quantity} {row.unit_of_measure || ''}</dd>

                    <dt className="text-muted-foreground">Unit Cost</dt>
                    <dd className="text-right">{money(row.unit_cost)}</dd>

                    <dt className="text-muted-foreground font-medium">Total Cost</dt>
                    <dd className="text-right font-semibold">{money(row.total_cost)}</dd>

                    <dt className="text-muted-foreground">Date Received</dt>
                    <dd className="text-right">
                      {row.received_at ? new Date(row.received_at).toLocaleDateString() : 'N/A'}
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}