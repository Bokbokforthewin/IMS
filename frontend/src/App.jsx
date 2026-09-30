import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth & API Client
import { useAuth } from './context/AuthContext';
import api from './api/client';

// Route Guards
import ProtectedRoute from './auth/ProtectedRoute';
import GuestRoute from './auth/GuestRoute';

// Layout & Core Pages
import Layout from './components/Layout';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';

// Feature Pages
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import ReceivePage from './pages/ReceivePage';
import ConsumablesPage from './pages/ConsumablesPage';
import AccountabilityPage from './pages/AccountabilityPage';
import TransferReturnPage from './pages/TransferReturnPage';
import UserManagementPage from './pages/UserManagementPage';

// UI Notifications
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard-overview');

  // Shared System Data States
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stockBatches, setStockBatches] = useState([]);
  const [serializedAssets, setSerializedAssets] = useState([]);

  // Form States
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ 
    category_id: '', name: '', unit_of_measure: '', reorder_level: '', is_serialized: false 
  });
  const [receiveForm, setReceiveForm] = useState({
    item_id: '', unit_cost: '', arrival_date: '', tracking_type: '',
    quantity: '', serial_number: '', model: '',
    manufacturer_name: '', country_of_origin: '', estimated_useful_life: ''
  });
  const [accountabilityForm, setAccountabilityForm] = useState({ 
    serialized_asset_id: '', user_id: '', issued_by_id: '', date_issued: '', remarks: '' 
  });

  // Centralized System Data Fetching
  const fetchData = useCallback(async () => {
    if (!user) return; // Skip if unauthenticated

    try {
      const [catRes, itemRes, batchRes, assetRes] = await Promise.all([
        api.get('/v1/categories').catch(() => null),
        api.get('/v1/items').catch(() => null),
        api.get('/v1/stock-batches').catch(() => null),
        api.get('/v1/serialized-assets').catch(() => null),
      ]);

      if (catRes?.data) setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.data || []);
      if (itemRes?.data) setItems(Array.isArray(itemRes.data) ? itemRes.data : itemRes.data.data || []);
      if (batchRes?.data) setStockBatches(Array.isArray(batchRes.data) ? batchRes.data : batchRes.data.data || []);
      if (assetRes?.data) setSerializedAssets(Array.isArray(assetRes.data) ? assetRes.data : assetRes.data.data || []);
    } catch (error) {
      console.error('Error fetching system data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Centralized API Handler for Form Submissions & Actions
  const handleApiCall = async (endpoint, payload, onSuccess, method = 'POST') => {
    try {
      // Clean endpoint string to avoid endpoint duplication issues
      const cleanEndpoint = endpoint.replace(/^\/?(api\/)?(v1\/)?/, '');

      const response = await api({
        url: `/v1/${cleanEndpoint}`,
        method: method,
        data: payload,
      });

      toast.success(response.data?.message || 'Action completed successfully!');
      if (onSuccess) onSuccess();
      fetchData(); // Refresh global states after mutation
      return response.data;
    } catch (error) {  
      console.error('API Error:', error);
      const data = error.response?.data;
      toast.error(
        data?.error || 
        (data?.errors ? Object.values(data.errors).flat().join(' ') : 'An unexpected error occurred.')
      );
      throw error;
    }
  };

  return (
    <>
      <Toaster richColors position="top-right" />

      <Routes>
        {/* Unauthenticated Guest Routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Authenticated Protected System Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
                {/* Dashboard Tab */}
                {activeTab.startsWith('dashboard') && (
                  <DashboardPage 
                    items={items}
                    categories={categories}
                    stockBatches={stockBatches}
                    serializedAssets={serializedAssets}
                  />
                )}

                {/* Catalog Tab */}
                {activeTab.startsWith('catalog') && (
                  <CatalogPage 
                    activeTab={activeTab}
                    categories={categories}
                    categoryForm={categoryForm}
                    setCategoryForm={setCategoryForm}
                    items={items}
                    itemForm={itemForm}
                    setItemForm={setItemForm}
                    handleApiCall={handleApiCall}
                  />
                )}

                {/* Receive Stock Tab */}
                {activeTab.startsWith('receive') && (
                  <ReceivePage 
                    activeTab={activeTab}
                    items={items}
                    receiveForm={receiveForm}
                    setReceiveForm={setReceiveForm}
                    handleApiCall={handleApiCall}
                  />
                )}

                {/* Consumables Tab */}
                {activeTab.startsWith('consumables') && (
                  <ConsumablesPage 
                    activeTab={activeTab}
                    stockBatches={stockBatches}
                    handleApiCall={handleApiCall}
                    refreshData={fetchData}
                  />
                )}

                {/* Asset Accountability Tab */}
                {activeTab.startsWith('accountability') && (
                  <AccountabilityPage 
                    activeTab={activeTab}
                    serializedAssets={serializedAssets}
                    accountabilityForm={accountabilityForm}
                    setAccountabilityForm={setAccountabilityForm}
                    handleApiCall={handleApiCall}
                  />
                )}

                {/* Transfers & Movement Logs Tab */}
                {activeTab.startsWith('transfer-return') && (
                  <TransferReturnPage 
                    activeTab={activeTab}
                    serializedAssets={serializedAssets}
                    handleApiCall={handleApiCall}
                    refreshData={fetchData}
                  />
                )}

                {/* Admin Management Panel */}
                {activeTab.startsWith('admin') && (
                  <UserManagementPage 
                    activeTab={activeTab}
                    handleApiCall={handleApiCall}
                    refreshData={fetchData}
                  />
                )}
              </Layout>
            }
          />
        </Route>

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}