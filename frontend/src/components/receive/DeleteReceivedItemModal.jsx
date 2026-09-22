import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function DeleteReceivedItemModal({ isOpen, onClose, row, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!row) return null;

  const isConsumable = row.type === 'Consumable';
  const endpoint = isConsumable
    ? `/inventory/stock-batches/${row.id}`
    : `/inventory/serialized-assets/${row.id}`;

  const handleDelete = async (e) => {
    // Prevent default closing so modal remains open if an API error occurs
    e.preventDefault();
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete record.');
        return;
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError('Network error while deleting.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {/* Error Callout */}
              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <p>
                This action cannot be undone. This will permanently delete the received item record for{' '}
                <strong className="font-bold text-foreground">{row.item_name}</strong>{' '}
                {row.reference_no && (
                  <span className="font-mono text-xs text-foreground">({row.reference_no})</span>
                )}
                .
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className={buttonVariants({ variant: 'destructive' })}
          >
            {deleting ? 'Deleting...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}