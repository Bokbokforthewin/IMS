import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = '/api/v1';

export default function AccountabilityForm({ serializedAssets, initialAssetId, handleApiCall, onSuccess }) {
  const [lines, setLines] = useState(() =>
    initialAssetId
      ? [{ key: `a-${initialAssetId}`, serialized_asset_id: Number(initialAssetId), attachToKey: null }]
      : []
  );
  const [pendingAssetId, setPendingAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [issuedById, setIssuedById] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [remarks, setRemarks] = useState('');
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

  useEffect(() => {
    if (initialAssetId) {
      setLines([{ key: `a-${initialAssetId}`, serialized_asset_id: Number(initialAssetId), attachToKey: null }]);
    }
  }, [initialAssetId]);

  // Only genuinely available, unheld assets can be added to this delivery.
  const availableAssets = (serializedAssets || []).filter(
    a => a.status === 'Available' && !a.current_holder_id &&
    !lines.some(l => l.serialized_asset_id === a.id)
  );

  const findAsset = (id) => (serializedAssets || []).find(a => a.id === id);

  const recipient = users.find(u => u.id == userId);
  const unitHead = recipient
    ? users.find(u => u.unit === recipient.unit && u.id !== recipient.id && u.is_head)
    : null;

  const addLine = () => {
    if (!pendingAssetId) return;
    const id = Number(pendingAssetId);
    setLines([...lines, { key: `a-${id}`, serialized_asset_id: id, attachToKey: null }]);
    setPendingAssetId('');
  };

  const removeLine = (key) => {
    // Detach anything that was pointing at the removed line
    setLines(lines
      .filter(l => l.key !== key)
      .map(l => (l.attachToKey === key ? { ...l, attachToKey: null } : l))
    );
  };

  const updateAttachment = (key, attachToKey) => {
    setLines(lines.map(l => (l.key === key ? { ...l, attachToKey: attachToKey || null } : l)));
  };

  const totalCost = lines.reduce((sum, l) => {
    const asset = findAsset(l.serialized_asset_id);
    return sum + Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
  }, 0);

  // Only assets that can carry a property number make sense as attach targets.
  const attachTargets = lines.filter(l => findAsset(l.serialized_asset_id)?.property_number);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lines.length === 0) return;

    setSubmitting(true);

    const payload = {
      cart: lines.map(l => ({
        key: l.key,
        serialized_asset_id: l.serialized_asset_id,
        attach_to_key: l.attachToKey || undefined,
      })),
      user_id: userId,
      issued_by_id: issuedById,
      date_issued: dateIssued,
      remarks,
    };

    handleApiCall('/accountability/issue-asset', payload, () => {
      setLines([]);
      setPendingAssetId('');
      setUserId('');
      setIssuedById('');
      setDateIssued('');
      setRemarks('');
      if (typeof onSuccess === 'function') onSuccess();
    }).finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit}>
      {lines.length > 0 && (
        <div className="form-group" style={{ border: '1px solid #eee', borderRadius: '6px', padding: '12px' }}>
          <label>Assets in This Delivery ({lines.length})</label>
          {lines.map(line => {
            const asset = findAsset(line.serialized_asset_id);
            const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
            const attachedToLine = lines.find(l => l.key === line.attachToKey);
            const attachedToAsset = attachedToLine ? findAsset(attachedToLine.serialized_asset_id) : null;

            return (
              <div key={line.key} style={{ marginTop: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>
                    {asset?.item?.name} — SN: {asset?.serial_number} (₱{cost.toLocaleString()})
                  </strong>
                  <button type="button" onClick={() => removeLine(line.key)} style={{ color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>

                {attachTargets.filter(t => t.key !== line.key).length > 0 && (
                  <select
                    value={line.attachToKey || ''}
                    onChange={e => updateAttachment(line.key, e.target.value)}
                    className="form-select"
                    style={{ marginTop: '6px', width: '100%' }}
                  >
                    <option value="">Standalone (not attached)</option>
                    {attachTargets.filter(t => t.key !== line.key).map(t => {
                      const tAsset = findAsset(t.serialized_asset_id);
                      return (
                        <option key={t.key} value={t.key}>
                          Attach to: {tAsset?.item?.name} — SN: {tAsset?.serial_number}
                        </option>
                      );
                    })}
                  </select>
                )}

                {attachedToAsset && (
                  <small style={{ display: 'block', marginTop: '4px', color: '#555' }}>
                    Attached to: {attachedToAsset.item?.name} (SN: {attachedToAsset.serial_number})
                  </small>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
            Total: ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <small style={{ color: '#666' }}>
            Each asset's own value decides its document — items ≥ ₱50,000 print on a PAR, the rest on a separate ICS, even within the same delivery.
          </small>
        </div>
      )}

      <div className="form-group">
        <label>Add Another Asset to This Delivery (Optional)</label><br />
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={pendingAssetId}
            onChange={e => setPendingAssetId(e.target.value)}
            className="form-select"
            style={{ flex: 1 }}
          >
            <option value="">Select asset...</option>
            {availableAssets.map(a => {
              const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? 0);
              return (
                <option key={a.id} value={a.id}>
                  {a.item?.name} — SN: {a.serial_number} (₱{cost.toLocaleString()})
                </option>
              );
            })}
          </select>
          <button type="button" onClick={addLine} className="submit-btn" disabled={!pendingAssetId}>
            + Add
          </button>
        </div>
        <small style={{ color: '#666' }}>
          e.g. add a keyboard/mouse that arrived attached to this desktop.
        </small>
      </div>

      <div className="form-group">
        <label>Issue To</label><br />
        <select required value={userId} onChange={e => setUserId(e.target.value)} className="form-select">
          <option value="">Select employee...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} — {u.designation}, {u.unit} / {u.division}</option>
          ))}
        </select>
        {recipient && (
          <small style={{ display: 'block', marginTop: '4px', color: '#555' }}>
            Unit head: {unitHead ? unitHead.name : 'No head designated for this unit yet'}
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Issued By (You)</label><br />
        <select required value={issuedById} onChange={e => setIssuedById(e.target.value)} className="form-select">
          <option value="">Select your name...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} — {u.designation}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Date Issued</label><br />
        <input type="date" required value={dateIssued} onChange={e => setDateIssued(e.target.value)} className="form-input" />
      </div>

      <div className="form-group">
        <label>Remarks (Optional)</label><br />
        <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} className="form-input" />
      </div>

      <button type="submit" className="submit-btn" disabled={submitting || lines.length === 0}>
        {submitting ? 'Processing...' : `Issue ${lines.length} Asset${lines.length !== 1 ? 's' : ''}`}
      </button>
    </form>
  );
}