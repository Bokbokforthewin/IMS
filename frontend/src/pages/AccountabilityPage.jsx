import React, { useState, useEffect, useCallback } from 'react';
import AssetCatalogBrowse from '../components/assets/AssetCatalogBrowse.jsx';
import CartReview from '../components/assets/CartReview.jsx';
import DeliveryForm from '../components/assets/DeliveryForm.jsx';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable.jsx';

const API_BASE_URL = '/api/v1';

export default function AccountabilityPage({ activeTab, handleApiCall }) {
  const [step, setStep] = useState('browse'); // 'browse' -> 'cart' -> 'delivery'
  const [catalog, setCatalog] = useState({ serialized: [], non_serialized: [] });
  const [cart, setCart] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accountability/available-for-cart`);
      const data = await res.json();
      setCatalog(data);
    } catch (err) {
      console.error('Failed to load accountability catalog:', err);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog, refreshKey]);

  // Helper to extract clean numeric unit cost
function parseCost(asset) {
  const rawCost = asset.unit_cost ?? asset.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

const addAssetToCart = (asset, children = []) => {
  const primaryKey = `a-${asset.id}`;

  // Check if primary is already in cart
  if (cart.some((c) => c.key === primaryKey)) return;

  const itemsToAdd = [];

  // 1. Add Primary Asset
  itemsToAdd.push({
    key: primaryKey,
    id: asset.id,
    serialized_asset_id: asset.id,
    name: `${asset.item?.name || asset.item_name || 'Asset'} — SN: ${asset.serial_number || 'N/A'}`,
    unit_cost: parseCost(asset),
    property_number: asset.property_number,
    propertyNumber: asset.property_number,
    attachToKey: null,
    attachToLabel: null,
  });

  // 2. Automatically Add Attached/Bundled Children (if any exist)
  if (Array.isArray(children) && children.length > 0) {
    children.forEach((child) => {
      const childKey = `a-${child.id}`;
      if (!cart.some((c) => c.key === childKey)) {
        itemsToAdd.push({
          key: childKey,
          id: child.id,
          serialized_asset_id: child.id,
          name: `${child.item?.name || child.item_name || 'Peripheral'} — SN: ${child.serial_number || 'N/A'}`,
          unit_cost: parseCost(child),
          property_number: child.property_number,
          propertyNumber: child.property_number,
          attachToKey: primaryKey, // Automatically attach child to primary asset
          attachToLabel: asset.item?.name || 'Primary Asset',
        });
      }
    });
  }

  setCart((prevCart) => [...prevCart, ...itemsToAdd]);
};

  const updateCartQuantity = (key, quantity) => {
    setCart(
      cart.map((c) =>
        c.key === key
          ? { ...c, quantity: Math.max(1, Math.min(quantity, c.maxQty)) }
          : c
      )
    );
  };

  const updateCartAttachment = (key, attachToKey) => {
    const attachedTo = attachToKey
      ? cart.find((c) => c.key === attachToKey)
      : null;
    setCart(
      cart.map((c) =>
        c.key === key
          ? {
              ...c,
              attachToKey: attachToKey || null,
              attachToLabel: attachedTo ? attachedTo.name : null,
            }
          : c
      )
    );
  };

  const removeFromCart = (key) => {
    setCart(
      cart
        .filter((c) => c.key !== key)
        .map((c) =>
          c.attachToKey === key
            ? { ...c, attachToKey: null, attachToLabel: null }
            : c
        )
    );
  };

  const handleDeliverySuccess = () => {
    setCart([]);
    setStep('browse');
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="accountability-page-container space-y-6">
      {/* 1. Assign Asset Wizard Flow */}
      {activeTab === 'accountability-assign' && (
        <div className="accountability-page__section">
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
        </div>
      )}

      {/* 2. Assigned List / PAR & ICS Receipts History */}
      {activeTab === 'accountability-list' && (
        <div className="accountability-page__section">
          <AccountabilityReceiptsTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}