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
    permission: "view catalog",
  },
  {
    key: "receive",
    label: "Receive Stock",
    permission: "view receiving",
  },
  {
    key: "consumables",
    label: "Consumables",
    permission: "view consumables",
  },
  {
    key: "accountability",
    label: "Accountability",
    permission: "view assets",
  },
  {
    key: "transfer-return",
    label: "Transfer/Return",
    permission: "view assets",
  },
  {
    key: "admin",
    label: "Admin Panel",
    permission: "manage users",
  },
  {
    key: "audit",
    label: "Audit Trail",
    permission: "view audit trail",
  },
];

export default function Layout({
  activeTab,
  setActiveTab,
  children,
}) {
  const { hasPermission } = useAuth();

  const visibleTabs = NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  );

  return (
    <SidebarProvider>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        visibleTabs={visibleTabs}
      />

      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
        <div className="z-10 shrink-0 border-b bg-background">
          <Header />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}