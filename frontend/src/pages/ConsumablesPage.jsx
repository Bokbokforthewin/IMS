import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ConsumablesPage({ stockBatches = [], handleApiCall, refreshData }) {
  const [form, setForm] = useState({
    stock_batch_id: '',
    quantity_requested: '',
    issued_to: '',
    issuance_date: '',
    purpose: ''
  });

  const [issuances, setIssuances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchIssuances = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/stock-issuances');
      setIssuances(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load issuance logs:', err);
      setIssuances([]);
    }
  };

  useEffect(() => {
    fetchIssuances();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (typeof handleApiCall !== 'function') {
      setErrorMessage('Configuration error: handleApiCall handler is missing.');
      return;
    }

    setLoading(true);
    try {
      await handleApiCall('/consumables/issue', form, () => {
        setForm({
          stock_batch_id: '',
          quantity_requested: '',
          issued_to: '',
          issuance_date: '',
          purpose: ''
        });
        fetchIssuances();
        if (typeof refreshData === 'function') refreshData();
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to process issuance.');
    } finally {
      setLoading(false);
    }
  };

  // Safe guarded array for batches mapping
  const safeBatches = Array.isArray(stockBatches) ? stockBatches : [];

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '800px', margin: '0 auto', background: '#fff' }}>
      <h2>Issue Consumables (RIS - Requisition & Issue Slip)</h2>
      
      {errorMessage && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', marginBottom: '15px', borderRadius: '4px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Select Batch Dropdown */}
        <div style={{ marginBottom: '15px' }}>
          <label>Select Stock Batch (Consumable Item)</label><br />
          <select 
            required 
            value={form.stock_batch_id} 
            onChange={e => setForm({...form, stock_batch_id: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select available batch...</option>
            {safeBatches.map(b => (
              <option key={b?.id || Math.random()} value={b?.id}>
                {b?.item?.name || 'Unknown Item'} — Brand: {b?.brand || 'N/A'} {b?.specifications ? `(${b.specifications})` : ''} [Batch: {b?.iar_number}] — Available Qty: {b?.quantity_on_hand ?? 0}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Requested */}
        <div style={{ marginBottom: '15px' }}>
          <label>Quantity to Issue</label><br />
          <input 
            type="number" 
            required 
            min="1"
            placeholder="e.g., 5" 
            value={form.quantity_requested} 
            onChange={e => setForm({...form, quantity_requested: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {/* Issued To */}
        <div style={{ marginBottom: '15px' }}>
          <label>Issued To (Employee / Department)</label><br />
          <input 
            type="text" 
            required 
            placeholder="e.g., John Doe / Accounting Department" 
            value={form.issued_to} 
            onChange={e => setForm({...form, issued_to: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {/* Issuance Date */}
        <div style={{ marginBottom: '15px' }}>
          <label>Issuance Date</label><br />
          <input 
            type="date" 
            required 
            value={form.issuance_date} 
            onChange={e => setForm({...form, issuance_date: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {/* Purpose */}
        <div style={{ marginBottom: '15px' }}>
          <label>Purpose / Remarks (Optional)</label><br />
          <input 
            type="text" 
            placeholder="e.g., Monthly office supplies printing" 
            value={form.purpose} 
            onChange={e => setForm({...form, purpose: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px 15px', background: loading ? '#ccc' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Processing...' : 'Issue Consumables & Generate RIS'}
        </button>
      </form>

      {/* History Log Table */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>Consumable Issuance History (RIS Logs)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>RIS Number</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item & Brand/Specs</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qty Issued</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Issued To</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(issuances) || issuances.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#777' }}>No issuance records found.</td>
              </tr>
            ) : (
              issuances.map(i => (
                <tr key={i?.id || Math.random()}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{i?.document_number || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {i?.stock_batch?.item?.name || 'Item'} <br />
                    <small style={{ color: '#555' }}>{i?.stock_batch?.brand || ''} {i?.stock_batch?.specifications || ''}</small>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{i?.quantity_issued ?? 0}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i?.issued_to || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i?.issuance_date || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i?.purpose || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}