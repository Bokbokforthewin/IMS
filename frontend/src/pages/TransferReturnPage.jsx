import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TransferReturnPage({ serializedAssets, handleApiCall, refreshData }) {
  const [transfers, setTransfers] = useState([]);
  const [form, setForm] = useState({
    serialized_asset_id: '',
    transfer_type: 'RETURN',
    from_office: '',
    to_office: '',
    reason: '',
    transfer_date: '',
    remarks: ''
  });

  const fetchTransfers = async () => {
    try {
      const response = await axios.get('/api/v1/asset-transfers');
      // Safely unpack data regardless of whether Laravel wraps it in a resource collection or plain array
      const rawData = response.data;
      const items = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.transfers || []);
      setTransfers(items);
    } catch (err) {
      console.error('Failed to load transfer/return records:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '800px', margin: '0 auto', background: '#fff' }}>
      <h2>6. Return or Transfer Equipment (PTR / Return Slip)</h2>
      <p style={{ fontSize: '13px', color: '#666' }}>
        Process employee returns or inter-office property transfers.
      </p>

      <form onSubmit={(e) => {
        e.preventDefault();
        handleApiCall('/asset-transfers', form, () => {
          setForm({
            serialized_asset_id: '',
            transfer_type: 'RETURN',
            from_office: '',
            to_office: '',
            reason: '',
            transfer_date: '',
            remarks: ''
          });
          fetchTransfers();
          if (refreshData) refreshData();
        });
      }}>
        
        {/* Action Type Radio Buttons */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>Action Type</label><br />
          <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
            <label style={{ cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="transfer_type" 
                value="RETURN"
                checked={form.transfer_type === 'RETURN'}
                onChange={e => setForm({...form, transfer_type: e.target.value, serialized_asset_id: ''})}
              /> Return Equipment (Back to Warehouse)
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="transfer_type" 
                value="TRANSFER"
                checked={form.transfer_type === 'TRANSFER'}
                onChange={e => setForm({...form, transfer_type: e.target.value, serialized_asset_id: ''})}
              /> Transfer Equipment (Office to Office)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Select Asset</label><br />
          <select 
            required 
            value={form.serialized_asset_id} 
            onChange={e => {
              const selectedId = e.target.value;
              const foundAsset = (serializedAssets || []).find(a => String(a.id) === String(selectedId));
              setForm({
                ...form, 
                serialized_asset_id: selectedId,
                from_office: foundAsset ? (foundAsset.remarks || '') : ''
              });
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select an asset...</option>
            {(serializedAssets || []).map(a => {
              const isAvailable = a.status === 'Available';
              const disableOption = form.transfer_type === 'RETURN' && isAvailable;
              
              const categoryName = a.item?.category?.name ? `[${a.item.category.name}]` : '';
              const itemName = a.item ? a.item.name : `Item ID: ${a.item_id}`;
              const brandModel = (a.brand || a.model) ? `(${a.brand || ''} ${a.model || ''})`.trim() : '';

              return (
                <option 
                  key={a.id} 
                  value={a.id} 
                  disabled={disableOption}
                >
                  {categoryName} {itemName} {brandModel} — SN: {a.serial_number} [{a.status}]
                </option>
              );
            })}
          </select>
          {form.transfer_type === 'RETURN' && (
            <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>
              * Assets currently marked as <b>[Available]</b> cannot be returned because they are already in the warehouse.
            </small>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>From Office / Department / End-User</label><br />
          <input 
            type="text" 
            required
            placeholder="e.g., IT Department / John Doe" 
            value={form.from_office} 
            onChange={e => setForm({...form, from_office: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>To Office / Destination Department</label><br />
          <input 
            type="text" 
            required
            placeholder={form.transfer_type === 'RETURN' ? 'e.g., Warehouse / Main Storage' : 'e.g., Accounting Office'} 
            value={form.to_office} 
            onChange={e => setForm({...form, to_office: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Reason for {form.transfer_type === 'RETURN' ? 'Return' : 'Transfer'}</label><br />
          <input 
            type="text" 
            required
            placeholder={form.transfer_type === 'RETURN' ? 'e.g., Resigned, Retired, Defective' : 'e.g., Departmental Reassignment'} 
            value={form.reason} 
            onChange={e => setForm({...form, reason: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Transaction Date</label><br />
          <input 
            type="date" 
            required 
            value={form.transfer_date} 
            onChange={e => setForm({...form, transfer_date: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Remarks / Notes</label><br />
          <input 
            type="text" 
            placeholder="Optional additional context..." 
            value={form.remarks} 
            onChange={e => setForm({...form, remarks: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {form.transfer_type === 'RETURN' ? 'Process Equipment Return' : 'Generate Property Transfer Report (PTR)'}
        </button>
      </form>

      {/* History Table */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>Return & Transfer History Logs</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Doc Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item & SN</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Route</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reason</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#777' }}>No return or transfer records found.</td>
              </tr>
            ) : (
              transfers.map(t => (
                <tr key={t.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{t.document_number || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <span style={{ 
                      padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      background: t.transfer_type === 'RETURN' ? '#d4edda' : '#fff3cd',
                      color: t.transfer_type === 'RETURN' ? '#155724' : '#856404'
                    }}>
                      {t.transfer_type}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {t.serialized_asset?.item?.name || 'N/A'} <br />
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#555' }}>SN: {t.serialized_asset?.serial_number || 'N/A'}</span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '13px' }}>
                    {t.from_office} ➔ {t.to_office}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.reason}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.transfer_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}