import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
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
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_BASE_URL = '/api/v1';

function getCost(item) {
  const rawCost = item.unit_cost ?? item.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

export default function DeliveryForm({
  cart = [],
  initialDetails,
  onUpdateAttachment,
  onRemove,
  onBack,
  onNext,
}) {
  const [users, setUsers] = useState([]);
  
  // Signatory level state
  const [receivedMrById, setReceivedMrById] = useState(
    initialDetails?.receivedMrById || initialDetails?.received_mr_by_id || ''
  );
  const [issuedById, setIssuedById] = useState(
    initialDetails?.issuedById || initialDetails?.issued_by_id || ''
  );
  const [dateIssued, setDateIssued] = useState(
    initialDetails?.dateIssued || new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState(initialDetails?.remarks || '');

  // Item-level Secondary Receivers mapping { [itemKey]: userId }
  const [itemUsers, setItemUsers] = useState(() => {
    const initialMap = {};
    cart.forEach((item) => {
      initialMap[item.key] = item.user_id || initialDetails?.userId || '';
    });
    return initialMap;
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Keep itemUsers synchronized if new cart items are added
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

      // Auto-assign secondary receiver to attached children peripherals if parent changes
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

    const primaryReceiverUser = users.find((u) => String(u.id) === String(receivedMrById));
    const issuerUser = users.find((u) => String(u.id) === String(issuedById));

    // Map cart items with their specific secondary receiver (user_id)
    const cartWithSecondaryReceivers = cart.map((item) => ({
      ...item,
      user_id: itemUsers[item.key] || receivedMrById, // Secondary receiver
      secondary_receiver_user: users.find(
        (u) => String(u.id) === String(itemUsers[item.key] || receivedMrById)
      ),
    }));

    onNext({
      receivedMrById, // Primary Receiver (for PAR/ICS bottom signature)
      received_mr_by_id: receivedMrById,
      issuedById,     // Sender / Property Admin
      issued_by_id: issuedById,
      dateIssued,
      remarks,
      primaryReceiverUser,
      issuerUser,
      updatedCart: cartWithSecondaryReceivers,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            Asset Details & Receiver Assignments
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign secondary receivers per asset, then select the primary PAR/ICS signatory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
          </Badge>
          <Badge variant="secondary" className="text-xs px-2.5 py-1 font-mono">
            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item list + Secondary Receiver (user_id) + attachment editing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Items & Secondary Receiver Allocation
            </h3>
          </div>

          {cart.map((item) => {
            const itemCost = getCost(item);
            const isPAR = itemCost >= 50000;
            const attachedToItem = cart.find((c) => c.key === item.attachToKey);
            const validTargets = attachTargets.filter((t) => t.key !== item.key);
            const selectedSecondaryUser = itemUsers[item.key] || '';

            return (
              <Card key={item.key} className="shadow-2xs">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Asset Header Info */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <Badge
                          variant={isPAR ? 'default' : 'secondary'}
                          className="text-[10px] uppercase"
                        >
                          {isPAR ? 'PAR (≥₱50k)' : 'ICS (<₱50k)'}
                        </Badge>
                        {attachedToItem && (
                          <Badge variant="outline" className="text-xs gap-1 text-blue-600 bg-blue-50/50">
                            <Paperclip className="h-3 w-3" /> Attached to: {attachedToItem.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {item.property_number && (
                          <span>
                            Prop No: <code>{item.property_number}</code>
                          </span>
                        )}
                        {item.serial_number && (
                          <span>
                            SN: <code>{item.serial_number}</code>
                          </span>
                        )}
                        <span className="font-semibold text-foreground">
                          ₱{itemCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Controls Row: Peripheral Attach & Secondary Receiver (user_id) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                        {/* Secondary Receiver Dropdown (user_id) */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            Secondary Receiver (`user_id`):
                          </label>
                          <Select
                            value={String(selectedSecondaryUser)}
                            onValueChange={(val) => handleItemUserChange(item.key, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-full bg-background">
                              <SelectValue placeholder="Select secondary receiver..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                                  {u.name} {u.designation ? `(${u.designation})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Attach Peripheral Selector */}
                        {validTargets.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5" /> Attach to Main Asset:
                            </label>
                            <Select
                              value={item.attachToKey || 'NONE'}
                              onValueChange={(val) =>
                                onUpdateAttachment(item.key, val === 'NONE' ? null : val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-full bg-background">
                                <SelectValue placeholder="Standalone" />
                              </SelectTrigger>
                              <SelectContent>
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
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs gap-1.5 self-start sm:self-auto"
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

        {/* Primary Receiver (received_mr_by_id) / Issuer / Date / Remarks */}
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Document Signatory & Delivery Details
            </CardTitle>
            <CardDescription className="text-xs">
              Select the primary accountable person (`received_mr_by_id`) whose name appears at the bottom of the PAR/ICS receipt.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Receiver (received_mr_by_id) */}
              <div className="space-y-2">
                <Label htmlFor="received_mr_by_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Primary Receiver (`received_mr_by_id`) <span className="text-destructive">*</span>
                </Label>
                <Select value={String(receivedMrById)} onValueChange={setReceivedMrById} required>
                  <SelectTrigger id="received_mr_by_id" className="w-full h-10">
                    <SelectValue placeholder="Select primary accountable receiver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        <div className="flex items-center justify-between w-full">
                          <span>{u.name}</span>
                          {u.designation && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({u.designation})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  This person signs the bottom PAR/ICS acknowledgment receipt.
                </p>
              </div>

              {/* Sender / Issued By (issued_by_id) */}
              <div className="space-y-2">
                <Label htmlFor="issued_by_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Issued By / Sender (`issued_by_id`) <span className="text-destructive">*</span>
                </Label>
                <Select value={String(issuedById)} onValueChange={setIssuedById} required>
                  <SelectTrigger id="issued_by_id" className="w-full h-10">
                    <SelectValue placeholder="Select issuing officer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} {u.designation ? `— ${u.designation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  The property officer or system administrator issuing the assets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
              {/* Date Issued */}
              <div className="space-y-2">
                <Label htmlFor="date_issued" className="text-xs font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  Date Issued <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date_issued"
                  type="date"
                  required
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Remarks / Purpose
                </Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Issued for Offsite Project, Regular Deployment..."
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 bg-muted/50 px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Selection
            </Button>
            <Button
              type="submit"
              disabled={!receivedMrById || !issuedById || !dateIssued || cart.length === 0}
              className="w-full sm:w-auto gap-2 font-medium"
            >
              Review Delivery <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}