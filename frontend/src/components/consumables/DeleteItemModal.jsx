import React, { useState } from 'react';
import Modal from '../Modal.jsx';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function DeleteItemModal({ isOpen, onClose, item, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!item) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${item.id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
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
    <Modal isOpen={isOpen} title="Confirm Delete Item" onClose={onClose}>
      {error && <div className="consumables-alert consumables-alert--error">{error}</div>}

      <p>
        Are you sure you want to delete <strong>{item.name}</strong> ({item.item_code})?
        This can only succeed if the item has zero stock on hand and no issuance history.
      </p>

      <div className="consumables-modal-actions">
        <button type="button" onClick={onClose} className="consumables-cancel-btn">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={deleting} className="consumables-delete-btn">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}