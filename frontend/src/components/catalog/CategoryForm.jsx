import React from 'react';
import './CatalogPage.css';

export default function CategoryForm({ categoryForm, setCategoryForm, handleApiCall }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleApiCall('/categories', categoryForm, () => setCategoryForm({ name: '', description: '' }));
  };

  return (
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category Name</label><br />
          <input 
            type="text" 
            required 
            value={categoryForm.name || ''} 
            onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
          />
        </div>
        <div className="form-group">
          <label>Description</label><br />
          <textarea 
            rows="3"
            placeholder="Brief category description..."
            value={categoryForm.description || ''} 
            onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} 
          />
        </div>
        <button type="submit" className="btn-submit">Save Category</button>
      </form>
  );
}