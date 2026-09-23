import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import StockStatusTable from '../components/consumables/StockStatusTable.jsx';
import IssuanceHistoryTable from '../components/consumables/IssuanceHistoryTable.jsx';

import '../components/consumables/ConsumablesPage.css';

export default function ConsumablesPage({ activeTab, handleApiCall, refreshData }) {
  const [stockStatus, setStockStatus] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStockStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/consumables/stock-status');
      setStockStatus(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load stock status:', err);
      setStockStatus([]);
    }
  }, []);

  useEffect(() => {
    fetchStockStatus();
  }, [fetchStockStatus]);

  const handleIssueSuccess = () => {
    fetchStockStatus();
    setRefreshKey((k) => k + 1);
    if (typeof refreshData === 'function') refreshData();
  };

  return (
    <div className="consumables-page-container">
      {/* 1. Issue Consumables / FIFO Stock Status Table */}
      {activeTab === 'consumables-issue' && (
        <div className="consumables-page__section">
          <StockStatusTable
            stockStatus={stockStatus}
            onChanged={fetchStockStatus}
            handleApiCall={handleApiCall}
            onIssued={handleIssueSuccess}
          />
        </div>
      )}

      {/* 2. Issuance Logs & History */}
      {activeTab === 'consumables-history' && (
        <div className="consumables-page__section">
          <IssuanceHistoryTable refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}