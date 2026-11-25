import React, { useState, useMemo } from 'react';
import api from '../../api/client';
import { Trash2, X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function getUserDesignation(user) {
  if (!user) return '';
  return user.designation?.name || user.designation || '';
}

export function getUserUnit(user) {
  if (!user) return '';
  return user.unit?.name || user.unit || '';
}

export function formatUserLabel(user, fallback = 'Unassigned') {
  if (!user) return fallback;
  const name = user.name || fallback;
  const designation = getUserDesignation(user);
  const unit = getUserUnit(user);
  const meta = [designation, unit].filter(Boolean).join(' • ');
  return meta ? `${name} (${meta})` : name;
}

function getLineEndUserId(line, fallbackMrUserId) {
  return String(
    line.end_user_id ??
      line.endUser?.id ??
      line.end_user?.id ??
      line.user_id ??
      line.user?.id ??
      line.serialized_asset?.current_holder_id ??
      line.serialized_asset?.current_holder?.id ??
      line.serialized_asset?.currentHolder?.id ??
      fallbackMrUserId ??
      ''
  );
}

export default function EditDetailsModal({ receipt, bundleUser, users, onClose, onSaved }) {
  const initialMrUserId = String(
    receipt.received_mr_by_id ??
      receipt.receivedMrBy?.id ??
      receipt.received_mr_by?.id ??
      receipt.user_id ??
      bundleUser?.id ??
      ''
  );

  const initialIssuedById = String(
    receipt.issued_by_id ?? receipt.issuedBy?.id ?? ''
  );

  const [mrUserId, setMrUserId] = useState(initialMrUserId);
  const [issuedById, setIssuedById] = useState(initialIssuedById);
  const [remarks, setRemarks] = useState(receipt.remarks || '');
  const [lineEndUsers, setLineEndUsers] = useState(() => {
    const map = {};
    (receipt.lines || []).forEach((line) => {
      map[line.id] = getLineEndUserId(line, initialMrUserId);
    });
    return map;
  });
  const [removedLineIds, setRemovedLineIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(String(u.id), u));
    return map;
  }, [users]);

  const selectedMrUser = userById.get(String(mrUserId)) || receipt.receivedMrBy || bundleUser;
  const selectedIssuerUser = userById.get(String(issuedById)) || receipt.issuedBy;

  const activeLines = useMemo(() => {
    const remaining = (receipt.lines || []).filter((line) => !removedLineIds.has(line.id));
    const removedPropertyNumbers = new Set(
      (receipt.lines || [])
        .filter((line) => removedLineIds.has(line.id))
        .map((line) => line.serialized_asset?.property_number)
        .filter(Boolean)
    );

    return remaining.filter((line) => {
      const attachedTo = line.serialized_asset?.attached_to;
      return !(attachedTo && removedPropertyNumbers.has(attachedTo));
    });
  }, [receipt.lines, removedLineIds]);

  const handleToggleRemoveLine = (lineId) => {
    setRemovedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const removedLineIdList = Array.from(removedLineIds);
    const removedAssetIds = (receipt.lines || [])
      .filter((line) => removedLineIds.has(line.id))
      .map((line) => line.serialized_asset?.id)
      .filter(Boolean);

    const payload = {
      received_mr_by_id: mrUserId ? Number(mrUserId) : null,
      user_id: mrUserId ? Number(mrUserId) : null,
      issued_by_id: issuedById ? Number(issuedById) : null,
      remarks,
      removed_line_ids: removedLineIdList,
      removed_asset_ids: removedAssetIds,
      lines: activeLines.map((line) => ({
        id: line.id,
        serialized_asset_id: line.serialized_asset?.id ?? line.serialized_asset_id ?? null,
        end_user_id: lineEndUsers[line.id] ? Number(lineEndUsers[line.id]) : null,
      })),
    };

    try {
      await api.put(`/v1/accountability/receipts/${receipt.id}`, payload);
      toast.success(`Updated ${receipt.document_number}`);
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update MR:', err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to update Management Receipt.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Edit Management Receipt — {receipt.document_number}
            </h4>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Management Receipt User */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Issued To
              </label>
              <Select value={mrUserId} onValueChange={setMrUserId}>
                <SelectTrigger className="h-9 text-xs border-border">
                  <SelectValue placeholder="Select MR User">
                    {selectedMrUser ? formatUserLabel(selectedMrUser) : 'Select MR User'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-border">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                      {formatUserLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issued By User */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Issued By
              </label>
              <Select value={issuedById} onValueChange={setIssuedById}>
                <SelectTrigger className="h-9 text-xs border-border">
                  <SelectValue placeholder="Select Issuer">
                    {selectedIssuerUser ? formatUserLabel(selectedIssuerUser) : 'Select Issuer'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-border">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                      {formatUserLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Remarks</label>
            <Input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              className="h-9 text-xs"
            />
          </div>

          {/* Items Inside the MR Card */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Items ({activeLines.length} active, {removedLineIds.size} removed)
              </label>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border/60 bg-muted/20">
              {(receipt.lines || []).length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No items attached to this receipt.
                </div>
              ) : (
                (receipt.lines || []).map((line) => {
                  const isRemoved = removedLineIds.has(line.id);
                  const itemName =
                    line.item?.name || line.serialized_asset?.item?.name || 'Asset Item';
                  const propNum = line.serialized_asset?.property_number || 'N/A';
                  const currentEndUserId = lineEndUsers[line.id] || '';
                  const currentEndUser =
                    userById.get(String(currentEndUserId)) ||
                    line.endUser ||
                    line.end_user ||
                    line.serialized_asset?.currentHolder ||
                    line.serialized_asset?.current_holder;

                  return (
                    <div
                      key={line.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isRemoved ? 'bg-destructive/10 opacity-70' : 'bg-card'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-medium ${
                              isRemoved ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {itemName}
                          </span>
                          {isRemoved && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Will Return to Available
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {propNum}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isRemoved && (
                          <div className="w-56 sm:w-64">
                            <Select
                              value={currentEndUserId}
                              onValueChange={(val) =>
                                setLineEndUsers((prev) => ({ ...prev, [line.id]: val }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs border-border">
                                <SelectValue placeholder="End User">
                                  {currentEndUser
                                    ? formatUserLabel(currentEndUser, 'End User')
                                    : 'End User'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="border-border">
                                {users.map((u) => (
                                  <SelectItem
                                    key={u.id}
                                    value={String(u.id)}
                                    className="text-xs"
                                  >
                                    {formatUserLabel(u)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant={isRemoved ? 'outline' : 'destructive'}
                          className="h-8 text-xs gap-1"
                          onClick={() => handleToggleRemoveLine(line.id)}
                        >
                          {isRemoved ? (
                            <span>Restore</span>
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}