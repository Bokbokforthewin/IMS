import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import CatalogPage from './pages/CatalogPage';
import ReceivePage from './pages/ReceivePage';
import ConsumablesPage from './pages/ConsumablesPage';
import AccountabilityPage from './pages/AccountabilityPage';
import TransferReturnPage from './pages/TransferReturnPage';

const API_BASE_URL = '/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Shared state variables
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stockBatches, setStockBatches] = useState([]);
  const [serializedAssets, setSerializedAssets] = useState([]);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ category_id: '', name: '', unit_of_measure: '', reorder_level: '', is_serialized: false });
  const [receiveForm, setReceiveForm] = useState({
    item_id: '', unit_cost: '', arrival_date: '', is_serialized: false,
    quantity: '', serial_number: '', model: '',
    manufacturer_name: '', country_of_origin: '', estimated_useful_life: ''
  });
  const [accountabilityForm, setAccountabilityForm] = useState({ serialized_asset_id: '',user_id: '',issued_by_id: '', date_issued: '', remarks: '' });
  
  // Transfer / Return Form State
  const [transferForm, setTransferForm] = useState({
    serialized_asset_id: '',
    transfer_type: 'RETURN',
    from_office: '',
    to_office: '',
    reason: '',
    transfer_date: '',
    remarks: ''
  });

  // Helper to extract array safely whether it's direct or wrapped in { data: [...] }
  const parseJsonArray = async (res) => {
    try {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.data)) return json.data;
      return [];
    } catch {
      return [];
    }
  };

  // Fetch initial master lists
  const fetchData = async () => {
    try {
      const [catRes, itemRes, batchRes, assetRes] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/items`).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/stock-batches`).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/serialized-assets`).catch(() => ({ ok: false }))
      ]);

      if (catRes.ok) setCategories(await parseJsonArray(catRes));
      if (itemRes.ok) setItems(await parseJsonArray(itemRes));
      if (batchRes.ok) setStockBatches(await parseJsonArray(batchRes));
      if (assetRes.ok) setSerializedAssets(await parseJsonArray(assetRes));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApiCall = async (endpoint, payload, onSuccess, method = 'POST') => { // <-- Add method parameter here
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: method, // <-- Use the dynamic method here instead of hardcoding 'POST'
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Success!');
        if (onSuccess) onSuccess();
        fetchData(); // Refresh data globally
      } else {
        alert(data.error || JSON.stringify(data.errors) || 'An error occurred.');
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('An unexpected network error occurred.');
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'catalog' && (
        <CatalogPage 
          categories={categories}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          items={items}
          itemForm={itemForm}
          setItemForm={setItemForm}
          handleApiCall={handleApiCall}
        />
      )}

      {activeTab === 'receive' && (
        <ReceivePage 
          items={items}
          receiveForm={receiveForm}
          setReceiveForm={setReceiveForm}
          handleApiCall={handleApiCall}
        />
      )}

      {activeTab === 'consumables' && (
        <ConsumablesPage 
          stockBatches={stockBatches}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      )}

      {activeTab === 'accountability' && (
        <AccountabilityPage 
          serializedAssets={serializedAssets}
          accountabilityForm={accountabilityForm}
          setAccountabilityForm={setAccountabilityForm}
          handleApiCall={handleApiCall}
        />
      )}

      {activeTab === 'transfer-return' && (
        <TransferReturnPage 
          serializedAssets={serializedAssets}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardPage
          serializedAssets={serializedAssets}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      )}
    </Layout>
  );
}