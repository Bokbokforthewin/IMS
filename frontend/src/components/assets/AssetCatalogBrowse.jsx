import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AssetCatalogBrowse({ catalog, cart, onAddSerialized, onAddNonSerialized, onProceed }) {
  const [qtyInputs, setQtyInputs] = useState({});
  const [attachInputs, setAttachInputs] = useState({});

  const serializedInCart = cart.filter(c => c.type === 'serialized');

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Browse Assets</h2>

      <h3 className="text-sm font-medium text-muted-foreground mb-2">Serialized Assets</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {catalog.serialized.map(asset => {
          const inCart = cart.some(c => c.key === `s-${asset.id}`);
          return (
            <Card key={asset.id}>
              <CardHeader>
                <CardTitle>{asset.item?.name}</CardTitle>
                <CardDescription>SN: {asset.serial_number} — ₱{Number(asset.unit_cost).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" disabled={inCart} onClick={() => onAddSerialized(asset)}>
                  {inCart ? 'In Cart' : 'Add to Cart'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground mb-2">Non-Serialized Assets</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {catalog.non_serialized.map(item => (
          <Card key={item.item_id}>
            <CardHeader>
              <CardTitle>{item.item_name}</CardTitle>
              <CardDescription>
                Available: {item.total_available} — ₱{Number(item.unit_cost).toLocaleString()} each
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-2">
              <div className="flex gap-2 w-full">
                <Input
                  type="number"
                  min="1"
                  max={item.total_available}
                  placeholder="Qty"
                  value={qtyInputs[item.item_id] || ''}
                  onChange={e => setQtyInputs({ ...qtyInputs, [item.item_id]: e.target.value })}
                  className="w-20"
                />
                <select
                  className="flex-1 border rounded-md h-9 px-2 text-sm"
                  value={attachInputs[item.item_id] || ''}
                  onChange={e => setAttachInputs({ ...attachInputs, [item.item_id]: e.target.value })}
                >
                  <option value="">Standalone (not attached)</option>
                  {serializedInCart.map(s => (
                    <option key={s.key} value={s.key}>Attach to: {s.name}</option>
                  ))}
                </select>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const qty = Number(qtyInputs[item.item_id]) || 1;
                  const attachToKey = attachInputs[item.item_id] || null;
                  onAddNonSerialized(item, qty, attachToKey);
                  setQtyInputs({ ...qtyInputs, [item.item_id]: '' });
                  setAttachInputs({ ...attachInputs, [item.item_id]: '' });
                }}
              >
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Button size="lg" disabled={cart.length === 0} onClick={onProceed}>
        Proceed to Cart ({cart.length})
      </Button>
    </div>
  );
}