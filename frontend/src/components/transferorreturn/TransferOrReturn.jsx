import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function TransferOrReturnForm({ serializedAssets = [], handleApiCall, onSuccess }) {
  const [form, setForm] = useState({
    serialized_asset_id: '',
    transfer_type: 'RETURN',
    user_id: '',
    transfered_to: '',
    description: '',
    reason: '',
    transfer_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await handleApiCall('/asset-transfers', form, () => {
        setForm({
          serialized_asset_id: '',
          transfer_type: 'RETURN',
          user_id: '',
          transfered_to: '',
          description: '',
          reason: '',
          transfer_date: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        if (typeof onSuccess === 'function') onSuccess();
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="transfer-panel">
      <h2 className="transfer-panel__title">6. Return or Transfer Equipment (PTR / Return Slip)</h2>
      <p className="transfer-panel__subtitle">
        Process employee returns or inter-office property transfers.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="transfer-radio-group">
          <label>Action Type</label>
          <div className="transfer-radio-options">
            <label>
              <input
                type="radio"
                name="transfer_type"
                value="RETURN"
                checked={form.transfer_type === 'RETURN'}
                onChange={e => setForm({ ...form, transfer_type: e.target.value, serialized_asset_id: '' })}
              />
              Return Equipment (Back to Warehouse)
            </label>
            <label>
              <input
                type="radio"
                name="transfer_type"
                value="TRANSFER"
                checked={form.transfer_type === 'TRANSFER'}
                onChange={e => setForm({ ...form, transfer_type: e.target.value, serialized_asset_id: '' })}
              />
              Transfer Equipment (Person to Person)
            </label>
          </div>
        </div>

        <div className="transfer-field">
          <label>Select Asset</label>
          <select
            required
            value={form.serialized_asset_id}
            onChange={e => setForm({ ...form, serialized_asset_id: e.target.value })}
          >
            <option value="">Select an asset...</option>
            {serializedAssets.map(a => {
              const isAvailable = a.status === 'Available';
              const disableOption = form.transfer_type === 'RETURN' && isAvailable;

              const categoryName = a.item?.category?.name ? `[${a.item.category.name}]` : '';
              const itemName = a.item ? a.item.name : `Item ID: ${a.item_id}`;
              const brandModel = (a.brand || a.model) ? `(${a.brand || ''} ${a.model || ''})`.trim() : '';

              return (
                <option key={a.id} value={a.id} disabled={disableOption}>
                  {categoryName} {itemName} {brandModel} — SN: {a.serial_number} [{a.status}]
                </option>
              );
            })}
          </select>
          {form.transfer_type === 'RETURN' && (
            <small>
              * Assets currently marked as <b>[Available]</b> cannot be returned because they are already in the warehouse.
            </small>
          )}
        </div>

        <div className="transfer-field">
          <label>Transferring From (Current Holder)</label>
          <select
            required
            value={form.user_id}
            onChange={e => setForm({ ...form, user_id: e.target.value })}
          >
            <option value="">Select employee...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.designation}, {u.unit} / {u.division}
              </option>
            ))}
          </select>
        </div>

        <div className="transfer-field">
          <label>Transferring To</label>
          <select
            required
            value={form.transfered_to}
            onChange={e => setForm({ ...form, transfered_to: e.target.value })}
          >
            <option value="">Select employee...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.designation}, {u.unit} / {u.division}
              </option>
            ))}
          </select>
        </div>

        <div className="transfer-field">
          <label>Description</label>
          <input
            type="text"
            required
            placeholder="e.g., Laptop reassignment, unit relocation"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="transfer-field">
          <label>Reason for {form.transfer_type === 'RETURN' ? 'Return' : 'Transfer'}</label>
          <input
            type="text"
            required
            placeholder={form.transfer_type === 'RETURN' ? 'e.g., Resigned, Retired, Defective' : 'e.g., Departmental Reassignment'}
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        <div className="transfer-field">
          <label>Transaction Date</label>
          <input
            type="date"
            required
            value={form.transfer_date}
            onChange={e => setForm({ ...form, transfer_date: e.target.value })}
          />
        </div>

        <div className="transfer-field">
          <label>Remarks / Notes</label>
          <input
            type="text"
            placeholder="Optional additional context..."
            value={form.remarks}
            onChange={e => setForm({ ...form, remarks: e.target.value })}
          />
        </div>

        <button type="submit" disabled={submitting} className="transfer-submit-btn">
          {submitting
            ? 'Processing...'
            : form.transfer_type === 'RETURN'
              ? 'Process Equipment Return'
              : 'Generate Property Transfer Report (PTR)'}
        </button>
      </form>
    </div>
  );
}