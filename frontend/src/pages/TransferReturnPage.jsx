import React, { useState } from 'react';

import TransferOrReturnForm from '../components/transferorreturn/TransferOrReturn.jsx';
import TransferHistoryTable from '../components/transferorreturn/TransferHistoryTable.jsx';

import '../components/transferorreturn/TransferOrReturn.css';

export default function TransferReturnPage({ serializedAssets = [], handleApiCall, refreshData }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(k => k + 1);
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="transfer-page-container">
      <TransferOrReturnForm
        serializedAssets={serializedAssets}
        handleApiCall={handleApiCall}
        onSuccess={handleSuccess}
      />

      <TransferHistoryTable refreshKey={refreshKey} />
    </div>
  );
}