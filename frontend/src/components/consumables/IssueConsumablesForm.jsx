import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = '/api/v1';

export default function IssueConsumablesForm({ item, handleApiCall, onSuccess }) {
  const [form, setForm] = useState({
    item_id: item?.id || '',
    quantity_requested: '',
    issued_to_id: '',
    issuance_date: '',
    purpose: ''
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const json = await res.json();
      
      // Handle both direct arrays and Laravel wrapped/paginated responses ({ data: [...] })
      let userList = [];
      if (Array.isArray(json)) {
        userList = json;
      } else if (json && Array.isArray(json.data)) {
        userList = json.data;
      }
      
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Keep item_id in sync in case the modal is reused for a different item
  // without fully unmounting (e.g. opened again for a new row).
  useEffect(() => {
    setForm(f => ({ ...f, item_id: item?.id || '' }));
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (typeof handleApiCall !== 'function') {
      setErrorMessage('Configuration error: handleApiCall handler is missing.');
      return;
    }

    setLoading(true);
    try {
      await handleApiCall('/consumables/issue', form, (res) => {
        if (res?.message) {
          setSuccessMessage(res.message);
        }
        setForm({
          item_id: item?.id || '',
          quantity_requested: '',
          issued_to_id: '',
          issuance_date: '',
          purpose: ''
        });
        if (typeof onSuccess === 'function') onSuccess();
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to process issuance.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div>
      {errorMessage && (
        <div className="consumables-alert consumables-alert--error">{errorMessage}</div>
      )}

      {successMessage && (
        <div className="consumables-alert consumables-alert--success">{successMessage}</div>
      )}

      <div className="consumables-issue-target">
        <div className="consumables-issue-target__label">Issuing</div>
        <div className="consumables-issue-target__name">{item.name}</div>
        <div className="consumables-issue-target__meta">
          [{item.item_code}] — Available: {item.total_stock} {item.unit_of_measure}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="consumables-field">
          <label>Quantity to Issue</label>
          <input
            type="number"
            required
            min="1"
            max={item.total_stock}
            placeholder="e.g., 5"
            value={form.quantity_requested}
            onChange={e => setForm({ ...form, quantity_requested: e.target.value })}
          />
        </div>

        <div className="consumables-field">
          <label>Issued To</label>
          <select
            required
            value={form.issued_to_id}
            onChange={e => setForm({ ...form, issued_to_id: e.target.value })}
          >
            <option value="">Select employee...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.designation}, {u.unit} / {u.division}
              </option>
            ))}
          </select>
        </div>

        <div className="consumables-field">
          <label>Issuance Date</label>
          <input
            type="date"
            required
            value={form.issuance_date}
            onChange={e => setForm({ ...form, issuance_date: e.target.value })}
          />
        </div>

        <div className="consumables-field">
          <label>Purpose / Remarks (Optional)</label>
          <input
            type="text"
            placeholder="e.g., Monthly office supplies printing"
            value={form.purpose}
            onChange={e => setForm({ ...form, purpose: e.target.value })}
          />
        </div>

        <button type="submit" disabled={loading} className="consumables-submit-btn">
          {loading ? 'Processing...' : 'Issue Consumables & Generate RIS'}
        </button>
      </form>
    </div>
  );
}