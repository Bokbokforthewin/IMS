import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = '/api/v1';

function emptyAccessory() {
  return { name: '', brand: '', serial_number: '' };
}

export default function AccountabilityForm({ serializedAssets, initialAssetId, handleApiCall, onSuccess }) {
  const [lines, setLines] = useState(() =>
    initialAssetId ? [{ serialized_asset_id: Number(initialAssetId), accessories: [] }] : []
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
      setLines([{ serialized_asset_id: Number(initialAssetId), accessories: [] }]);
    }
  }, [initialAssetId]);

  const availableAssets = (serializedAssets || []).filter(
    a => a.status === 'Available' && !lines.some(l => l.serialized_asset_id === a.id)
  );

  const recipient = users.find(u => u.id == userId);
  const unitHead = recipient
    ? users.find(u => u.unit === recipient.unit && u.id !== recipient.id && u.is_head)
    : null;

  const addLine = () => {
    if (!pendingAssetId) return;
    setLines([...lines, { serialized_asset_id: Number(pendingAssetId), accessories: [] }]);
    setPendingAssetId('');
  };

  const removeLine = (assetId) => {
    setLines(lines.filter(l => l.serialized_asset_id !== assetId));
  };

  const addAccessory = (assetId) => {
    setLines(lines.map(l =>
      l.serialized_asset_id === assetId
        ? { ...l, accessories: [...l.accessories, emptyAccessory()] }
        : l
    ));
  };

  const updateAccessory = (assetId, index, field, value) => {
    setLines(lines.map(l => {
      if (l.serialized_asset_id !== assetId) return l;
      const updated = [...l.accessories];
      updated[index] = { ...updated[index], [field]: value };
      return { ...l, accessories: updated };
    }));
  };

  const removeAccessory = (assetId, index) => {
    setLines(lines.map(l => {
      if (l.serialized_asset_id !== assetId) return l;
      return { ...l, accessories: l.accessories.filter((_, i) => i !== index) };
    }));
  };

  const totalCost = lines.reduce((sum, l) => {
    const asset = serializedAssets.find(a => a.id === l.serialized_asset_id);
    const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
    return sum + cost;
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lines.length === 0) return;

    setSubmitting(true);

    // Strip out any accessory rows the user added but never filled in
    const payloadLines = lines.map(l => ({
      serialized_asset_id: l.serialized_asset_id,
      accessories: l.accessories.filter(a => a.name.trim() !== ''),
    }));

    const payload = {
      lines: payloadLines,
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
          <label>Assets in This Receipt ({lines.length})</label>
          {lines.map(line => {
            const asset = serializedAssets.find(a => a.id === line.serialized_asset_id);
            const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
            return (
              <div key={line.serialized_asset_id} style={{ marginTop: '10px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{asset?.item?.name} — SN: {asset?.serial_number} (₱{cost.toLocaleString()})</strong>
                  <button type="button" onClick={() => removeLine(line.serialized_asset_id)} style={{ color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>

                {/* Structured accessory rows */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
                    Bundled Accessories (optional)
                  </div>

                  {line.accessories.map((acc, index) => (
                    <div key={index} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Accessory name (e.g. Keyboard)"
                        value={acc.name}
                        onChange={e => updateAccessory(line.serialized_asset_id, index, 'name', e.target.value)}
                        className="form-input"
                        style={{ flex: 2 }}
                      />
                      <input
                        type="text"
                        placeholder="Brand (optional)"
                        value={acc.brand}
                        onChange={e => updateAccessory(line.serialized_asset_id, index, 'brand', e.target.value)}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Serial Number (optional)"
                        value={acc.serial_number}
                        onChange={e => updateAccessory(line.serialized_asset_id, index, 'serial_number', e.target.value)}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeAccessory(line.serialized_asset_id, index)}
                        style={{ color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addAccessory(line.serialized_asset_id)}
                    style={{ fontSize: '12px', padding: '4px 10px', border: '1px dashed #ccc', borderRadius: '4px', background: '#fafafa', cursor: 'pointer' }}
                  >
                    + Add Accessory
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
            Total: ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            {' — '}{totalCost >= 50000 ? 'Will be issued as PAR' : 'Will be issued as ICS'}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Add Another Asset to This Receipt (Optional)</label><br />
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
          e.g. add a keyboard/mouse bundled with a desktop under the same PAR.
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