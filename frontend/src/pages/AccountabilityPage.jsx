import React, { useState, useEffect, useCallback } from 'react';
import AssetCatalogBrowse from '../components/assets/AssetCatalogBrowse.jsx';
import CartReview from '../components/assets/CartReview.jsx';
import DeliveryForm from '../components/assets/DeliveryForm.jsx';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable.jsx';
import AccountabilityForm from '@/components/assets/AccountabilityForm.jsx';

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

  const addAssetToCart = (asset, attachToKey) => {
  const key = `a-${asset.id}`;
  if (cart.some(c => c.key === key)) return;
  setCart([...cart, {
    key,
    serialized_asset_id: asset.id,
    name: `${asset.item?.name} — SN: ${asset.serial_number}`,
    unit_cost: Number(asset.unit_cost),
    propertyNumber: asset.property_number,
    attachToKey: attachToKey || null,
    attachToLabel: null,
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
      {/* <AccountabilityForm refreshKey={refreshKey} /> */}
      {step === 'browse' && (
        <AssetCatalogBrowse
          catalog={catalog}
          cart={cart}

          addAssetToCart={addAssetToCart}
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