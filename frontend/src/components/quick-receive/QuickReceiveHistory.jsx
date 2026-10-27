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
import { Search, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
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
      const res = await api.get('v1/inventory/received-history?per_page=50');
      
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGrouped.map(({ primary, children }) => (
            <Card
              key={`${primary.type}-${primary.id}`}
              className="flex flex-col justify-between"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={primary.type === 'Asset' ? 'default' : 'secondary'}>
                    {primary.type}
                  </Badge>
                  {children.length > 0 && <Badge variant="outline">Bundled</Badge>}
                </div>
                <CardTitle className="text-base">{primary.item_name}</CardTitle>
                <CardDescription className="text-xs">
                  {primary.item_code} &middot; Ref: {primary.reference_no || 'N/A'}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 py-2">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right">
                    {primary.received_at
                      ? new Date(primary.received_at).toLocaleDateString()
                      : 'N/A'}
                  </dd>

                  <dt className="text-muted-foreground">Qty</dt>
                  <dd className="text-right">
                    {primary.quantity} {primary.unit_of_measure || ''}
                  </dd>

                  <dt className="text-muted-foreground font-medium">Total Cost</dt>
                  <dd className="text-right font-semibold">
                    {money(primary.total_cost)}
                  </dd>
                </dl>
              </CardContent>

              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => openDetails({ primary, children })}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{detailsGroup?.primary?.item_name}</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {allDetailRows.map((row) => (
              <div key={`${row.type}-${row.id}`} className="border rounded-md p-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>{row.item_name}</span>
                  <Badge variant={row.type === 'Asset' ? 'default' : 'secondary'}>
                    {row.type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span>Code: {row.item_code}</span>
                  <span className="text-right">Ref: {row.reference_no || 'N/A'}</span>
                  <span>Qty: {row.quantity}</span>
                  <span className="text-right">Total: {money(row.total_cost)}</span>
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}