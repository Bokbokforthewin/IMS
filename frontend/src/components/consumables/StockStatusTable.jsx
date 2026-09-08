import React, { useState } from 'react';
import EditReorderLevelModal from './EditReorderLevelModal.jsx';
import DeleteItemModal from './DeleteItemModal.jsx';
import IssueConsumablesModal from './IssueConsumablesModal.jsx';

function statusBadgeClass(status) {
  if (status === 'Out of Stock') return 'status-badge status-badge--empty';
  if (status.includes('Low')) return 'status-badge status-badge--low';
  return 'status-badge status-badge--ok';
}

export default function StockStatusTable({ stockStatus, onChanged, handleApiCall, onIssued }) {
  const safeStock = Array.isArray(stockStatus) ? stockStatus : [];

  const [editingItem, setEditingItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [issuingItem, setIssuingItem] = useState(null);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const openEdit = (stock) => {
    setEditingItem(stock);
    setIsEditOpen(true);
  };

  const openDelete = (stock) => {
    setDeletingItem(stock);
    setIsDeleteOpen(true);
  };

  const openIssue = (stock) => {
    setIssuingItem(stock);
    setIsIssueOpen(true);
  };

  const handleChanged = () => {
    if (typeof onChanged === 'function') onChanged();
  };

  const handleIssued = () => {
    if (typeof onIssued === 'function') onIssued();
  };

  return (
    <div className="consumables-panel">
      <h3 className="consumables-panel__title">Consumables Stock Level &amp; Reorder Status</h3>
      <div className="consumables-table-wrapper">
        <table className="consumables-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name &amp; Details</th>
              <th>Unit Cost</th>
              <th>Available Qty</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeStock.length === 0 ? (
              <tr>
                <td colSpan="7" className="consumables-table__empty">No stock status data available.</td>
              </tr>
            ) : (
              safeStock.map(stock => (
                <tr key={stock.id}>
                  <td className="consumables-table__item-code">{stock.item_code}</td>
                  <td>
                    <strong>{stock.name}</strong> ({stock.unit_of_measure})
                    {(stock.item_brand || stock.item_specifications || stock.item_type) && (
                      <div className="consumables-table__item-meta">
                        {[stock.item_brand, stock.item_specifications, stock.item_type].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </td>
                  <td>
                    {stock.cost ? `₱${Number(stock.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'}
                  </td>
                  <td className="consumables-table__qty">{stock.total_stock}</td>
                  <td>{stock.reorder_level}</td>
                  <td>
                    <span className={statusBadgeClass(stock.status)}>{stock.status}</span>
                  </td>
                  <td className="consumables-table__actions">
                    <button
                      type="button"
                      className="consumables-action-btn consumables-action-btn--primary"
                      onClick={() => openIssue(stock)}
                      disabled={!stock.total_stock || stock.total_stock <= 0}
                    >
                      Issue
                    </button>
                    <button type="button" className="consumables-action-btn" onClick={() => openEdit(stock)}>
                      Edit
                    </button>
                    <button type="button" className="consumables-action-btn consumables-action-btn--danger" onClick={() => openDelete(stock)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <IssueConsumablesModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        item={issuingItem}
        handleApiCall={handleApiCall}
        onSuccess={handleIssued}
      />

      <EditReorderLevelModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        item={editingItem}
        onSaved={handleChanged}
      />

      <DeleteItemModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        item={deletingItem}
        onDeleted={handleChanged}
      />
    </div>
  );
}