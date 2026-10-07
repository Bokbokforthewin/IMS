import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarIcon, Search, Check, X } from 'lucide-react';
import api from '../../api/client';

import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
function IssuanceDatePicker({ value, onChange }) {
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
        id="issuance_date"
        value={inputValue}
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
                aria-label="Select issuance date"
                type="button"
              >
                <CalendarIcon className="size-4" />
                <span className="sr-only">Select issuance date</span>
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

// --- Helper to Format User Label ---
function getUserLabel(user) {
  if (!user) return '';
  const desig = user.designation ? ` — ${user.designation}` : '';
  const dept = user.unit || user.division ? ` (${[user.unit, user.division].filter(Boolean).join(' / ')})` : '';
  return `${user.name}${desig}${dept}`;
}

// --- Responsive Searchable Employee Select Dropdown ---
function UserSearch({ users = [], userId, onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync search input when userId changes externally or on user list load
  useEffect(() => {
    if (!userId) {
      setSearchTerm('');
    } else {
      const match = users.find((u) => String(u.id) === String(userId));
      if (match) {
        const label = getUserLabel(match);
        if (label !== searchTerm && !isOpen) {
          setSearchTerm(label);
        }
      }
    }
  }, [userId, users]);

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

  // Filter users based on input query
  const filteredUsers = (users || []).filter((user) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const name = (user.name || '').toLowerCase();
    const designation = (user.designation || '').toLowerCase();
    const unit = (user.unit || '').toLowerCase();
    const division = (user.division || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    return (
      name.includes(q) ||
      designation.includes(q) ||
      unit.includes(q) ||
      division.includes(q) ||
      email.includes(q)
    );
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    // Auto-match exact name or formatted label
    const exactMatch = users.find((u) => {
      const label = getUserLabel(u).toLowerCase();
      const name = (u.name || '').toLowerCase();
      const trimmed = val.trim().toLowerCase();
      return trimmed && (label === trimmed || name === trimmed);
    });

    if (exactMatch) {
      onSelectUser(String(exactMatch.id));
    } else {
      onSelectUser('');
    }
  };

  const handleSelectOption = (user) => {
    setSearchTerm(getUserLabel(user));
    onSelectUser(String(user.id));
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSelectUser('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id="issued_to_id"
          type="text"
          required
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
            aria-label="Clear employee search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Employee List Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg max-h-64 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-sm">
              {filteredUsers.map((u) => {
                const isSelected = String(u.id) === String(userId);
                const dept = [u.unit, u.division].filter(Boolean).join(' / ');

                return (
                  <li
                    key={u.id}
                    onClick={() => handleSelectOption(u)}
                    className={`flex flex-col gap-0.5 p-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {u.name}
                        {u.designation && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            — {u.designation}
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>

                    {dept && (
                      <div className="text-xs text-muted-foreground">
                        {dept}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No matching employees found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IssueConsumablesForm({ item, handleApiCall, onSuccess }) {
  const [form, setForm] = useState({
    item_id: item?.id || '',
    quantity_requested: '',
    issued_to_id: '',
    issuance_date: '',
    purpose: '',
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch users using authenticated client
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/v1/users');
      const json = response.data;

      let userList = [];
      if (Array.isArray(json)) {
        userList = json;
      } else if (json && Array.isArray(json.data)) {
        userList = json.data;
      }

      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Keep item_id in sync when item prop updates
  useEffect(() => {
    setForm((f) => ({ ...f, item_id: item?.id || '' }));
  }, [item]);

  const selectedUser = users.find((u) => String(u.id) === String(form.issued_to_id));

  // Pre-validate form before opening confirmation modal
  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.quantity_requested || !form.issued_to_id || !form.issuance_date) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (Number(form.quantity_requested) > Number(item?.total_stock || 0)) {
      setErrorMessage(`Requested quantity exceeds available stock (${item?.total_stock}).`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setIsConfirmOpen(false);

    if (typeof handleApiCall !== 'function') {
      setErrorMessage('Configuration error: handleApiCall handler is missing.');
      return;
    }

    setLoading(true);
    try {
      const res = await handleApiCall('/consumables/issue', form);
      if (res?.message) {
        setSuccessMessage(res.message);
      }
      setForm({
        item_id: item?.id || '',
        quantity_requested: '',
        issued_to_id: '',
        issuance_date: '',
        purpose: '',
      });
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to process issuance.');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {errorMessage && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 font-medium">
          {successMessage}
        </div>
      )}

      {/* Target Item Summary Card */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Issuing Item</span>
        <h4 className="text-base font-semibold">{item.name}</h4>
        <p className="text-xs text-muted-foreground">
          <span> Available: </span>
          <strong className="text-foreground">{item.total_stock} {item.unit_of_measure}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">[{item.item_code}]</span>
        </p>
      </div>

      <form onSubmit={handlePreSubmit}>
        <FieldGroup className="space-y-4">

           {/* Searchable Issued To Employee Field */}
          <Field>
            <FieldLabel htmlFor="issued_to_id">
              Issued To <span className="text-destructive">*</span>
            </FieldLabel>
            <UserSearch
              users={users}
              userId={form.issued_to_id}
              onSelectUser={(id) => setForm({ ...form, issued_to_id: id })}
            />
          </Field>


          {/* Quantity Field */}
          <Field>
            <FieldLabel htmlFor="quantity_requested">
              Quantity to Issue <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="quantity_requested"
              type="number"
              required
              min="1"
              max={item.total_stock}
              value={form.quantity_requested}
              onChange={(e) => setForm({ ...form, quantity_requested: e.target.value })}
            />
          </Field>

          {/* Custom Issuance DatePicker Field */}
          <Field>
            <FieldLabel htmlFor="issuance_date">
              Issuance Date <span className="text-destructive">*</span>
            </FieldLabel>
            <IssuanceDatePicker
              value={form.issuance_date}
              onChange={(dateStr) => setForm({ ...form, issuance_date: dateStr })}
            />
          </Field>

          {/* Purpose / Remarks Field */}
          <Field>
            <FieldLabel htmlFor="purpose">Purpose / Remarks</FieldLabel>
            <Input
              id="purpose"
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </Field>
        </FieldGroup>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Processing...' : 'Issue Consumables & Generate RIS'}
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Consumable Issuance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to issue <strong>{form.quantity_requested} {item.unit_of_measure}</strong> of <strong>{item.name}</strong> to <strong>{selectedUser?.name || 'the selected employee'}</strong>? This action will decrement inventory stock and generate a Requisition and Issue Slip (RIS).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit}>
              Confirm & Issue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}