import React, { useState, useEffect } from 'react';
import {
  Field, FieldLabel, FieldGroup, FieldSet, FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SerialNumberScanner from '../receive/SerialNumberScanner.jsx';
import ItemPickerDialog from '@/components/ItemPickerDialog.jsx';
import QuickReceiveBundleForm from './QuickReceiveBundleForm.jsx';

function emptyForm() {
  return {
    item_mode: 'new',
    item_id: '',
    category_id: '',
    name: '', brand: '', specifications: '', type: '',
    unit_of_measure: '', reorder_level: '5', tracking_type: 'consumable',
    estimated_useful_life: '',
    unit_cost: '', arrival_date: '', quantity: '',
    has_property_number: false, model: '', manufacturer_name: '', country_of_origin: '',
  };
}

export default function QuickEncodeForm({ categories, items, handleApiCall }) {
  const [receiveMode, setReceiveMode] = useState('single'); // 'single' | 'bundle'
  const [form, setForm] = useState(emptyForm());
  const [serials, setSerials] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const existingItem = (items || []).find((i) => String(i.id) === String(form.item_id));
  const trackingType = form.item_mode === 'existing'
    ? existingItem?.tracking_type
    : form.tracking_type;
  const isAsset = trackingType === 'asset';
  const quantity = Number(form.quantity) || 0;

  useEffect(() => { setSerials([]); }, [form.quantity, form.item_id, form.item_mode]);

  const categoryOptions = (categories || []).map((c) => ({ value: String(c.id), label: c.name }));

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.item_mode === 'new' && !form.category_id) return;
    if (form.item_mode === 'existing' && !form.item_id) return;
    if (isAsset && serials.length !== quantity) return;

    setSubmitting(true);
    const payload = {
      item_mode: form.item_mode,
      item_id: form.item_mode === 'existing' ? form.item_id : undefined,
      category_id: form.item_mode === 'new' ? form.category_id : undefined,
      name: form.item_mode === 'new' ? form.name : undefined,
      brand: form.brand || null,
      specifications: form.specifications || null,
      type: form.type || null,
      unit_of_measure: form.item_mode === 'new' ? form.unit_of_measure : undefined,
      tracking_type: form.item_mode === 'new' ? form.tracking_type : undefined,
      reorder_level: form.item_mode === 'new' ? Number(form.reorder_level) : undefined,
      estimated_useful_life: form.estimated_useful_life || null,
      unit_cost: form.unit_cost,
      arrival_date: form.arrival_date || undefined,
      quantity: form.quantity,
      ...(isAsset
        ? {
            has_property_number: form.has_property_number,
            serial_numbers: serials,
            model: form.model || null,
            manufacturer_name: form.manufacturer_name || null,
            country_of_origin: form.country_of_origin || null,
          }
        : {}),
    };

    handleApiCall('/quick-receive', payload, () => {
      setForm(emptyForm());
      setSerials([]);
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6">
      {/* Radio Selector at top of QuickEncodeForm */}
      <Card className="bg-muted/20 border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Receiving Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={receiveMode}
            onValueChange={setReceiveMode}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div
              className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                receiveMode === 'single' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
              }`}
              onClick={() => setReceiveMode('single')}
            >
              <RadioGroupItem value="single" id="mode-single" />
              <div>
                <FieldLabel htmlFor="mode-single" className="font-medium cursor-pointer">
                  Standard / Single Item
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Receive individual assets or consumable stock
                </p>
              </div>
            </div>

            <div
              className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                receiveMode === 'bundle' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
              }`}
              onClick={() => setReceiveMode('bundle')}
            >
              <RadioGroupItem value="bundle" id="mode-bundle" />
              <div>
                <FieldLabel htmlFor="mode-bundle" className="font-medium cursor-pointer">
                  Bundle / Set
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Receive main unit paired with peripherals
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Conditionally Render Single Form OR Imported Bundle Form */}
      {receiveMode === 'bundle' ? (
        <QuickReceiveBundleForm
          categories={categories}
          items={items}
          handleApiCall={handleApiCall}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldSet>
            <RadioGroup
              value={form.item_mode}
              onValueChange={(v) => update({ item_mode: v, item_id: '', category_id: '' })}
              className="mb-4"
            >
              <Field orientation="horizontal">
                <RadioGroupItem value="new" id="mode-new" />
                <FieldLabel htmlFor="mode-new" className="font-normal">New item</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="existing" id="mode-existing" />
                <FieldLabel htmlFor="mode-existing" className="font-normal">Existing item (just receiving more stock)</FieldLabel>
              </Field>
            </RadioGroup>

            {form.item_mode === 'existing' ? (
              <Field>
                <FieldLabel>Select Item *</FieldLabel>
                <ItemPickerDialog
                  items={items}
                  categories={categories}
                  value={form.item_id}
                  onSelect={(item) => update({ item_id: String(item.id) })}
                />
              </Field>
            ) : (
              <FieldGroup>
                <Field>
                  <FieldLabel>Category *</FieldLabel>
                  <Select items={categoryOptions} value={form.category_id} onValueChange={(v) => update({ category_id: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Item Name *</FieldLabel>
                    <Input required value={form.name} onChange={(e) => update({ name: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>Brand</FieldLabel>
                    <Input value={form.brand} onChange={(e) => update({ brand: e.target.value })} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Specifications</FieldLabel>
                    <Input value={form.specifications} onChange={(e) => update({ specifications: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>Unit of Measure *</FieldLabel>
                    <Input required value={form.unit_of_measure} onChange={(e) => update({ unit_of_measure: e.target.value })} />
                  </Field>
                </div>

                <RadioGroup value={form.tracking_type} onValueChange={(v) => update({ tracking_type: v })}>
                  <Field orientation="horizontal">
                    <RadioGroupItem value="asset" id="tt-asset" />
                    <FieldLabel htmlFor="tt-asset" className="font-normal">Asset</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem value="consumable" id="tt-consumable" />
                    <FieldLabel htmlFor="tt-consumable" className="font-normal">Consumable</FieldLabel>
                  </Field>
                </RadioGroup>

                {form.tracking_type === 'consumable' && (
                  <Field>
                    <FieldLabel>Reorder Level *</FieldLabel>
                    <Input type="number" min="0" required value={form.reorder_level} onChange={(e) => update({ reorder_level: e.target.value })} />
                  </Field>
                )}

                {form.tracking_type === 'asset' && (
                  <Field>
                    <FieldLabel>Estimated Useful Life (in years)</FieldLabel>
                    <Input type="number" min="0" value={form.estimated_useful_life} onChange={(e) => update({ estimated_useful_life: e.target.value })} />
                  </Field>
                )}
              </FieldGroup>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend>Receiving Details</FieldLegend>
            <FieldGroup>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Unit Cost (₱) *</FieldLabel>
                  <Input type="number" step="0.01" min="0" required value={form.unit_cost} onChange={(e) => update({ unit_cost: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel>Arrival Date *</FieldLabel>
                  <Input type="date" required value={form.arrival_date} onChange={(e) => update({ arrival_date: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel>Quantity *</FieldLabel>
                  <Input type="number" min="1" required value={form.quantity} onChange={(e) => update({ quantity: e.target.value })} />
                </Field>
              </div>

              {isAsset && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Field orientation="horizontal">
                      <Switch checked={form.has_property_number} onCheckedChange={(c) => update({ has_property_number: c })} />
                      <FieldLabel>Assign Property Number</FieldLabel>
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                      <Field><FieldLabel>Model</FieldLabel><Input value={form.model} onChange={(e) => update({ model: e.target.value })} /></Field>
                      <Field><FieldLabel>Manufacturer</FieldLabel><Input value={form.manufacturer_name} onChange={(e) => update({ manufacturer_name: e.target.value })} /></Field>
                      <Field><FieldLabel>Country of Origin</FieldLabel><Input value={form.country_of_origin} onChange={(e) => update({ country_of_origin: e.target.value })} /></Field>
                    </div>

                    {quantity > 0 && (
                      <Field>
                        <FieldLabel>Serial Numbers *</FieldLabel>
                        <SerialNumberScanner quantity={quantity} serials={serials} onChange={setSerials} />
                      </Field>
                    )}
                  </CardContent>
                </Card>
              )}
            </FieldGroup>
          </FieldSet>

          <Button type="submit" disabled={submitting || (isAsset && serials.length !== quantity)}>
            {submitting ? 'Processing...' : 'Save Item & Receive Stock'}
          </Button>
        </form>
      )}
    </div>
  );
}