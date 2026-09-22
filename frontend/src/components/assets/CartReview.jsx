import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function CartReview({ cart, onUpdateAttachment, onRemove, onBack, onProceed }) {
  const total = cart.reduce((sum, c) => sum + c.unit_cost, 0);
  const attachTargets = cart.filter(c => c.propertyNumber);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Review Cart</h2>

      <div className="space-y-3 mb-4">
        {cart.map(item => {
          const attachedToItem = cart.find(c => c.key === item.attachToKey);
          return (
            <Card key={item.key}>
              <CardContent className="flex items-center justify-between py-4 gap-4">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {item.name}
                    {attachedToItem && (
                      <Badge variant="secondary">Attached to: {attachedToItem.name}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">₱{item.unit_cost.toLocaleString()}</div>

                  {attachTargets.filter(t => t.key !== item.key).length > 0 && (
                    <select
                      className="mt-2 border rounded-md h-8 px-2 text-sm"
                      value={item.attachToKey || ''}
                      onChange={e => onUpdateAttachment(item.key, e.target.value || null)}
                    >
                      <option value="">Standalone (not attached)</option>
                      {attachTargets.filter(t => t.key !== item.key).map(t => (
                        <option key={t.key} value={t.key}>Attach to: {t.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <Button variant="destructive" size="sm" onClick={() => onRemove(item.key)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="font-semibold mb-4">
        Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        <p className="text-sm font-normal text-muted-foreground">
          Items ≥ ₱50,000 will print on a PAR; the rest print on a separate ICS.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onProceed} disabled={cart.length === 0}>Proceed to Delivery</Button>
      </div>
    </div>
  );
}