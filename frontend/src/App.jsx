import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { ArrowUp } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import api from "./api/client";

import ProtectedRoute from "./auth/ProtectedRoute";
import GuestRoute from "./auth/GuestRoute";

import Layout from "./components/Layout";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";

import DashboardPage from "./pages/DashboardPage";
import CatalogPage from "./pages/CatalogPage";
import ReceivePage from "./pages/ReceivePage";
import ConsumablesPage from "./pages/ConsumablesPage";
import AccountabilityPage from "./pages/AccountabilityPage";
import TransferReturnPage from "./pages/TransferReturnPage";
import UserManagementPage from "./pages/UserManagementPage";
import AuditPage from "./pages/AuditPage";
import QuickReceivePage from "./pages/QuickReceivePage";
import ReportsPage from "./pages/ReportsPage";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function App() {
  const { user, hasPermission, settings } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard-overview");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stockBatches, setStockBatches] = useState([]);
  const [serializedAssets, setSerializedAssets] = useState([]);

  const simplified = Boolean(settings?.simplified_encoding_workflow);

  const getDefaultAllowedTab = useCallback(() => {
    if (!user) return "dashboard-overview";
    if (hasPermission("view:dashboard_page")) return "dashboard-overview";

    const candidates = [
      { perm: "view:quick_receive_page", tab: "quick-receive-form", allowed: simplified },
      { perm: "view:catalog_page", tab: "catalog-items", allowed: !simplified },
      { perm: "view:receiving_page", tab: "receive-single", allowed: !simplified },
      { perm: "view:consumables_page", tab: "consumables-issue", allowed: true },
      { perm: "view:assets_page", tab: "accountability-list", allowed: true },
      { perm: "view:reports_page", tab: "reports-overview", allowed: true },
      { perm: "view:audit_trail_page", tab: "audit-logs", allowed: true },
      { perm: "action:manage users", tab: "admin-users", allowed: true },
    ];

    const match = candidates.find((c) => c.allowed && hasPermission(c.perm));
    return match ? match.tab : "dashboard-overview";
  }, [user, hasPermission, simplified]);

  useEffect(() => {
    if (!user) return;

    const tabPermissionMap = {
      dashboard: "view:dashboard_page",
      "quick-receive": "view:quick_receive_page",
      catalog: "view:catalog_page",
      receive: "view:receiving_page",
      consumables: "view:consumables_page",
      accountability: "view:assets_page",
      "transfer-return": "view:assets_page",
      admin: "action:manage users",
      audit: "view:audit_trail_page",
      reports: "view:reports_page",
    };

    const currentRequiredPerm = Object.entries(tabPermissionMap).find(([prefix]) =>
      activeTab.startsWith(prefix)
    )?.[1];

    if (currentRequiredPerm && !hasPermission(currentRequiredPerm)) {
      const nextTab = getDefaultAllowedTab();
      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    }
  }, [user, activeTab, hasPermission, getDefaultAllowedTab]);

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

  useEffect(() => {
    const checkScroll = () => {
      const hasWindowScroll = window.scrollY > 120;
      const hasElementScroll = [...document.querySelectorAll("*")].some(
        (el) => el.scrollTop > 120
      );
      setShowScrollTop(hasWindowScroll || hasElementScroll);
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    document.addEventListener("scroll", checkScroll, {
      capture: true,
      passive: true,
    });
    checkScroll();

    return () => {
      window.removeEventListener("scroll", checkScroll);
      document.removeEventListener("scroll", checkScroll, { capture: true });
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    document.querySelectorAll("*").forEach((el) => {
      if (el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

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
          Array.isArray(catRes.data) ? catRes.data : catRes.data.data || []
        );
      }

      if (itemRes?.data) {
        setItems(
          Array.isArray(itemRes.data) ? itemRes.data : itemRes.data.data || []
        );
      }

      if (batchRes?.data) {
        setStockBatches(
          Array.isArray(batchRes.data) ? batchRes.data : batchRes.data.data || []
        );
      }

      if (assetRes?.data) {
        setSerializedAssets(
          Array.isArray(assetRes.data) ? assetRes.data : assetRes.data.data || []
        );
      }
    } catch (error) {
      console.error("Error fetching system data:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const renderActivePage = () => {
    if (activeTab.startsWith("dashboard")) {
      if (!hasPermission("view:dashboard_page")) return <AccessDenied />;

      return (
        <DashboardPage
          items={items}
          categories={categories}
          stockBatches={stockBatches}
          serializedAssets={serializedAssets}
        />
      );
    }

    if (activeTab.startsWith("quick-receive")) {
      if (!hasPermission("view:quick_receive_page")) return <AccessDenied />;
      return (
        <QuickReceivePage
          activeTab={activeTab}
          categories={categories}
          items={items}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    if (activeTab.startsWith("catalog")) {
      if (!hasPermission("view:catalog_page")) return <AccessDenied />;

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

    if (activeTab.startsWith("receive")) {
      if (!hasPermission("view:receiving_page")) return <AccessDenied />;

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

    if (activeTab.startsWith("consumables")) {
      if (!hasPermission("view:consumables_page")) return <AccessDenied />;

      return (
        <ConsumablesPage
          activeTab={activeTab}
          stockBatches={stockBatches}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    if (activeTab.startsWith("accountability")) {
      if (!hasPermission("view:assets_page")) return <AccessDenied />;

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

    if (activeTab.startsWith("transfer-return")) {
      if (!hasPermission("view:assets_page")) return <AccessDenied />;

      return (
        <TransferReturnPage
          activeTab={activeTab}
          serializedAssets={serializedAssets}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    if (activeTab.startsWith("admin")) {
      if (!hasPermission("action:manage users")) return <AccessDenied />;

      return (
        <UserManagementPage
          activeTab={activeTab}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    if (activeTab.startsWith("audit")) {
      if (!hasPermission("view:audit_trail_page")) return <AccessDenied />;

      return (
        <AuditPage
          activeTab={activeTab}
          api={api}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    if (activeTab.startsWith("reports")) {
      if (!hasPermission("view:reports_page")) return <AccessDenied />;

      return (
        <ReportsPage
          activeTab={activeTab}
          handleApiCall={handleApiCall}
          refreshData={fetchData}
        />
      );
    }

    return <AccessDenied />;
  };

  return (
    <>
      <Toaster richColors position="top-right" />

      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

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

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>

      {showScrollTop &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll back to top"
            title="Back to top"
            style={{
              position: "fixed",
              right: "24px",
              bottom: "24px",
              width: "38px",
              height: "38px",
              borderRadius: "9999px",
              zIndex: 2147483647,
            }}
            className="flex items-center justify-center border border-border bg-card text-foreground shadow-lg hover:bg-muted cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" />
          </button>,
          document.body
        )}
    </>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have permission to access this section.
        </p>
      </div>
    </div>
  );
}