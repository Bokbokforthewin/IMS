import React, { useState, useEffect, useCallback } from 'react';
import EditReceivedItemModal from './EditReceivedItemModal.jsx';
import DeleteReceivedItemModal from './DeleteReceivedItemModal.jsx';

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

const API_BASE_URL = '/api/v1';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function ReceivedStockTable({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [editingRow, setEditingRow] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingRow, setDeletingRow] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/received-history?per_page=50`);
      const json = await res.json();
      setHistory(Array.isArray(json.data) ? json.data : []);
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

  const openEdit = (row) => {
    setEditingRow(row);
    setIsEditOpen(true);
  };

  const openDelete = (row) => {
    setDeletingRow(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Received Stocks & Assets</h2>

      {loadingHistory && <p className="receive-table__loading">Loading...</p>}

      {!loadingHistory && history.length === 0 && (
        <p className="receive-table__empty">No received records found.</p>
      )}

      {!loadingHistory && history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {history.map(row => (
            <Card key={`${row.type}-${row.id}`} className="npm dlx shadcn@latest add card">
              <CardHeader>
                <CardAction>
                  <Badge variant={row.type === 'Asset' ? 'default' : 'secondary'}>
                    {row.type}
                  </Badge>
                </CardAction>
                <CardTitle>{row.item_name}</CardTitle>
                <CardDescription>
                  {row.item_code} &middot; Ref: {row.reference_no}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right">
                    {row.received_at ? new Date(row.received_at).toLocaleDateString() : 'N/A'}
                  </dd>

                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="text-right">
                    {row.quantity} {row.unit_of_measure || ''}
                  </dd>

                  <dt className="text-muted-foreground">Unit Cost</dt>
                  <dd className="text-right">{money(row.unit_cost)}</dd>

                  <dt className="text-muted-foreground font-medium">Total Cost</dt>
                  <dd className="text-right font-semibold">{money(row.total_cost)}</dd>
                </dl>
              </CardContent>

              <CardFooter className="gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(row)}>
                  Edit
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => openDelete(row)}>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <EditReceivedItemModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        row={editingRow}
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