import React, { useState } from 'react';
import EditReorderLevelModal from './EditReorderLevelModal.jsx';
import DeleteItemModal from './DeleteItemModal.jsx';
import IssueConsumablesModal from './IssueConsumablesModal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search, Eye, Send, RotateCcw } from 'lucide-react';
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

function getStatusBadgeClass(status) {
  if (!status) return 'bg-success-soft text-success-text border-success-border';
  const s = status.toLowerCase();
  if (s.includes('out of stock') || s.includes('critical')) {
    return 'bg-destructive-soft text-destructive-text border-destructive-border';
  }
  if (s.includes('low') || s.includes('warning')) {
    return 'bg-warning-soft text-warning-text border-warning-border';
  }
  return 'bg-success-soft text-success-text border-success-border';
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

  const resetFilters = () => {
    setSearchQuery('');
  };

  const hasActiveFilters = Boolean(searchQuery.trim());

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Task Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Consumable Stocks Inventory
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
            placeholder="Search consumables by name, code, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Card Content & Grid */}
      <div>
        {receivedStock.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-center text-xs text-muted-foreground border rounded-lg border-dashed border-border bg-muted/20">
            No received consumable stock available.
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col h-36 items-center justify-center text-center text-xs text-muted-foreground gap-3 border border-dashed border-border rounded-lg bg-muted/20">
            <span>No consumable items match "{searchQuery}".</span>
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs h-8">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStock.map((stock) => {
              const isOutOfStock =
                !stock.total_stock || Number(stock.total_stock) <= 0;
              const imageUrl = stock.image_url || stock.item_image_url || stock.image_path;

              return (
                <Card
                  key={stock.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-2xs transition-all hover:shadow-sm"
                >
                  {/* Large Hero Card Image Header */}
                  <div className="relative aspect-4/3 w-full bg-muted/40 overflow-hidden border-b border-border flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={stock.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                        <Package className="size-8 stroke-[1.5]" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">No Preview</span>
                      </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${getStatusBadgeClass(
                          stock.status
                        )}`}
                      >
                        {stock.status || 'OK'}
                      </span>
                    </div>
                  </div>

                  <CardHeader className="p-3.5 pb-2">
                    <CardTitle className="text-sm font-semibold line-clamp-1 text-foreground">{stock.name}</CardTitle>
                    <p className="text-[11px] font-medium text-muted-foreground truncate">
                      Code: {stock.item_code || 'N/A'}
                    </p>
                  </CardHeader>

                  <CardContent className="px-3.5 py-1.5 flex-1">
                    <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">In Stock</dt>
                      <dd className="text-right font-medium text-foreground">
                        {stock.total_stock ?? 0} {stock.unit_of_measure || ''}
                      </dd>

                      <dt className="text-muted-foreground font-medium pt-1 border-t border-border/55">Unit Cost</dt>
                      <dd className="text-right font-semibold text-xs text-foreground pt-1 border-t border-border/55">
                        {money(stock.cost)}
                      </dd>
                    </dl>
                  </CardContent>

                  <CardFooter className="p-3.5 pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
                      onClick={() => openDetails(stock)}
                    >
                      <Eye className="size-3.5" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
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
          <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                {detailsItem?.name || 'Item Details'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Full item specification and current stock information.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {detailsItem && (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-2">
                <div className="border border-border rounded-lg bg-muted/30 p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-md border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
                      {detailsItem.image_url || detailsItem.item_image_url || detailsItem.image_path ? (
                        <img
                          src={detailsItem.image_url || detailsItem.item_image_url || detailsItem.image_path}
                          alt={detailsItem.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Package className="size-6 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-sm text-foreground truncate">{detailsItem.name}</div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${getStatusBadgeClass(
                            detailsItem.status
                          )}`}
                        >
                          {detailsItem.status || 'OK'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{detailsItem.item_code || 'No item code'}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <dt className="text-muted-foreground">Item Code</dt>
                    <dd className="text-right font-mono text-xs text-foreground">
                      {detailsItem.item_code || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Brand</dt>
                    <dd className="text-right text-foreground">
                      {detailsItem.item_brand || detailsItem.brand || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Specifications</dt>
                    <dd className="text-right text-foreground">
                      {detailsItem.item_specifications || detailsItem.specifications || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="text-right text-foreground">
                      {detailsItem.item_type || detailsItem.type || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Unit of Measure</dt>
                    <dd className="text-right text-foreground">
                      {detailsItem.unit_of_measure || 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Reorder Level</dt>
                    <dd className="text-right text-foreground">
                      {detailsItem.reorder_level ?? 'N/A'}
                    </dd>

                    <dt className="font-medium text-muted-foreground">
                      Quantity on Hand
                    </dt>
                    <dd className="text-right font-semibold text-foreground">
                      {detailsItem.total_stock ?? 0}{' '}
                      {detailsItem.unit_of_measure || ''}
                    </dd>

                    <dt className="font-medium text-muted-foreground">
                      Unit Cost
                    </dt>
                    <dd className="text-right font-semibold text-foreground">
                      {money(detailsItem.cost)}
                    </dd>
                  </dl>
                </div>
              </div>
            )}

            <AlertDialogFooter className="pt-2 border-t border-border">
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
      </div>
    </div>
  );
}