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
import ImageCaptureInput from '@/components/ImageCaptureInput.jsx';

function emptyForm() {
  return {
    item_mode: 'new',
    item_id: '',
    category_id: '',
    name: '', brand: '', specifications: '', type: '',
    unit_of_measure: '', reorder_level: '5', tracking_type: 'consumable',
    estimated_useful_life: '',
    unit_cost: '', arrival_date: '', quantity: '',
    has_property_number: false,
    has_serial_number: true,
    model: '', manufacturer_name: '', country_of_origin: '',
    image: null, // File object for catalog item photo
  };
}

export default function QuickEncodeForm({ categories, items, handleApiCall }) {
  const [receiveMode, setReceiveMode] = useState('single');
  const [form, setForm] = useState(emptyForm());
  const [serials, setSerials] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const existingItem = (items || []).find((i) => String(i.id) === String(form.item_id));
  const trackingType = form.item_mode === 'existing'
    ? existingItem?.tracking_type
    : form.tracking_type;
  const isAsset = trackingType === 'asset';
  const quantity = Number(form.quantity) || 0;

  useEffect(() => { setSerials([]); }, [form.quantity, form.item_id, form.item_mode, form.has_serial_number]);

  const categoryOptions = (categories || []).map((c) => ({ value: String(c.id), label: c.name }));

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.item_mode === 'new' && !form.category_id) return;
    if (form.item_mode === 'existing' && !form.item_id) return;
    
    if (isAsset && form.has_serial_number && serials.length !== quantity) return;

    setSubmitting(true);

    // Build FormData payload to support file upload
    const formData = new FormData();
    formData.append('item_mode', form.item_mode);
    if (form.item_mode === 'existing') formData.append('item_id', form.item_id);
    if (form.item_mode === 'new') {
      formData.append('category_id', form.category_id);
      formData.append('name', form.name);
      formData.append('unit_of_measure', form.unit_of_measure);
      formData.append('tracking_type', form.tracking_type);
      formData.append('reorder_level', Number(form.reorder_level));
      if (form.image) formData.append('image', form.image);
    }

    if (form.brand) formData.append('brand', form.brand);
    if (form.specifications) formData.append('specifications', form.specifications);
    if (form.type) formData.append('type', form.type);
    if (form.estimated_useful_life) formData.append('estimated_useful_life', form.estimated_useful_life);
    
    formData.append('unit_cost', form.unit_cost);
    if (form.arrival_date) formData.append('arrival_date', form.arrival_date);
    formData.append('quantity', form.quantity);

    if (isAsset) {
      formData.append('has_property_number', form.has_property_number ? '1' : '0');
      formData.append('has_serial_number', form.has_serial_number ? '1' : '0');
      if (form.model) formData.append('model', form.model);
      if (form.manufacturer_name) formData.append('manufacturer_name', form.manufacturer_name);
      if (form.country_of_origin) formData.append('country_of_origin', form.country_of_origin);
      
      if (form.has_serial_number) {
        serials.forEach((sn, idx) => formData.append(`serial_numbers[${idx}]`, sn));
      }
    }

    handleApiCall('/quick-receive', formData, () => {
      setForm(emptyForm());
      setSerials([]);
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Receiving Mode Toggle */}
      <Card className="bg-muted/20 border">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base font-semibold">Receiving Mode</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
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
              className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-6"
            >
              <Field orientation="horizontal" className="space-x-2">
                <RadioGroupItem value="new" id="mode-new" />
                <FieldLabel htmlFor="mode-new" className="font-normal cursor-pointer">New item</FieldLabel>
              </Field>
              <Field orientation="horizontal" className="space-x-2">
                <RadioGroupItem value="existing" id="mode-existing" />
                <FieldLabel htmlFor="mode-existing" className="font-normal cursor-pointer">Existing item (just receiving more stock)</FieldLabel>
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
              <FieldGroup className="space-y-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Item Name *</FieldLabel>
                    <Input required value={form.name} onChange={(e) => update({ name: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>Brand</FieldLabel>
                    <Input value={form.brand} onChange={(e) => update({ brand: e.target.value })} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Specifications</FieldLabel>
                    <Input value={form.specifications} onChange={(e) => update({ specifications: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>Unit of Measure *</FieldLabel>
                    <Input required value={form.unit_of_measure} onChange={(e) => update({ unit_of_measure: e.target.value })} />
                  </Field>
                </div>

                <RadioGroup value={form.tracking_type} onValueChange={(v) => update({ tracking_type: v })} className="flex flex-row gap-6 pt-2">
                  <Field orientation="horizontal" className="space-x-2">
                    <RadioGroupItem value="asset" id="tt-asset" />
                    <FieldLabel htmlFor="tt-asset" className="font-normal cursor-pointer">Asset</FieldLabel>
                  </Field>
                  <Field orientation="horizontal" className="space-x-2">
                    <RadioGroupItem value="consumable" id="tt-consumable" />
                    <FieldLabel htmlFor="tt-consumable" className="font-normal cursor-pointer">Consumable</FieldLabel>
                  </Field>
                </RadioGroup>

                {/* ADDED: Image Capture & Upload Field */}
                <ImageCaptureInput
                  onImageSelected={(file) => update({ image: file })}
                />

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
            <FieldLegend className="text-base font-semibold mb-3">Receiving Details</FieldLegend>
            <FieldGroup className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <Field orientation="horizontal" className="space-x-3">
                        <Switch checked={form.has_property_number} onCheckedChange={(c) => update({ has_property_number: c })} />
                        <FieldLabel className="cursor-pointer">Assign Property Number</FieldLabel>
                      </Field>

                      <Field orientation="horizontal" className="space-x-3">
                        <Switch checked={form.has_serial_number} onCheckedChange={(c) => update({ has_serial_number: c })} />
                        <FieldLabel className="cursor-pointer">Track Serial Numbers</FieldLabel>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field><FieldLabel>Model</FieldLabel><Input value={form.model} onChange={(e) => update({ model: e.target.value })} /></Field>
                      <Field><FieldLabel>Manufacturer</FieldLabel><Input value={form.manufacturer_name} onChange={(e) => update({ manufacturer_name: e.target.value })} /></Field>
                      <Field><FieldLabel>Country of Origin</FieldLabel><Input value={form.country_of_origin} onChange={(e) => update({ country_of_origin: e.target.value })} /></Field>
                    </div>

                    {form.has_serial_number && quantity > 0 && (
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

          <Button 
            type="submit" 
            className="w-full sm:w-auto min-w-[200px]"
            disabled={submitting || (isAsset && form.has_serial_number && serials.length !== quantity)}
          >
            {submitting ? 'Processing...' : 'Save Item & Receive Stock'}
          </Button>
        </form>
      )}
    </div>
  );
}