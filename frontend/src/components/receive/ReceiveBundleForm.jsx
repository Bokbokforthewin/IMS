import React, { useEffect, useState, useRef } from 'react';
import { 
  CalendarIcon, Search, Check, X, Boxes, Layers, 
  Trash2, Plus, DollarSign, Calendar as CalendarIconLucide, Globe, ShieldCheck, Save 
} from 'lucide-react';

import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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

import SerialNumberScanner from './SerialNumberScanner.jsx';

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

// --- Helper to Format Item Label ---
function getItemLabel(item) {
  if (!item) return '';
  const brandStr = item.brand ? ` [${item.brand}]` : '';
  return `${item.name}${brandStr}`;
}

// --- Responsive Auto-Matching Item Search Bar ---
function ItemSearch({ items = [], itemId, onSelectItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current) return;

    if (!itemId) {
      setSearchTerm('');
    } else {
      const match = items.find((i) => String(i.id) === String(itemId));
      if (match) {
        setSearchTerm(getItemLabel(match));
      }
    }
  }, [itemId, items]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = (items || []).filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const name = (item.name || '').toLowerCase();
    const brand = (item.brand || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const specs = (item.specifications || '').toLowerCase();
    const unit = (item.unit_of_measure || '').toLowerCase();
    const tracking = (item.tracking_type || '').toLowerCase();
    const categoryName = (item.category?.name || item.category_name || '').toLowerCase();

    return (
      name.includes(q) ||
      brand.includes(q) ||
      type.includes(q) ||
      specs.includes(q) ||
      unit.includes(q) ||
      tracking.includes(q) ||
      categoryName.includes(q)
    );
  });

  const handleInputChange = (e) => {
    isTypingRef.current = true;
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    const exactMatch = items.find((i) => {
      const label = getItemLabel(i).toLowerCase();
      const name = (i.name || '').toLowerCase();
      const trimmed = val.trim().toLowerCase();
      return trimmed && (label === trimmed || name === trimmed);
    });

    if (exactMatch) {
      onSelectItem(String(exactMatch.id));
    } else {
      onSelectItem('');
    }

    setTimeout(() => {
      isTypingRef.current = false;
    }, 0);
  };

  const handleSelectOption = (item) => {
    isTypingRef.current = false;
    setSearchTerm(getItemLabel(item));
    onSelectItem(String(item.id));
    setIsOpen(false);
  };

  const handleClear = () => {
    isTypingRef.current = false;
    setSearchTerm('');
    onSelectItem('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full mt-1.5">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id="item_id"
          type="text"
          required
          placeholder="Search asset item name, brand, type, specs, category..."
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          className="pl-9 pr-8"
          autoComplete="off"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear item search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border border-border shadow-md max-h-64 overflow-y-auto">
          {filteredItems.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-sm">
              {filteredItems.map((item) => {
                const isSelected = String(item.id) === String(itemId);
                const categoryName = item.category?.name || item.category_name;

                return (
                  <li
                    key={item.id}
                    onClick={() => handleSelectOption(item)}
                    className={`flex flex-col gap-1 p-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {item.name}
                        {item.brand && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            [{item.brand}]
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                            item.tracking_type === 'asset'
                              ? 'bg-info-soft text-info-text border border-info-border'
                              : 'bg-success-soft text-success-text border border-success-border'
                          }`}
                        >
                          {item.tracking_type === 'asset'
                            ? 'Asset'
                            : `Consumable (${item.unit_of_measure || 'qty'})`}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {categoryName && <span>Cat: {categoryName}</span>}
                      {item.type && <span>Type: {item.type}</span>}
                      {item.specifications && (
                        <span className="truncate max-w-[220px]">
                          Specs: {item.specifications}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No matching asset catalog items found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Empty Bundle Component State ---
function emptyComponent() {
  return {
    item_id: '',
    unit_cost: '',
    has_property_number: false,
    has_serial_number: true,
    model: '',
    manufacturer_name: '',
    country_of_origin: '',
    serial_numbers: [],
  };
}

// --- Component Fields Row for Main or Peripheral Assets ---
function ComponentFields({ label, items, value, onChange, sets }) {
  const assetItems = (items || []).filter((i) => i.tracking_type === 'asset');
  const fieldKey = label.replace(/\s+/g, '_').toLowerCase();

  return (
    <FieldGroup className="space-y-4">
      <Field data-invalid={!value.item_id ? undefined : false}>
        <FieldLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          {label} <span className="text-destructive">*</span>
        </FieldLabel>
        <ItemSearch
          items={assetItems}
          itemId={value.item_id}
          onSelectItem={(id) => onChange({ ...value, item_id: id })}
        />
      </Field>

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
              id={`has_property_number_${fieldKey}`}
              checked={value.has_property_number}
              onCheckedChange={(checked) =>
                onChange({ ...value, has_property_number: checked })
              }
            />
            <FieldLabel
              htmlFor={`has_property_number_${fieldKey}`}
              className="cursor-pointer text-xs font-semibold text-foreground"
            >
              Assign Property Number
            </FieldLabel>
          </div>
          <FieldDescription className="text-[11px] text-muted-foreground pl-1">
            Auto-generate or assign property tags per unit.
          </FieldDescription>
        </Field>

        {/* Toggle Serial Number Tracking */}
        <Field className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Switch
              id={`has_serial_number_${fieldKey}`}
              checked={value.has_serial_number}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  has_serial_number: checked,
                  serial_numbers: checked ? value.serial_numbers : [],
                })
              }
            />
            <FieldLabel
              htmlFor={`has_serial_number_${fieldKey}`}
              className="cursor-pointer text-xs font-semibold text-foreground"
            >
              Track Serial Number
            </FieldLabel>
          </div>
          <FieldDescription className="text-[11px] text-muted-foreground pl-1">
            Require entering/scanning serials per unit.
          </FieldDescription>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field>
          <FieldLabel className="text-xs font-medium text-muted-foreground">Model</FieldLabel>
          <Input
            placeholder="e.g., UltraSharp U2723QE"
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
            onChange={(e) =>
              onChange({ ...value, manufacturer_name: e.target.value })
            }
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
            onChange={(e) =>
              onChange({ ...value, country_of_origin: e.target.value })
            }
            className="mt-1.5 w-full"
          />
        </Field>
      </div>

      {sets > 0 && value.has_serial_number && (
        <Field className="pt-2">
          <FieldLabel className="text-xs font-medium text-muted-foreground mb-1.5">
            Serial Numbers <span className="text-destructive">*</span>
          </FieldLabel>
          <SerialNumberScanner
            quantity={sets}
            serials={value.serial_numbers}
            onChange={(newSerials) =>
              onChange({ ...value, serial_numbers: newSerials })
            }
          />
        </Field>
      )}
    </FieldGroup>
  );
}

// --- Main Form Component ---
export default function ReceiveBundleForm({ items, handleApiCall, onSuccess }) {
  const [sets, setSets] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
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

    if (main.has_serial_number && main.serial_numbers.length !== numSets) return;

    for (const p of peripherals) {
      if (p.has_serial_number && p.serial_numbers.length !== numSets) return;
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
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Task Title Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Boxes className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Receive Bundled Assets & Equipment Sets
        </h3>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
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
            </Field>

            <Field>
              <FieldLabel htmlFor="arrival_date" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarIconLucide className="w-3.5 h-3.5 text-muted-foreground" />
                Arrival Date <span className="text-destructive">*</span>
              </FieldLabel>
              <ArrivalDatePicker
                value={arrivalDate}
                onChange={setArrivalDate}
              />
            </Field>
          </div>

          {/* Main Unit Card */}
          <Card className="rounded-lg border border-border bg-card shadow-2xs">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Main System Unit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4">
              <ComponentFields
                label="Main System Component"
                items={items}
                value={main}
                onChange={setMain}
                sets={Number(sets) || 0}
              />
            </CardContent>
          </Card>

          {/* Peripherals Cards */}
          {peripherals.map((p, idx) => (
            <Card key={idx} className="rounded-lg border border-border bg-card shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border py-2.5 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Boxes className="size-4 text-muted-foreground" />
                  Peripheral {idx + 1} (e.g., Monitor, UPS, Keyboard)
                </CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removePeripheral(idx)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-4">
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

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={addPeripheral}
              className="gap-2 text-xs"
            >
              <Plus className="size-4" />
              Add Peripheral Component
            </Button>
          </div>
        </FieldGroup>

        <div className="pt-2 border-t border-border">
          <Button type="submit" className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Process Bundle Stock
          </Button>
        </div>
      </form>
    </div>
  );
}