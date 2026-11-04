import React, { useState } from 'react';

import ReceiveForm from '../components/receive/ReceiveForm.jsx';
import ReceiveBundleForm from '../components/receive/ReceiveBundleForm.jsx';
import ReceivedStockTable from '../components/receive/ReceivedStockTable.jsx';

export default function ReceivePage({ 
  activeTab, 
  items, 
  receiveForm, 
  setReceiveForm, 
  handleApiCall 
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {activeTab === 'receive-single'
            ? 'Single Item Receiving'
            : activeTab === 'receive-bundle'
            ? 'Bulk & Bundle Receiving'
            : 'Receiving History & Logs'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeTab === 'receive-single'
            ? 'Process inbound inventory stock and register serial numbers for individual items.'
            : activeTab === 'receive-bundle'
            ? 'Encode bulk deliveries, bundled equipment sets, and composite packages.'
            : 'Review past inbound deliveries, supplier receipts, and stock entries.'}
        </p>
      </div>

      {/* 1. Receive Single Item Form */}
      {activeTab === 'receive-single' && (
        <div className="flex flex-col gap-6">
          <ReceiveForm
            items={items}
            receiveForm={receiveForm}
            setReceiveForm={setReceiveForm}
            handleApiCall={handleApiCall}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 2. Receive Bundle / Set Form */}
      {activeTab === 'receive-bundle' && (
        <div className="flex flex-col gap-6">
          <ReceiveBundleForm
            items={items}
            handleApiCall={handleApiCall}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 3. Received Stock History Table */}
      {activeTab === 'receive-history' && (
        <div className="flex flex-col gap-6">
          <ReceivedStockTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}