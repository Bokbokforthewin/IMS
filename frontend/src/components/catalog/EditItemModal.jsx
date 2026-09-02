import React from 'react';
import Modal from '../Modal.jsx';
import './CatalogModals.css';

export default function EditItemModal({ isOpen, onClose, editingItem, setEditingItem, categories, handleUpdateItem }) {
  return (
    <Modal isOpen={isOpen} title="Edit Catalog Item" onClose={onClose}>
      <form onSubmit={handleUpdateItem}>
        <div className="modal-form-group">
          <label>Category</label><br />
          <select 
            required 
            value={editingItem.category_id || ''} 
            onChange={e => setEditingItem({...editingItem, category_id: e.target.value})}
          >
            <option value="">Select Category...</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="modal-form-group">
          <label>Item Name</label><br />
          <input 
            type="text" 
            required 
            value={editingItem.name || ''} 
            onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
          />
        </div>

        <div className="modal-form-row">
          <div className="modal-form-group flex-1">
            <label>Brand</label><br />
            <input 
              type="text" 
              value={editingItem.brand || ''} 
              onChange={e => setEditingItem({...editingItem, brand: e.target.value})} 
            />
          </div>
          <div className="modal-form-group flex-1">
            <label>Specifications</label><br />
            <input 
              type="text" 
              value={editingItem.specifications || ''} 
              onChange={e => setEditingItem({...editingItem, specifications: e.target.value})} 
            />
          </div>
        </div>

        <div className="modal-form-group">
          <label>Item Type</label><br />
          <input 
            type="text" 
            value={editingItem.type || ''} 
            onChange={e => setEditingItem({...editingItem, type: e.target.value})} 
          />
        </div>

        <div className="modal-form-group">
          <label>Unit of Measure</label><br />
          <input 
            type="text" 
            required 
            value={editingItem.unit_of_measure || ''} 
            onChange={e => setEditingItem({...editingItem, unit_of_measure: e.target.value})} 
          />
        </div>

        <div className="modal-form-group">
          <label>Reorder Level</label><br />
          <input 
            type="number" 
            required={!editingItem.is_serialized}
            disabled={editingItem.is_serialized}
            value={editingItem.is_serialized ? '1' : (editingItem.reorder_level || '')} 
            onChange={e => setEditingItem({...editingItem, reorder_level: e.target.value})} 
            style={{ backgroundColor: editingItem.is_serialized ? '#f0f0f0' : '#fff' }}
          />
        </div>

        <div className="modal-form-group mb-large">
          <label className="modal-serialized-toggle">
            <input
              type="checkbox"
              checked={!!editingItem.is_serialized}
              onChange={(e) => {
                const isChecked = e.target.checked;

                setEditingItem({
                  ...editingItem,
                  is_serialized: isChecked,
                  reorder_level: isChecked ? '1' : '',
                });
              }}
            />

            <span
              className="modal-serialized-toggle__box"
              aria-hidden="true"
            />

            <span className="modal-serialized-toggle__content">
              <strong>Serialized Asset</strong>
              <small>
                Enable this for equipment that requires individual asset tracking.
              </small>
            </span>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-modal btn-cancel">Cancel</button>
          <button type="submit" className="btn-modal btn-primary">Update Item</button>
        </div>
      </form>
    </Modal>
  );
}