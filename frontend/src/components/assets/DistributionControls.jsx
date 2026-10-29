// Save as: src/components/assets/DistributionControls.jsx
import React, { useState } from 'react';
import { Loader2, PackageCheck, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const STATUS_STYLES = {
  Available: 'border-slate-300 text-slate-600',
  Assigned: 'border-blue-300 bg-blue-50 text-blue-700',
  Distributed: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  'Under Repair': 'border-amber-300 bg-amber-50 text-amber-700',
  Condemned: 'border-red-300 bg-red-50 text-red-700',
};

function errorMessage(err, fallback) {
  const data = err.response?.data;
  return (
    data?.error ||
    (data?.errors ? Object.values(data.errors).flat().join(' ') : null) ||
    fallback
  );
}

export function AssetStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={`px-1.5 py-0 text-[10px] font-medium ${STATUS_STYLES[status] || ''}`}
    >
      {status || 'Unknown'}
    </Badge>
  );
}

/**
 * Text and behavior of the single "reason" dialog, per mode:
 *  - request: the MR asks ICTU to revert a Distributed item (reason required)
 *  - revert:  ICTU reverts to Assigned (reason required only if there is no pending MR request)
 *  - decline: ICTU declines a pending MR request (no input)
 */
function dialogConfig(mode, asset) {
  const pn = asset?.property_number || 'This item';

  if (mode === 'request') {
    return {
      title: 'Request a revert to Assigned?',
      description: `${pn} is marked Distributed. Only ICTU can change it back, so your reason will be sent to ICTU for review.`,
      action: 'Send request',
      needsReason: true,
      endpoint: 'request-revert',
    };
  }

  if (mode === 'decline') {
    return {
      title: 'Decline the revert request?',
      description: `${pn} will stay Distributed and the request will be cleared.`,
      action: 'Decline request',
      needsReason: false,
      endpoint: 'decline-revert',
    };
  }

  const pending = !!asset?.revert_reason;
  return {
    title: pending ? 'Approve the revert?' : 'Revert to Assigned?',
    description: pending
      ? `${pn} will go back to Assigned. Reason from the MR: “${asset.revert_reason}”`
      : `${pn} will go from Distributed back to Assigned. A reason is required.`,
    action: 'Revert to Assigned',
    needsReason: !pending,
    endpoint: 'revert-distribution',
  };
}

/**
 * All distribution state and actions in one place.
 * onChanged = function that reloads the receipts after a change.
 */
export function useDistribution(onChanged) {
  const { user, hasPermission } = useAuth();
  const isIctu = hasPermission('action:manage asset status');

  const [selected, setSelected] = useState(() => new Set()); // keys: "receiptId:assetId"
  const [confirm, setConfirm] = useState(null); // { rcpt, assetIds }
  const [reasonDialog, setReasonDialog] = useState(null); // { mode, asset }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // The MR named on the receipt, or ICTU
  const canDistribute = (rcpt) =>
    isIctu || (!!user && Number(rcpt.received_mr_by_id) === Number(user.id));

  // Items on this receipt that are waiting to be distributed
  const waitingIds = (rcpt) =>
    (rcpt.lines || [])
      .map((line) => line.serialized_asset)
      .filter((asset) => asset?.status === 'Assigned')
      .map((asset) => asset.id);

  const selectedIds = (rcpt) => {
    const waiting = waitingIds(rcpt);
    return [...selected]
      .filter((key) => key.startsWith(`${rcpt.id}:`))
      .map((key) => Number(key.split(':')[1]))
      .filter((id) => waiting.includes(id));
  };

  const toggle = (receiptId, assetId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = `${receiptId}:${assetId}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --- Distribute ---
  const requestDistribute = (rcpt, assetIds) => setConfirm({ rcpt, assetIds });
  const closeConfirm = () => setConfirm(null);

  const submitDistribute = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await api.post(
        `/v1/accountability/receipts/${confirm.rcpt.id}/distribute`,
        { asset_ids: confirm.assetIds }
      );
      toast.success(res.data?.message || 'Items marked as distributed.');
      setSelected(new Set());
      setConfirm(null);
      await onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to mark items as distributed.'));
    } finally {
      setBusy(false);
    }
  };

  // --- Request / approve / decline a revert ---
  const openReasonDialog = (mode, asset) => {
    setReason('');
    setReasonDialog({ mode, asset });
  };
  const closeReasonDialog = () => {
    setReasonDialog(null);
    setReason('');
  };

  const submitReasonDialog = async () => {
    if (!reasonDialog) return;

    const cfg = dialogConfig(reasonDialog.mode, reasonDialog.asset);
    const text = reason.trim();

    setBusy(true);
    try {
      const res = await api.post(
        `/v1/accountability/serialized-assets/${reasonDialog.asset.id}/${cfg.endpoint}`,
        text ? { reason: text } : {}
      );
      toast.success(res.data?.message || 'Done.');
      closeReasonDialog();
      await onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'The request failed.'));
    } finally {
      setBusy(false);
    }
  };

  return {
    isIctu,
    busy,
    selected,
    confirm,
    reasonDialog,
    reason,
    setReason,
    canDistribute,
    waitingIds,
    selectedIds,
    toggle,
    requestDistribute,
    closeConfirm,
    submitDistribute,
    openReasonDialog,
    closeReasonDialog,
    submitReasonDialog,
  };
}

/**
 * Status badge for one receipt line, plus:
 *  - the selection checkbox (Assigned items this user can distribute)
 *  - "Request revert" for the MR on a Distributed item
 *  - "Revert requested" badge, and "Approve" / "Decline" for ICTU
 *  - a direct "Revert" for ICTU when there is no pending request
 */
export function AssetStatusCell({ line, rcpt, dist }) {
  const asset = line.serialized_asset;
  if (!asset) return null;

  const isDistributed = asset.status === 'Distributed';
  const pending = isDistributed && !!asset.revert_reason;
  const selectable = dist.canDistribute(rcpt) && asset.status === 'Assigned';
  const key = `${rcpt.id}:${asset.id}`;

  console.log({ status: asset.status, isIctu: dist.isIctu, canDistribute: dist.canDistribute(rcpt), mr: rcpt.received_mr_by_id });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectable && (
        <Checkbox
          className="size-3.5"
          checked={dist.selected.has(key)}
          onCheckedChange={() => dist.toggle(rcpt.id, asset.id)}
          aria-label={`Select ${asset.property_number || asset.id} for distribution`}
        />
      )}

      <AssetStatusBadge status={asset.status} />

      {pending && (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700"
          title={`Reason: ${asset.revert_reason}`}
        >
          Revert requested
        </Badge>
      )}

      {/* ICTU */}
      {isDistributed && dist.isIctu && pending && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 gap-0.5 px-1 text-[10px]"
            onClick={() => dist.openReasonDialog('revert', asset)}
            title="Approve the revert to Assigned"
          >
            <Undo2 className="h-3 w-3" />
            Approve
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px]"
            onClick={() => dist.openReasonDialog('decline', asset)}
            title="Decline the request"
          >
            Decline
          </Button>
        </>
      )}

      {isDistributed && dist.isIctu && !pending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 gap-0.5 px-1 text-[10px]"
          onClick={() => dist.openReasonDialog('revert', asset)}
          title="Revert to Assigned (ICTU correction)"
        >
          <Undo2 className="h-3 w-3" />
          Revert
        </Button>
      )}

      {/* MR (not ICTU): can only ask */}
      {isDistributed && !dist.isIctu && dist.canDistribute(rcpt) && !pending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-[10px]"
          onClick={() => dist.openReasonDialog('request', asset)}
          title="Ask ICTU to revert this item to Assigned"
        >
          Request revert
        </Button>
      )}
    </div>
  );
}

/** "Distribute selected" / "Distribute all" buttons for one receipt. */
export function ReceiptDistributeButtons({ rcpt, dist }) {
  if (!dist.canDistribute(rcpt)) return null;

  const waiting = dist.waitingIds(rcpt);
  if (waiting.length === 0) return null;

  const chosen = dist.selectedIds(rcpt);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.length > 0 && (
        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => dist.requestDistribute(rcpt, chosen)}
        >
          <PackageCheck className="h-3.5 w-3.5" />
          Distribute selected ({chosen.length})
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 text-xs"
        onClick={() => dist.requestDistribute(rcpt, waiting)}
      >
        <PackageCheck className="h-3.5 w-3.5" />
        Distribute all ({waiting.length})
      </Button>
    </div>
  );
}

/** The two dialogs. Mount once inside the table component. */
export function DistributionDialogs({ dist }) {
  const { confirm, reasonDialog, busy, reason } = dist;
  const count = confirm?.assetIds?.length || 0;
  const cfg = reasonDialog ? dialogConfig(reasonDialog.mode, reasonDialog.asset) : null;

  return (
    <>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) dist.closeConfirm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark items as distributed?</DialogTitle>
            <DialogDescription>
              {count} item{count === 1 ? '' : 's'} on {confirm?.rcpt?.document_number} will be
              recorded as handed over to the end users. Once confirmed, only ICTU can change it back.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dist.closeConfirm} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={dist.submitDistribute} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reasonDialog}
        onOpenChange={(open) => {
          if (!open && !busy) dist.closeReasonDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{cfg?.title}</DialogTitle>
            <DialogDescription>{cfg?.description}</DialogDescription>
          </DialogHeader>

          {cfg?.needsReason && (
            <Input
              placeholder="Reason (required)"
              value={reason}
              onChange={(e) => dist.setReason(e.target.value)}
              maxLength={1000}
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dist.closeReasonDialog} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={dist.submitReasonDialog}
              disabled={busy || (cfg?.needsReason && reason.trim().length < 5)}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cfg?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
