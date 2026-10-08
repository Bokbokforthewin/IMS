import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  User,
  UserCheck,
  Calendar as CalendarIcon,
  MessageSquare,
  Package,
  Search,
  Check,
  X,
  FileText,
  RotateCcw,
  Send,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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

import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';

// Endpoints for fetching active users
const ENDPOINTS = ['/v1/users', '/users'];

// --- Helper Functions ---
function getUserLabel(user) {
  if (!user) return '';
  const details = [user.designation, user.unit || user.division].filter(Boolean).join(', ');
  return details ? `${user.name} (${details})` : user.name || '';
}

function getAssetLabel(asset) {
  if (!asset) return '';
  const categoryName = asset.item?.category?.name ? `[${asset.item.category.name}]` : '';
  const itemName = asset.item ? asset.item.name : `Item ID: ${asset.item_id}`;
  const brandModel = (asset.brand || asset.model) ? `(${asset.brand || ''} ${asset.model || ''})`.trim() : '';
  const sn = asset.serial_number ? `SN: ${asset.serial_number}` : 'SN: N/A';
  const pn = asset.property_number ? `PN: ${asset.property_number}` : '';
  const details = [sn, pn].filter(Boolean).join(' | ');

  return `${categoryName} ${itemName} ${brandModel} — ${details}`.trim();
}

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

// --- Custom DatePicker Component ---
function TransferDatePicker({ value, onChange, id = 'transfer_date' }) {
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
    <InputGroup className="w-full">
      <InputGroupInput
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        placeholder="Select transaction date..."
        className="h-8 text-xs"
        required
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                id={`${id}-trigger`}
                variant="ghost"
                size="icon-xs"
                aria-label="Select date"
                type="button"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="sr-only">Select date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0 z-50"
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

// --- Searchable Employee Select Dropdown ---
function UserSearch({
  users = [],
  userId,
  onSelectUser,
  id = 'user_search',
  placeholder = 'Search employee...',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedUser = useMemo(() => {
    return users.find((u) => String(u.id) === String(userId));
  }, [users, userId]);

  const selectedLabel = useMemo(() => {
    return selectedUser ? getUserLabel(selectedUser) : '';
  }, [selectedUser]);

  useEffect(() => {
    if (!userId) {
      setSearchTerm('');
    } else if (selectedUser && !isOpen) {
      setSearchTerm(selectedLabel);
    }
  }, [userId, selectedUser, selectedLabel, isOpen]);

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
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed || (selectedLabel && trimmed === selectedLabel.trim().toLowerCase())) {
      return users;
    }
    return users.filter((user) => {
      const name = (user.name || '').toLowerCase();
      const designation = (user.designation || '').toLowerCase();
      const unit = (user.unit || user.division || '').toLowerCase();
      return name.includes(trimmed) || designation.includes(trimmed) || unit.includes(trimmed);
    });
  }, [users, searchTerm, selectedLabel]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    const exactMatch = users.find((u) => {
      const name = (u.name || '').toLowerCase();
      const trimmed = val.trim().toLowerCase();
      return trimmed && name === trimmed;
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
          id={id}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onChange={handleInputChange}
          className="pl-8 pr-7 h-8 text-xs"
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-56 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-xs">
              {filteredUsers.map((u) => {
                const isSelected = String(u.id) === String(userId);
                const subText = [u.designation, u.unit || u.division].filter(Boolean).join(' • ');

                return (
                  <li
                    key={u.id}
                    onClick={() => handleSelectOption(u)}
                    className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{u.name}</span>
                      {subText && (
                        <span className="text-[10px] text-muted-foreground">{subText}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
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

// --- Searchable Serialized Asset Select Dropdown ---
function AssetSearch({
  assets = [],
  assetId,
  onSelectAsset,
  transferType,
  id = 'asset_search',
  placeholder = 'Search asset by name, SN, or property no...',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => String(a.id) === String(assetId));
  }, [assets, assetId]);

  const selectedLabel = useMemo(() => {
    return selectedAsset ? getAssetLabel(selectedAsset) : '';
  }, [selectedAsset]);

  useEffect(() => {
    if (!assetId) {
      setSearchTerm('');
    } else if (selectedAsset && !isOpen) {
      setSearchTerm(selectedLabel);
    }
  }, [assetId, selectedAsset, selectedLabel, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAssets = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed || (selectedLabel && trimmed === selectedLabel.trim().toLowerCase())) {
      return assets;
    }
    return assets.filter((a) => {
      const category = (a.item?.category?.name || '').toLowerCase();
      const itemName = (a.item?.name || '').toLowerCase();
      const brand = (a.brand || '').toLowerCase();
      const model = (a.model || '').toLowerCase();
      const sn = (a.serial_number || '').toLowerCase();
      const pn = (a.property_number || '').toLowerCase();
      const status = (a.status || '').toLowerCase();

      return (
        category.includes(trimmed) ||
        itemName.includes(trimmed) ||
        brand.includes(trimmed) ||
        model.includes(trimmed) ||
        sn.includes(trimmed) ||
        pn.includes(trimmed) ||
        status.includes(trimmed)
      );
    });
  }, [assets, searchTerm, selectedLabel]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    if (!val) {
      onSelectAsset('');
    }
  };

  const handleSelectOption = (asset, isDisabled) => {
    if (isDisabled) return;
    setSearchTerm(getAssetLabel(asset));
    onSelectAsset(String(asset.id));
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSelectAsset('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onChange={handleInputChange}
          className="pl-8 pr-7 h-8 text-xs"
          autoComplete="off"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear asset search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto">
          {filteredAssets.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-xs">
              {filteredAssets.map((a) => {
                const isSelected = String(a.id) === String(assetId);
                const isAvailable = a.status === 'Available';
                const isDisabled = transferType === 'RETURN' && isAvailable;

                const categoryName = a.item?.category?.name ? `[${a.item.category.name}]` : '';
                const itemName = a.item ? a.item.name : `Item ID: ${a.item_id}`;
                const brandModel = (a.brand || a.model)
                  ? `(${a.brand || ''} ${a.model || ''})`.trim()
                  : '';
                const subText = `SN: ${a.serial_number || 'N/A'}${a.property_number ? ` • PN: ${a.property_number}` : ''} • [${a.status}]`;

                return (
                  <li
                    key={a.id}
                    onClick={() => handleSelectOption(a, isDisabled)}
                    className={`flex items-center justify-between p-2 transition-colors ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-muted/30'
                        : isSelected
                        ? 'bg-accent text-accent-foreground font-medium cursor-pointer'
                        : 'hover:bg-muted/80 cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {categoryName} {itemName} {brandModel}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{subText}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-2.5 text-xs text-muted-foreground text-center">
              No matching assets found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Form Component ---
export default function TransferOrReturnForm({
  serializedAssets = [],
  handleApiCall,
  onSuccess,
}) {
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState({
    serialized_asset_id: '',
    transfer_type: 'RETURN',
    user_id: '',       // Return From / Transferring From (Current Holder)
    transfered_to: '', // Receiving Officer / Transferring To (Recipient)
    description: '',
    reason: '',
    transfer_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await api.get(endpoint);
        const data = response.data;

        const userList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data?.data)
          ? data.data.data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.users)
          ? data.users
          : [];

        if (userList.length > 0) {
          setUsers(userList);
          setIsLoadingUsers(false);
          return;
        }
      } catch (err) {
        // Silently continue to next endpoint
      }
    }
    setIsLoadingUsers(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Ensure current logged-in user exists in user dropdown
  const combinedUsers = useMemo(() => {
    if (!currentUser?.id) return users;
    const exists = users.some((u) => String(u.id) === String(currentUser.id));
    if (!exists) {
      return [
        {
          id: currentUser.id,
          name: currentUser.name || 'Current User',
          designation: currentUser.designation || '',
          unit: currentUser.unit || currentUser.division || '',
        },
        ...users,
      ];
    }
    return users;
  }, [users, currentUser]);

  const handleAssetChange = (assetId) => {
    const selectedAsset = serializedAssets.find((a) => String(a.id) === String(assetId));

    // Auto-fill "user_id" (Return From / Transferring From) with asset's current holder
    const derivedHolderId = selectedAsset?.current_holder_id
      ? String(selectedAsset.current_holder_id)
      : '';

    setForm((prev) => ({
      ...prev,
      serialized_asset_id: assetId,
      user_id: derivedHolderId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await handleApiCall('/asset-transfers', form, () => {
        setForm({
          serialized_asset_id: '',
          transfer_type: 'RETURN',
          user_id: '',
          transfered_to: '',
          description: '',
          reason: '',
          transfer_date: new Date().toISOString().split('T')[0],
          remarks: '',
        });
        if (typeof onSuccess === 'function') onSuccess();
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Equipment Return & Property Transfer
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Type Toggle */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Action Type <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.transfer_type === 'RETURN'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="transfer_type"
                    value="RETURN"
                    checked={form.transfer_type === 'RETURN'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transfer_type: e.target.value,
                        serialized_asset_id: '',
                        user_id: '',
                      })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium cursor-pointer">Return Equipment</span>
                    <p className="text-xs text-muted-foreground">
                      Transfer item back to warehouse stock (Status becomes Available)
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.transfer_type === 'TRANSFER'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="transfer_type"
                    value="TRANSFER"
                    checked={form.transfer_type === 'TRANSFER'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transfer_type: e.target.value,
                        serialized_asset_id: '',
                        user_id: '',
                      })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium cursor-pointer">Transfer Equipment</span>
                    <p className="text-xs text-muted-foreground">
                      Reassign item from employee to employee (PTR Document)
                    </p>
                  </div>
                </label>
              </div>
            </div>

          <div className="space-y-2">
          <Label htmlFor="asset_search" className="text-xs font-semibold flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" />
            Select Serialized Asset <span className="text-destructive">*</span>
          </Label>
          <AssetSearch
            id="asset_search"
            assets={serializedAssets}
            assetId={form.serialized_asset_id}
            onSelectAsset={(id) => handleAssetChange(id)}
            transferType={form.transfer_type}
            placeholder="Search by asset name, SN, or property number..."
          />
          {form.transfer_type === 'RETURN' && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
              Assets marked as <b>[Available]</b> are already in warehouse stock and cannot be returned.
            </p>
          )}
        </div>

            {/* User Selectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
              {/* Return From / Transferring From -> user_id */}
              <div className="space-y-2">
                <Label htmlFor="user_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  {form.transfer_type === 'RETURN' ? 'Return From' : 'Transferring From'} (Current Holder) <span className="text-destructive">*</span>
                </Label>
                <UserSearch
                  id="user_id"
                  users={combinedUsers}
                  userId={form.user_id}
                  onSelectUser={(id) => setForm((prev) => ({ ...prev, user_id: id }))}
                  placeholder="Search current holder..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Auto-filled from asset record — update only if actual holder differs.
                </p>
              </div>

              {/* Receiving Officer / Transferring To -> transfered_to */}
              <div className="space-y-2">
                <Label htmlFor="transfered_to" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  {form.transfer_type === 'RETURN' ? 'Receiving Officer (Warehouse)' : 'Transferring To (Recipient)'} <span className="text-destructive">*</span>
                </Label>
                <UserSearch
                  id="transfered_to"
                  users={combinedUsers}
                  userId={form.transfered_to}
                  onSelectUser={(id) => setForm((prev) => ({ ...prev, transfered_to: id }))}
                  placeholder={
                    form.transfer_type === 'RETURN'
                      ? 'Search warehouse receiving officer...'
                      : 'Search recipient employee...'
                  }
                />
              </div>
            </div>

            {/* Context Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Description / Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  type="text"
                  required
                  placeholder="e.g., Laptop reassignment, unit relocation"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-semibold">
                  Reason for {form.transfer_type === 'RETURN' ? 'Return' : 'Transfer'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reason"
                  type="text"
                  required
                  placeholder={
                    form.transfer_type === 'RETURN'
                      ? 'e.g., Resigned, Retired, Defective'
                      : 'e.g., Departmental Reassignment'
                  }
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Transaction Date */}
              <div className="space-y-2">
                <Label htmlFor="transfer_date" className="text-xs font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Transaction Date <span className="text-destructive">*</span>
                </Label>
                <TransferDatePicker
                  id="transfer_date"
                  value={form.transfer_date}
                  onChange={(date) => setForm({ ...form, transfer_date: date })}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Remarks / Notes
                </Label>
                <Input
                  id="remarks"
                  type="text"
                  placeholder="Optional additional context..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Form Submit Button */}
            <div className="pt-4 border-t flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={
                  submitting ||
                  !form.serialized_asset_id ||
                  !form.user_id ||
                  !form.transfered_to ||
                  !form.description ||
                  !form.reason ||
                  !form.transfer_date
                }
                className="gap-1.5 text-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting
                  ? 'Processing...'
                  : form.transfer_type === 'RETURN'
                  ? 'Process Equipment Return'
                  : 'Generate Property Transfer Report (PTR)'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}