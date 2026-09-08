import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const STATUS_OPTIONS = ['Available', 'Under Repair', 'Condemned'];

export default function EditAssetStatusModal({ isOpen, onClose, asset, onSaved }) {
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (asset) {
      setStatus(asset.status === 'Assigned' ? '' : asset.status);
      setRemarks(asset.condition_remarks || '');
      setError(null);
    }
  }, [asset]);

  if (!asset) return null;

  const requiresRemarks = status === 'Under Repair' || status === 'Condemned';
  const isBlockedTransition = asset.status === 'Assigned' && status === 'Available';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/serialized-assets/${asset.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ status, condition_remarks: remarks || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface whatever Laravel actually sent, not just the 'error' key —
        // 404s and validation failures use different response shapes.
        const validationErrors = data.errors ? Object.values(data.errors).flat().join(' ') : null;
        setError(data.error || validationErrors || data.message || `Request failed (${res.status}).`);
        return;
      }
      onSaved(data.asset);
      onClose();
    } catch (err) {
      setError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={`Edit Status — ${asset.item?.name || 'Asset'} (SN: ${asset.serial_number})`} onClose={onClose}>
      {error && <div className="consumables-alert consumables-alert--error">{error}</div>}

      {asset.status === 'Assigned' && (
        <p style={{ fontSize: '13px', color: '#856404', background: '#fff3cd', padding: '8px 10px', borderRadius: '6px' }}>
          This asset is currently assigned to <strong>{asset.current_holder?.name || 'someone'}</strong>.
          You can mark it Under Repair or Condemned (it stays recorded under them), but returning it to Available
          must be done through the <strong>Return/Transfer</strong> page.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Status</label><br />
          <select
            required
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="form-select"
          >
            <option value="">Select status...</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s} disabled={s === 'Available' && asset.status === 'Assigned'}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {requiresRemarks && (
          <div className="form-group">
            <label>Reason / Remarks {requiresRemarks && <span style={{ color: '#c0392b' }}>*</span>}</label><br />
            <textarea
              required={requiresRemarks}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Won't power on, sent to IT for diagnosis"
              className="form-input"
              rows={3}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={saving || isBlockedTransition || !status}
        >
          {saving ? 'Saving...' : 'Update Status'}
        </button>
      </form>
    </Modal>
  );
}