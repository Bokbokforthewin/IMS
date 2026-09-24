import React, { useEffect, useState, useRef } from 'react';
import { CalendarIcon, Search, Check, X } from 'lucide-react';

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
    <InputGroup>
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
                <CalendarIcon className="size-4" />
                <span className="sr-only">Select arrival date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0"
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

  // Sync input string when itemId is selected or reset externally
  useEffect(() => {
    if (!itemId) {
      setSearchTerm('');
    } else {
      const match = items.find((i) => String(i.id) === String(itemId));
      if (match) {
        const label = getItemLabel(match);
        if (label !== searchTerm && !isOpen) {
          setSearchTerm(label);
        }
      }
    }
  }, [itemId, items]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items matching query against multiple fields
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
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    // Auto-match exact name or formatted label
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
  };

  const handleSelectOption = (item) => {
    setSearchTerm(getItemLabel(item));
    onSelectItem(String(item.id));
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSelectItem('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id="item_id"
          type="text"
          required
          placeholder="Search item name, brand, type, specs, category..."
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

      {/* Recommendations Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg max-h-64 overflow-y-auto">
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
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {item.tracking_type === 'asset'
                            ? 'Asset'
                            : `Consumable (${item.unit_of_measure || 'qty'})`}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    </div>

                    {/* Additional specifications & details */}
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
              No matching catalog items found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReceiveForm({
  items,
  receiveForm,
  setReceiveForm,
  handleApiCall,
  onSuccess,
}) {
  const [serials, setSerials] = useState([]);

  const selectedItem = (items || []).find(
    (i) => String(i.id) === String(receiveForm.item_id)
  );
  const isAsset = selectedItem?.tracking_type === 'asset';
  const quantity = Number(receiveForm.quantity) || 0;

  useEffect(() => {
    setSerials([]);
  }, [receiveForm.item_id, receiveForm.quantity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!receiveForm.item_id) return;
    if (isAsset && serials.length !== quantity) return;

    const payload = isAsset
      ? {
          ...receiveForm,
          has_property_number: Boolean(receiveForm.has_property_number),
          serial_numbers: serials,
        }
      : receiveForm;

    handleApiCall('/stocks/receive', payload, () => {
      setReceiveForm({
        item_id: '',
        unit_cost: '',
        arrival_date: '',
        quantity: '',
        has_property_number: false,
        model: '',
        manufacturer_name: '',
        country_of_origin: '',
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
          {/* Responsive Auto-Matching Catalog Item Search */}
          <Field data-invalid={!receiveForm.item_id ? undefined : false}>
            <FieldLabel htmlFor="item_id">Select Catalog Item *</FieldLabel>
            <ItemSearch
              items={items}
              itemId={receiveForm.item_id}
              onSelectItem={(id) =>
                setReceiveForm({ ...receiveForm, item_id: id })
              }
            />
          </Field>

          {/* Unit Cost */}
          <Field>
            <FieldLabel htmlFor="unit_cost">Unit Cost (₱) *</FieldLabel>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={receiveForm.unit_cost || ''}
              onChange={(e) =>
                setReceiveForm({ ...receiveForm, unit_cost: e.target.value })
              }
            />
          </Field>

          {/* Custom DatePicker Input */}
          <Field>
            <FieldLabel htmlFor="arrival_date">Arrival Date *</FieldLabel>
            <ArrivalDatePicker
              value={receiveForm.arrival_date || ''}
              onChange={(dateStr) =>
                setReceiveForm({ ...receiveForm, arrival_date: dateStr })
              }
            />
          </Field>

          {/* Quantity */}
          <Field>
            <FieldLabel htmlFor="quantity">Quantity *</FieldLabel>
            <Input
              id="quantity"
              type="number"
              min="1"
              required
              value={receiveForm.quantity || ''}
              onChange={(e) =>
                setReceiveForm({ ...receiveForm, quantity: e.target.value })
              }
            />
            <FieldDescription>
              How many identical units arrived in this delivery.
            </FieldDescription>
          </Field>

          {/* Asset Specific Details */}
          {isAsset && (
            <FieldSet>
              <FieldLegend>Asset Stock Details</FieldLegend>
              <FieldGroup className="gap-4">
                {/* Switch for Property Number */}
                <Field className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="has_property_number"
                      checked={Boolean(receiveForm.has_property_number)}
                      onCheckedChange={(checked) =>
                        setReceiveForm({
                          ...receiveForm,
                          has_property_number: checked,
                        })
                      }
                    />
                    <FieldLabel
                      htmlFor="has_property_number"
                      className="cursor-pointer font-medium"
                    >
                      Assign Property Number
                    </FieldLabel>
                  </div>
                  <FieldDescription>
                    Turn on to automatically assign a property number. Leave off if
                    the asset only requires a serial number.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="model">Model (Optional)</FieldLabel>
                  <Input
                    id="model"
                    value={receiveForm.model || ''}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, model: e.target.value })
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="manufacturer_name">
                    Manufacturer (Optional)
                  </FieldLabel>
                  <Input
                    id="manufacturer_name"
                    value={receiveForm.manufacturer_name || ''}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        manufacturer_name: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="country_of_origin">
                    Country of Origin (Optional)
                  </FieldLabel>
                  <Input
                    id="country_of_origin"
                    value={receiveForm.country_of_origin || ''}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        country_of_origin: e.target.value,
                      })
                    }
                  />
                </Field>

                {quantity > 0 && (
                  <Field>
                    <FieldLabel>Serial Numbers *</FieldLabel>
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

        <Button
          type="submit"
          className="mt-4"
          disabled={isAsset && serials.length !== quantity}
        >
          Process Inbound Stock
        </Button>
      </form>
    </div>
  );
}