import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Auth & API Client
import { useAuth } from "./context/AuthContext";
import api from "./api/client";

// Route Guards
import ProtectedRoute from "./auth/ProtectedRoute";
import GuestRoute from "./auth/GuestRoute";

// Layout & Core Pages
import Layout from "./components/Layout";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";

// Feature Pages
import DashboardPage from "./pages/DashboardPage";
import CatalogPage from "./pages/CatalogPage";
import ReceivePage from "./pages/ReceivePage";
import ConsumablesPage from "./pages/ConsumablesPage";
import AccountabilityPage from "./pages/AccountabilityPage";
import TransferReturnPage from "./pages/TransferReturnPage";
import UserManagementPage from "./pages/UserManagementPage";

// UI Notifications
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function App() {
  const { user, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard-overview");

  // ============================================================
  // SHARED SYSTEM DATA
  // ============================================================

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stockBatches, setStockBatches] = useState([]);
  const [serializedAssets, setSerializedAssets] = useState([]);

  // ============================================================
  // FORM STATES
  // ============================================================

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [itemForm, setItemForm] = useState({
    category_id: "",
    name: "",
    unit_of_measure: "",
    reorder_level: "",
    is_serialized: false,
  });

  const [receiveForm, setReceiveForm] = useState({
    item_id: "",
    unit_cost: "",
    arrival_date: "",
    tracking_type: "",
    quantity: "",
    serial_number: "",
    model: "",
    manufacturer_name: "",
    country_of_origin: "",
    estimated_useful_life: "",
  });

  const [accountabilityForm, setAccountabilityForm] = useState({
    serialized_asset_id: "",
    user_id: "",
    issued_by_id: "",
    date_issued: "",
    remarks: "",
  });

  // ============================================================
  // CENTRALIZED DATA FETCHING
  // ============================================================

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [catRes, itemRes, batchRes, assetRes] = await Promise.all([
        api.get("/v1/categories").catch(() => null),
        api.get("/v1/items").catch(() => null),
        api.get("/v1/stock-batches").catch(() => null),
        api.get("/v1/serialized-assets").catch(() => null),
      ]);

      if (catRes?.data) {
        setCategories(
          Array.isArray(catRes.data)
            ? catRes.data
            : catRes.data.data || []
        );
      }

      if (itemRes?.data) {
        setItems(
          Array.isArray(itemRes.data)
            ? itemRes.data
            : itemRes.data.data || []
        );
      }

      if (batchRes?.data) {
        setStockBatches(
          Array.isArray(batchRes.data)
            ? batchRes.data
            : batchRes.data.data || []
        );
      }

      if (assetRes?.data) {
        setSerializedAssets(
          Array.isArray(assetRes.data)
            ? assetRes.data
            : assetRes.data.data || []
        );
      }
    } catch (error) {
      console.error("Error fetching system data:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // CENTRALIZED API HANDLER
  // ============================================================

  const handleApiCall = async (
    endpoint,
    payload,
    onSuccess,
    method = "POST"
  ) => {
    try {
      const cleanEndpoint = endpoint
        .replace(/^\/+/, "")
        .replace(/^api\/+/i, "")
        .replace(/^v1\/+/i, "");

      const response = await api({
        url: `/v1/${cleanEndpoint}`,
        method,
        data: payload,
      });

      toast.success(
        response.data?.message || "Action completed successfully!"
      );

      if (onSuccess) {
        onSuccess();
      }

      await fetchData();

      return response.data;
    } catch (error) {
      console.error("API Error:", error);

      const data = error.response?.data;

      toast.error(
        data?.error ||
          (data?.errors
            ? Object.values(data.errors).flat().join(" ")
            : "An unexpected error occurred.")
      );

      throw error;
    }
  };

  // ============================================================
  // PAGE CONTENT
  // ============================================================

  const renderActivePage = () => {
    // ----------------------------------------------------------
    // DASHBOARD
    // ----------------------------------------------------------

    if (activeTab.startsWith("dashboard")) {
      if (!hasPermission("view dashboard")) {
        return <AccessDenied />;
      }

      return (
        <DashboardPage
          items={items}
          categories={categories}
          stockBatches={stockBatches}
          serializedAssets={serializedAssets}
        />
      );
    }

    // ----------------------------------------------------------
    // CATALOG
    // ----------------------------------------------------------

    if (activeTab.startsWith("catalog")) {
      if (!hasPermission("manage items")) {
        return <AccessDenied />;
      }

      return (
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
      );
    }

    // ----------------------------------------------------------
    // RECEIVE STOCK
    // ----------------------------------------------------------

    if (activeTab.startsWith("receive")) {
      if (!hasPermission("receive stock")) {
        return <AccessDenied />;
      }

      return (
        <ReceivePage
          activeTab={activeTab}
          items={items}
          receiveForm={receiveForm}
          setReceiveForm={setReceiveForm}
          handleApiCall={handleApiCall}
        />
      );
    }

    // ----------------------------------------------------------
    // CONSUMABLES
    // ----------------------------------------------------------

    if (activeTab.startsWith("consumables")) {
      if (!hasPermission("issue consumables")) {
        return <AccessDenied />;
      }

      return (
        <ConsumablesPage
          activeTab={activeTab}
          stockBatches={stockBatches}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    // ----------------------------------------------------------
    // ACCOUNTABILITY
    // ----------------------------------------------------------

    if (activeTab.startsWith("accountability")) {
      if (!hasPermission("issue assets")) {
        return <AccessDenied />;
      }

      return (
        <AccountabilityPage
          activeTab={activeTab}
          serializedAssets={serializedAssets}
          accountabilityForm={accountabilityForm}
          setAccountabilityForm={setAccountabilityForm}
          handleApiCall={handleApiCall}
        />
      );
    }

    // ----------------------------------------------------------
    // TRANSFERS & RETURNS
    // ----------------------------------------------------------

    if (activeTab.startsWith("transfer-return")) {
      if (!hasPermission("transfer assets")) {
        return <AccessDenied />;
      }

      return (
        <TransferReturnPage
          activeTab={activeTab}
          serializedAssets={serializedAssets}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    // ----------------------------------------------------------
    // ADMINISTRATION
    // ----------------------------------------------------------

    if (activeTab.startsWith("admin")) {
      return hasPermission("manage users") ? (
        <UserManagementPage
          activeTab={activeTab}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      ) : (
        <AccessDenied />
      );
    }

    // ----------------------------------------------------------
    // UNKNOWN TAB
    // ----------------------------------------------------------

    return <AccessDenied />;
  };

  return (
    <>
      <Toaster richColors position="top-right" />

      <Routes>
        {/* ======================================================
            GUEST ROUTES
        ====================================================== */}

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ======================================================
            PROTECTED SYSTEM ROUTES
        ====================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <Layout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              >
                {renderActivePage()}
              </Layout>
            }
          />
        </Route>

        {/* ======================================================
            FALLBACK
        ====================================================== */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}

// ============================================================
// ACCESS DENIED COMPONENT
// ============================================================

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold">
          Access Denied
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have permission to access this section.
        </p>
      </div>
    </div>
  );
}