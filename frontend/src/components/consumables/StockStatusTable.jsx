import React, { useState } from 'react';
import EditReorderLevelModal from './EditReorderLevelModal.jsx';
import DeleteItemModal from './DeleteItemModal.jsx';
import IssueConsumablesModal from './IssueConsumablesModal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search, Eye, Send } from 'lucide-react';
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
    <Card className="w-full border-none shadow-none bg-transparent">
      {/* Header with Icon & Search */}
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-0 pb-6 pt-0">
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
            className="pl-8 h-9 text-xs"
          />
        </div>
      </CardHeader>

      {/* Card Content & Grid */}
      <CardContent className="px-0">
        {receivedStock.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground border rounded-2xl border-dashed">
            No received consumable stock available.
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground border rounded-2xl border-dashed">
            No consumable items match "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredStock.map((stock) => {
              const isOutOfStock =
                !stock.total_stock || Number(stock.total_stock) <= 0;
              const imageUrl = stock.image_url || stock.item_image_url || stock.image_path;

              return (
                <Card
                  key={stock.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md"
                >
                  {/* Large Hero Card Image Header */}
                  <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={stock.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                        <Package className="size-10 stroke-[1.5]" />
                        <span className="text-[11px] font-medium uppercase tracking-wider">No Image</span>
                      </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-2.5 right-2.5">
                      <Badge
                        variant={getStatusVariant(stock.status)}
                        className="shadow-xs text-[10px]"
                      >
                        {stock.status || 'OK'}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base font-bold line-clamp-1">{stock.name}</CardTitle>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      Code: {stock.item_code || 'N/A'}
                    </p>
                  </CardHeader>

                  <CardContent className="px-4 py-2 flex-1">
                    <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">In Stock</dt>
                      <dd className="text-right font-medium">
                        {stock.total_stock ?? 0} {stock.unit_of_measure || ''}
                      </dd>

                      <dt className="text-muted-foreground font-medium pt-1">Unit Cost</dt>
                      <dd className="text-right font-bold text-sm text-foreground pt-1">
                        {money(stock.cost)}
                      </dd>
                    </dl>
                  </CardContent>

                  <CardFooter className="p-4 pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      onClick={() => openDetails(stock)}
                    >
                      <Eye className="size-3.5" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      onClick={() => openIssue(stock)}
                      disabled={isOutOfStock}
                    >
                      <Send className="size-3.5" />
                      {isOutOfStock ? 'Out of Stock' : 'Issue'}
                    </Button>
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
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="border rounded-md p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {detailsItem.image_url || detailsItem.item_image_url || detailsItem.image_path ? (
                        <img
                          src={detailsItem.image_url || detailsItem.item_image_url || detailsItem.image_path}
                          alt={detailsItem.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-8 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm truncate">{detailsItem.name}</div>
                        <Badge variant={getStatusVariant(detailsItem.status)}>
                          {detailsItem.status || 'OK'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{detailsItem.item_code || 'No item code'}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm border-t pt-2">
                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right font-mono text-xs">
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
        {/* <EditReorderLevelModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          item={editingItem}
          handleApiCall={handleApiCall}
          onSaved={handleChanged}
        /> */}

        {/* Delete Item Modal */}
        {/* <DeleteItemModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          item={deletingItem}
          handleApiCall={handleApiCall}
          onDeleted={handleChanged}
        /> */}
      </CardContent>
    </Card>
  );
}