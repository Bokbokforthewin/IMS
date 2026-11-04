import React, { useState } from 'react';

import QuickEncodeForm from '../components/quick-receive/QuickEncodeForm.jsx';
import QuickCategoryForm from '../components/quick-receive/QuickCategoryForm.jsx';
import QuickReceiveHistory from '../components/quick-receive/QuickReceiveHistory.jsx';

export default function QuickReceivePage({ 
  activeTab = 'quick-receive-form', 
  categories = [], 
  items = [], 
  handleApiCall, 
  refreshData 
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="space-y-6 p-4">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {activeTab === 'quick-receive-categories'
            ? 'Quick Category Management'
            : activeTab === 'quick-receive-history'
            ? 'Quick Receive Logs & History'
            : 'Quick Encode & Receive'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeTab === 'quick-receive-categories'
            ? 'Create and maintain item classification groups on the fly.'
            : activeTab === 'quick-receive-history'
            ? 'Review past rapid stock entries, quick encodings, and audit receipts.'
            : 'Rapidly register new inventory items and process immediate stock arrivals in one step.'}
        </p>
      </div>

      {/* 1. Category Form & List */}
      {activeTab === 'quick-receive-categories' && (
        <div className="flex flex-col gap-6">
          <QuickCategoryForm 
            categories={categories} 
            handleApiCall={handleApiCall} 
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 2. Quick Encode & Receive Form */}
      {(activeTab === 'quick-receive-form' || activeTab === 'quick-receive') && (
        <div className="flex flex-col gap-6">
          <QuickEncodeForm 
            categories={categories} 
            items={items} 
            handleApiCall={handleApiCall} 
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 3. Received Stock History Logs */}
      {activeTab === 'quick-receive-history' && (
        <div className="flex flex-col gap-6">
          <QuickReceiveHistory refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}