import React from 'react';
import Modal from '../Modal.jsx';
import AccountabilityForm from './AccountabilityForm';

export default function IssueAssetModal({
  isOpen,
  onClose,
  serializedAssets,
  initialAssetId,
  handleApiCall,
  onSuccess
}) {
  return (
    <Modal isOpen={isOpen} title="Issue Asset & Generate Document" onClose={onClose}>
      <AccountabilityForm
        serializedAssets={serializedAssets}
        initialAssetId={initialAssetId}
        handleApiCall={handleApiCall}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}