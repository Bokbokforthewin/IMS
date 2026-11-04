import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CalendarIcon, Search, Check, X, Send } from 'lucide-react';
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

import { useAuth } from '@/context/AuthContext';

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
    <InputGroup className="w-full overflow-hidden rounded-lg border border-input bg-card shadow-2xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
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
        placeholder="Select issuance date..."
        className="h-8 text-xs bg-transparent border-0 focus-visible:ring-0 shadow-none"
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
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="sr-only">Select issuance date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0 border border-border z-50 bg-popover"
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
  const unitStr = user.unit?.name || user.unit;
  const divStr = user.division?.name || user.division;
  const dept = unitStr || divStr ? ` (${[unitStr, divStr].filter(Boolean).join(' / ')})` : '';
  return `${user.name}${desig}${dept}`;
}

// --- Responsive Searchable Employee Select Dropdown ---
function UserSearch({ users = [], userId, onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

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
  }, [userId, users, isOpen]);

  // Robust click-outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase().trim();

    return (users || []).filter((user) => {
      const name = (user.name || '').toLowerCase();
      const designation = (user.designation?.name || user.designation || '').toLowerCase();
      const unit = (user.unit?.name || user.unit || '').toLowerCase();
      const division = (user.division?.name || user.division || '').toLowerCase();
      const email = (user.email || '').toLowerCase();

      return (
        name.includes(q) ||
        designation.includes(q) ||
        unit.includes(q) ||
        division.includes(q) ||
        email.includes(q)
      );
    });
  }, [users, searchTerm]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true); // Open dropdown when typing

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
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="issued_to_id"
          type="text"
          required
          placeholder="Search employee name or department..."
          value={searchTerm}
          // Changed from opening immediately on focus to only opening if there is text or explicit click
          onClick={() => setIsOpen(true)}
          onChange={handleInputChange}
          className="pl-8 pr-7 h-8 text-xs bg-card border-border"
          autoComplete="off"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear employee search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Employee List Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border border-border shadow-md max-h-56 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-xs">
              {filteredUsers.map((u) => {
                const isSelected = String(u.id) === String(userId);
                const unitStr = u.unit?.name || u.unit;
                const divStr = u.division?.name || u.division;
                const dept = [unitStr, divStr].filter(Boolean).join(' / ');

                return (
                  <li
                    key={u.id}
                    onClick={() => handleSelectOption(u)}
                    className={`flex flex-col gap-0.5 p-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground text-xs">
                        {u.name}
                        {u.designation && (
                          <span className="ml-1 text-[11px] text-muted-foreground font-normal">
                            — {u.designation?.name || u.designation}
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>

                    {dept && (
                      <div className="text-[10px] text-muted-foreground">
                        {dept}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-2.5 text-xs text-muted-foreground text-center">
              No matching employees found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IssueConsumablesForm({ item, handleApiCall, onSuccess }) {
  const { user: currentUser } = useAuth();

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

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/v1/users/options');
      const data = response.data;

      const userList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.users)
        ? data.users
        : [];

      setUsers(userList);
    } catch (err) {
      console.error('Failed to load user options:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const combinedUsers = useMemo(() => {
    if (!currentUser?.id) return users;
    const exists = users.some((u) => String(u.id) === String(currentUser.id));
    if (!exists) {
      return [
        {
          id: currentUser.id,
          name: currentUser.name || 'Current User',
          unit: currentUser.unit,
          designation: currentUser.designation,
          division: currentUser.division,
        },
        ...users,
      ];
    }
    return users;
  }, [users, currentUser]);

  useEffect(() => {
    setForm((f) => ({ ...f, item_id: item?.id || '' }));
  }, [item]);

  const selectedUser = combinedUsers.find((u) => String(u.id) === String(form.issued_to_id));

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
    <div className="space-y-4">
      {/* Alert Notifications */}
      {errorMessage && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft p-3 text-xs text-destructive-text font-medium">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-success-border bg-success-soft p-3 text-xs text-success-text font-medium">
          {successMessage}
        </div>
      )}

      {/* Target Item Summary Card */}
      <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Issuing Item</span>
        <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
        <p className="text-xs text-muted-foreground">
          <span>Available: </span>
          <strong className="text-foreground">{item.total_stock} {item.unit_of_measure}</strong>
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          [{item.item_code}]
        </p>
      </div>

      <form onSubmit={handlePreSubmit}>
        <FieldGroup className="space-y-4">
          {/* Searchable Issued To Employee Field */}
          <Field>
            <FieldLabel htmlFor="issued_to_id" className="text-xs font-semibold text-muted-foreground">
              Issued To <span className="text-destructive">*</span>
            </FieldLabel>
            <UserSearch
              users={combinedUsers}
              userId={form.issued_to_id}
              onSelectUser={(id) => setForm({ ...form, issued_to_id: id })}
            />
          </Field>

          {/* Quantity Field */}
          <Field>
            <FieldLabel htmlFor="quantity_requested" className="text-xs font-semibold text-muted-foreground">
              Quantity to Issue <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="quantity_requested"
              type="number"
              required
              min="1"
              max={item.total_stock}
              placeholder="e.g., 5"
              value={form.quantity_requested}
              onChange={(e) => setForm({ ...form, quantity_requested: e.target.value })}
              className="h-8 text-xs bg-card border-border"
            />
          </Field>

          {/* Custom Issuance DatePicker Field */}
          <Field>
            <FieldLabel htmlFor="issuance_date" className="text-xs font-semibold text-muted-foreground">
              Issuance Date <span className="text-destructive">*</span>
            </FieldLabel>
            <IssuanceDatePicker
              value={form.issuance_date}
              onChange={(dateStr) => setForm({ ...form, issuance_date: dateStr })}
            />
          </Field>

          {/* Purpose / Remarks Field */}
          <Field>
            <FieldLabel htmlFor="purpose" className="text-xs font-semibold text-muted-foreground">Purpose / Remarks</FieldLabel>
            <Input
              id="purpose"
              type="text"
              placeholder="Optional additional context..."
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="h-8 text-xs bg-card border-border"
            />
          </Field>
        </FieldGroup>

        {/* Action Button */}
        <div className="mt-5 pt-3 border-t border-border flex justify-end">
          <Button type="submit" size="sm" disabled={loading} className="gap-1.5 text-xs h-8 w-full sm:w-auto">
            <Send className="h-3.5 w-3.5" />
            {loading ? 'Processing...' : 'Issue Consumables & Generate RIS'}
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Confirm Consumable Issuance</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to issue <strong className="text-foreground">{form.quantity_requested} {item.unit_of_measure}</strong> of <strong className="text-foreground">{item.name}</strong> to <strong className="text-foreground">{selectedUser?.name || 'the selected employee'}</strong>? This action will decrement inventory stock and generate a Requisition and Issue Slip (RIS).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit} className="text-xs h-8">
              Confirm & Issue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}