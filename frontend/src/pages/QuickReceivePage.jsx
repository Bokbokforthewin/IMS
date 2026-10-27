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
    <div className="quick-receive-page-container space-y-6">
      {/* 1. Category Form & List */}
      {activeTab === 'quick-receive-categories' && (
        <div className="quick-receive-page__section">
          <QuickCategoryForm 
            categories={categories} 
            handleApiCall={handleApiCall} 
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 2. Quick Encode & Receive Form */}
      {(activeTab === 'quick-receive-form' || activeTab === 'quick-receive') && (
        <div className="quick-receive-page__section">
          <h2 className="text-xl font-bold tracking-tight mb-4">Quick Encode & Receive</h2>
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
        <div className="quick-receive-page__section">
          <QuickReceiveHistory refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}