import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext.jsx";

import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    permission: "view dashboard",
  },
  {
    key: "catalog",
    label: "Catalog",
    permission: "manage items",
  },
  {
    key: "receive",
    label: "Receive Stock",
    permission: "receive stock",
  },
  {
    key: "consumables",
    label: "Consumables",
    permission: "issue consumables",
  },
  {
    key: "accountability",
    label: "Accountability",
    permission: "issue assets",
  },
  {
    key: "transfer-return",
    label: "Transfer/Return",
    permission: "transfer assets",
  },
  {
    key: "admin",
    label: "Admin Panel",
    permission: "manage users",
  },
];

export default function Layout({
  activeTab,
  setActiveTab,
  children,
}) {
  const { hasPermission } = useAuth();

  /*
   * Only expose navigation sections that the
   * currently authenticated user is allowed to access.
   */
  const visibleTabs = NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  );

  /*
   * Prevent rendering the application shell while
   * permissions are not yet available, if your
   * AuthContext exposes a loading state later.
   */

  return (
    <SidebarProvider>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        visibleTabs={visibleTabs}
      />

      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
        {/* =========================================================
            FIXED / STICKY HEADER
        ========================================================= */}
        <div className="z-10 shrink-0 border-b bg-background">
          <Header />
        </div>

        {/* =========================================================
            SCROLLABLE CONTENT
        ========================================================= */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}