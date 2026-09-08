import React from 'react';
import Modal from '../Modal.jsx';
import './CatalogPage.css';

export default function DeleteItemModal({ isOpen, onClose, itemToDelete, handleDeleteItem }) {
  return (
    <Modal isOpen={isOpen} title="Confirm Deletion" onClose={onClose}>
      <div>
        <p className="modal-text">
          Are you sure you want to delete the following catalog item?
        </p>
        {itemToDelete && (
          <div className="modal-info-box">
            <strong>Item Code:</strong> <span className="monospace">{itemToDelete.item_code}</span><br />
            <strong>Name:</strong> {itemToDelete.name}<br />
            <span className="info-subtext">
              <strong>Category:</strong> {itemToDelete.category?.name || 'N/A'}
            </span>
          </div>
        )}
        <div className="modal-actions">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-modal btn-danger"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleDeleteItem} 
            className="btn-modal btn-cancel"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}