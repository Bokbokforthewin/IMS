import React, { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
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

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    subItems: [{ id: "dashboard-overview", label: "Overview" }],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Boxes,
    subItems: [
      { id: "catalog-categories", label: "Categories" },
      { id: "catalog-items", label: "Items" },
    ],
  },
  {
    id: "receive",
    label: "Receive Stock",
    icon: PackageCheck,
    subItems: [
      { id: "receive-single", label: "Single Item" },
      { id: "receive-bundle", label: "Bundle / Set" },
      { id: "receive-history", label: "Received History" },
    ],
  },
  {
    id: "consumables",
    label: "Issue Consumables",
    icon: PackageOpen,
    subItems: [
      { id: "consumables-issue", label: "Issue Item" },
      { id: "consumables-history", label: "Issue History" },
    ],
  },
  {
    id: "accountability",
    label: "Assign Asset",
    icon: ClipboardCheck,
    subItems: [
      { id: "accountability-assign", label: "Assign Form" },
      { id: "accountability-list", label: "Assigned List" },
    ],
  },
  {
    id: "transfer-return",
    label: "Transfers & Returns",
    icon: ArrowLeftRight,
    subItems: [
      { id: "transfer-return-form", label: "Transfer / Return" },
      { id: "transfer-return-history", label: "Movement Logs" },
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
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {isCollapsed ? (
        <PanelLeftOpen className="size-4" />
      ) : (
        <PanelLeftClose className="size-4" />
      )}
    </button>
  );
}

export default function Sidebar({ activeTab, setActiveTab, appConfig: propConfig }) {
  const { toggleSidebar } = useSidebar();
  const [openMenus, setOpenMenus] = useState({});
  const [appConfig, setAppConfig] = useState(propConfig || null);

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
    <ShadcnSidebar collapsible="icon" variant="sidebar" className="border-r text-left">
      {/* Header aligned left when expanded, centered when collapsed as icon */}
      <SidebarHeader className="flex h-14 items-center justify-between border-b px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
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
              <span className="truncate text-xs text-muted-foreground">
                {appConfig?.organization || "DOH NIR CHD"}
              </span>
            </div>
          </div>

          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarCollapseButton />
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="text-left">
        <SidebarGroup className="text-left">
          <SidebarGroupLabel className="text-left text-xs font-medium text-muted-foreground">
            Inventory Management
          </SidebarGroupLabel>

          <SidebarGroupContent className="text-left">
            <SidebarMenu className="text-left">
              {menuItems.map((item) => {
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
                          className="h-9 w-full justify-start text-left"
                          onClick={() => {
                            if (item.subItems?.length) {
                              setActiveTab(item.subItems[0].id);
                            } else {
                              setActiveTab(item.id);
                            }
                          }}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="flex-1 truncate text-left">
                            {item.label}
                          </span>

                          {item.subItems?.length > 0 && (
                            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      {item.subItems?.length > 0 && (
                        <CollapsibleContent>
                          <SidebarMenuSub className="my-1 ml-3.5 border-l pl-2.5 text-left">
                            {item.subItems.map((subItem) => {
                              const isActive = activeTab === subItem.id;

                              return (
                                <SidebarMenuSubItem key={subItem.id} className="text-left">
                                  <SidebarMenuSubButton
                                    isActive={isActive}
                                    className="h-8 w-full justify-start text-left"
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

      {/* Footer Section */}
      <SidebarFooter className="border-t p-2 text-left">
        <SidebarMenu className="text-left">
          <SidebarMenuItem className="text-left">
            <SidebarMenuButton
              size="lg"
              tooltip={appConfig?.organization || "Organization"}
              className="w-full justify-start text-left"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Boxes className="size-4" />
              </div>

              <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-sidebar-foreground">
                  {appConfig?.region || "DOH NIR CHD"}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
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