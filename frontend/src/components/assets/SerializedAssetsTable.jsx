import React, { useState } from 'react';
import IssueAssetModal from './IssueAssetModal.jsx';

export default function SerializedAssetsTable({ serializedAssets, handleApiCall, refreshData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialAssetId, setInitialAssetId] = useState(null);

  const handleOpenModal = (asset) => {
    setInitialAssetId(asset.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInitialAssetId(null);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setInitialAssetId(null);
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
          {(!serializedAssets || serializedAssets.length === 0) ? (
            <tr>
              <td colSpan="6" className="empty-row">No serialized assets found.</td>
            </tr>
          ) : (
            serializedAssets.map(a => {
              const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? a.item?.cost ?? a.item?.price ?? 0);
              const type = cost >= 50000 ? 'PAR' : 'ICS';
              const isAssigned = a.status === 'Assigned';

              return (
                <tr key={a.id}>
                  <td>{a.item?.name || 'N/A'}</td>
                  <td className="mono-text">{a.serial_number}</td>
                  <td className="bold-text">{type}</td>
                  <td>₱{cost.toLocaleString()}</td>
                  <td>
                    <span className={isAssigned ? 'badge-assigned' : 'badge-available'}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === 'Available' ? (
                      <button
                        onClick={() => handleOpenModal(a)}
                        className="btn-issue"
                        style={{ padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Issue
                      </button>
                    ) : (
                      <span style={{ color: '#888', fontStyle: 'italic' }}>{a.status}</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <IssueAssetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        serializedAssets={serializedAssets}
        initialAssetId={initialAssetId}
        handleApiCall={handleApiCall}
        onSuccess={handleSuccess}
      />
    </div>
  );
}