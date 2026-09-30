import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/client'; // Import your centralized Axios client
import EditReceivedItemModal from './EditReceivedItemModal.jsx';
import DeleteReceivedItemModal from './DeleteReceivedItemModal.jsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

function money(n) {
  return `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Groups received-history rows into primary rows and child rows
 */
function groupHistory(history) {
  const byReference = {};
  history.forEach(row => {
    if (row.type === 'Asset' && row.reference_no) {
      byReference[row.reference_no] = row;
    }
  });

  const childIds = new Set();
  history.forEach(row => {
    if (row.type === 'Asset' && row.attached_to && byReference[row.attached_to]) {
      childIds.add(`${row.type}-${row.id}`);
    }
  });

  const primaries = history.filter(row => !childIds.has(`${row.type}-${row.id}`));

  return primaries.map(primary => ({
    primary,
    children: (primary.type === 'Asset' && primary.reference_no)
      ? history.filter(r => r.type === 'Asset' && r.attached_to === primary.reference_no)
      : [],
  }));
}

export default function ReceivedStockTable({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [editingRow, setEditingRow] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingRow, setDeletingRow] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [detailsGroup, setDetailsGroup] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      // Using centralized Axios client (api base is '/api', so path is '/v1/inventory/...')
      const res = await api.get('/v1/inventory/received-history?per_page=50');
      
      // Handles both paginated (res.data.data) and non-paginated (res.data) responses
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

  const openEdit = (row) => {
    setEditingRow(row);
    setIsEditOpen(true);
  };

  const openDelete = (row) => {
    setDeletingRow(row);
    setIsDeleteOpen(true);
  };

  const openDetails = (group) => {
    setDetailsGroup(group);
    setIsDetailsOpen(true);
  };

  const grouped = groupHistory(history);
  const allDetailRows = detailsGroup ? [detailsGroup.primary, ...detailsGroup.children] : [];

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title text-xl font-bold mb-4">Received Stocks & Assets</h2>

      {loadingHistory && <p className="receive-table__loading text-muted-foreground">Loading...</p>}

      {!loadingHistory && grouped.length === 0 && (
        <p className="receive-table__empty text-muted-foreground">No received records found.</p>
      )}

      {!loadingHistory && grouped.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {grouped.map(({ primary, children }) => {
            const isBundled = children.length > 0;

            return (
              <Card key={`${primary.type}-${primary.id}`} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant={primary.type === 'Asset' ? 'default' : 'secondary'}>
                      {primary.type}
                    </Badge>
                    {isBundled && <Badge variant="outline">Bundled</Badge>}
                  </div>
                  <CardTitle className="text-base">{primary.item_name}</CardTitle>
                  <CardDescription>
                    {primary.item_code} &middot; Ref: {primary.reference_no || 'N/A'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="text-right">
                      {primary.received_at ? new Date(primary.received_at).toLocaleDateString() : 'N/A'}
                    </dd>

                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-right">
                      {primary.quantity} {primary.unit_of_measure || ''}
                    </dd>

                    <dt className="text-muted-foreground font-medium">Total Cost</dt>
                    <dd className="text-right font-semibold">{money(primary.total_cost)}</dd>
                  </dl>

                  {isBundled && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {children.map(c => c.item_name).join(', ')}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => openDetails({ primary, children })}>
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {detailsGroup?.primary?.item_name}
              {detailsGroup?.children.length > 0 && ` + ${detailsGroup.children.length} bundled item(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Full details for every item received together in this batch.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {allDetailRows.map(row => (
              <div key={`${row.type}-${row.id}`} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{row.item_name}</div>
                  <Badge variant={row.type === 'Asset' ? 'default' : 'secondary'}>{row.type}</Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Item Code</dt>
                  <dd className="text-right">{row.item_code}</dd>

                  <dt className="text-muted-foreground">Reference No.</dt>
                  <dd className="text-right">{row.reference_no || 'N/A'}</dd>

                  {row.serial_number && (
                    <>
                      <dt className="text-muted-foreground">Serial Number</dt>
                      <dd className="text-right">{row.serial_number}</dd>
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

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setIsDetailsOpen(false); openEdit(row); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setIsDetailsOpen(false); openDelete(row); }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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