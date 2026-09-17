import React, { useState, useEffect } from 'react';
import Modal from '../Modal.jsx';

const API_BASE_URL = '/api/v1';

function getAvailableOptions(asset) {
  if (asset.status === 'Condemned') {
    return []; // terminal
  }

  if (asset.status === 'Under Repair') {
    const returnTo = asset.pre_repair_status || 'Available';
    return [
      { value: returnTo, label: `${returnTo} (repair complete)` },
      { value: 'Condemned', label: 'Condemned' },
    ];
  }

  // Available or Assigned — can only enter repair or be condemned directly
  return [
    { value: 'Under Repair', label: 'Under Repair' },
    { value: 'Condemned', label: 'Condemned' },
  ];
}

export default function EditAssetStatusModal({ isOpen, onClose, asset, onSaved }) {
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (asset) {
      setStatus('');
      setRemarks(asset.condition_remarks || '');
      setError(null);
    }
  }, [asset]);

  if (!asset) return null;

  const options = getAvailableOptions(asset);
  const requiresRemarks = status === 'Under Repair' || status === 'Condemned';
  const isTerminal = asset.status === 'Condemned';

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

      {isTerminal && (
        <p style={{ fontSize: '13px', color: '#721c24', background: '#f8d7da', padding: '8px 10px', borderRadius: '6px' }}>
          This asset is condemned. Its status cannot be changed from here.
        </p>
      )}

      {!isTerminal && asset.status === 'Under Repair' && (
        <p style={{ fontSize: '13px', color: '#856404', background: '#fff3cd', padding: '8px 10px', borderRadius: '6px' }}>
          This asset was under repair from <strong>{asset.pre_repair_status || 'Available'}</strong>.
          It can only return to that status, or be marked Condemned.
        </p>
      )}

      {!isTerminal && (
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
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {requiresRemarks && (
            <div className="form-group">
              <label>Reason / Remarks <span style={{ color: '#c0392b' }}>*</span></label><br />
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. Won't power on, sent to IT for diagnosis"
                className="form-input"
                rows={3}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={saving || !status}>
            {saving ? 'Saving...' : 'Update Status'}
          </button>
        </form>
      )}
    </Modal>
  );
}