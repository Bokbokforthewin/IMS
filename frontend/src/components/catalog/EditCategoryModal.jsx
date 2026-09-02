import React from 'react';
import Modal from '../Modal.jsx';
import './CatalogModals.css';

export default function EditCategoryModal({ isOpen, onClose, editingCategory, setEditingCategory, handleUpdateCategory }) {
  return (
    <Modal isOpen={isOpen} title="Edit Category" onClose={onClose}>
      <form onSubmit={handleUpdateCategory}>
        <div className="modal-form-group">
          <label>Category Name</label><br />
          <input 
            type="text" 
            required 
            value={editingCategory.name || ''} 
            onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} 
          />
        </div>
        <div className="modal-form-group mb-large">
          <label>Description</label><br />
          <textarea 
            rows="3"
            value={editingCategory.description || ''} 
            onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })} 
          />
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-modal btn-cancel">Cancel</button>
          <button type="submit" className="btn-modal btn-primary">Update Changes</button>
        </div>
      </form>
    </Modal>
  );
}