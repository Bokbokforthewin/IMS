import React, { useState } from 'react';
import Modal from '../Modal.jsx';

export default function DeleteReceivedItemModal({ isOpen, onClose, row, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!row) return null;

  const isConsumable = row.type === 'Consumable';
  const endpoint = isConsumable
    ? `/inventory/stock-batches/${row.id}`
    : `/inventory/serialized-assets/${row.id}`;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1${endpoint}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
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
    <Modal isOpen={isOpen} title="Confirm Delete" onClose={onClose}>
      {error && <div className="receive-modal-error">{error}</div>}

      <p>
        Are you sure you want to delete <strong>{row.item_name}</strong> ({row.reference_no})?
        This cannot be undone.
      </p>

      <div className="receive-modal-actions">
        <button type="button" onClick={onClose} className="receive-cancel-btn">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={deleting} className="receive-delete-btn">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}