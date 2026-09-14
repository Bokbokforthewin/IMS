import React from 'react';

export default function ReceiveForm({ items, receiveForm, setReceiveForm, handleApiCall, onSuccess }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    handleApiCall('/stocks/receive', receiveForm, () => {
      setReceiveForm({
        item_id: '',
        unit_cost: '',
        arrival_date: '',
        is_serialized: false,
        serial_number: '',
        model: '',
        manufacturer_name: '',
        country_of_origin: '',
        estimated_useful_life: '',
        quantity: ''
      });
      if (onSuccess) onSuccess();
    });
  };

  const selectedItem = (items || []).find(i => i.id == receiveForm.item_id);

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">3. Receive Stock / Inbound Delivery</h2>
      <form className="receive-form" onSubmit={handleSubmit}>

        <div className="receive-field">
          <label>Select Catalog Item</label>
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
          >
            <option value="">Select item...</option>
            {(items || []).map(i => {
              const brandText = i.brand ? `[${i.brand}]` : '';
              const specText = i.specifications ? `(${i.specifications})` : '';
              const typeText = i.type ? `- ${i.type}` : '';
              return (
                <option key={i.id} value={i.id}>
                  {i.name} {brandText} {specText} {typeText} — {i.is_serialized ? 'Serialized' : `Consumable (${i.unit_of_measure})`}
                </option>
              );
            })}
          </select>

          {selectedItem && (
            <div className="receive-item-preview">
              <b>Item Code:</b> {selectedItem.item_code} | <b>Brand:</b> {selectedItem.brand || 'N/A'} | <b>Specs:</b> {selectedItem.specifications || 'N/A'} | <b>Unit:</b> {selectedItem.unit_of_measure}
            </div>
          )}
        </div>

        <div className="receive-field">
          <label>Unit Cost (₱)</label>
          <input
            type="number"
            step="0.01"
            required
            value={receiveForm.unit_cost || ''}
            onChange={e => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })}
          />
        </div>

        <div className="receive-field">
          <label>Arrival Date</label>
          <input
            type="date"
            required
            value={receiveForm.arrival_date || ''}
            onChange={e => setReceiveForm({ ...receiveForm, arrival_date: e.target.value })}
          />
        </div>

        {receiveForm.is_serialized === false && (

        <div className="receive-field">
          <label>Quantity</label>
          <input
            type="number"
            required
            value={receiveForm.quantity || ''}
            onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
          />
        </div>
        )}

        {receiveForm.is_serialized ? (
          <div className="receive-subpanel">
            <h3 className="receive-subpanel__title">Serialized Fields</h3>

            <div className="receive-field">
              <label>Serial Number</label>
              <small>Required for PAR assets, optional for ICS items.</small>
              <input
                type="text"
                placeholder="Serial Number (if applicable)"
                value={receiveForm.serial_number || ''}
                onChange={e => setReceiveForm({ ...receiveForm, serial_number: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Model (Optional)</label>
              <input
                type="text"
                placeholder="Model"
                value={receiveForm.model || ''}
                onChange={e => setReceiveForm({ ...receiveForm, model: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Name of Manufacturer (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Epson"
                value={receiveForm.manufacturer_name || ''}
                onChange={e => setReceiveForm({ ...receiveForm, manufacturer_name: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Country of Origin (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Japan"
                value={receiveForm.country_of_origin || ''}
                onChange={e => setReceiveForm({ ...receiveForm, country_of_origin: e.target.value })}
              />
            </div>

            <div className="receive-field">
              <label>Estimated Useful Life (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 5 Years"
                value={receiveForm.estimated_useful_life || ''}
                onChange={e => setReceiveForm({ ...receiveForm, estimated_useful_life: e.target.value })}
              />
              <small>This updates the item's useful life catalog-wide, not just this unit.</small>
            </div>
          </div>
        ) : null}

        <button type="submit" className="receive-submit-btn">
          Process Inbound Stock
        </button>
      </form>
    </div>
  );
}