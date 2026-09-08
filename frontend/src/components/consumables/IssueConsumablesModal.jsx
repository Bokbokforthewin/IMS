import React from 'react';
import Modal from '../Modal.jsx';
import IssueConsumablesForm from './IssueConsumablesForm.jsx';

export default function IssueConsumablesModal({ isOpen, onClose, item, handleApiCall, onSuccess }) {
  return (
    <Modal isOpen={isOpen} title={item ? `Issue Consumable — ${item.name}` : 'Issue Consumable'} onClose={onClose}>
      <IssueConsumablesForm
        item={item}
        handleApiCall={handleApiCall}
        onSuccess={() => {
          if (typeof onSuccess === 'function') onSuccess();
          onClose();
        }}
      />
    </Modal>
  );
}