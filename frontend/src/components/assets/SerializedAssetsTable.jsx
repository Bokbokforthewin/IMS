import React, { useState, useEffect } from 'react';
import IssueAssetModal from './IssueAssetModal.jsx';
import EditAssetStatusModal from './EditAssetStatusModal.jsx';

function statusBadgeClass(status) {
  if (status === 'Available') return 'badge-available';
  if (status === 'Assigned') return 'badge-assigned';
  if (status === 'Under Repair') return 'badge-repair';
  if (status === 'Condemned') return 'badge-condemned';
  return '';
}

export default function SerializedAssetsTable({ serializedAssets, handleApiCall, refreshData }) {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [initialAssetId, setInitialAssetId] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // 1. Maintain a local copy of assets for immediate UI updates
  const [localAssets, setLocalAssets] = useState(serializedAssets || []);

  // 2. Keep local state synchronized if props change from outside
  useEffect(() => {
    setLocalAssets(serializedAssets || []);
  }, [serializedAssets]);

  const handleOpenIssueModal = (asset) => {
    setInitialAssetId(asset.id);
    setIsIssueModalOpen(true);
  };

  const handleCloseIssueModal = () => {
    setIsIssueModalOpen(false);
    setInitialAssetId(null);
  };

  const handleIssueSuccess = () => {
    setIsIssueModalOpen(false);
    setInitialAssetId(null);
    if (typeof refreshData === 'function') refreshData();
  };

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAsset(null);
  };

  // 3. Receive the updated asset back and patch it locally right away
  const handleEditSaved = (updatedAsset) => {
    if (updatedAsset && updatedAsset.id) {
      setLocalAssets(prev =>
        prev.map(a => (a.id === updatedAsset.id ? updatedAsset : a))
      );
    }
    // Also trigger parent refresh in the background to keep everything aligned
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="table-section">
      <h3>Serialized Assets Inventory Status</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Serial Number</th>
            <th>Type</th>
            <th>Cost</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(!localAssets || localAssets.length === 0) ? (
            <tr>
              <td colSpan="6" className="empty-row">No serialized assets found.</td>
            </tr>
          ) : (
            localAssets.map(a => {
              const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? a.item?.cost ?? a.item?.price ?? 0);
              const type = cost >= 50000 ? 'PAR' : 'ICS';

              return (
                <tr key={a.id}>
                  <td>{a.item?.name || 'N/A'}</td>
                  <td className="mono-text">{a.serial_number}</td>
                  <td className="bold-text">{type}</td>
                  <td>₱{cost.toLocaleString()}</td>
                  <td>
                    <span className={statusBadgeClass(a.status)}>{a.status}</span>
                    {a.condition_remarks && (a.status === 'Under Repair' || a.status === 'Condemned') && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                        {a.condition_remarks}
                      </div>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    {a.status === 'Available' && (
                      <button
                        onClick={() => handleOpenIssueModal(a)}
                        className="btn-issue"
                        style={{ padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Issue
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(a)}
                      className="btn-edit"
                      style={{ padding: '6px 12px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <IssueAssetModal
        isOpen={isIssueModalOpen}
        onClose={handleCloseIssueModal}
        serializedAssets={localAssets}
        initialAssetId={initialAssetId}
        handleApiCall={handleApiCall}
        onSuccess={handleIssueSuccess}
      />

      <EditAssetStatusModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        asset={editingAsset}
        onSaved={handleEditSaved}
      />
    </div>
  );
}