import React from 'react';
import './CatalogForms.css';

export default function ItemForm({ itemForm, setItemForm, categories, handleApiCall }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleApiCall('/items', itemForm, () => setItemForm({ 
      category_id: '', 
      name: '', 
      brand: '', 
      specifications: '', 
      type: '', 
      unit_of_measure: '', 
      reorder_level: '', 
      is_serialized: false 
    }));
  };

  return (
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category</label><br />
          <select 
            required 
            value={itemForm.category_id || ''} 
            onChange={e => setItemForm({...itemForm, category_id: e.target.value})}
          >
            <option value="">Select Category...</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Item Name</label><br />
          <input 
            type="text" 
            required 
            placeholder="e.g., Lenovo Thinkpad, Epson l5290"
            value={itemForm.name || ''} 
            onChange={e => setItemForm({...itemForm, name: e.target.value})} 
          />
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label>Brand (Optional)</label><br />
            <input 
              type="text" 
              placeholder="e.g., Advance, Dell, HP" 
              value={itemForm.brand || ''} 
              onChange={e => setItemForm({...itemForm, brand: e.target.value})} 
            />
          </div>
          <div className="form-group flex-1">
            <label>Specifications (Optional)</label><br />
            <input 
              type="text" 
              placeholder="e.g., A4, 70gsm, Core i5" 
              value={itemForm.specifications || ''} 
              onChange={e => setItemForm({...itemForm, specifications: e.target.value})} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Item Type (Optional)</label><br />
          <input 
            type="text" 
            placeholder="e.g., Ink, Paper, Hardware" 
            value={itemForm.type || ''} 
            onChange={e => setItemForm({...itemForm, type: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Unit of Measure</label><br />
          <input 
            type="text" 
            required 
            placeholder="pcs / box / ream / unit" 
            value={itemForm.unit_of_measure || ''} 
            onChange={e => setItemForm({...itemForm, unit_of_measure: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Reorder Level</label><br />
          <input 
            type="number" 
            required={!itemForm.is_serialized}
            disabled={itemForm.is_serialized}
            value={itemForm.is_serialized ? '1' : (itemForm.reorder_level || '')} 
            onChange={e => setItemForm({...itemForm, reorder_level: e.target.value})} 
            className={itemForm.is_serialized ? 'input-disabled' : 'input-enabled'}
          />
        </div>

        <div className="form-group">
          <label className="serialized-toggle">
            <input
              type="checkbox"
              checked={!!itemForm.is_serialized}
              onChange={(e) => {
                const isChecked = e.target.checked;

                setItemForm({
                  ...itemForm,
                  is_serialized: isChecked,
                  reorder_level: isChecked ? '1' : '',
                });
              }}
            />

            <span className="serialized-toggle__box" aria-hidden="true" />

            <span className="serialized-toggle__content">
              <strong>Serialized Asset</strong>
              <small>
                Enable this for equipment that requires individual asset tracking.
              </small>
            </span>
          </label>
        </div>
        
        <button type="submit" className="btn-submit">Save Item</button>
      </form>
  );
}