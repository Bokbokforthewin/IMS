import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api/v1';

export default function AccountabilityReceiptsTable({ refreshKey }) {
  const [receipts, setReceipts] = useState([]);

  const fetchReceipts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/accountability/receipts`);
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
            <th>Document</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="8" className="empty-row">No accountability receipts generated yet.</td></tr>
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
                <td>
                  {isFirst && (
                    <a
                      href={`${API_BASE_URL}/accountability/receipts/${receipt.id}/download-excel`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-download"
                      aria-label="Download Excel receipt"
                      style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} 
                      title="Download Excel"
                    >
                      <svg 
                      xmlns="http://w3.org" 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Excel</span>
                    </a>
                  )}
                  <a 
                    href={`${API_BASE_URL}/accountability/receipt-lines/${line.id}/download-tag-pdf`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-download" 
                    style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} 
                    aria-label="Download PDF"
                  >
                    <svg 
                      xmlns="http://w3.org" 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>PDF</span>
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}