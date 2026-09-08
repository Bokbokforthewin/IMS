import React from 'react';
import Modal from '../Modal.jsx';
import './CatalogPage.css';

export default function DeleteCategoryModal({ isOpen, onClose, categoryToDelete, handleDeleteCategory }) {
  return (
    <Modal isOpen={isOpen} title="Confirm Deletion" onClose={onClose}>
      <div>
        <p className="modal-text">
          Are you sure you want to delete the following category?
        </p>
        {categoryToDelete && (
          <div className="modal-info-box">
            <strong>Name:</strong> {categoryToDelete.name}<br />
            <span className="info-subtext">
              <strong>Description:</strong> {categoryToDelete.description || 'N/A'}
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
            onClick={handleDeleteCategory} 
            className="btn-modal btn-neutral"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}