import React, { useState } from 'react';

import TransferOrReturnForm from '../components/transferorreturn/TransferOrReturn.jsx';
import TransferHistoryTable from '../components/transferorreturn/TransferHistoryTable.jsx';

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
    <div className="space-y-6 p-4 min-w-0 w-full">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {activeTab === 'transfer-return-form'
            ? 'Equipment Return & Property Transfer'
            : 'Transfer & Return History Logs'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeTab === 'transfer-return-form'
            ? 'Process equipment returns to warehouse stock or issue Property Transfer Reports (PTR) between employees.'
            : 'Track and review historical logs of asset transfers, reassignment records, and equipment returns.'}
        </p>
      </div>

      {/* Sub-view: Transfer or Return Form */}
      {activeTab === 'transfer-return-form' && (
        <div className="flex flex-col gap-6 min-w-0 w-full">
          <TransferOrReturnForm
            serializedAssets={serializedAssets}
            handleApiCall={handleApiCall}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* Sub-view: Movement Logs / History */}
      {activeTab === 'transfer-return-history' && (
        <div className="flex flex-col gap-6 min-w-0 w-full">
          <TransferHistoryTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}