import React, { useState, useEffect, useCallback } from 'react';
import EditReceivedItemModal from './EditReceivedItemModal.jsx';
import DeleteReceivedItemModal from './DeleteReceivedItemModal.jsx';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function ReceivedStockTable({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [editingRow, setEditingRow] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingRow, setDeletingRow] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/received-history?per_page=50`);
      const json = await res.json();
      setHistory(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error('Failed to fetch received history:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const openEdit = (row) => {
    setEditingRow(row);
    setIsEditOpen(true);
  };

  const openDelete = (row) => {
    setDeletingRow(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Received Stock</h2>

      {loadingHistory && <p className="receive-table__loading">Loading...</p>}

      {!loadingHistory && (
        <div className="receive-table-wrapper">
          <table className="receive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item Name</th>
                <th>Item Code</th>
                <th>Reference No.</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="10" className="receive-table__empty">
                    No received records found.
                  </td>
                </tr>
              ) : (
                history.map(row => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td className="receive-table__date">
                      {row.received_at ? new Date(row.received_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${row.type === 'Asset' ? 'badge--asset' : 'badge--consumable'}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="receive-table__item-name">{row.item_name}</td>
                    <td className="receive-table__item-code">{row.item_code}</td>
                    <td className="receive-table__reference">{row.reference_no}</td>
                    <td className="receive-table__qty">{row.quantity}</td>
                    <td className="receive-table__unit">{row.unit_of_measure || '-'}</td>
                    <td>₱{Number(row.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="receive-table__total">
                      ₱{Number(row.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="receive-table__actions">
                      <button type="button" className="receive-action-btn" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="receive-action-btn receive-action-btn--danger" onClick={() => openDelete(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <EditReceivedItemModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        row={editingRow}
        onSaved={fetchHistory}
      />

      <DeleteReceivedItemModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        row={deletingRow}
        onDeleted={fetchHistory}
      />
    </div>
  );
}