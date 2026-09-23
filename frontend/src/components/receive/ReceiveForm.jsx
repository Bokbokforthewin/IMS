import React, { useEffect, useState } from 'react';
import {
  Field, FieldLabel, FieldDescription, FieldGroup, FieldSet, FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SerialNumberScanner from './SerialNumberScanner.jsx';

export default function ReceiveForm({ items, receiveForm, setReceiveForm, handleApiCall, onSuccess }) {
  const [serials, setSerials] = useState([]);

  const itemOptions = (items || []).map((i) => ({
    value: String(i.id),
    label: `${i.name}${i.brand ? ` [${i.brand}]` : ''} — ${i.tracking_type === 'asset' ? 'Asset' : `Consumable (${i.unit_of_measure})`}`,
  }));

  const selectedItem = (items || []).find((i) => i.id == receiveForm.item_id);
  const isAsset = selectedItem?.tracking_type === 'asset';
  const quantity = Number(receiveForm.quantity) || 0;

  useEffect(() => {
    setSerials([]);
  }, [receiveForm.item_id, receiveForm.quantity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!receiveForm.item_id) return;
    if (isAsset && serials.length !== quantity) return;

    // Use !! to strictly cast undefined to false so Laravel's validation doesn't fail
    const payload = isAsset
      ? { 
          ...receiveForm, 
          has_property_number: !!receiveForm.has_property_number, 
          serial_numbers: serials 
        }
      : receiveForm;

    handleApiCall('/stocks/receive', payload, () => {
      setReceiveForm({
        item_id: '', unit_cost: '', arrival_date: '', quantity: '',
        has_property_number: false, model: '', manufacturer_name: '', country_of_origin: '',
      });
      setSerials([]);
      if (onSuccess) onSuccess();
    });
  };

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Receive Stock / Inbound Delivery</h2>
      <form className="receive-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="item_id">Select Catalog Item *</FieldLabel>
            <Select
              items={itemOptions}
              value={receiveForm.item_id ? String(receiveForm.item_id) : ''}
              onValueChange={(value) => setReceiveForm({ ...receiveForm, item_id: value })}
            >
              <SelectTrigger id="item_id" className="w-full">
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {itemOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="unit_cost">Unit Cost (₱) *</FieldLabel>
            <Input
              id="unit_cost" type="number" step="0.01" min="0" required
              value={receiveForm.unit_cost || ''}
              onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="arrival_date">Arrival Date *</FieldLabel>
            <Input
              id="arrival_date" type="date" required
              value={receiveForm.arrival_date || ''}
              onChange={(e) => setReceiveForm({ ...receiveForm, arrival_date: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="quantity">Quantity *</FieldLabel>
            <Input
              id="quantity" type="number" min="1" required
              value={receiveForm.quantity || ''}
              onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
            />
            <FieldDescription>How many identical units arrived in this delivery.</FieldDescription>
          </Field>

          {isAsset && (
            <FieldSet>
              <FieldLegend>Asset Stock Details</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Switch
                    id="has_property_number"
                    checked={!!receiveForm.has_property_number}
                    onCheckedChange={(checked) => setReceiveForm({ ...receiveForm, has_property_number: checked })}
                  />
                  <FieldLabel htmlFor="has_property_number">Assign Property Number</FieldLabel>
                </Field>
                <FieldDescription>
                  Turn on to automatically assign a property number. Leave off if the asset only requires a serial number.
                </FieldDescription>

                <Field>
                  <FieldLabel htmlFor="model">Model (Optional)</FieldLabel>
                  <Input id="model" value={receiveForm.model || ''} onChange={(e) => setReceiveForm({ ...receiveForm, model: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="manufacturer_name">Manufacturer (Optional)</FieldLabel>
                  <Input id="manufacturer_name" value={receiveForm.manufacturer_name || ''} onChange={(e) => setReceiveForm({ ...receiveForm, manufacturer_name: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="country_of_origin">Country of Origin (Optional)</FieldLabel>
                  <Input id="country_of_origin" value={receiveForm.country_of_origin || ''} onChange={(e) => setReceiveForm({ ...receiveForm, country_of_origin: e.target.value })} />
                </Field>

                {quantity > 0 && (
                  <Field>
                    <FieldLabel>Serial Numbers *</FieldLabel>
                    <SerialNumberScanner quantity={quantity} serials={serials} onChange={setSerials} />
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
          )}
        </FieldGroup>

        <Button type="submit" className="mt-4" disabled={isAsset && serials.length !== quantity}>
          Process Inbound Stock
        </Button>
      </form>
    </div>
  );
}