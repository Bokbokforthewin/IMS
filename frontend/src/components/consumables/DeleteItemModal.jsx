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

export default function DeleteItemModal({ isOpen, onClose, item, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!item) return null;

  const handleDelete = async (e) => {
    // Prevent default closing behavior so modal stays open if API error occurs
    e.preventDefault();
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/items/${item.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete item.');
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
                This action cannot be undone. This will permanently delete the item{' '}
                <strong className="font-bold text-foreground">{item.name}</strong>{' '}
                <span className="font-mono text-xs text-foreground">({item.item_code})</span>.
              </p>

              <p className="text-xs">
                Note: Deletion will only succeed if the item has zero stock on hand and no issuance history.
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