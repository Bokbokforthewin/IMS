import React, { useState } from 'react';

import ReceiveForm from '../components/receive/ReceiveForm.jsx';
import ReceivedStockTable from '../components/receive/ReceivedStockTable.jsx';

import '../components/receive/ReceivePage.css';

export default function ReceivePage({ items, receiveForm, setReceiveForm, handleApiCall }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="receive-page-container">
      <ReceiveForm
        items={items}
        receiveForm={receiveForm}
        setReceiveForm={setReceiveForm}
        handleApiCall={handleApiCall}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <ReceivedStockTable refreshKey={refreshKey} />
    </div>
  );
}