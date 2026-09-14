import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function TransferHistoryTable({ refreshKey }) {
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/asset-transfers`);
      const rawData = response.data;
      const items = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.transfers || []);
      setTransfers(items);
    } catch (err) {
      console.error('Failed to load transfer/return records:', err);
      setErrorMessage('Could not load transfer history logs. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers, refreshKey]);

  return (
    <div className="transfer-panel">
      <h3 className="transfer-panel__title">Return &amp; Transfer History Logs</h3>

      {errorMessage && (
        <div className="transfer-alert transfer-alert--error">{errorMessage}</div>
      )}

      <div className="transfer-table-wrapper">
        <table className="transfer-table">
          <thead>
            <tr>
              <th>Doc Number</th>
              <th>Type</th>
              <th>Item &amp; SN</th>
              <th>Route</th>
              <th>Description</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="transfer-table__empty">Loading records...</td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td colSpan="7" className="transfer-table__empty">No return or transfer records found.</td>
              </tr>
            ) : (
              transfers.map(t => (
                <tr key={t.id}>
                  <td className="transfer-table__doc">{t.document_number || 'N/A'}</td>
                  <td>
                    <span className={`transfer-badge ${t.transfer_type === 'RETURN' ? 'transfer-badge--return' : 'transfer-badge--transfer'}`}>
                      {t.transfer_type}
                    </span>
                  </td>
                  <td>
                    {t.serialized_asset?.item?.name || 'N/A'} <br />
                    <span className="transfer-table__sn">SN: {t.serialized_asset?.serial_number || 'N/A'}</span>
                  </td>
                  <td className="transfer-table__route">
                    {t.transferred_from?.name || 'N/A'} ➔ {t.transferred_to?.name || 'N/A'}
                  </td>
                  <td>{t.description}</td>
                  <td>{t.reason}</td>
                  <td>{t.transfer_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}