import React from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function DetailItem({ label, children, mono = false, spanFull = false }) {
  const hasValue = children !== null && children !== undefined && children !== '';

  return (
    <div
      className={`flex items-baseline justify-between gap-2 border-b border-border py-1 leading-tight ${
        spanFull ? 'col-span-2' : ''
      }`}
    >
      <dt className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`truncate text-right text-xs text-foreground ${
          mono ? 'font-mono tabular-nums' : ''
        }`}
        title={hasValue && typeof children === 'string' ? children : undefined}
      >
        {hasValue ? children : <span className="text-muted-foreground">N/A</span>}
      </dd>
    </div>
  );
}

export default function AccountabilityDetailsModal({ open, onClose, details, onPrintTag }) {
  if (!details) return null;

  const { line, receipt, mr } = details;
  const asset = line.serialized_asset || {};
  const itemName = line.item?.name || asset.item?.name || 'Asset details';
  const holder = asset.current_holder || asset.currentHolder || line.user;
  const issuedBy = receipt.issuedBy || receipt.issued_by;

  const rawCost = asset.unit_cost ?? line.unit_cost;
  const formattedCost =
    rawCost !== null && rawCost !== undefined && rawCost !== ''
      ? `₱${Number(rawCost).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;

  const endUserDisplay =
    holder?.name || mr?.name
      ? `${holder?.name || mr?.name}${holder?.designation ? ` · ${holder.designation}` : ''}`
      : null;

  const brandModelDisplay = [asset.brand, asset.model].filter(Boolean).join(' / ') || null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl gap-1 overflow-visible rounded-xl border-border bg-card p-3 text-foreground shadow-lg sm:p-4">
        <DialogHeader className="space-y-0.5 border-b border-border pb-2 pr-6 text-left">
          <DialogTitle className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground sm:text-base">
            <FileText className="h-4 w-4 shrink-0 text-foreground" />
            <span className="truncate">{itemName}</span>
          </DialogTitle>
          <DialogDescription className="truncate text-[11px] leading-tight text-muted-foreground">
            <span className="font-mono">{receipt.document_number}</span>
            {' · '}
            <span>{receipt.receipt_type}</span>
            {' · '}
            <span>{receipt.date_issued || 'N/A'}</span>
          </DialogDescription>
        </DialogHeader>

        <dl className="gap-x-3">
          <DetailItem label="Prop. No." mono>
            {asset.property_number}
          </DetailItem>
          <DetailItem label="PPE No." mono>
            {asset.ppe_number}
          </DetailItem>
          <DetailItem label="Serial No." mono>
            {asset.serial_number}
          </DetailItem>
          <DetailItem label="Qty" mono>
            {line.quantity}
          </DetailItem>
          <DetailItem label="End User">{endUserDisplay}</DetailItem>
          <DetailItem label="MR">{mr?.name || receipt.received_mr_by_id}</DetailItem>
          <DetailItem label="Unit Cost" mono>
            {formattedCost}
          </DetailItem>
          <DetailItem label="Status">{asset.status}</DetailItem>
          <DetailItem label="Brand / Model">{brandModelDisplay}</DetailItem>
          <DetailItem label="Manufacturer">{asset.manufacturer_name}</DetailItem>
          <DetailItem label="Origin">{asset.country_of_origin}</DetailItem>
          <DetailItem label="Remarks">{asset.condition_remarks}</DetailItem>
          <DetailItem label="Attached To" mono>
            {asset.attached_to}
          </DetailItem>
          <DetailItem label="Issued By">{issuedBy?.name || receipt.issued_by_id}</DetailItem>
          <DetailItem label="Notes" spanFull>
            {line.accessories_notes || receipt.remarks}
          </DetailItem>
        </dl>

        {asset.id && (
          <div className="flex items-center justify-end border-t border-border pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 border-border bg-card px-2.5 text-xs text-foreground hover:bg-muted focus-visible:ring-ring"
              onClick={() => onPrintTag(asset.id)}
            >
              <Download className="h-3 w-3" />
              Print asset tag
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}