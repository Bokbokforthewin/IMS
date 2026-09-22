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
    estimated_useful_life: '',
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
          <FieldLabel>Model</FieldLabel>
          <Input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>Manufacturer</FieldLabel>
          <Input value={value.manufacturer_name} onChange={(e) => onChange({ ...value, manufacturer_name: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>Country of Origin</FieldLabel>
          <Input value={value.country_of_origin} onChange={(e) => onChange({ ...value, country_of_origin: e.target.value })} />
        </Field>
      </div>

      <Field>
        <FieldLabel>Estimated Useful Life</FieldLabel>
        <Input
          placeholder="e.g. 5 Years"
          value={value.estimated_useful_life}
          onChange={(e) => onChange({ ...value, estimated_useful_life: e.target.value })}
        />
      </Field>

      {sets > 0 && (
        <Field>
          <FieldLabel>Serial Numbers * ({sets} needed)</FieldLabel>
          <SerialNumberScanner
            quantity={sets}
            serials={value.serial_numbers}
            onChange={(serials) => onChange({ ...value, serial_numbers: serials })}
          />
        </Field>
      )}
    </FieldGroup>
  );
}

export default function ReceiveBundleForm({ items, handleApiCall, onSuccess }) {
  const [sets, setSets] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [main, setMain] = useState(emptyComponent());
  const [peripherals, setPeripherals] = useState([]);

  const setsNum = Number(sets) || 0;

  const addPeripheral = () => {
    setPeripherals([...peripherals, emptyComponent()]);
  };

  const updatePeripheral = (index, updated) => {
    setPeripherals(peripherals.map((p, i) => (i === index ? updated : p)));
  };

  const removePeripheral = (index) => {
    setPeripherals(peripherals.filter((_, i) => i !== index));
  };

  const isReady =
    setsNum > 0 &&
    main.item_id && main.unit_cost && main.serial_numbers.length === setsNum &&
    peripherals.every((p) => p.item_id && p.unit_cost && p.serial_numbers.length === setsNum) &&
    (peripherals.length === 0 || main.has_property_number); // peripherals need something to attach to

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isReady) return;

    const payload = {
      sets: setsNum,
      arrival_date: arrivalDate || undefined,
      main,
      peripherals,
    };

    handleApiCall('/stocks/receive-bundle', payload, () => {
      setSets('');
      setArrivalDate('');
      setMain(emptyComponent());
      setPeripherals([]);
      if (onSuccess) onSuccess();
    });
  };

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Receive Bundle (Set of Items)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use this when one delivery contains a box of related items — e.g. a PC set with monitor, mouse, and keyboard.
        Each peripheral is linked to its matching main unit by delivery order.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FieldGroup className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Number of Sets *</FieldLabel>
            <Input
              type="number" min="1" required
              value={sets}
              onChange={(e) => setSets(e.target.value)}
            />
            <FieldDescription>How many identical boxes arrived.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Arrival Date *</FieldLabel>
            <Input
              type="date" required
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </Field>
        </FieldGroup>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Main Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <ComponentFields
              label="Main Item (e.g. PC)"
              items={items}
              value={main}
              onChange={setMain}
              sets={setsNum}
            />
            {peripherals.length > 0 && !main.has_property_number && (
              <p className="text-sm text-destructive mt-2">
                Peripherals are added below, so the main unit needs a property number for them to attach to.
              </p>
            )}
          </CardContent>
        </Card>

        {peripherals.map((peripheral, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Peripheral #{index + 1}</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => removePeripheral(index)}>
                Remove
              </Button>
            </CardHeader>
            <CardContent>
              <ComponentFields
                label="Peripheral Item (e.g. Mouse)"
                items={items}
                value={peripheral}
                onChange={(updated) => updatePeripheral(index, updated)}
                sets={setsNum}
              />
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addPeripheral} disabled={setsNum <= 0}>
          + Add Peripheral
        </Button>

        <div>
          <Button type="submit" disabled={!isReady}>
            Process Bundle Delivery
          </Button>
          {!isReady && setsNum > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Fill in every component and its serial numbers to enable submission.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}