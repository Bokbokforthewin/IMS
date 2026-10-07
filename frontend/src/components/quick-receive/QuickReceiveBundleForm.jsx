import React, { useState } from 'react';
import { Field, FieldLabel, FieldGroup, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SerialNumberScanner from '../receive/SerialNumberScanner.jsx';
import ItemPickerDialog from '@/components/ItemPickerDialog.jsx';

function emptyComponent() {
  return {
    item_mode: 'new', item_id: '', category_id: '',
    name: '', brand: '', specifications: '', type: '', unit_of_measure: '',
    unit_cost: '', has_property_number: false,
    model: '', manufacturer_name: '', country_of_origin: '', estimated_useful_life: '',
    serial_numbers: [],
  };
}

export default function QuickReceiveBundleForm({ categories, items, handleApiCall }) {
  const [sets, setSets] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [main, setMain] = useState(emptyComponent());
  const [peripherals, setPeripherals] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const setsNum = Number(sets) || 0;

  const isReady =
    setsNum > 0 &&
    ((main.item_mode === 'existing' && main.item_id) || (main.item_mode === 'new' && main.category_id && main.name && main.unit_of_measure)) &&
    main.unit_cost && main.serial_numbers.length === setsNum &&
    peripherals.every((p) =>
      ((p.item_mode === 'existing' && p.item_id) || (p.item_mode === 'new' && p.category_id && p.name && p.unit_of_measure)) &&
      p.unit_cost && p.serial_numbers.length === setsNum
    ) &&
    (peripherals.length === 0 || main.has_property_number);

  const buildPayload = (component) => ({
    item_mode: component.item_mode,
    item_id: component.item_mode === 'existing' ? component.item_id : undefined,
    category_id: component.item_mode === 'new' ? component.category_id : undefined,
    name: component.item_mode === 'new' ? component.name : undefined,
    brand: component.brand || null,
    specifications: component.specifications || null,
    type: component.type || null,
    unit_of_measure: component.item_mode === 'new' ? component.unit_of_measure : undefined,
    estimated_useful_life: component.estimated_useful_life || null,
    unit_cost: component.unit_cost,
    has_property_number: component.has_property_number,
    model: component.model || null,
    manufacturer_name: component.manufacturer_name || null,
    country_of_origin: component.country_of_origin || null,
    serial_numbers: component.serial_numbers,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isReady) return;
    setSubmitting(true);

    const payload = {
      sets: setsNum,
      arrival_date: arrivalDate || undefined,
      main: buildPayload(main),
      peripherals: peripherals.map(buildPayload),
    };

    handleApiCall('/quick-receive-bundle', payload, () => {
      setSets(''); setArrivalDate(''); setMain(emptyComponent()); setPeripherals([]);
    }).finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Number of Sets *</FieldLabel>
          <Input type="number" min="1" required value={sets} onChange={(e) => setSets(e.target.value)} />
          <FieldDescription>How many identical sets/boxes arrived.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Arrival Date *</FieldLabel>
          <Input type="date" required value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
        </Field>
      </FieldGroup>

      <Card>
        <CardHeader><CardTitle className="text-base">Main Unit</CardTitle></CardHeader>
        <CardContent>
          <ComponentFields label="Main Item" items={items} categories={categories} value={main} onChange={setMain} sets={setsNum} />
          {peripherals.length > 0 && !main.has_property_number && (
            <p className="text-sm text-destructive mt-2">Peripherals need the main unit to have a property number.</p>
          )}
        </CardContent>
      </Card>

      {peripherals.map((p, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Peripheral #{index + 1}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPeripherals(peripherals.filter((_, i) => i !== index))}>Remove</Button>
          </CardHeader>
          <CardContent>
            <ComponentFields
              label={`Peripheral #${index + 1}`}
              items={items} categories={categories} value={p} sets={setsNum}
              onChange={(updated) => setPeripherals(peripherals.map((x, i) => (i === index ? updated : x)))}
            />
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={() => setPeripherals([...peripherals, emptyComponent()])} disabled={setsNum <= 0}>
        + Add Peripheral
      </Button>

      <Button type="submit" disabled={!isReady || submitting}>
        {submitting ? 'Processing...' : 'Process Bundle Delivery'}
      </Button>
    </form>
  );
}

function ComponentFields({ label, items, categories, value, onChange, sets }) {
  return (
    <FieldGroup>
      <RadioGroup value={value.item_mode} onValueChange={(v) => onChange({ ...value, item_mode: v, item_id: '' })}>
        <Field orientation="horizontal">
          <RadioGroupItem value="new" id={`bundle-mode-new-${label}`} />
          <FieldLabel htmlFor={`bundle-mode-new-${label}`} className="font-normal">New catalog item</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="existing" id={`bundle-mode-existing-${label}`} />
          <FieldLabel htmlFor={`bundle-mode-existing-${label}`} className="font-normal">Existing catalog item</FieldLabel>
        </Field>
      </RadioGroup>

      {value.item_mode === 'existing' ? (
        <Field>
          <FieldLabel>{label} *</FieldLabel>
          <ItemPickerDialog
            items={items}
            categories={categories}
            value={value.item_id}
            filterTrackingType="asset"
            onSelect={(item) => onChange({ ...value, item_id: String(item.id) })}
          />
        </Field>
      ) : (
        <>
          <Field>
            <FieldLabel>Category *</FieldLabel>
            <select
              required
              className="border rounded-md h-9 px-2 w-full bg-background"
              value={value.category_id}
              onChange={(e) => onChange({ ...value, category_id: e.target.value })}
            >
              <option value="">Select category...</option>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field><FieldLabel>Item Name *</FieldLabel><Input required value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field>
            <Field><FieldLabel>Unit of Measure *</FieldLabel><Input required value={value.unit_of_measure} onChange={(e) => onChange({ ...value, unit_of_measure: e.target.value })} /></Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Unit Cost (₱) *</FieldLabel>
          <Input type="number" step="0.01" min="0" required value={value.unit_cost} onChange={(e) => onChange({ ...value, unit_cost: e.target.value })} />
        </Field>
        <Field orientation="horizontal">
          <Switch checked={value.has_property_number} onCheckedChange={(c) => onChange({ ...value, has_property_number: c })} />
          <FieldLabel>Assign Property Number</FieldLabel>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field><FieldLabel>Model</FieldLabel><Input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} /></Field>
        <Field><FieldLabel>Manufacturer</FieldLabel><Input value={value.manufacturer_name} onChange={(e) => onChange({ ...value, manufacturer_name: e.target.value })} /></Field>
        <Field><FieldLabel>Country of Origin</FieldLabel><Input value={value.country_of_origin} onChange={(e) => onChange({ ...value, country_of_origin: e.target.value })} /></Field>
      </div>

      {value.item_mode === 'new' && (
        <Field>
          <FieldLabel>Estimated Useful Life</FieldLabel>
          <Input placeholder="e.g. 5 Years" value={value.estimated_useful_life} onChange={(e) => onChange({ ...value, estimated_useful_life: e.target.value })} />
        </Field>
      )}

      {sets > 0 && (
        <Field>
          <FieldLabel>Serial Numbers * ({sets} needed)</FieldLabel>
          <SerialNumberScanner quantity={sets} serials={value.serial_numbers} onChange={(serials) => onChange({ ...value, serial_numbers: serials })} />
        </Field>
      )}
    </FieldGroup>
  );
}