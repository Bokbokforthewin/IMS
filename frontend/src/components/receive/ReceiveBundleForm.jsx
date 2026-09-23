import React, { useState } from 'react';
import {
  Field, FieldLabel, FieldDescription, FieldGroup, FieldSet, FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SerialNumberScanner from './SerialNumberScanner.jsx';

function emptyComponent() {
  return {
    item_id: '',
    unit_cost: '',
    has_property_number: false,
    model: '',
    manufacturer_name: '',
    country_of_origin: '',
    serial_numbers: [],
  };
}

function ComponentFields({ label, items, value, onChange, sets }) {
  const itemOptions = (items || [])
    .filter((i) => i.tracking_type === 'asset')
    .map((i) => ({
      value: String(i.id),
      label: `${i.name}${i.brand ? ` [${i.brand}]` : ''}`,
    }));

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{label} *</FieldLabel>
        <Select
          items={itemOptions}
          value={value.item_id ? String(value.item_id) : ''}
          onValueChange={(v) => onChange({ ...value, item_id: v })}
        >
          <SelectTrigger className="w-full">
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

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Unit Cost (₱) *</FieldLabel>
          <Input
            type="number" step="0.01" min="0" required
            value={value.unit_cost}
            onChange={(e) => onChange({ ...value, unit_cost: e.target.value })}
          />
        </Field>
        <Field orientation="horizontal">
          <Switch
            checked={value.has_property_number}
            onCheckedChange={(checked) => onChange({ ...value, has_property_number: checked })}
          />
          <FieldLabel>Assign Property Number</FieldLabel>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field>
          <FieldLabel>Model (Optional)</FieldLabel>
          <Input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>Manufacturer (Optional)</FieldLabel>
          <Input value={value.manufacturer_name} onChange={(e) => onChange({ ...value, manufacturer_name: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>Country of Origin (Optional)</FieldLabel>
          <Input value={value.country_of_origin} onChange={(e) => onChange({ ...value, country_of_origin: e.target.value })} />
        </Field>
      </div>

      {sets > 0 && (
        <Field>
          <FieldLabel>Serial Numbers *</FieldLabel>
          <SerialNumberScanner
            quantity={sets}
            serials={value.serial_numbers}
            onChange={(newSerials) => onChange({ ...value, serial_numbers: newSerials })}
          />
        </Field>
      )}
    </FieldGroup>
  );
}

export default function ReceiveBundleForm({ items, handleApiCall, onSuccess }) {
  const [sets, setSets] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  // Set default main has_property_number to true since your backend requires the main item to have one
  const [main, setMain] = useState({ ...emptyComponent(), has_property_number: true });
  const [peripherals, setPeripherals] = useState([]);

  const addPeripheral = () => {
    setPeripherals([...peripherals, emptyComponent()]);
  };

  const updatePeripheral = (index, newValue) => {
    const updated = [...peripherals];
    updated[index] = newValue;
    setPeripherals(updated);
  };

  const removePeripheral = (index) => {
    setPeripherals(peripherals.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numSets = Number(sets) || 0;

    if (numSets < 1) return;
    if (main.serial_numbers.length !== numSets) return;
    
    // Ensure all peripherals have exactly the required amount of serial numbers
    for (const p of peripherals) {
      if (p.serial_numbers.length !== numSets) return;
    }

    const payload = {
      sets: numSets,
      arrival_date: arrivalDate,
      main,
      peripherals,
    };

    handleApiCall('/stocks/receive-bundle', payload, () => {
      setSets('');
      setArrivalDate('');
      setMain({ ...emptyComponent(), has_property_number: true });
      setPeripherals([]);
      if (onSuccess) onSuccess();
    });
  };

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Receive Bundled Assets</h2>
      <form className="receive-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sets">Number of Bundles (Sets) *</FieldLabel>
              <Input
                id="sets" type="number" min="1" required
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="arrival_date">Arrival Date *</FieldLabel>
              <Input
                id="arrival_date" type="date" required
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </Field>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Main Unit (e.g., Desktop PC)</CardTitle>
            </CardHeader>
            <CardContent>
              <ComponentFields
                label="Main Component"
                items={items}
                value={main}
                onChange={setMain}
                sets={Number(sets) || 0}
              />
            </CardContent>
          </Card>

          {peripherals.map((p, idx) => (
            <Card key={idx} className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Peripheral {idx + 1} (e.g., Monitor, UPS)</CardTitle>
                <Button type="button" variant="destructive" onClick={() => removePeripheral(idx)}>
                  Remove
                </Button>
              </CardHeader>
              <CardContent>
                <ComponentFields
                  label={`Peripheral ${idx + 1}`}
                  items={items}
                  value={p}
                  onChange={(val) => updatePeripheral(idx, val)}
                  sets={Number(sets) || 0}
                />
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addPeripheral} className="mt-4">
            + Add Peripheral
          </Button>
        </FieldGroup>

        <Button type="submit" className="mt-6 w-full">
          Process Bundle Stock
        </Button>
      </form>
    </div>
  );
}