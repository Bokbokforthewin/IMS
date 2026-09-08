import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';

export default function EditReceivedItemModal({ isOpen, onClose, row, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!row) return;
    if (row.type === 'Consumable') {
      setForm({
        iar_number: row.reference_no || '',
        received_date: row.received_at ? row.received_at.substring(0, 10) : '',
        quantity_on_hand: row.quantity ?? '',
        unit_cost: row.unit_cost ?? '',
      });
    } else {
      setForm({
        serial_number: row.serial_number || '',
        model: row.model || '',
        unit_cost: row.unit_cost ?? '',
      });
    }
    setError(null);
  }, [row]);

  if (!row) return null;

  const isConsumable = row.type === 'Consumable';
  const endpoint = isConsumable
    ? `/inventory/stock-batches/${row.id}`
    : `/inventory/serialized-assets/${row.id}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save changes.');
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
    <Modal isOpen={isOpen} title={`Edit ${isConsumable ? 'Stock Batch' : 'Serialized Asset'}`} onClose={onClose}>
      {error && <div className="receive-modal-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {isConsumable ? (
          <>
            <div className="receive-field">
              <label>IAR Number</label>
              <input
                type="text"
                required
                value={form.iar_number || ''}
                onChange={e => setForm({ ...form, iar_number: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Received Date</label>
              <input
                type="date"
                required
                value={form.received_date || ''}
                onChange={e => setForm({ ...form, received_date: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Quantity on Hand</label>
              <input
                type="number"
                min="0"
                required
                value={form.quantity_on_hand}
                onChange={e => setForm({ ...form, quantity_on_hand: e.target.value })}
              />
              <small>Correcting this does not reverse or replay any past issuances.</small>
            </div>

            <div className="receive-field">
              <label>Unit Cost (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.unit_cost}
                onChange={e => setForm({ ...form, unit_cost: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="receive-field">
              <label>Serial Number</label>
              <input
                type="text"
                value={form.serial_number || ''}
                onChange={e => setForm({ ...form, serial_number: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Model</label>
              <input
                type="text"
                value={form.model || ''}
                onChange={e => setForm({ ...form, model: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Unit Cost (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.unit_cost}
                onChange={e => setForm({ ...form, unit_cost: e.target.value })}
              />
            </div>

            <small>Property number and status are not editable here. Status changes through issuance or return workflows.</small>
          </>
        )}

        <button type="submit" disabled={saving} className="receive-submit-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </Modal>
  );
}