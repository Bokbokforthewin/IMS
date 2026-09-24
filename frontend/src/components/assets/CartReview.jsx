import React, { useState } from 'react';
import {
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Paperclip,
  User,
  UserCheck,
  ShieldCheck,
  Calendar as CalendarIcon,
  MessageSquare,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';

function getCost(item) {
  const rawCost = item.unit_cost ?? item.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

export default function CartReview({
  cart = [],
  deliveryDetails,
  handleApiCall,
  onBack,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);

  // Use the updated cart with secondary receivers if available
  const activeCart = deliveryDetails?.updatedCart || cart;

  const total = activeCart.reduce((sum, c) => sum + getCost(c), 0);
  const parItems = activeCart.filter((c) => getCost(c) >= 50000);
  const icsItems = activeCart.filter((c) => getCost(c) < 50000);

  const findAttached = (key) => activeCart.find((c) => c.key === key);

  const handleConfirm = () => {
    setSubmitting(true);

    const primaryReceiverId =
      deliveryDetails?.receivedMrById ||
      deliveryDetails?.received_mr_by_id ||
      deliveryDetails?.userId;

    const payload = {
      cart: activeCart.map((c) => ({
        key: c.key,
        serialized_asset_id: c.serialized_asset_id || c.id,
        attach_to_key: c.attachToKey || undefined,
        user_id: c.user_id || primaryReceiverId, // Secondary Receiver for this item
      })),
      received_mr_by_id: primaryReceiverId, // Primary Receiver (PAR/ICS Signatory)
      issued_by_id: deliveryDetails?.issuedById || deliveryDetails?.issued_by_id, // Sender
      user_id: deliveryDetails?.userId || primaryReceiverId, // Default secondary receiver fallback
      date_issued: deliveryDetails?.dateIssued,
      remarks: deliveryDetails?.remarks || null,
    };

    handleApiCall('/accountability/issue-asset', payload, (response) => {
      onSuccess(response?.receipts || []);
    }).finally(() => setSubmitting(false));
  };

  const renderGroup = (items, label, badgeVariant) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{label}</Badge>
          <span className="text-xs text-muted-foreground">
            {items.length} item(s) — printed on receipt
          </span>
        </div>
        {items.map((item) => {
          const attached = findAttached(item.attachToKey);
          const secondaryReceiver =
            item.secondary_receiver_user?.name ||
            deliveryDetails?.primaryReceiverUser?.name ||
            deliveryDetails?.recipientUser?.name ||
            'Assigned Recipient';

          return (
            <div
              key={item.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-3 text-sm gap-3 bg-card"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.property_number && (
                    <span className="text-xs text-muted-foreground font-mono">
                      ({item.property_number})
                    </span>
                  )}
                </div>

                {/* Secondary Receiver Assignment */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    Secondary Receiver:
                    <strong className="text-foreground font-semibold">
                      {secondaryReceiver}
                    </strong>
                  </span>

                  {attached && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      Attached to: {attached.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="self-end sm:self-center text-right shrink-0">
                <span className="font-mono font-semibold text-foreground">
                  ₱{getCost(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Confirm Delivery & Receiver Assignments
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review primary and secondary receiver details before generating official receipts.
          </p>
        </div>
      </div>

      {/* Primary Signatories & Issuance Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Delivery Signatories & Overview
          </CardTitle>
          <CardDescription className="text-xs">
            Summary of primary accountabilities and issuing officer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t">
          {/* Primary Receiver */}
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-muted">
            <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Primary Receiver (`received_mr_by_id`)
              </p>
              <p className="font-semibold text-foreground">
                {deliveryDetails?.primaryReceiverUser?.name ||
                  deliveryDetails?.recipientUser?.name ||
                  'N/A'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Accountable official signing the PAR/ICS receipt.
              </p>
            </div>
          </div>

          {/* Issued By / Sender */}
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20 border border-muted">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Issued By / Sender (`issued_by_id`)
              </p>
              <p className="font-semibold text-foreground">
                {deliveryDetails?.issuerUser?.name || 'N/A'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Property Officer issuing the items.
              </p>
            </div>
          </div>

          {/* Date Issued */}
          <div className="flex items-start gap-2.5">
            <CalendarIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Date Issued</p>
              <p className="font-medium text-foreground">{deliveryDetails?.dateIssued}</p>
            </div>
          </div>

          {/* Remarks */}
          {deliveryDetails?.remarks && (
            <div className="flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Remarks / Purpose</p>
                <p className="font-medium text-foreground">{deliveryDetails.remarks}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items & Document Categorization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Items & Secondary Receiver Allocation
          </CardTitle>
          <CardDescription className="text-xs">
            Review individual asset items and their allocated end-users (`user_id`).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {renderGroup(parItems, 'PAR (≥ ₱50,000)', 'default')}
          {renderGroup(icsItems, 'ICS (< ₱50,000)', 'secondary')}
        </CardContent>
      </Card>

      {/* Totals & Confirm Actions */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Total Estimated Value
            </span>
            <span className="text-2xl font-bold font-mono text-primary">
              ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {parItems.length > 0 && icsItems.length > 0 && (
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-background p-3 rounded-lg border">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-0.5">
                  Two separate receipts will be generated
                </p>
                One PAR covering the {parItems.length} item(s) ≥ ₱50,000, and one ICS covering the{' '}
                {icsItems.length} item(s) below ₱50,000.
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 bg-muted/50 px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={submitting}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Edit
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full sm:w-auto gap-2 font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing Issuance...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Confirm & Generate Receipt
                {parItems.length > 0 && icsItems.length > 0 ? 's' : ''}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}