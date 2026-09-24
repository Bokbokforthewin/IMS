import React, { useState, useEffect, useCallback } from 'react';
import { Package, NotebookPen, CheckCircle2, ShoppingCart } from 'lucide-react';

import AssetCatalogBrowse from '../components/assets/AssetCatalogBrowse.jsx';
import DeliveryForm from '../components/assets/DeliveryForm.jsx';
import CartReview from '../components/assets/CartReview.jsx';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable.jsx';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = '/api/v1';

// Helper to extract clean numeric unit cost
function parseCost(asset) {
  const rawCost = asset.unit_cost ?? asset.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

export default function AccountabilityPage({ activeTab, handleApiCall }) {
  // Wizard steps: 'browse' -> 'delivery' -> 'review'
  const [step, setStep] = useState('browse');
  const [catalog, setCatalog] = useState({ assets: [], serialized: [], non_serialized: [] });
  const [cart, setCart] = useState([]);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch available asset catalog
  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/accountability/available-for-cart`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      const data = await res.json();
      setCatalog(data);
    } catch (err) {
      console.error('Failed to load accountability catalog:', err);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog, refreshKey]);

  /**
   * Adds a primary asset and optional bundled child peripherals to the cart.
   */
  const addAssetToCart = (asset, children = []) => {
    const primaryKey = `a-${asset.id}`;
    if (cart.some((c) => c.key === primaryKey)) return;

    const itemsToAdd = [];

    // 1. Add Primary Asset
    itemsToAdd.push({
      key: primaryKey,
      id: asset.id,
      serialized_asset_id: asset.id,
      name: asset.item?.name || asset.item_name || 'Asset Item',
      unit_cost: parseCost(asset),
      property_number: asset.property_number,
      propertyNumber: asset.property_number,
      serial_number: asset.serial_number || asset.serialNumber,
      attachToKey: null,
      attachToLabel: null,
    });

    // 2. Automatically Add Attached/Bundled Children (if provided)
    if (Array.isArray(children) && children.length > 0) {
      children.forEach((child) => {
        const childKey = `a-${child.id}`;
        if (!cart.some((c) => c.key === childKey)) {
          itemsToAdd.push({
            key: childKey,
            id: child.id,
            serialized_asset_id: child.id,
            name: child.item?.name || child.item_name || 'Peripheral Item',
            unit_cost: parseCost(child),
            property_number: child.property_number,
            propertyNumber: child.property_number,
            serial_number: child.serial_number || child.serialNumber,
            attachToKey: primaryKey,
            attachToLabel: asset.item?.name || 'Primary Asset',
          });
        }
      });
    }

    setCart((prevCart) => [...prevCart, ...itemsToAdd]);
  };

  /**
   * Updates attachment parent for a given item in cart.
   */
  const updateAttachment = (key, attachToKey) => {
    const attachedTo = attachToKey ? cart.find((c) => c.key === attachToKey) : null;
    setCart((prev) =>
      prev.map((c) =>
        c.key === key
          ? {
              ...c,
              attachToKey: attachToKey || null,
              attachToLabel: attachedTo ? attachedTo.name || attachedTo.item?.name : null,
            }
          : c
      )
    );
  };

  /**
   * Removes item from cart and clears orphan attachments pointing to it.
   */
  const removeFromCart = (key) => {
    setCart((prev) =>
      prev
        .filter((c) => c.key !== key)
        .map((c) =>
          c.attachToKey === key
            ? { ...c, attachToKey: null, attachToLabel: null }
            : c
        )
    );
  };

  /**
   * Called when DeliveryForm completes step 2.
   */
  const handleDeliveryNext = (details) => {
    setDeliveryDetails(details);
    setStep('review');
  };

  /**
   * Called after successfully submitting accountability receipts.
   */
  const handleIssueSuccess = () => {
    setCart([]);
    setDeliveryDetails(null);
    setStep('browse');
    setRefreshKey((k) => k + 1);
  };

  // Helper for Stepper UI
  const stepsMap = [
    { id: 'browse', label: '1. Select Assets', icon: Package },
    { id: 'delivery', label: '2. Asset Info', icon: NotebookPen },
    { id: 'review', label: '3. Review & Issue', icon: CheckCircle2 },
  ];

  const currentStepIdx = stepsMap.findIndex((s) => s.id === step);

  const renderWizardContent = () => (
    <div className="space-y-6">
      {/* Visual Stepper Header */}
      <div className="bg-card border rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {stepsMap.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = idx < currentStepIdx;

            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {idx < stepsMap.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                      idx < currentStepIdx ? 'bg-emerald-600' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step 1: Browse Catalog */}
      {step === 'browse' && (
        <AssetCatalogBrowse
          catalog={catalog}
          cart={cart}
          addAssetToCart={addAssetToCart}
          onProceed={() => setStep('delivery')}
        />
      )}

      {/* Step 2: Delivery Details & Attachments */}
      {step === 'delivery' && (
        <DeliveryForm
          cart={cart}
          initialDetails={deliveryDetails}
          onUpdateAttachment={updateAttachment}
          onRemove={removeFromCart}
          onBack={() => setStep('browse')}
          onNext={handleDeliveryNext}
        />
      )}

      {/* Step 3: Final Review & Confirmation */}
      {step === 'review' && (
        <CartReview
          cart={cart}
          deliveryDetails={deliveryDetails}
          handleApiCall={handleApiCall}
          onBack={() => setStep('delivery')}
          onSuccess={handleIssueSuccess}
        />
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* If activeTab is provided, render according to tab selection */}
      {activeTab ? (
        <>
          {activeTab === 'accountability-assign' && renderWizardContent()}
          {activeTab === 'accountability-list' && (
            <AccountabilityReceiptsTable refreshKey={refreshKey} />
          )}
        </>
      ) : (
        /* Standalone mode: Render wizard and history table together */
        <>
          {renderWizardContent()}
          <div className="pt-6 border-t">
            <AccountabilityReceiptsTable refreshKey={refreshKey} />
          </div>
        </>
      )}
    </div>
  );
}