import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../api/client';
import {
  User,
  UserCheck,
  Users,
  ShieldCheck,
  Calendar as CalendarIcon,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Package,
  Paperclip,
  Trash2,
  NotebookPen,
  Search,
  Check,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// --- Helper Functions ---
function getCost(item) {
  const rawCost = item.unit_cost ?? item.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

function getUserLabel(user) {
  if (!user) return '';
  return user.name || '';
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
function IssuanceDatePicker({ value, onChange, id = "date_issued" }) {
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
        placeholder="Select issuance date..."
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

// --- Searchable Employee Select Dropdown ---
function UserSearch({ users = [], userId, onSelectUser, id = "user_search", placeholder = "Search employee..." }) {
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
  }, [userId, users, isOpen]);

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

  // Filter users based on name, unit, designation, and division
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase().trim();

    return users.filter((user) => {
      const name = (user.name || '').toLowerCase();
      const unit = (user.unit?.name || user.unit || '').toLowerCase();
      const designation = (user.designation?.name || user.designation || '').toLowerCase();
      const division = (user.division?.name || user.division || '').toLowerCase();

      return (
        name.includes(q) ||
        unit.includes(q) ||
        designation.includes(q) ||
        division.includes(q)
      );
    });
  }, [users, searchTerm]);

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
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          className="pl-8 pr-7 h-8 text-xs bg-card"
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
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border border-border shadow-md max-h-56 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <ul className="py-1 divide-y divide-border/40 text-xs">
              {filteredUsers.map((u) => {
                const isSelected = String(u.id) === String(userId);
                const unitStr = u.unit?.name || u.unit;
                const desigStr = u.designation?.name || u.designation;
                const divStr = u.division?.name || u.division;

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
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{u.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>

                    {(unitStr || desigStr || divStr) && (
                      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-1.5 gap-y-0.5">
                        {desigStr && <span>{desigStr}</span>}
                        {unitStr && <span>{unitStr}</span>}
                        {divStr && <span>({divStr})</span>}
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

// --- Main Delivery Form Component ---
export default function DeliveryForm({
  cart = [],
  initialDetails,
  onUpdateAttachment,
  onRemove,
  onBack,
  onNext,
}) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Signatory level state
  const [receivedMrById, setReceivedMrById] = useState(
    initialDetails?.receivedMrById || initialDetails?.received_mr_by_id || ''
  );

  // Default "Issued By" to current logged-in user
  const [issuedById, setIssuedById] = useState(
    initialDetails?.issuedById || initialDetails?.issued_by_id || currentUser?.id || ''
  );

  const [dateIssued, setDateIssued] = useState(
    initialDetails?.dateIssued || new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState(initialDetails?.remarks || '');

  // Keep issuedById aligned with currentUser once loaded
  useEffect(() => {
    if (currentUser?.id && !issuedById) {
      setIssuedById(String(currentUser.id));
    }
  }, [currentUser, issuedById]);

  // Secondary receivers mapping per cart item
  const [itemUsers, setItemUsers] = useState(() => {
    const initialMap = {};
    cart.forEach((item) => {
      initialMap[item.key] = item.user_id || initialDetails?.userId || '';
    });
    return initialMap;
  });

  // Fetch user list options directly via central Axios instance
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
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
      console.warn('DeliveryForm: Failed to fetch user options:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Ensure current user exists in users list
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

  // Sync secondary receiver mapping when cart items update
  useEffect(() => {
    setItemUsers((prev) => {
      const updated = { ...prev };
      cart.forEach((item) => {
        if (!(item.key in updated)) {
          updated[item.key] = item.user_id || receivedMrById || '';
        }
      });
      return updated;
    });
  }, [cart, receivedMrById]);

  const handleItemUserChange = (itemKey, userId) => {
    setItemUsers((prev) => {
      const updated = { ...prev, [itemKey]: userId };

      // Cascade receiver assignment to attached peripherals
      cart.forEach((child) => {
        if (child.attachToKey === itemKey) {
          updated[child.key] = userId;
        }
      });

      return updated;
    });
  };

  const attachTargets = cart.filter((c) => c.property_number || c.propertyNumber);
  const total = cart.reduce((sum, c) => sum + getCost(c), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!receivedMrById || !issuedById || !dateIssued) return;

    const primaryReceiverUser = combinedUsers.find(
      (u) => String(u.id) === String(receivedMrById) || u.name === receivedMrById
    );
    const issuerUser = combinedUsers.find(
      (u) => String(u.id) === String(issuedById) || u.name === issuedById
    );

    const cartWithSecondaryReceivers = cart.map((item) => {
      const targetUserId = itemUsers[item.key] || receivedMrById;
      const secondaryUser = combinedUsers.find(
        (u) => String(u.id) === String(targetUserId) || u.name === targetUserId
      );

      return {
        ...item,
        user_id: secondaryUser?.id || targetUserId,
        secondary_receiver_user: secondaryUser || primaryReceiverUser,
      };
    });

    onNext({
      receivedMrById: primaryReceiverUser?.id || receivedMrById,
      received_mr_by_id: primaryReceiverUser?.id || receivedMrById,
      issuedById: issuerUser?.id || issuedById,
      issued_by_id: issuerUser?.id || issuedById,
      dateIssued,
      remarks,
      primaryReceiverUser,
      issuerUser,
      updatedCart: cartWithSecondaryReceivers,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-5">
      {/* Prominent Section Task Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Asset Details & End User Assignments
          </h3>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-xs px-2.5 py-0.5 gap-1 border-border">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
          </Badge>
          <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cart items list */}
        <div className="space-y-3">
          {cart.map((item) => {
            const itemCost = getCost(item);
            const validTargets = attachTargets.filter((t) => t.key !== item.key);
            const selectedSecondaryUser = itemUsers[item.key] || '';

            return (
              <Card 
                key={item.key} 
                className="rounded-lg border border-border bg-card shadow-2xs overflow-visible relative transition-all focus-within:z-30 hover:z-20"
              >
                <CardContent className="p-4 overflow-visible">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 overflow-visible">
                    <div className="flex-1 space-y-3 overflow-visible">
                      
                      {/* Asset Header Info */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{item.name}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {item.property_number && (
                          <span>
                            Property No: <code className="font-medium text-foreground">{item.property_number}</code>
                          </span>
                        )}
                        {item.serial_number && (
                          <span>
                            Serial Number: <code className="font-medium text-foreground">{item.serial_number}</code>
                          </span>
                        )}
                        <span>
                          Item Price: <code className="font-medium text-foreground">₱{itemCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
                        </span>
                      </div>

                      {/* Item Controls Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/60 overflow-visible">
                        
                        {/* Per-Item End User Selector */}
                        <div className="space-y-1 relative z-30 overflow-visible">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            End User:
                          </label>
                          <UserSearch
                            id={`user_search_${item.key}`}
                            users={combinedUsers}
                            userId={selectedSecondaryUser}
                            onSelectUser={(userId) => handleItemUserChange(item.key, userId)}
                            placeholder="Search end user..."
                          />
                        </div>

                        {/* Attach Peripheral Selector */}
                        {validTargets.length > 0 && (
                          <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> Attach to Main Asset:
                            </label>
                            <Select
                              value={item.attachToKey || 'NONE'}
                              onValueChange={(val) =>
                                onUpdateAttachment(item.key, val === 'NONE' ? null : val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-full bg-card border-border">
                                <SelectValue placeholder="Standalone" />
                              </SelectTrigger>
                              <SelectContent className="z-50 border-border">
                                <SelectItem value="NONE" className="text-xs">
                                  Standalone (not attached)
                                </SelectItem>
                                {validTargets.map((t) => (
                                  <SelectItem key={t.key} value={t.key} className="text-xs">
                                    Attach to: {t.name} ({t.property_number || 'N/A'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Remove Action */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive-soft h-8 text-xs gap-1.5 self-start sm:self-auto shrink-0"
                      onClick={() => onRemove(item.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Primary Receiver / Issuer / Date / Remarks Card */}
        <Card className="rounded-lg border border-border bg-card shadow-2xs">
          <CardHeader className="border-b border-border py-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Document Signatory & Delivery Details
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issued To Field */}
              <div className="space-y-1.5">
                <Label htmlFor="received_mr_by_id" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Issued To (Accountable Receiver) <span className="text-destructive">*</span>
                </Label>
                <UserSearch
                  id="received_mr_by_id"
                  users={combinedUsers}
                  userId={receivedMrById}
                  onSelectUser={setReceivedMrById}
                  placeholder="Search accountable receiver..."
                />
              </div>

              {/* Issued By Field */}
              <div className="space-y-1.5">
                <Label htmlFor="issued_by_id" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Issued By <span className="text-destructive">*</span>
                </Label>
                <UserSearch
                  id="issued_by_id"
                  users={combinedUsers}
                  userId={issuedById}
                  onSelectUser={setIssuedById}
                  placeholder="Search issuer..."
                />
              </div>

              {/* Date Issued Field */}
              <div className="space-y-1.5">
                <Label htmlFor="date_issued" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Issuance Date <span className="text-destructive">*</span>
                </Label>
                <IssuanceDatePicker
                  id="date_issued"
                  value={dateIssued}
                  onChange={setDateIssued}
                />
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <Label htmlFor="remarks" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Purpose / Remarks
                </Label>
                <Input
                  id="remarks"
                  type="text"
                  placeholder="Enter optional issuance notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>
            </div>
          </CardContent>

          {/* Form Actions Footer */}
          <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-1.5 text-xs h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!receivedMrById || !issuedById || !dateIssued || cart.length === 0}
              className="gap-1.5 text-xs h-8"
            >
              Next Step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}