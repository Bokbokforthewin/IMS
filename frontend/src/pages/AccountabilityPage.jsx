import React, { useState } from 'react';

import SerializedAssetsTable from '../components/assets/SerializedAssetsTable';
import AccountabilityReceiptsTable from '../components/assets/AccountabilityReceiptsTable';

import '../components/assets/AccountabilityPage.css';

export default function AccountabilityPage({ serializedAssets, accountabilityForm, setAccountabilityForm, handleApiCall, refreshData }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleIssuanceSuccess = () => { 
    setRefreshKey(k => k + 1);
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="accountability-container">
      <h2>5. Issue Serialized Asset (PAR / ICS)</h2>
      <p className="accountability-subtitle">
        System automatically assigns <strong>PAR</strong> (&ge; ₱50,000) or <strong>ICS</strong> (&lt; ₱50,000) based on the catalog item cost.
      </p>

      <SerializedAssetsTable 
      serializedAssets={serializedAssets}
      handleApiCall={handleApiCall}
       />

      <AccountabilityReceiptsTable refreshKey={refreshKey} />
    </div>
  );
}