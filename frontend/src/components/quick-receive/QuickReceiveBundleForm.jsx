import React, { useState, useEffect } from 'react';
import { 
  Boxes, Plus, Trash2, Save, Layers, Calendar as CalendarIconLucide, 
  DollarSign, ShieldCheck, Globe, Search, Scale, Tag 
} from 'lucide-react';
import { Field, FieldLabel, FieldGroup, FieldDescription, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import ImageCaptureInput from '@/components/ImageCaptureInput.jsx';

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
                <CalendarIconLucide className="size-4 text-muted-foreground" />
                <span className="sr-only">Select arrival date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0 border border-border"
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

function emptyComponent() {
  return {
    item_mode: 'new', item_id: '', category_id: '',
    name: '', brand: '', specifications: '', type: '', unit_of_measure: '',
    unit_cost: '', has_property_number: false,
    has_serial_number: true,
    model: '', manufacturer_name: '', country_of_origin: '', estimated_useful_life: '',
    serial_numbers: [],
    image: null,
  };
}

export default function QuickReceiveBundleForm({ categories, items, handleApiCall }) {
  const [sets, setSets] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [main, setMain] = useState(emptyComponent());
  const [peripherals, setPeripherals] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const setsNum = Number(sets) || 0;

  const isComponentValid = (c) => {
    const basicValid = (c.item_mode === 'existing' && c.item_id) || 
                       (c.item_mode === 'new' && c.category_id && c.name && c.unit_of_measure);
    const serialValid = !c.has_serial_number || c.serial_numbers.length === setsNum;
    return basicValid && c.unit_cost && serialValid;
  };

  const isReady =
    setsNum > 0 &&
    isComponentValid(main) &&
    peripherals.every(isComponentValid) &&
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
    has_serial_number: component.has_serial_number,
    model: component.model || null,
    manufacturer_name: component.manufacturer_name || null,
    country_of_origin: component.country_of_origin || null,
    serial_numbers: component.has_serial_number ? component.serial_numbers : [],
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
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Task Title Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Boxes className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Quick Receive Bundled Assets & Equipment Sets
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FieldGroup className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sets" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                Number of Bundles (Sets) <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="sets"
                type="number"
                min="1"
                required
                placeholder="e.g., 5"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="mt-1.5 w-full"
              />
              <FieldDescription className="text-[11px] text-muted-foreground mt-1">
                Total number of identical composite equipment sets receiving stock.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="arrival_date" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarIconLucide className="w-3.5 h-3.5 text-muted-foreground" />
                Arrival Date <span className="text-destructive">*</span>
              </FieldLabel>
              <ArrivalDatePicker
                value={arrivalDate}
                onChange={(dateStr) => setArrivalDate(dateStr)}
              />
            </Field>
          </div>

          {/* Main System Unit Card */}
          <Card className="rounded-lg border border-border bg-card shadow-2xs">
            <CardHeader className="border-b border-border py-3 px-4 sm:px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Main System Unit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ComponentFields
                label="Main Component"
                items={items}
                categories={categories}
                value={main}
                onChange={setMain}
                sets={setsNum}
              />
              {peripherals.length > 0 && !main.has_property_number && (
                <p className="text-xs text-destructive mt-3 font-medium flex items-center gap-1.5">
                  Peripherals require the main system unit to have an assigned property number.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Peripherals Cards */}
          {peripherals.map((p, index) => (
            <Card key={index} className="rounded-lg border border-border bg-card shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border py-2.5 px-4 sm:px-6">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Boxes className="size-4 text-muted-foreground" />
                  Peripheral {index + 1} (e.g., Monitor, UPS, Keyboard)
                </CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setPeripherals(peripherals.filter((_, i) => i !== index))}
                  className="h-7 text-xs gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <ComponentFields
                  label={`Peripheral ${index + 1}`}
                  items={items}
                  categories={categories}
                  value={p}
                  sets={setsNum}
                  onChange={(updated) =>
                    setPeripherals(peripherals.map((x, i) => (i === index ? updated : x)))
                  }
                />
              </CardContent>
            </Card>
          ))}

          <div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-xs"
              onClick={() => setPeripherals([...peripherals, emptyComponent()])}
              disabled={setsNum <= 0}
            >
              <Plus className="size-4" />
              Add Peripheral Component
            </Button>
          </div>
        </FieldGroup>

        <div className="pt-2 border-t border-border">
          <Button
            type="submit"
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2"
            disabled={!isReady || submitting}
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Processing Entry...' : 'Process Bundle Delivery'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ComponentFields({ label, items, categories, value, onChange, sets }) {
  const categoryOptions = (categories || []).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <FieldGroup className="space-y-4">
      {/* Item Mode Switcher */}
      <RadioGroup
        value={value.item_mode}
        onValueChange={(v) => onChange({ ...value, item_mode: v, item_id: '' })}
        className="flex flex-col sm:flex-row gap-3 sm:gap-6 border-b border-border/60 pb-3"
      >
        <Field orientation="horizontal" className="space-x-2">
          <RadioGroupItem value="new" id={`bundle-mode-new-${label}`} />
          <FieldLabel htmlFor={`bundle-mode-new-${label}`} className="font-medium text-xs sm:text-sm cursor-pointer text-foreground">
            Encode new catalog item
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" className="space-x-2">
          <RadioGroupItem value="existing" id={`bundle-mode-existing-${label}`} />
          <FieldLabel htmlFor={`bundle-mode-existing-${label}`} className="font-medium text-xs sm:text-sm cursor-pointer text-foreground">
            Existing asset catalog item
          </FieldLabel>
        </Field>
      </RadioGroup>

      {value.item_mode === 'existing' ? (
        <Field>
          <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            Select {label} <span className="text-destructive">*</span>
          </FieldLabel>
          <div className="mt-1.5">
            <ItemPickerDialog
              items={items}
              categories={categories}
              value={value.item_id}
              filterTrackingType="asset"
              onSelect={(item) => onChange({ ...value, item_id: String(item.id) })}
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
            <Select 
              items={categoryOptions} 
              value={value.category_id} 
              onValueChange={(v) => onChange({ ...value, category_id: v })}
            >
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder="Select asset category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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
                placeholder="e.g., Desktop System Unit"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
                className="mt-1.5 w-full"
              />
            </Field>
            <Field>
              <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                Unit of Measure <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                required
                placeholder="e.g., unit, set, piece"
                value={value.unit_of_measure}
                onChange={(e) => onChange({ ...value, unit_of_measure: e.target.value })}
                className="mt-1.5 w-full"
              />
            </Field>
          </div>

          {/* Image Capture & Upload Field */}
          <ImageCaptureInput
            onImageSelected={(file) => onChange({ ...value, image: file })}
            currentImageUrl={value.image ? URL.createObjectURL(value.image) : null}
          />
        </FieldGroup>
      )}

      {/* Pricing & Serial Switches Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={value.unit_cost}
            onChange={(e) => onChange({ ...value, unit_cost: e.target.value })}
            className="mt-1.5 w-full"
          />
        </Field>

        {/* Toggle Property Number */}
        <Field className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={value.has_property_number}
              onCheckedChange={(c) => onChange({ ...value, has_property_number: c })}
            />
            <FieldLabel className="cursor-pointer text-xs font-semibold text-foreground">
              Assign Property Number
            </FieldLabel>
          </div>
        </Field>

        {/* Toggle Serial Number Tracking */}
        <Field className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={value.has_serial_number}
              onCheckedChange={(c) =>
                onChange({
                  ...value,
                  has_serial_number: c,
                  serial_numbers: c ? value.serial_numbers : [],
                })
              }
            />
            <FieldLabel className="cursor-pointer text-xs font-semibold text-foreground">
              Track Serial Numbers
            </FieldLabel>
          </div>
        </Field>
      </div>

      {/* Model Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field>
          <FieldLabel className="text-xs font-medium text-muted-foreground">Model</FieldLabel>
          <Input
            placeholder="e.g., OptiPlex 7090"
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            className="mt-1.5 w-full"
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs font-medium text-muted-foreground">Manufacturer</FieldLabel>
          <Input
            placeholder="e.g., Dell Inc."
            value={value.manufacturer_name}
            onChange={(e) => onChange({ ...value, manufacturer_name: e.target.value })}
            className="mt-1.5 w-full"
          />
        </Field>
        <Field>
          <FieldLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            Country of Origin
          </FieldLabel>
          <Input
            placeholder="e.g., Philippines, Japan"
            value={value.country_of_origin}
            onChange={(e) => onChange({ ...value, country_of_origin: e.target.value })}
            className="mt-1.5 w-full"
          />
        </Field>
      </div>

      {value.item_mode === 'new' && (
        <Field>
          <FieldLabel className="text-xs font-medium text-muted-foreground">
            Estimated Useful Life (in years)
          </FieldLabel>
          <Input
            placeholder="e.g., 5"
            value={value.estimated_useful_life}
            onChange={(e) => onChange({ ...value, estimated_useful_life: e.target.value })}
            className="mt-1.5 w-full"
          />
        </Field>
      )}

      {value.has_serial_number && sets > 0 && (
        <Field className="pt-2">
          <FieldLabel className="text-xs font-medium text-muted-foreground mb-1.5">
            Serial Numbers <span className="text-destructive">*</span> ({sets} needed)
          </FieldLabel>
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