import React, { useState, useEffect, useCallback } from 'react';
import AssetCatalogBrowse from '../components/assets/AssetCatalogBrowse.jsx';
import CartReview from '../components/assets/CartReview.jsx';
import DeliveryForm from '../components/assets/DeliveryForm.jsx';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable.jsx';

const API_BASE_URL = '/api/v1';

export default function AccountabilityPage({ handleApiCall }) {
  const [step, setStep] = useState('browse'); // browse -> cart -> delivery
  const [catalog, setCatalog] = useState({ serialized: [], non_serialized: [] });
  const [cart, setCart] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCatalog = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/accountability/available-for-cart`);
    const data = await res.json();
    setCatalog(data);
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog, refreshKey]);

  const addSerializedToCart = (asset) => {
    const key = `s-${asset.id}`;
    if (cart.some(c => c.key === key)) return;
    setCart([...cart, {
      key,
      type: 'serialized',
      serialized_asset_id: asset.id,
      name: `${asset.item?.name} — SN: ${asset.serial_number}`,
      unit_cost: Number(asset.unit_cost),
      quantity: 1,
      maxQty: 1,
    }]);
  };

  // attachToKey: the cart `key` of a serialized item already in the cart,
  // or null/undefined for a standalone (unattached) non-serialized item.
  const addNonSerializedToCart = (item, qty, attachToKey) => {
    const key = `ns-${item.item_id}-${attachToKey || 'standalone'}`;
    const existing = cart.find(c => c.key === key);

    if (existing) {
      updateCartQuantity(key, existing.quantity + qty);
      return;
    }

    const attachedTo = attachToKey ? cart.find(c => c.key === attachToKey) : null;

    setCart([...cart, {
      key,
      type: 'non-serialized',
      item_id: item.item_id,
      name: item.item_name,
      unit_cost: Number(item.unit_cost),
      quantity: qty,
      maxQty: item.total_available,
      attachToKey: attachToKey || null,
      attachToLabel: attachedTo ? attachedTo.name : null,
    }]);
  };

  const updateCartQuantity = (key, quantity) => {
    setCart(cart.map(c => c.key === key ? { ...c, quantity: Math.max(1, Math.min(quantity, c.maxQty)) } : c));
  };

  const updateCartAttachment = (key, attachToKey) => {
    const attachedTo = attachToKey ? cart.find(c => c.key === attachToKey) : null;
    setCart(cart.map(c => c.key === key
      ? { ...c, attachToKey: attachToKey || null, attachToLabel: attachedTo ? attachedTo.name : null }
      : c
    ));
  };

  const removeFromCart = (key) => {
    // Removing a serialized item also detaches anything that pointed to it
    setCart(cart
      .filter(c => c.key !== key)
      .map(c => c.attachToKey === key ? { ...c, attachToKey: null, attachToLabel: null } : c)
    );
  };

  const handleDeliverySuccess = () => {
    setCart([]);
    setStep('browse');
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6">
      {step === 'browse' && (
        <AssetCatalogBrowse
          catalog={catalog}
          cart={cart}
          onAddSerialized={addSerializedToCart}
          onAddNonSerialized={addNonSerializedToCart}
          onProceed={() => setStep('cart')}
        />
      )}

      {step === 'cart' && (
        <CartReview
          cart={cart}
          onUpdateQuantity={updateCartQuantity}
          onUpdateAttachment={updateCartAttachment}
          onRemove={removeFromCart}
          onBack={() => setStep('browse')}
          onProceed={() => setStep('delivery')}
        />
      )}

      {step === 'delivery' && (
        <DeliveryForm
          cart={cart}
          handleApiCall={handleApiCall}
          onBack={() => setStep('cart')}
          onSuccess={handleDeliverySuccess}
        />
      )}

      <AccountabilityReceiptsTable refreshKey={refreshKey} />
    </div>
  );
}