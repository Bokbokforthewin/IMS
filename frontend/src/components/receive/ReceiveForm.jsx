import React, { useEffect, useState } from 'react';

import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';

import { Input } from '@/components/ui/input';

import { CalendarIcon } from 'lucide-react';

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

import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function parseLocalDate(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function formatDateForBackend(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

export default function ReceiveForm({
  items,
  receiveForm,
  setReceiveForm,
  handleApiCall,
  onSuccess,
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [arrivalDate, setArrivalDate] = useState(
    parseLocalDate(receiveForm.arrival_date)
  );

  const [arrivalMonth, setArrivalMonth] = useState(
    parseLocalDate(receiveForm.arrival_date) || new Date()
  );

  const [arrivalDateValue, setArrivalDateValue] = useState(
    formatDateForDisplay(parseLocalDate(receiveForm.arrival_date))
  );

  useEffect(() => {
    const parsedDate = parseLocalDate(receiveForm.arrival_date);
    setArrivalDate(parsedDate);
    if (parsedDate) {
      setArrivalMonth(parsedDate);
      setArrivalDateValue(formatDateForDisplay(parsedDate));
    } else {
      setArrivalDateValue('');
    }
  }, [receiveForm.arrival_date]);

  const itemOptions = (items || []).map((i) => {
    const brandText = i.brand ? `[${i.brand}]` : '';
    const specText = i.specifications ? `(${i.specifications})` : '';
    const typeText = i.type ? `- ${i.type}` : '';

    let stockLabel = 'Consumable';
    if (i.tracking_type === 'serialized') stockLabel = 'Serialized';
    else if (i.tracking_type === 'non-serialized') stockLabel = 'Non-Serialized Asset';
    else if (i.unit_of_measure) stockLabel = `Consumable (${i.unit_of_measure})`;

    return {
      value: String(i.id),
      label: `${i.name} ${brandText} ${specText} ${typeText} — ${stockLabel}`.replace(/\s+/g, ' ').trim(),
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!receiveForm.item_id) {
      return;
    }

    handleApiCall('/stocks/receive', receiveForm, () => {
      setReceiveForm({
        item_id: '',
        unit_cost: '',
        arrival_date: '',
        tracking_type: '',
        serial_number: '',
        model: '',
        manufacturer_name: '',
        country_of_origin: '',
        estimated_useful_life: '',
        quantity: '',
      });

      setArrivalDate(undefined);
      setArrivalMonth(new Date());
      setArrivalDateValue('');
      setDatePickerOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    });
  };

  const selectedItem = (items || []).find((i) => i.id == receiveForm.item_id);
  const trackingType = selectedItem?.tracking_type || '';
  const isConsumable = trackingType === 'consumable';
  const isSerialized = trackingType === 'serialized';
  const isNonSerialized = trackingType === 'non-serialized';
  const isAsset = isSerialized || isNonSerialized;

  return (
    <div className="receive-panel">
      <h2 className="receive-panel__title">Receive Stock / Inbound Delivery</h2>
      <form className="receive-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={!receiveForm.item_id ? undefined : false}>
            <FieldLabel htmlFor="item_id">Select Catalog Item *</FieldLabel>
            <Select
              items={itemOptions}
              value={receiveForm.item_id ? String(receiveForm.item_id) : ''}
              onValueChange={(value) => {
                const selected = (items || []).find((i) => String(i.id) === value);
                setReceiveForm({
                  ...receiveForm,
                  item_id: value,
                  tracking_type: selected?.tracking_type || '',
                });
              }}
            >
              <SelectTrigger id="item_id" className="w-full">
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {itemOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {selectedItem && (
              <FieldDescription>
                <b>Item Code:</b> {selectedItem.item_code}
                {' | '}
                <b>Brand:</b> {selectedItem.brand || 'N/A'}
                {' | '}
                <b>Specs:</b> {selectedItem.specifications || 'N/A'}
                {' | '}
                <b>Unit:</b> {selectedItem.unit_of_measure}
                {' | '}
                <b>Reorder Level:</b> {selectedItem.reorder_level}
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="unit_cost">Unit Cost (₱) *</FieldLabel>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              required
              value={receiveForm.unit_cost || ''}
              onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="arrival-date">Arrival Date *</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="arrival-date"
                value={arrivalDateValue}
                placeholder="September 16, 2026"
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setArrivalDateValue(inputValue);
                  const parsedDate = new Date(inputValue);
                  if (isValidDate(parsedDate)) {
                    setArrivalDate(parsedDate);
                    setArrivalMonth(parsedDate);
                    setReceiveForm({
                      ...receiveForm,
                      arrival_date: formatDateForBackend(parsedDate),
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setDatePickerOpen(true);
                  }
                }}
              />
              <InputGroupAddon align="inline-end">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger
                    render={
                      <InputGroupButton
                        id="arrival-date-picker"
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Select arrival date"
                      >
                        <CalendarIcon />
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
                      selected={arrivalDate}
                      month={arrivalMonth}
                      onMonthChange={setArrivalMonth}
                      onSelect={(selectedDate) => {
                        if (!selectedDate) return;
                        setArrivalDate(selectedDate);
                        setArrivalMonth(selectedDate);
                        setArrivalDateValue(formatDateForDisplay(selectedDate));
                        setReceiveForm({
                          ...receiveForm,
                          arrival_date: formatDateForBackend(selectedDate),
                        });
                        setDatePickerOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </InputGroupAddon>
            </InputGroup>
            <input
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              required
              value={receiveForm.arrival_date || ''}
              onChange={() => {}}
              style={{
                position: 'absolute',
                opacity: 0,
                height: 0,
                width: 0,
                pointerEvents: 'none',
              }}
            />
          </Field>

          {(isConsumable || isNonSerialized) && (
            <Field>
              <FieldLabel htmlFor="quantity">Quantity *</FieldLabel>
              <Input
                id="quantity"
                type="number"
                min="1"
                required
                value={receiveForm.quantity || ''}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
              />
            </Field>
          )}

          {isAsset && (
            <FieldSet>
              <FieldLegend>
                {isSerialized ? 'Serialized Asset Fields' : 'Non-Serialized Asset Fields'}
              </FieldLegend>
              <FieldGroup>
                {(isSerialized || isNonSerialized) && (
                  <Field>
                    <FieldLabel htmlFor="serial_number">Serial Number *</FieldLabel>
                    <FieldDescription>
                      Required for serialized assets.
                    </FieldDescription>
                    <Input
                      id="serial_number"
                      type="text"
                      required
                      placeholder="Serial Number"
                      value={receiveForm.serial_number || ''}
                      onChange={(e) => setReceiveForm({ ...receiveForm, serial_number: e.target.value })}
                    />
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="model">Model (Optional)</FieldLabel>
                  <Input
                    id="model"
                    type="text"
                    placeholder="Model"
                    value={receiveForm.model || ''}
                    onChange={(e) => setReceiveForm({ ...receiveForm, model: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="manufacturer_name">Name of Manufacturer (Optional)</FieldLabel>
                  <Input
                    id="manufacturer_name"
                    type="text"
                    placeholder="e.g. Epson"
                    value={receiveForm.manufacturer_name || ''}
                    onChange={(e) => setReceiveForm({ ...receiveForm, manufacturer_name: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="country_of_origin">Country of Origin (Optional)</FieldLabel>
                  <Input
                    id="country_of_origin"
                    type="text"
                    placeholder="e.g. Japan"
                    value={receiveForm.country_of_origin || ''}
                    onChange={(e) => setReceiveForm({ ...receiveForm, country_of_origin: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="estimated_useful_life">Estimated Useful Life (Optional)</FieldLabel>
                  <Input
                    id="estimated_useful_life"
                    type="number"
                    placeholder="e.g. 5 Years"
                    value={receiveForm.estimated_useful_life || ''}
                    onChange={(e) => setReceiveForm({ ...receiveForm, estimated_useful_life: e.target.value })}
                  />
                  <FieldDescription>
                    This updates the item's useful life catalog-wide, not just this unit.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldSet>
          )}
        </FieldGroup>

        <Button type="submit" className="mt-4">
          Process Inbound Stock
        </Button>
      </form>
    </div>
  );
}