import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export default function Layout({
  activeTab,
  setActiveTab,
  children,
}) {
  return (
    <SidebarProvider>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="z-10 shrink-0 border-b bg-background">
          <Header />
        </div>

        {/* Scrollable Content Area */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}