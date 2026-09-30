import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Trash2,
  Paperclip,
  UserCheck,
  Calendar,
  FileText,
  Building2,
  Loader2,
} from 'lucide-react';

const API_BASE_URL = '/api/v1';

function money(value) {
  return `₱${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AccountabilityForm({
  serializedAssets = [],
  initialAssetId = null,
  handleApiCall,
  onSuccess,
}) {
  const [lines, setLines] = useState(() =>
    initialAssetId
      ? [{ key: `a-${initialAssetId}`, serialized_asset_id: Number(initialAssetId), attachToKey: null }]
      : []
  );

  const [pendingAssetId, setPendingAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [issuedById, setIssuedById] = useState('');
  const [dateIssued, setDateIssued] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users list on mount
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Sync initial asset if passed from parent
  useEffect(() => {
    if (initialAssetId) {
      const numId = Number(initialAssetId);
      setLines((prev) => {
        if (prev.some((l) => l.serialized_asset_id === numId)) return prev;
        return [{ key: `a-${numId}`, serialized_asset_id: numId, attachToKey: null }];
      });
    }
  }, [initialAssetId]);

  // Filter available assets not currently in cart
  const availableAssets = useMemo(() => {
    return (serializedAssets || []).filter(
      (a) =>
        a.status === 'Available' &&
        !a.current_holder_id &&
        !lines.some((l) => l.serialized_asset_id === a.id)
    );
  }, [serializedAssets, lines]);

  const findAsset = useCallback(
    (id) => (serializedAssets || []).find((a) => a.id === Number(id)),
    [serializedAssets]
  );

  // Recipient and unit head detection
  const selectedUserNum = Number(userId);
  const recipient = useMemo(
    () => users.find((u) => u.id === selectedUserNum),
    [users, selectedUserNum]
  );

  const unitHead = useMemo(() => {
    if (!recipient?.unit) return null;
    return users.find(
      (u) => u.unit === recipient.unit && u.id !== recipient.id && (u.is_head || u.is_unit_head)
    );
  }, [users, recipient]);

  // Cart Management
  const addLine = () => {
    if (!pendingAssetId) return;
    const id = Number(pendingAssetId);
    setLines((prev) => [...prev, { key: `a-${id}`, serialized_asset_id: id, attachToKey: null }]);
    setPendingAssetId('');
  };

  const removeLine = (key) => {
    setLines((prev) =>
      prev
        .filter((l) => l.key !== key)
        .map((l) => (l.attachToKey === key ? { ...l, attachToKey: null } : l))
    );
  };

  const updateAttachment = (key, attachToKey) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, attachToKey: attachToKey || null } : l))
    );
  };

  // Cost & Classification Computations
  const totalCost = useMemo(() => {
    return lines.reduce((sum, l) => {
      const asset = findAsset(l.serialized_asset_id);
      const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
      return sum + cost;
    }, 0);
  }, [lines, findAsset]);

  const docBreakdown = useMemo(() => {
    let parCount = 0;
    let icsCount = 0;

    lines.forEach((l) => {
      const asset = findAsset(l.serialized_asset_id);
      const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
      if (cost >= 50000) parCount++;
      else icsCount++;
    });

    return { parCount, icsCount };
  }, [lines, findAsset]);

  // Potential primary parent targets (must have a property number)
  const attachTargets = useMemo(() => {
    return lines.filter((l) => Boolean(findAsset(l.serialized_asset_id)?.property_number));
  }, [lines, findAsset]);

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (lines.length === 0 || !userId || !issuedById || !dateIssued) return;

    setSubmitting(true);

    const payload = {
      cart: lines.map((l) => ({
        key: l.key,
        serialized_asset_id: l.serialized_asset_id,
        attach_to_key: l.attachToKey || undefined,
      })),
      user_id: Number(userId),
      issued_by_id: Number(issuedById),
      date_issued: dateIssued,
      remarks: remarks.trim() || undefined,
    };

    const apiCall = typeof handleApiCall === 'function' ? handleApiCall : fetch;

    Promise.resolve(apiCall('/accountability/issue-asset', payload))
      .then(() => {
        setLines([]);
        setPendingAssetId('');
        setUserId('');
        setIssuedById('');
        setRemarks('');
        if (typeof onSuccess === 'function') onSuccess();
      })
      .catch((err) => console.error('Issuance failed:', err))
      .finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Assets in Delivery Cart */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Assets in This Delivery ({lines.length})
            </CardTitle>
            <div className="flex gap-1.5">
              {docBreakdown.parCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {docBreakdown.parCount} PAR Form(s)
                </Badge>
              )}
              {docBreakdown.icsCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {docBreakdown.icsCount} ICS Form(s)
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {lines.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
              No assets selected. Add an available item below to start.
            </div>
          ) : (
            lines.map((line) => {
              const asset = findAsset(line.serialized_asset_id);
              const cost = Number(asset?.unit_cost ?? asset?.item?.unit_cost ?? 0);
              const isPar = cost >= 50000;
              const itemName = asset?.item?.name || asset?.item_name || 'Asset Item';
              const validTargets = attachTargets.filter((t) => t.key !== line.key);

              return (
                <div
                  key={line.key}
                  className="p-3 border rounded-lg bg-card space-y-2 relative transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{itemName}</span>
                        <Badge variant={isPar ? 'destructive' : 'outline'} className="text-[10px] px-1.5 py-0">
                          {isPar ? 'PAR' : 'ICS'}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                        {asset?.serial_number && (
                          <span>SN: <code className="font-mono">{asset.serial_number}</code></span>
                        )}
                        {asset?.property_number && (
                          <span>Prop #: <code className="font-mono">{asset.property_number}</code></span>
                        )}
                        <span className="font-semibold text-foreground">{money(cost)}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.key)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Attachment Dropdown */}
                  {validTargets.length > 0 && (
                    <div className="pt-2 border-t flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <select
                        value={line.attachToKey || ''}
                        onChange={(e) => updateAttachment(line.key, e.target.value)}
                        className="w-full text-xs bg-muted/40 border border-input rounded-md px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="">Standalone (Not Attached)</option>
                        {validTargets.map((t) => {
                          const tAsset = findAsset(t.serialized_asset_id);
                          return (
                            <option key={t.key} value={t.key}>
                              Attach to: {tAsset?.item?.name || 'Item'} ({tAsset?.property_number || `SN: ${tAsset?.serial_number}`})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Cart Footer Summary */}
          {lines.length > 0 && (
            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-sm font-medium">Total Issuance Value:</span>
              <span className="text-base font-bold text-primary">{money(totalCost)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Add More Assets Section */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Add Asset to Delivery</Label>
        <div className="flex gap-2">
          <select
            value={pendingAssetId}
            onChange={(e) => setPendingAssetId(e.target.value)}
            className="flex-1 text-sm bg-background border border-input rounded-md px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">Select available asset...</option>
            {availableAssets.map((a) => {
              const cost = Number(a.unit_cost ?? a.item?.unit_cost ?? 0);
              const name = a.item?.name || a.item_name || 'Item';
              return (
                <option key={a.id} value={a.id}>
                  {name} — SN: {a.serial_number || 'N/A'} ({money(cost)})
                </option>
              );
            })}
          </select>

          <Button
            type="button"
            onClick={addLine}
            disabled={!pendingAssetId}
            variant="secondary"
            className="shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use this to include attached peripherals (e.g., keyboards, monitors, or system units).
        </p>
      </div>

      {/* 3. Recipient Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
          Issue To (Recipient) <span className="text-destructive">*</span>
        </Label>
        <select
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Select employee...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.designation || 'Staff'} ({u.unit || u.division || 'General'})
            </option>
          ))}
        </select>

        {recipient && (
          <div className="text-xs bg-muted/40 p-2 rounded-md border flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Unit Head:</strong> {unitHead ? `${unitHead.name} (${unitHead.designation || 'Head'})` : 'No unit head designated'}
            </span>
          </div>
        )}
      </div>

      {/* 4. Issued By & Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Issued By (Issuer) <span className="text-destructive">*</span>
          </Label>
          <select
            required
            value={issuedById}
            onChange={(e) => setIssuedById(e.target.value)}
            className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">Select issuer name...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.designation || 'Property Custodian'}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Date Issued <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            required
            value={dateIssued}
            onChange={(e) => setDateIssued(e.target.value)}
          />
        </div>
      </div>

      {/* 5. Remarks */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Remarks (Optional)
        </Label>
        <Input
          type="text"
          placeholder="e.g. Granted for office desktop setup project"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Submit Action */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={submitting || lines.length === 0 || !userId || !issuedById}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Delivery...
          </>
        ) : (
          `Issue ${lines.length} Asset${lines.length !== 1 ? 's' : ''}`
        )}
      </Button>
    </form>
  );
}