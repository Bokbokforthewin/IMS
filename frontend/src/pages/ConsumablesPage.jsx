import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

import StockStatusTable from '../components/consumables/StockStatusTable.jsx';
import IssuanceHistoryTable from '../components/consumables/IssuanceHistoryTable.jsx';

export default function ConsumablesPage({ activeTab, handleApiCall, refreshData }) {
  const [stockStatus, setStockStatus] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStockStatus = useCallback(async () => {
    try {
      // Use the authenticated Axios instance directly for GET requests
      const response = await api.get('/v1/consumables/stock-status');
      const data = response.data;
      
      const resultList = Array.isArray(data) ? data : data?.data || [];
      setStockStatus(resultList);
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
          <IssuanceHistoryTable 
            refreshKey={refreshKey} 
            handleApiCall={handleApiCall}
          />
        </div>
      )}
    </div>
  );
}