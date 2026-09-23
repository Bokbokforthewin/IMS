import React, { useState } from 'react';

import TransferOrReturnForm from '../components/transferorreturn/TransferOrReturn.jsx';
import TransferHistoryTable from '../components/transferorreturn/TransferHistoryTable.jsx';

import '../components/transferorreturn/TransferOrReturn.css';

export default function TransferReturnPage({ 
  activeTab, 
  serializedAssets = [], 
  handleApiCall, 
  refreshData 
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="transfer-page-container space-y-6">
      {/* 1. Transfer or Return Form */}
      {activeTab === 'transfer-return-form' && (
        <div className="transfer-page__section">
          <TransferOrReturnForm
            serializedAssets={serializedAssets}
            handleApiCall={handleApiCall}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* 2. Movement Logs / History */}
      {activeTab === 'transfer-return-history' && (
        <div className="transfer-page__section">
          <TransferHistoryTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}