import React from 'react';

export default function CatalogPage({ 
  categories, 
  categoryForm, 
  setCategoryForm, 
  items, 
  itemForm, 
  setItemForm, 
  handleApiCall 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* 1. Add Category Form */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', background: '#fff' }}>
          <h2>1. Add Category</h2>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            handleApiCall('/categories', categoryForm, () => setCategoryForm({ name: '', description: '' })); 
          }}>
            <div style={{ marginBottom: '10px' }}>
              <label>Category Name</label><br />
              <input 
                type="text" 
                required 
                value={categoryForm.name || ''} 
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Description</label><br />
              <textarea 
                rows="3"
                placeholder="Brief category description..."
                value={categoryForm.description || ''} 
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>Save Category</button>
          </form>
        </div>

        {/* 2. Add Catalog Item Form */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', background: '#fff' }}>
          <h2>2. Add Catalog Item</h2>
          <form onSubmit={(e) => { 
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
          }}>
            <div style={{ marginBottom: '10px' }}>
              <label>Category</label><br />
              <select 
                required 
                value={itemForm.category_id || ''} 
                onChange={e => setItemForm({...itemForm, category_id: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="">Select Category...</option>
                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Item Name</label><br />
              <input 
                type="text" 
                required 
                placeholder="e.g., Lenovo Thinkpad, Epson l5290"
                value={itemForm.name || ''} 
                onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>Brand (Optional)</label><br />
                <input 
                  type="text" 
                  placeholder="e.g., Advance, Dell, HP" 
                  value={itemForm.brand || ''} 
                  onChange={e => setItemForm({...itemForm, brand: e.target.value})} 
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Specifications (Optional)</label><br />
                <input 
                  type="text" 
                  placeholder="e.g., A4, 70gsm, Core i5" 
                  value={itemForm.specifications || ''} 
                  onChange={e => setItemForm({...itemForm, specifications: e.target.value})} 
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Item Type (Optional)</label><br />
              <input 
                type="text" 
                placeholder="e.g., Ink, Paper, Hardware" 
                value={itemForm.type || ''} 
                onChange={e => setItemForm({...itemForm, type: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Unit of Measure</label><br />
              <input 
                type="text" 
                required 
                placeholder="pcs / box / ream / unit" 
                value={itemForm.unit_of_measure || ''} 
                onChange={e => setItemForm({...itemForm, unit_of_measure: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Reorder Level</label><br />
              <input 
                type="number" 
                required={!itemForm.is_serialized}
                disabled={itemForm.is_serialized}
                value={itemForm.is_serialized ? '1' : (itemForm.reorder_level || '')} 
                onChange={e => setItemForm({...itemForm, reorder_level: e.target.value})} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  backgroundColor: itemForm.is_serialized ? '#f0f0f0' : '#fff',
                  cursor: itemForm.is_serialized ? 'not-allowed' : 'text'
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                <input 
                  type="checkbox" 
                  checked={!!itemForm.is_serialized} 
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setItemForm({
                      ...itemForm, 
                      is_serialized: isChecked,
                      reorder_level: isChecked ? '1' : ''
                    });
                  }} 
                />{' '}
                Is Serialized Asset? (Equipment)
              </label>
            </div>
            
            <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>Save Item</button>
          </form>
        </div>

      </div>

      {/* Catalog Items Table */}
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', background: '#fff' }}>
        <h3>Existing Catalog Items & Generated Codes</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item Code</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Item Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Brand</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Specifications</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Unit</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tracking Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {(!items || items.length === 0) ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '15px', color: '#777' }}>No items created yet.</td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{item.item_code}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{item.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.category?.name || 'N/A'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.brand || '—'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.specifications || '—'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.type || '—'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.unit_of_measure}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {item.is_serialized ? 'Serialized Asset' : 'Consumable / Bulk'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.reorder_level}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}