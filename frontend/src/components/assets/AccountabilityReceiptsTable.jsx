import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function AccountabilityReceiptsTable({ refreshKey }) {
  const [receipts, setReceipts] = useState([]);

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/v1/accountability/receipts');
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load accountability receipts:', err);
      setReceipts([]);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts, refreshKey]);

  const rows = receipts.flatMap(receipt => {
    const lines = Array.isArray(receipt?.lines) ? receipt.lines : [];
    return lines.map((line, index) => ({ line, receipt, isFirst: index === 0, count: lines.length }));
  });

  return (
    <div className="table-section">
      <h3>Issued Accountability Receipts (PAR / ICS)</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Document Number</th>
            <th>Type</th>
            <th>Item Name</th>
            <th>Serial Number</th>
            <th>Accessories</th>
            <th>Issued To</th>
            <th>Date Issued</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="7" className="empty-row">No accountability receipts generated yet.</td></tr>
          ) : (
            rows.map(({ line, receipt, isFirst, count }) => (
              <tr key={line.id}>
                <td className="mono-text bold-text">
                  {isFirst ? receipt.document_number : ''}
                  {isFirst && count > 1 && <span className="badge-multi">{count} items</span>}
                </td>
                <td>
                  {isFirst && (
                    <span className={receipt.receipt_type === 'PAR' ? 'badge-par' : 'badge-ics'}>
                      {receipt.receipt_type}
                    </span>
                  )}
                </td>
                <td>{line.serialized_asset?.item?.name || 'N/A'}</td>
                <td className="mono-text">{line.serialized_asset?.serial_number || 'N/A'}</td>
                <td>{line.accessories_notes || '—'}</td>
                <td>{isFirst ? (receipt.user?.name || 'N/A') : ''}</td>
                <td>{isFirst ? receipt.date_issued : ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}