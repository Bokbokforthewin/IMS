import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AccountabilityPage({ serializedAssets, accountabilityForm, setAccountabilityForm, handleApiCall }) {
  const [accountabilityReceipts, setAccountabilityReceipts] = useState([]);

  // Fetch issued accountability receipts
  const fetchReceipts = async () => {
    try {
      // Explicitly point to your Laravel backend port
      const response = await axios.get('http://127.0.0.1:8000/api/v1/accountability/receipts');
      
      const receiptsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
      setAccountabilityReceipts(receiptsData);
    } catch (err) {
      console.error('Failed to load accountability receipts:', err);
      setAccountabilityReceipts([]);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '800px', margin: '0 auto', background: '#fff' }}>
      <h2>5. Issue Serialized Asset (PAR / ICS)</h2>
      <p style={{ fontSize: '13px', color: '#666' }}>
        System automatically assigns <strong>PAR</strong> (≥ ₱50,000) or <strong>ICS</strong> (&lt; ₱50,000) based on the catalog item cost.
      </p>
      
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        handleApiCall('/accountability/issue-asset', accountabilityForm, () => {
          setAccountabilityForm({ serialized_asset_id: '', date_issued: '', remarks: '' });
          fetchReceipts(); // Refresh the receipts table on successful issuance
        }); 
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label>Select Available Asset</label><br />
          <select 
            required 
            value={accountabilityForm.serialized_asset_id || ''} 
            onChange={e => setAccountabilityForm({...accountabilityForm, serialized_asset_id: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select asset...</option>
            {(serializedAssets || []).map(a => {
              const isReleased = a.is_released || a.status === 'released' || a.status === 'Assigned' || !!a.date_issued;
              if (isReleased) return null; // Only show unreleased assets in dropdown
              
              const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? a.item?.cost ?? a.item?.price ?? 0);
              const type = cost >= 50000 ? 'PAR' : 'ICS';
              return (
                <option key={a.id} value={a.id}>
                  [{type}] {a.item?.name} {a.serialized_asset || ''} — SN: {a.serial_number} (Cost: ₱{cost.toLocaleString()})
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Date Issued</label><br />
          <input 
            type="date" 
            required 
            value={accountabilityForm.date_issued || ''} 
            onChange={e => setAccountabilityForm({...accountabilityForm, date_issued: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Remarks / End-User Info</label><br />
          <input 
            type="text" 
            placeholder="Issued to [Name / Office]" 
            value={accountabilityForm.remarks || ''} 
            onChange={e => setAccountabilityForm({...accountabilityForm, remarks: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Issue Asset & Generate Document
        </button>
      </form>

      {/* Serialized Assets Status Table */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>Serialized Assets Inventory Status</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Serial Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Cost</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Remarks / Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {(!serializedAssets || serializedAssets.length === 0) ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#777' }}>No serialized assets found.</td>
              </tr>
            ) : (
              serializedAssets.map(a => {
                const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? a.item?.cost ?? a.item?.price ?? 0);
                const type = cost >= 50000 ? 'PAR' : 'ICS';
                const isReleased = a.is_released || a.status === 'released' || a.status === 'Assigned' || !!a.date_issued;

                return (
                  <tr key={a.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{a.item?.name || 'N/A'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace' }}>{a.serial_number}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{type}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>₱{cost.toLocaleString()}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        background: isReleased ? '#d4edda' : '#fff3cd',
                        color: isReleased ? '#155724' : '#856404'
                      }}>
                        {isReleased ? 'Released' : 'Available'}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{a.remarks || a.end_user || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Accountability Receipts Table */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>Issued Accountability Receipts (PAR / ICS)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Document Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Serial Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date Issued</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Remarks / End-User</th>
            </tr>
          </thead>
          <tbody>
            {(!Array.isArray(accountabilityReceipts) || accountabilityReceipts.length === 0) ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#777' }}>No accountability receipts generated yet.</td>
              </tr>
            ) : (
              accountabilityReceipts.map(r => (
                <tr key={r.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{r.document_number}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      background: r.receipt_type === 'PAR' ? '#cce5ff' : '#e2e3e5',
                      color: r.receipt_type === 'PAR' ? '#004085' : '#383d41',
                      fontWeight: 'bold'
                    }}>
                      {r.receipt_type}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.item?.name || r.serialized_asset?.item?.name || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace' }}>{r.serialized_asset?.serial_number || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.date_issued}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{r.remarks || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}