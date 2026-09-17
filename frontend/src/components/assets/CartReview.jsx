import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function CartReview({ cart, onUpdateQuantity, onUpdateAttachment, onRemove, onBack, onProceed }) {
  const total = cart.reduce((sum, c) => sum + c.unit_cost * c.quantity, 0);
  const serializedInCart = cart.filter(c => c.type === 'serialized');

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Review Cart</h2>

      <div className="space-y-3 mb-4">
        {cart.map(item => (
          <Card key={item.key}>
            <CardContent className="flex items-center justify-between py-4 gap-4">
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {item.name}
                  {item.type === 'non-serialized' && item.attachToLabel && (
                    <Badge variant="secondary">Attached to: {item.attachToLabel}</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">₱{item.unit_cost.toLocaleString()} each</div>

                {item.type === 'non-serialized' && (
                  <select
                    className="mt-2 border rounded-md h-8 px-2 text-sm"
                    value={item.attachToKey || ''}
                    onChange={e => onUpdateAttachment(item.key, e.target.value || null)}
                  >
                    <option value="">Standalone (not attached)</option>
                    {serializedInCart.map(s => (
                      <option key={s.key} value={s.key}>Attach to: {s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3">
                {item.type === 'non-serialized' ? (
                  <Input
                    type="number"
                    min="1"
                    max={item.maxQty}
                    value={item.quantity}
                    onChange={e => onUpdateQuantity(item.key, Number(e.target.value))}
                    className="w-20"
                  />
                ) : (
                  <span className="text-sm">Qty: 1</span>
                )}
                <Button variant="destructive" size="sm" onClick={() => onRemove(item.key)}>
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="font-semibold mb-4">
        Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        {' — '}{total >= 50000 ? 'PAR' : 'ICS'}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onProceed} disabled={cart.length === 0}>Proceed to Delivery</Button>
      </div>
    </div>
  );
}