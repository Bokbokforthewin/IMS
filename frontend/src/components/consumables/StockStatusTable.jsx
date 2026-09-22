import React, { useState } from 'react';
import EditReorderLevelModal from './EditReorderLevelModal.jsx';
import DeleteItemModal from './DeleteItemModal.jsx';
import IssueConsumablesModal from './IssueConsumablesModal.jsx';
import Modal from '../Modal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  return n ? `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A';
}

export default function StockStatusGrid({ stockStatus, onChanged, handleApiCall, onIssued }) {
  const safeStock = Array.isArray(stockStatus) ? stockStatus : [];

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
    <div className="sp-consumables-panel">
      <div className="sp-panel-header">
        <h3 className="sp-panel-title">Consumable Stocks</h3>
      </div>

      {safeStock.length === 0 ? (
        <p className="sp-empty-state">No stock status data available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {safeStock.map((stock) => {
            const isOutOfStock = !stock.total_stock || stock.total_stock <= 0;

            return (
              <Card key={stock.id} className="flex flex-col">
                <CardHeader>
                  <CardAction>
                    <Badge variant={getStatusVariant(stock.status)}>
                      {stock.status || 'OK'}
                    </Badge>
                  </CardAction>
                  <CardTitle>{stock.name}</CardTitle>
                  <CardDescription>{stock.item_brand || 'No brand'}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right">
                      {stock.total_stock} {stock.unit_of_measure}
                    </dd>

                    <dt className="text-muted-foreground font-medium">Price</dt>
                    <dd className="text-right font-semibold">{money(stock.cost)}</dd>
                  </dl>

                  <Button
                    variant="link"
                    className="mt-2 px-0"
                    onClick={() => openDetails(stock)}
                  >
                    View Details
                  </Button>
                </CardContent>

                <CardFooter className="flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => openIssue(stock)}
                    disabled={isOutOfStock}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Issue'}
                  </Button>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1" onClick={() => openEdit(stock)}>
                      Edit
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => openDelete(stock)}>
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details modal — shows everything not on the compact card */}
      <Modal
        isOpen={isDetailsOpen}
        title={detailsItem?.name || 'Item Details'}
        onClose={() => setIsDetailsOpen(false)}
      >
        {detailsItem && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Item Code</dt>
            <dd className="text-right">{detailsItem.item_code || 'N/A'}</dd>

            <dt className="text-muted-foreground">Brand</dt>
            <dd className="text-right">{detailsItem.item_brand || 'N/A'}</dd>

            <dt className="text-muted-foreground">Specifications</dt>
            <dd className="text-right">{detailsItem.item_specifications || 'N/A'}</dd>

            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-right">{detailsItem.item_type || 'N/A'}</dd>

            <dt className="text-muted-foreground">Unit of Measure</dt>
            <dd className="text-right">{detailsItem.unit_of_measure || 'N/A'}</dd>

            <dt className="text-muted-foreground">Reorder Level</dt>
            <dd className="text-right">{detailsItem.reorder_level ?? 'N/A'}</dd>

            <dt className="text-muted-foreground">Quantity on Hand</dt>
            <dd className="text-right">{detailsItem.total_stock} {detailsItem.unit_of_measure}</dd>

            <dt className="text-muted-foreground">Unit Cost</dt>
            <dd className="text-right">{money(detailsItem.cost)}</dd>

            <dt className="text-muted-foreground font-medium">Status</dt>
            <dd className="text-right">
              <Badge variant={getStatusVariant(detailsItem.status)}>
                {detailsItem.status || 'OK'}
              </Badge>
            </dd>
          </dl>
        )}
      </Modal>

      <IssueConsumablesModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        item={issuingItem}
        handleApiCall={handleApiCall}
        onSuccess={handleIssued}
      />

      <EditReorderLevelModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        item={editingItem}
        onSaved={handleChanged}
      />

      <DeleteItemModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        item={deletingItem}
        onDeleted={handleChanged}
      />
    </div>
  );
}