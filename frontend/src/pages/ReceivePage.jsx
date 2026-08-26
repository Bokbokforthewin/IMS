import React from 'react';

export default function ReceivePage({ items, receiveForm, setReceiveForm, handleApiCall }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '600px', margin: '0 auto', background: '#fff' }}>
      <h2>3. Receive Stock / Inbound Delivery</h2>
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        handleApiCall('/stocks/receive', receiveForm, () => setReceiveForm({
          item_id: '',
          unit_cost: '',
          arrival_date: '',
          is_serialized: false,
          serial_number: '',
          brand: '',
          model: '',
          specifications: '',
          quantity: ''
        })); 
      }}>

        <div style={{ marginBottom: '15px' }}>
          <label>Select Catalog Item</label><br />
          <select 
            required 
            value={receiveForm.item_id || ''} 
            onChange={e => {
              const selected = (items || []).find(i => i.id == e.target.value);
              setReceiveForm({
                ...receiveForm, 
                item_id: e.target.value, 
                is_serialized: selected ? !!selected.is_serialized : false
              });
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select item...</option>
            {(items || []).map(i => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.is_serialized ? 'Serialized' : 'Consumable'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Unit Cost (₱)</label><br />
          <input 
            type="number" 
            step="0.01" 
            required 
            value={receiveForm.unit_cost || ''} 
            onChange={e => setReceiveForm({...receiveForm, unit_cost: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Arrival Date</label><br />
          <input 
            type="date" 
            required
            value={receiveForm.arrival_date || ''} 
            onChange={e => setReceiveForm({...receiveForm, arrival_date: e.target.value})} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {receiveForm.is_serialized ? (
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #eee' }}>
            <h3 style={{ marginTop: '0', fontSize: '16px' }}>Serialized Fields</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Serial Number</label><br />
              <input 
                type="text" 
                placeholder="Serial Number" 
                required 
                value={receiveForm.serial_number || ''} 
                onChange={e => setReceiveForm({...receiveForm, serial_number: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>Brand</label><br />
              <input 
                type="text" 
                placeholder="Brand" 
                required 
                value={receiveForm.brand || ''} 
                onChange={e => setReceiveForm({...receiveForm, brand: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>

            <div>
              <label>Model</label><br />
              <input 
                type="text" 
                placeholder="Model" 
                required 
                value={receiveForm.model || ''} 
                onChange={e => setReceiveForm({...receiveForm, model: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #eee' }}>
            <h3 style={{ marginTop: '0', fontSize: '16px' }}>Consumable / Bulk Quantity Details</h3>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label>Brand (Optional)</label><br />
                <input 
                  type="text" 
                  placeholder="e.g., Advance, HP, Pioneer" 
                  value={receiveForm.brand || ''} 
                  onChange={e => setReceiveForm({...receiveForm, brand: e.target.value})} 
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Specifications / Size (Optional)</label><br />
                <input 
                  type="text" 
                  placeholder="e.g., A4, Short, 70gsm" 
                  value={receiveForm.specifications || ''} 
                  onChange={e => setReceiveForm({...receiveForm, specifications: e.target.value})} 
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
            </div>

            <div>
              <label>Quantity</label><br />
              <input 
                type="number" 
                placeholder="Quantity" 
                required 
                value={receiveForm.quantity || ''} 
                onChange={e => setReceiveForm({...receiveForm, quantity: e.target.value})} 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
          </div>
        )}

        <button type="submit" style={{ padding: '10px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Process Inbound Stock
        </button>
      </form>
    </div>
  );
}