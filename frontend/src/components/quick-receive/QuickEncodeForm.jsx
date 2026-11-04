import React, { useState, useEffect } from 'react';
import { 
  Zap, Save, PackageCheck, Layers, DollarSign, Calendar as CalendarIcon, 
  Globe, ShieldCheck, Tag, AlignLeft, Scale 
} from 'lucide-react';
import {
  Field, FieldLabel, FieldDescription, FieldGroup, FieldSet, FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SerialNumberScanner from '../receive/SerialNumberScanner.jsx';
import ItemPickerDialog from '@/components/ItemPickerDialog.jsx';
import QuickReceiveBundleForm from './QuickReceiveBundleForm.jsx';
import ImageCaptureInput from '@/components/ImageCaptureInput.jsx';
import api from "@/api/client";

// --- Date Helpers ---
function formatDateDisplay(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatISO(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(isoString) {
  if (!isoString) return undefined;
  const [y, m, d] = isoString.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? undefined : date;
}

function isValidDate(date) {
  return !!date && !isNaN(date.getTime());
}

// --- DatePicker Component using Shadcn InputGroup + Popover + Calendar ---
function ArrivalDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const currentDate = parseISO(value);
  const [month, setMonth] = useState(currentDate || new Date());
  const [inputValue, setInputValue] = useState(formatDateDisplay(currentDate));

  useEffect(() => {
    const parsed = parseISO(value);
    setInputValue(formatDateDisplay(parsed));
    if (parsed) setMonth(parsed);
  }, [value]);

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    setInputValue(rawVal);
    const parsed = new Date(rawVal);
    if (isValidDate(parsed)) {
      onChange(formatISO(parsed));
      setMonth(parsed);
    }
  };

  const handleSelectDate = (selectedDate) => {
    if (selectedDate) {
      onChange(formatISO(selectedDate));
      setInputValue(formatDateDisplay(selectedDate));
    } else {
      onChange('');
      setInputValue('');
    }
    setOpen(false);
  };

  return (
    <InputGroup className="mt-1.5 w-full">
      <InputGroupInput
        id="arrival_date"
        value={inputValue}
        placeholder="e.g., June 01, 2026"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        required
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                id="date-picker-trigger"
                variant="ghost"
                size="icon-xs"
                aria-label="Select arrival date"
                type="button"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="sr-only">Select arrival date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0 border border-border bg-card"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={currentDate}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSelectDate}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}

function emptyForm() {
  return {
    item_mode: 'new',
    item_id: '',
    category_id: '',
    name: '', 
    brand: '', 
    specifications: '', 
    type: '',
    unit_of_measure: '', 
    reorder_level: '5', 
    tracking_type: 'consumable',
    estimated_useful_life: '',
    unit_cost: '', 
    arrival_date: '', 
    quantity: '',
    has_property_number: false,
    has_serial_number: true,
    model: '', 
    manufacturer_name: '', 
    country_of_origin: '',
    image: null,
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

  useEffect(() => { 
    setSerials([]); 
  }, [form.quantity, form.item_id, form.item_mode, form.has_serial_number]);

  const categoryOptions = (categories || []).map((c) => ({ value: String(c.id), label: c.name }));

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.item_mode === 'new' && !form.category_id) return;
    if (form.item_mode === 'existing' && !form.item_id) return;
    
    if (isAsset && form.has_serial_number && serials.length !== quantity) return;

    setSubmitting(true);

    const formData = new FormData();
    formData.append('item_mode', form.item_mode);
    
    if (form.item_mode === 'existing') {
      formData.append('item_id', form.item_id);
    }
    
    if (form.item_mode === 'new') {
      formData.append('category_id', form.category_id);
      formData.append('name', form.name);
      formData.append('unit_of_measure', form.unit_of_measure);
      formData.append('tracking_type', form.tracking_type);
      formData.append('reorder_level', Number(form.reorder_level));
      
      // FIX 1: Only append image if it is a valid File object
      if (form.image instanceof File) {
        formData.append('image', form.image);
      }
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

    // FIX 2: Ensure route matches `/v1/quick-receive`
    const endpoint = '/v1/quick-receive';

    if (typeof handleApiCall === 'function') {
      handleApiCall(endpoint, formData, () => {
        setForm(emptyForm());
        setSerials([]);
      }, 'POST').finally(() => setSubmitting(false));
    } else {
      api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then(() => {
        setForm(emptyForm());
        setSerials([]);
      })
      .catch((err) => {
        if (err.response?.status === 422) {
          console.error("Laravel Validation Errors:", err.response.data.errors);
        }
      })
      .finally(() => setSubmitting(false));
    }
  };

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Receiving Mode Toggle Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Zap className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Receiving Mode Selection
          </h3>
        </div>

        <RadioGroup
          value={receiveMode}
          onValueChange={setReceiveMode}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div
            className={`flex items-start space-x-3 border rounded-lg p-3.5 cursor-pointer transition-colors ${
              receiveMode === 'single'
                ? 'border-primary bg-accent/40 ring-1 ring-primary/20'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
            onClick={() => setReceiveMode('single')}
          >
            <RadioGroupItem value="single" id="mode-single" className="mt-0.5" />
            <div>
              <FieldLabel htmlFor="mode-single" className="font-semibold text-xs sm:text-sm cursor-pointer text-foreground">
                Standard / Single Item
              </FieldLabel>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Rapidly encode and receive individual assets or consumable stock
              </p>
            </div>
          </div>

          <div
            className={`flex items-start space-x-3 border rounded-lg p-3.5 cursor-pointer transition-colors ${
              receiveMode === 'bundle'
                ? 'border-primary bg-accent/40 ring-1 ring-primary/20'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
            onClick={() => setReceiveMode('bundle')}
          >
            <RadioGroupItem value="bundle" id="mode-bundle" className="mt-0.5" />
            <div>
              <FieldLabel htmlFor="mode-bundle" className="font-semibold text-xs sm:text-sm cursor-pointer text-foreground">
                Bundle / Set
              </FieldLabel>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive composite units paired with peripheral components
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {receiveMode === 'bundle' ? (
        <QuickReceiveBundleForm
          categories={categories}
          items={items}
          handleApiCall={handleApiCall}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
          {/* Section Task Header */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <PackageCheck className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Quick Item Encoding & Stock Receiving
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Catalog Mode Selection & Information */}
            <FieldSet className="space-y-4">
              <RadioGroup
                value={form.item_mode}
                onValueChange={(v) => update({ item_mode: v, item_id: '', category_id: '' })}
                className="flex flex-col sm:flex-row gap-3 sm:gap-6 border-b border-border/60 pb-4"
              >
                <Field orientation="horizontal" className="space-x-2">
                  <RadioGroupItem value="new" id="mode-new" />
                  <FieldLabel htmlFor="mode-new" className="font-medium text-xs sm:text-sm cursor-pointer text-foreground">
                    Encode new catalog item
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal" className="space-x-2">
                  <RadioGroupItem value="existing" id="mode-existing" />
                  <FieldLabel htmlFor="mode-existing" className="font-medium text-xs sm:text-sm cursor-pointer text-foreground">
                    Existing catalog item (receive additional stock)
                  </FieldLabel>
                </Field>
              </RadioGroup>

              {form.item_mode === 'existing' ? (
                <Field className="w-full col-span-full">
                  <FieldLabel className="text-xs font-medium text-muted-foreground">
                    Select Catalog Item <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="mt-1.5 w-full block">
                    <ItemPickerDialog
                      items={items}
                      categories={categories}
                      value={form.item_id}
                      onSelect={(item) => update({ item_id: String(item.id) })}
                    />
                  </div>
                </Field>
              ) : (
                <FieldGroup className="space-y-4">
                  <Field>
                    <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      Category <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select items={categoryOptions} value={form.category_id} onValueChange={(v) => update({ category_id: v })}>
                      <SelectTrigger className="w-full mt-1.5 bg-card border-border"><SelectValue placeholder="Select catalog category..." /></SelectTrigger>
                      <SelectContent className="border-border z-50">
                        <SelectGroup>
                          {categoryOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel className="text-xs font-medium text-muted-foreground">
                        Item Name <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        required
                        placeholder="e.g., Wireless Ergonomic Mouse"
                        value={form.name}
                        onChange={(e) => update({ name: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs font-medium text-muted-foreground">
                        Brand
                      </FieldLabel>
                      <Input
                        placeholder="e.g., Logitech"
                        value={form.brand}
                        onChange={(e) => update({ brand: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
                        Specifications
                      </FieldLabel>
                      <Input
                        placeholder="e.g., Bluetooth 5.0, Rechargeable"
                        value={form.specifications}
                        onChange={(e) => update({ specifications: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                        Unit of Measure <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        required
                        placeholder="e.g., piece, box, set"
                        value={form.unit_of_measure}
                        onChange={(e) => update({ unit_of_measure: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                  </div>

                  <Field className="pt-1">
                    <FieldLabel className="text-xs font-medium text-muted-foreground mb-1">
                      Tracking Type <span className="text-destructive">*</span>
                    </FieldLabel>
                    <RadioGroup
                      value={form.tracking_type}
                      onValueChange={(v) => update({ tracking_type: v })}
                      className="flex flex-row gap-6 pt-1"
                    >
                      <Field orientation="horizontal" className="space-x-2">
                        <RadioGroupItem value="asset" id="tt-asset" />
                        <FieldLabel htmlFor="tt-asset" className="font-medium text-xs cursor-pointer text-foreground">
                          Asset (Capitalized / Tracked Equipment)
                        </FieldLabel>
                      </Field>
                      <Field orientation="horizontal" className="space-x-2">
                        <RadioGroupItem value="consumable" id="tt-consumable" />
                        <FieldLabel htmlFor="tt-consumable" className="font-medium text-xs cursor-pointer text-foreground">
                          Consumable (Office/Store Inventory)
                        </FieldLabel>
                      </Field>
                    </RadioGroup>
                  </Field>

                  {/* Image Capture & Upload Field */}
                  <ImageCaptureInput
                    onImageSelected={(file) => update({ image: file })}
                  />

                  {form.tracking_type === 'consumable' && (
                    <Field>
                      <FieldLabel className="text-xs font-medium text-muted-foreground">
                        Reorder Level Threshold <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g., 5"
                        value={form.reorder_level}
                        onChange={(e) => update({ reorder_level: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                  )}

                  {form.tracking_type === 'asset' && (
                    <Field>
                      <FieldLabel className="text-xs font-medium text-muted-foreground">
                        Estimated Useful Life (in years)
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 3"
                        value={form.estimated_useful_life}
                        onChange={(e) => update({ estimated_useful_life: e.target.value })}
                        className="mt-1.5 w-full bg-card border-border"
                      />
                    </Field>
                  )}
                </FieldGroup>
              )}
            </FieldSet>

            {/* Receiving Details Section */}
            <FieldSet className="space-y-4 pt-2 border-t border-border">
              <FieldLegend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                Receiving & Financial Details
              </FieldLegend>

              <FieldGroup className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      Unit Cost (₱) <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={form.unit_cost}
                      onChange={(e) => update({ unit_cost: e.target.value })}
                      className="mt-1.5 w-full bg-card border-border"
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      Arrival Date <span className="text-destructive">*</span>
                    </FieldLabel>
                    <ArrivalDatePicker
                      value={form.arrival_date}
                      onChange={(dateStr) => update({ arrival_date: dateStr })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      Quantity <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g., 10"
                      value={form.quantity}
                      onChange={(e) => update({ quantity: e.target.value })}
                      className="mt-1.5 w-full bg-card border-border"
                    />
                  </Field>
                </div>

                {isAsset && (
                  <FieldSet className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    <FieldLegend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      Asset Tracking & Serial Details
                    </FieldLegend>

                    <FieldGroup className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={form.has_property_number}
                              onCheckedChange={(c) => update({ has_property_number: c })}
                            />
                            <FieldLabel className="cursor-pointer text-xs font-semibold text-foreground">
                              Assign Property Number
                            </FieldLabel>
                          </div>
                          <FieldDescription className="text-[11px] text-muted-foreground pl-1">
                            Auto-generate or assign property inventory tags.
                          </FieldDescription>
                        </Field>

                        <Field className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={form.has_serial_number}
                              onCheckedChange={(c) => update({ has_serial_number: c })}
                            />
                            <FieldLabel className="cursor-pointer text-xs font-semibold text-foreground">
                              Track Serial Numbers
                            </FieldLabel>
                          </div>
                          <FieldDescription className="text-[11px] text-muted-foreground pl-1">
                            Require entering or scanning serial numbers per unit.
                          </FieldDescription>
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field>
                          <FieldLabel className="text-xs font-medium text-muted-foreground">Model</FieldLabel>
                          <Input
                            placeholder="e.g., Latitude 5420"
                            value={form.model}
                            onChange={(e) => update({ model: e.target.value })}
                            className="mt-1.5 w-full bg-card border-border"
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs font-medium text-muted-foreground">Manufacturer</FieldLabel>
                          <Input
                            placeholder="e.g., Dell Inc."
                            value={form.manufacturer_name}
                            onChange={(e) => update({ manufacturer_name: e.target.value })}
                            className="mt-1.5 w-full bg-card border-border"
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Globe className="w-3.5 h-3.5" />
                            Country of Origin
                          </FieldLabel>
                          <Input
                            placeholder="e.g., Philippines, Japan"
                            value={form.country_of_origin}
                            onChange={(e) => update({ country_of_origin: e.target.value })}
                            className="mt-1.5 w-full bg-card border-border"
                          />
                        </Field>
                      </div>

                      {form.has_serial_number && quantity > 0 && (
                        <Field className="pt-2">
                          <FieldLabel className="text-xs font-medium text-muted-foreground mb-1.5">
                            Serial Numbers <span className="text-destructive">*</span>
                          </FieldLabel>
                          <SerialNumberScanner
                            quantity={quantity}
                            serials={serials}
                            onChange={setSerials}
                          />
                        </Field>
                      )}
                    </FieldGroup>
                  </FieldSet>
                )}
              </FieldGroup>
            </FieldSet>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2"
                disabled={submitting || (isAsset && form.has_serial_number && serials.length !== quantity)}
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Processing Entry...' : 'Save Item & Receive Stock'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}