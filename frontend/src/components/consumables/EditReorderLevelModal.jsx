import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function EditReorderLevelModal({ isOpen, onClose, item, onSaved }) {
  const [reorderLevel, setReorderLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setReorderLevel(item.reorder_level ?? '');
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ reorder_level: reorderLevel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update reorder level.');
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={`Edit Reorder Level — ${item.name}`} onClose={onClose}>
      {error && <div className="consumables-alert consumables-alert--error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="consumables-field">
          <label>Reorder Level</label>
          <input
            type="number"
            min="0"
            required
            value={reorderLevel}
            onChange={e => setReorderLevel(e.target.value)}
          />
          <small>Item will be flagged "Low Stock" once quantity on hand falls to or below this number.</small>
        </div>

        <button type="submit" disabled={saving} className="consumables-submit-btn">
          {saving ? 'Saving...' : 'Save Reorder Level'}
        </button>
      </form>
    </Modal>
  );
}