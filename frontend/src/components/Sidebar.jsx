import React, { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  LayoutDashboard,
  Boxes,
  PackageCheck,
  PackageOpen,
  ClipboardCheck,
  ArrowLeftRight,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Baby,
  ReceiptText,
  ShieldCogCorner,
  Sun,
  Moon,
} from "lucide-react";

import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Switch } from "@/components/ui/switch";

const rawMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "view:dashboard_page",
    subItems: [
      { id: "dashboard-overview", label: "Overview", permission: "view:dashboard_page" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ReceiptText,
    permission: "view:reports_page",
    subItems: [
      { id: "reports-overview", label: "Reports", permission: "view:reports_page" },
    ],
  },
  {
    id: "quick-receive",
    label: "Quick Receive",
    icon: PackageCheck,
    permission: "view:quick_receive_page",
    subItems: [
      { id: "quick-receive-categories", label: "Categories", permission: "component:quick_category_widget" },
      { id: "quick-receive-form", label: "Quick Receive Form", permission: "component:quick_receive_form_widget" },
      { id: "quick-receive-history", label: "Received History", permission: "component:quick_receive_history_widget" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Boxes,
    permission: "view:catalog_page",
    subItems: [
      { id: "catalog-categories", label: "Categories", permission: "component:catalog_category_widget" },
      { id: "catalog-items", label: "Items", permission: "component:catalog_item_widget" },
    ],
  },
  {
    id: "receive",
    label: "Receive Stock",
    icon: PackageCheck,
    permission: "view:receiving_page",
    subItems: [
      { id: "receive-single", label: "Single Item", permission: "component:receive_single_item_widget" },
      { id: "receive-bundle", label: "Bundle / Set", permission: "component:receive_bulk_item_widget" },
      { id: "receive-history", label: "Received History", permission: "component:receive_history_widget" },
    ],
  },
  {
    id: "consumables",
    label: "Issue Consumables",
    icon: PackageOpen,
    permission: "view:consumables_page",
    subItems: [
      { id: "consumables-issue", label: "Issue Item", permission: "component:issue_consumable_item_widget" },
      { id: "consumables-history", label: "Issue History", permission: "component:issue_history_widget" },
    ],
  },
  {
    id: "accountability",
    label: "Assign Asset",
    icon: ClipboardCheck,
    permission: "view:assets_page",
    subItems: [
      { id: "accountability-assign", label: "Assign Form", permission: "component:assign_asset_form_widget" },
      { id: "accountability-list", label: "Assigned List", permission: "component:assigned_list_widget" },
    ],
  },
  {
    id: "transfer-return",
    label: "Transfers & Returns",
    icon: ArrowLeftRight,
    permission: "view:assets_page",
    subItems: [
      { id: "transfer-return-form", label: "Transfer / Return", permission: "component:transfer_return_form_widget" },
      { id: "transfer-return-history", label: "Movement Logs", permission: "component:movement_logs_widget" },
    ],
  },
  {
    id: "admin",
    label: "Admin Panel",
    icon: Baby,
    permission: "action:manage users",
    subItems: [
      { id: "admin-users", label: "User Management", permission: "action:manage users" },
    ],
  },
  {
    id: "audit",
    label: "Audit Trail",
    icon: ShieldCogCorner,
    permission: "view:audit_trail_page",
    subItems: [
      { id: "audit-logs", label: "Audit Logs", permission: "view:audit_trail_page" },
    ],
  },
];

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      }}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {isCollapsed ? (
        <PanelLeftOpen className="size-4" />
      ) : (
        <PanelLeftClose className="size-4" />
      )}
    </button>
  );
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  appConfig: propConfig 
}) {
  const { hasPermission, settings } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [openMenus, setOpenMenus] = useState({});
  const [appConfig, setAppConfig] = useState(propConfig || null);

  // Night Mode State synced with document class and localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const simplified = settings?.simplified_encoding_workflow;

  const filteredMenuItems = rawMenuItems
    .filter((item) => {
      if (simplified && (item.id === "catalog" || item.id === "receive")) return false;
      if (!simplified && item.id === "quick-receive") return false;
      return true;
    })
    .map((item) => {
      const hasParentPerm = hasPermission(item.permission);
      const allowedSubItems = (item.subItems || []).filter(
        (subItem) => !subItem.permission || hasPermission(subItem.permission)
      );

      if (hasParentPerm || allowedSubItems.length > 0) {
        return {
          ...item,
          subItems: allowedSubItems,
        };
      }

      return null;
    })
    .filter(Boolean);

  useEffect(() => {
    if (propConfig) {
      setAppConfig(propConfig);
      return;
    }

    const fetchAppConfig = async () => {
      try {
        const response = await fetch("/api/app-config");
        if (response.ok) {
          const data = await response.json();
          setAppConfig(data);
        }
      } catch (err) {
        console.error("Failed to load application configuration:", err);
      }
    };

    fetchAppConfig();
  }, [propConfig]);

  const toggleMenu = (id) => {
    setOpenMenus((current) => ({
      ...current,
      [id]: current[id] !== undefined ? !current[id] : !activeTab.startsWith(id),
    }));
  };

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground text-left">
      {/* Header */}
      <SidebarHeader className="flex h-14 items-center justify-between border-b border-sidebar-border px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 overflow-hidden text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Toggle Sidebar"
              className="flex items-center justify-center shrink-0"
            >
              <Logo size={28} />
            </button>

            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-sidebar-foreground">
                {appConfig?.name || "Inventory System"}
              </span>
              <span className="truncate text-xs text-sidebar-muted-foreground">
                {appConfig?.organization || "DOH NIR CHD"}
              </span>
            </div>
          </div>

          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarCollapseButton />
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="text-left">
        <SidebarGroup className="text-left">
          <SidebarGroupLabel className="text-left text-xs font-semibold uppercase tracking-wider text-sidebar-muted-foreground">
            Inventory Management
          </SidebarGroupLabel>

          <SidebarGroupContent className="text-left">
            <SidebarMenu className="text-left">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isParentActive = activeTab.startsWith(item.id);
                const isOpen = openMenus[item.id] ?? isParentActive;

                return (
                  <Collapsible
                    key={item.id}
                    open={isOpen}
                    onOpenChange={() => toggleMenu(item.id)}
                    className="group/collapsible w-full text-left"
                  >
                    <SidebarMenuItem className="text-left">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={isParentActive}
                          className="h-9 w-full justify-start text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                          onClick={() => {
                            if (item.subItems?.length) {
                              setActiveTab(item.subItems[0].id);
                            } else {
                              setActiveTab(item.id);
                            }
                          }}
                        >
                          <Icon className="size-4 shrink-0 text-sidebar-foreground" />
                          <span className="flex-1 truncate text-left">
                            {item.label}
                          </span>

                          {item.subItems?.length > 0 && (
                            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-sidebar-muted-foreground" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      {item.subItems?.length > 0 && (
                        <CollapsibleContent>
                          <SidebarMenuSub className="my-1 ml-3.5 border-l border-sidebar-border pl-2.5 text-left">
                            {item.subItems.map((subItem) => {
                              const isActive = activeTab === subItem.id;

                              return (
                                <SidebarMenuSubItem key={subItem.id} className="text-left">
                                  <SidebarMenuSubButton
                                    isActive={isActive}
                                    className="h-8 w-full justify-start text-left text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                                    onClick={() => setActiveTab(subItem.id)}
                                  >
                                    <span className="truncate text-left">
                                      {subItem.label}
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2 text-left">
        {/* Night Mode Switch Toggle */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            {isDarkMode ? (
              <Moon className="size-4 shrink-0 text-sidebar-muted-foreground" />
            ) : (
              <Sun className="size-4 shrink-0 text-sidebar-muted-foreground" />
            )}
            <span className="text-xs font-medium text-sidebar-foreground">Night Mode</span>
          </div>
          <Switch
            checked={isDarkMode}
            onCheckedChange={setIsDarkMode}
            aria-label="Toggle night mode"
          />
        </div>

        <SidebarMenu className="text-left">
          <SidebarMenuItem className="text-left">
            <SidebarMenuButton
              size="lg"
              tooltip={appConfig?.organization || "Organization"}
              className="w-full justify-start text-left hover:bg-sidebar-accent"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-foreground">
                <Boxes className="size-4" />
              </div>

              <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-sidebar-foreground">
                  {appConfig?.region || "DOH NIR CHD"}
                </span>
                <span className="truncate text-[11px] text-sidebar-muted-foreground">
                  ICT Unit Systems
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}