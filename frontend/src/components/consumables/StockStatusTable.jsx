import React, { useState } from 'react';
import EditReorderLevelModal from './EditReorderLevelModal.jsx';
import DeleteItemModal from './DeleteItemModal.jsx';
import IssueConsumablesModal from './IssueConsumablesModal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function getStatusVariant(status) {
  if (!status) return 'secondary';
  const s = status.toLowerCase();
  if (s.includes('out of stock')) return 'destructive';
  if (s.includes('low')) return 'outline';
  return 'default';
}

function money(n) {
  return n
    ? `₱${Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`
    : 'N/A';
}

// Fallback API handler if handleApiCall is not supplied by parent
const defaultApiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export default function StockStatusGrid({
  stockStatus,
  onChanged,
  handleApiCall = defaultApiCall,
  onIssued,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const safeStock = Array.isArray(stockStatus) ? stockStatus : [];
  const receivedStock = safeStock.filter(
    (stock) => Number(stock.total_stock) > 0
  );

  // Filter only the consumable stocks based on search input
  const filteredStock = receivedStock.filter((stock) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      stock.name?.toLowerCase().includes(query) ||
      stock.item_code?.toLowerCase().includes(query) ||
      stock.item_brand?.toLowerCase().includes(query) ||
      stock.item_specifications?.toLowerCase().includes(query)
    );
  });

  const [editingItem, setEditingItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [issuingItem, setIssuingItem] = useState(null);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const [detailsItem, setDetailsItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const openEdit = (stock) => {
    setEditingItem(stock);
    setIsEditOpen(true);
  };

  const openDelete = (stock) => {
    setDeletingItem(stock);
    setIsDeleteOpen(true);
  };

  const openIssue = (stock) => {
    setIssuingItem(stock);
    setIsIssueOpen(true);
  };

  const openDetails = (stock) => {
    setDetailsItem(stock);
    setIsDetailsOpen(true);
  };

  const handleChanged = () => {
    if (typeof onChanged === 'function') onChanged();
  };

  const handleIssued = () => {
    if (typeof onIssued === 'function') onIssued();
  };

  return (
    <Card className="w-full">
      {/* Header with Icon & Search */}
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-xl font-bold tracking-tight">
            Consumable Stocks
          </CardTitle>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search consumables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      {/* Card Content & Grid */}
      <CardContent>
        {receivedStock.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            No received consumable stock available.
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            No consumable items match "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            {filteredStock.map((stock) => {
              const isOutOfStock =
                !stock.total_stock || Number(stock.total_stock) <= 0;

              return (
                <Card key={stock.id} className="flex flex-col justify-between shadow-xs">
                  {/* Item Header: Name & Status Badge */}
                  <CardHeader className="space-y-0 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
                        {stock.name}
                      </CardTitle>
                      <Badge
                        variant={getStatusVariant(stock.status)}
                        className="shrink-0 text-[10px]"
                      >
                        {stock.status || 'OK'}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Item Details Summary */}
                  <CardContent className="py-2 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Code:</span>
                      <span className="font-mono text-foreground">{stock.item_code || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Stock:</span>
                      <span className="font-semibold text-foreground">
                        {stock.total_stock ?? 0} {stock.unit_of_measure || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Cost:</span>
                      <span className="font-medium text-foreground">{money(stock.cost)}</span>
                    </div>
                  </CardContent>

                  {/* Item Actions */}
                  <CardFooter className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex w-full gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openDetails(stock)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openIssue(stock)}
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Issue'}
                      </Button>
                    </div>

                    <div className="flex w-full gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openEdit(stock)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openDelete(stock)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Details Modal */}
        <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {detailsItem?.name || 'Item Details'}
              </AlertDialogTitle>

              <AlertDialogDescription>
                Full item specification and current stock information.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {detailsItem && (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <p className="text-sm font-medium">
                        {detailsItem.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detailsItem.item_code || 'No item code'}
                      </p>
                    </div>

                    <Badge variant={getStatusVariant(detailsItem.status)}>
                      {detailsItem.status || 'OK'}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right font-mono">
                      {detailsItem.item_code || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Brand</dt>
                    <dd className="text-right">
                      {detailsItem.item_brand || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Specifications</dt>
                    <dd className="text-right">
                      {detailsItem.item_specifications || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="text-right">
                      {detailsItem.item_type || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Unit of Measure</dt>
                    <dd className="text-right">
                      {detailsItem.unit_of_measure || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Reorder Level</dt>
                    <dd className="text-right">
                      {detailsItem.reorder_level ?? 'N/A'}
                    </dd>

                    <dt className="font-medium text-muted-foreground">
                      Quantity on Hand
                    </dt>
                    <dd className="text-right font-semibold">
                      {detailsItem.total_stock ?? 0}{' '}
                      {detailsItem.unit_of_measure || ''}
                    </dd>

                    <dt className="font-medium text-muted-foreground">
                      Unit Cost
                    </dt>
                    <dd className="text-right font-semibold">
                      {money(detailsItem.cost)}
                    </dd>

                    <dt className="font-medium text-muted-foreground">
                      Status
                    </dt>
                    <dd className="flex justify-end">
                      <Badge
                        variant={getStatusVariant(detailsItem.status)}
                      >
                        {detailsItem.status || 'OK'}
                      </Badge>
                    </dd>
                  </dl>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Issue Consumables Modal */}
        <IssueConsumablesModal
          isOpen={isIssueOpen}
          onClose={() => setIsIssueOpen(false)}
          item={issuingItem}
          handleApiCall={handleApiCall}
          onSuccess={handleIssued}
        />

        {/* Edit Reorder Level Modal */}
        <EditReorderLevelModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          item={editingItem}
          handleApiCall={handleApiCall}
          onSaved={handleChanged}
        />

        {/* Delete Item Modal */}
        <DeleteItemModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          item={deletingItem}
          handleApiCall={handleApiCall}
          onDeleted={handleChanged}
        />
      </CardContent>
    </Card>
  );
}