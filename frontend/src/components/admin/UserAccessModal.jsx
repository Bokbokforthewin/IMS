import React, { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  UserCog,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  LayoutGrid,
  Layers,
  Wrench,
} from "lucide-react";

import api from "../../api/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Human-readable labels and descriptions for system permissions
const PERMISSION_LABEL_MAP = {
  // Page Views
  "view:dashboard_page": { title: "Dashboard Page", desc: "Overview cards and stock summaries" },
  "view:catalog_page": { title: "Catalog Page", desc: "Item masterlist and categories" },
  "view:receiving_page": { title: "Stock Receiving Page", desc: "Inbound inventory encoding" },
  "view:assets_page": { title: "Assets & Accountability", desc: "Track assigned and transferred assets" },
  "view:consumables_page": { title: "Consumables Page", desc: "Issue and track consumable stock" },
  "view:reports_page": { title: "Reports Page", desc: "Generate system reports" },
  "view:audit_trail_page": { title: "Audit Trail Page", desc: "View system audit logs" },
  "view:quick_receive_page": { title: "Quick Receive Page", desc: "Streamlined encoding page" },

  // Component Widgets
  "component:quick_category_widget": { title: "Quick Category Widget", desc: "Manage categories in Quick Receive" },
  "component:quick_receive_form_widget": { title: "Quick Receive Form", desc: "Fast encoding form for receiving stock" },
  "component:quick_receive_history_widget": { title: "Quick Receive History", desc: "View history logs in Quick Receive" },
  "component:catalog_category_widget": { title: "Catalog Category Table", desc: "Manage catalog categories" },
  "component:catalog_item_widget": { title: "Catalog Items Table", desc: "Manage catalog items" },
  "component:receive_single_item_widget": { title: "Single Item Receive Form", desc: "Receive individual stock units" },
  "component:receive_bulk_item_widget": { title: "Bulk / Bundle Receive Form", desc: "Receive grouped sets or bundles" },
  "component:receive_history_widget": { title: "Received Stock Logs", desc: "History logs of received stock" },
  "component:issue_consumable_item_widget": { title: "Issue Consumable Form", desc: "Form to issue consumables" },
  "component:issue_history_widget": { title: "Issuance History Table", desc: "Logs of issued consumables" },
  "component:assign_asset_form_widget": { title: "Assign Asset Form", desc: "Assign assets to personnel" },
  "component:assigned_list_widget": { title: "Assigned Assets List", desc: "List of currently assigned assets" },
  "component:transfer_return_form_widget": { title: "Transfer / Return Form", desc: "Process asset movements" },
  "component:movement_logs_widget": { title: "Movement Logs Table", desc: "Audit log of asset transfers" },

  // Actions & Admin
  "action:manage users": { title: "Manage Users", desc: "Create, edit, or deactivate user accounts" },
  "action:manage roles": { title: "Manage Roles & Matrix", desc: "Configure role permissions and settings" },
  "action:create_custom_permission": { title: "Create Permissions", desc: "Add custom permissions to system" },
  "action:create_custom_role": { title: "Create Roles", desc: "Create new user roles" },
};

export default function UserAccessModal({
  user,
  isOpen,
  onClose,
  onSaveSuccess,
}) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [rolePermissionsMap, setRolePermissionsMap] = useState({});

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [permissionSearch, setPermissionSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadAccess = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [userRes, matrixRes] = await Promise.all([
          api.get(`/v1/users/${user.id}`),
          api.get("/v1/permissions-matrix").catch(() => ({ data: { matrix: {} } })),
        ]);

        const data = userRes.data;
        setAvailableRoles(data.roles || []);
        setAvailablePermissions(data.permissions || []);
        setRolePermissionsMap(matrixRes.data.matrix || {});

        const currentUserRoles = data.user?.roles || user.roles || [];
        const currentUserPermissions = data.user?.permissions || user.permissions || [];

        const activeRoles = currentUserRoles.map((role) =>
          typeof role === "string" ? role : role.name
        );
        const activePerms = currentUserPermissions.map((permission) =>
          typeof permission === "string" ? permission : permission.name
        );

        setSelectedRoles(activeRoles);
        setSelectedPermissions(activePerms);
      } catch (error) {
        console.error("Failed to load user access:", error);
        setErrorMessage("Failed to fetch user access configuration.");
      } finally {
        setLoading(false);
      }
    };

    loadAccess();
  }, [isOpen, user]);

  const selectRole = (roleName) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles([roleName]);
      const defaultRolePerms = rolePermissionsMap[roleName] || [];
      if (defaultRolePerms.length > 0) {
        setSelectedPermissions(defaultRolePerms);
      }
    }
  };

  const togglePermission = (permissionName) => {
    setSelectedPermissions((current) =>
      current.includes(permissionName)
        ? current.filter((permission) => permission !== permissionName)
        : [...current, permissionName]
    );
  };

  const categorizedPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    const filtered = availablePermissions.filter((perm) => {
      const permName = typeof perm === "string" ? perm : perm.name;
      const title = PERMISSION_LABEL_MAP[permName]?.title || permName;
      return (
        permName.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query)
      );
    });

    const categories = {
      view: [],
      component: [],
      action: [],
    };

    filtered.forEach((perm) => {
      const permName = typeof perm === "string" ? perm : perm.name;
      if (permName.startsWith("view:")) categories.view.push(permName);
      else if (permName.startsWith("component:")) categories.component.push(permName);
      else if (permName.startsWith("action:")) categories.action.push(permName);
    });

    return categories;
  }, [availablePermissions, permissionSearch]);

  const toggleCategory = (categoryKey) => {
    const categoryPerms = categorizedPermissions[categoryKey] || [];
    const allChecked = categoryPerms.every((p) => selectedPermissions.includes(p));

    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((p) => !categoryPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...categoryPerms])));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage("");

    try {
      await api.patch(`/v1/users/${user.id}/roles`, { roles: selectedRoles });
      await api.patch(`/v1/users/${user.id}/permissions`, { permissions: selectedPermissions });

      onSaveSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to update user access:", error);
      const backendMessage = error.response?.data?.message || error.message;
      setErrorMessage(
        error.response?.status === 405
          ? "Route error (405): Server expected a different HTTP method (e.g. PATCH)."
          : backendMessage || "Failed to save user access."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (title, icon, perms, categoryKey) => {
    const IconComponent = icon;
    const allSelected = perms.length > 0 && perms.every((p) => selectedPermissions.includes(p));

    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <IconComponent className="size-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
            <Badge variant="outline" className="text-[10px] px-2 py-0 font-normal">
              {perms.length} items
            </Badge>
          </div>

          {perms.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleCategory(categoryKey)}
            >
              {allSelected ? (
                <Square className="mr-1.5 size-3.5 text-muted-foreground" />
              ) : (
                <CheckSquare className="mr-1.5 size-3.5 text-primary" />
              )}
              {allSelected ? "Deselect Category" : "Select Category"}
            </Button>
          )}
        </div>

        {/* Section Permission List - SINGLE COLUMN VERTICAL LIST */}
        {perms.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-md border border-dashed">
            No matching permissions found.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {perms.map((permName) => {
              const isChecked = selectedPermissions.includes(permName);
              const meta = PERMISSION_LABEL_MAP[permName] || {
                title: permName.replace(/^(view:|component:|action:)/, "").replace(/_/g, " "),
                desc: permName,
              };

              return (
                <label
                  key={permName}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-all ${
                    isChecked
                      ? "border-primary/50 bg-primary/5 shadow-sm font-medium"
                      : "bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => togglePermission(permName)}
                      className="shrink-0"
                    />
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="capitalize text-foreground font-semibold truncate">
                        {meta.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {meta.desc}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0 pl-2">
                    {permName}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[92vw] max-w-none sm:max-w-[1100px] !max-w-[1100px] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserCog className="size-5 text-primary" />
            Manage User Access
          </DialogTitle>
          <DialogDescription>
            Configure role assignment and fine-tune direct permission overrides for{" "}
            <strong>{user?.name}</strong> ({user?.email}).
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                Assigned Role
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {selectedRoles.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                Permission Overrides
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {selectedPermissions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SINGLE ROLE SELECTION */}
            <TabsContent value="roles" className="mt-4 space-y-3">
              <div className="space-y-2 rounded-xl border p-3 bg-card">
                {availableRoles.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No roles defined in the system.
                  </p>
                ) : (
                  availableRoles.map((role) => {
                    const roleName = typeof role === "string" ? role : role.name;
                    const isChecked = selectedRoles.includes(roleName);
                    return (
                      <label
                        key={role.id || roleName}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                          isChecked
                            ? "border-primary/50 bg-primary/5 font-semibold shadow-sm"
                            : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="user-role-selection"
                            checked={isChecked}
                            onChange={() => selectRole(roleName)}
                            className="size-4 text-primary accent-primary"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold capitalize">
                              {roleName.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              System Role
                            </span>
                          </div>
                        </div>
                        {isChecked && (
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            Active Role
                          </Badge>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB 2: DIRECT PERMISSION OVERRIDES */}
            <TabsContent value="permissions" className="mt-4 space-y-4">
              <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions by name or description..."
                    className="h-9 pl-8 text-xs bg-background"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </div>
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold">
                  {selectedPermissions.length} Active Permissions
                </Badge>
              </div>

              {renderSection("1. Page Views (Navigation Access)", LayoutGrid, categorizedPermissions.view, "view")}
              {renderSection("2. Component Widgets & Sub-Views", Layers, categorizedPermissions.component, "component")}
              {renderSection("3. Actions & Administrative Controls", Wrench, categorizedPermissions.action, "action")}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Access Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}