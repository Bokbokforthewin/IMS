import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, RefreshCw, AlertCircle, ArrowUp } from 'lucide-react';
import api from '@/api/client';
import { createPortal } from 'react-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AssetCatalogBrowse from '../components/assets/AssetCatalogBrowse.jsx';
import DeliveryForm from '../components/assets/DeliveryForm.jsx';
import CartReview from '../components/assets/CartReview.jsx';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable.jsx';

// Helper to extract clean numeric unit cost
function parseCost(asset) {
  const rawCost = asset.unit_cost ?? asset.item?.unit_cost ?? 0;
  return Number(String(rawCost).replace(/[^0-9.]/g, '')) || 0;
}

export default function AccountabilityPage({ activeTab, handleApiCall }) {
  // Wizard steps: 'browse' -> 'delivery' -> 'review'
  const [step, setStep] = useState('browse');
  const [catalog, setCatalog] = useState({ assets: [], serialized: [], non_serialized: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });

    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  // Fetch available asset catalog directly using Axios client
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/v1/accountability/available-for-cart');
      const data = response.data?.data || response.data;
      if (data) {
        setCatalog(data);
      }
    } catch (err) {
      console.error('Failed to load accountability catalog:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load accountability catalog.'
      );
    } finally {
      setLoading(false);
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

  const stepsList = [
    { id: 'browse', label: 'Select Assets' },
    { id: 'delivery', label: 'Assign to Users' },
    { id: 'review', label: 'Review & Issue' },
  ];

  const getPageTitle = () => {
    if (activeTab === 'accountability-assign') return 'Asset Accountability Assignment';
    if (activeTab === 'accountability-list') return 'Accountability Receipts Registry';
    return 'Asset Accountability & Custodianship';
  };

  const getPageDescription = () => {
    if (activeTab === 'accountability-assign')
      return 'Issue assets to designated personnel, pair equipment sets, and generate PAR/ICS receipts.';
    if (activeTab === 'accountability-list')
      return 'View, filter, and manage active asset accountability receipts and issued equipment.';
    return 'Manage equipment allocation, custodian assignments, and accountability receipt records.';
  };

  const renderSkeleton = () => (
    <div className="flex flex-col gap-6">
      {/* Stepper Skeleton */}
      <Skeleton className="h-14 w-full rounded-lg" />

      {/* Filter & Search Bar Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Catalog Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>

      {/* Receipts Table Skeleton when showing registry */}
      {activeTab !== 'accountability-assign' && (
        <div className="space-y-3 pt-4 border-t border-border">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}
    </div>
  );

  const renderWizardContent = () => (
    <div className="space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-2xs overflow-x-auto justify-center">
        {stepsList.map((s, idx) => {
          const isActive = step === s.id;
          const isCompleted =
            (step === 'delivery' && s.id === 'browse') ||
            (step === 'review' && (s.id === 'browse' || s.id === 'delivery'));

          return (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : isCompleted
                    ? 'text-foreground hover:bg-muted/50'
                    : 'text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="size-3.5" /> : null}
                <span>{s.label}</span>
              </div>
              {idx < stepsList.length - 1 && (
                <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
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
    <div className="space-y-6 p-4 min-w-0 w-full">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {getPageTitle()}
        </h2>
        <p className="text-sm text-muted-foreground">
          {getPageDescription()}
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && renderSkeleton()}

      {/* Error Alert with Retry button */}
      {!loading && error && (
        <Alert
          variant="destructive"
          className="max-w-xl mx-auto border-destructive-border bg-destructive-soft text-destructive-text"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Accountability Data</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <p className="text-xs">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCatalog}
              className="w-fit gap-2 text-xs border-border bg-card"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loaded Content */}
      {!loading && !error && (
        <>
          {activeTab ? (
            <>
              {activeTab === 'accountability-assign' && renderWizardContent()}
              {activeTab === 'accountability-list' && (
                <AccountabilityReceiptsTable refreshKey={refreshKey} />
              )}
            </>
          ) : (
            /* Standalone mode: Render wizard and receipts table together */
            <>
              {renderWizardContent()}
              <div className="pt-6 border-t border-border">
                <AccountabilityReceiptsTable refreshKey={refreshKey} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}