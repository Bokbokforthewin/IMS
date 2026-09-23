import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Helper to extract cost safely regardless of structure
function getCost(item) {
  const rawCost = item.unit_cost ?? item.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

export default function CartReview({ cart, onUpdateAttachment, onRemove, onBack, onProceed }) {
  const total = cart.reduce((sum, c) => sum + getCost(c), 0);
  
  // Fixed: Checks property_number (snake_case) or propertyNumber (camelCase)
  const attachTargets = cart.filter(c => c.property_number || c.propertyNumber);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Review Cart</h2>

      <div className="space-y-3 mb-4">
        {cart.map(item => {
          const itemCost = getCost(item);
          const itemName = item.name || item.item?.name || item.item_name || 'Asset Item';
          const attachedToItem = cart.find(c => c.key === item.attachToKey);

          return (
            <Card key={item.key || item.id}>
              <CardContent className="flex items-center justify-between py-4 gap-4">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {itemName}
                    <Badge variant="outline">{itemCost >= 50000 ? 'PAR' : 'ICS'}</Badge>
                    {attachedToItem && (
                      <Badge variant="secondary">
                        Attached to: {attachedToItem.name || attachedToItem.item?.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ₱{itemCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>

                  {attachTargets.filter(t => t.key !== item.key).length > 0 && (
                    <select
                      className="mt-2 border rounded-md h-8 px-2 text-sm"
                      value={item.attachToKey || ''}
                      onChange={e => onUpdateAttachment(item.key, e.target.value || null)}
                    >
                      <option value="">Standalone (not attached)</option>
                      {attachTargets.filter(t => t.key !== item.key).map(t => (
                        <option key={t.key} value={t.key}>
                          Attach to: {t.name || t.item?.name} ({t.property_number || t.propertyNumber})
                        </option>
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

      <div className="font-semibold mb-4 border-t pt-3">
        Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        <p className="text-sm font-normal text-muted-foreground mt-1">
          Items ≥ ₱50,000 will be issued on a PAR; items &lt; ₱50,000 will be issued on a separate ICS.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onProceed} disabled={cart.length === 0}>Proceed to Delivery</Button>
      </div>
    </div>
  );
}