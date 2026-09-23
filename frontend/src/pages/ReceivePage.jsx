import React, { useState } from 'react';

import ReceiveForm from '../components/receive/ReceiveForm.jsx';
import ReceiveBundleForm from '../components/receive/ReceiveBundleForm.jsx';
import ReceivedStockTable from '../components/receive/ReceivedStockTable.jsx';

import '../components/receive/ReceivePage.css';

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
    <div className="receive-page-container">
      {/* 1. Receive Single Item Form */}
      {activeTab === 'receive-single' && (
        <div className="receive-page__section">
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
        <div className="receive-page__section">
          <ReceiveBundleForm
            items={items}
            handleApiCall={handleApiCall}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 3. Received Stock History Table */}
      {activeTab === 'receive-history' && (
        <div className="receive-page__section">
          <ReceivedStockTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}