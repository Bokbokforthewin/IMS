import React, { useState, useEffect, useMemo } from "react";
import { Loader2, ShieldCheck, Search, LayoutGrid, Layers, Wrench, CheckSquare, Square } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Human-readable labels and descriptions for all system permissions
const PERMISSION_LABEL_MAP = {
  // --- PAGE VIEWS ---
  "view:dashboard_page": { title: "Dashboard Page", desc: "Overview cards and stock summaries" },
  "view:catalog_page": { title: "Catalog Page", desc: "Item masterlist and categories" },
  "view:receiving_page": { title: "Stock Receiving Page", desc: "Inbound inventory encoding" },
  "view:assets_page": { title: "Assets & Accountability", desc: "Track assigned and transferred assets" },
  "view:consumables_page": { title: "Consumables Page", desc: "Issue and track consumable stock" },
  "view:reports_page": { title: "Reports Page", desc: "Generate system reports" },
  "view:audit_trail_page": { title: "Audit Trail Page", desc: "View system audit logs" },
  "view:quick_receive_page": { title: "Quick Receive Page", desc: "Streamlined encoding page" },

  // --- COMPONENT WIDGETS ---
  "component:quick_category_widget": { title: "Quick Category Widget", desc: "Create and edit categories in Quick Receive" },
  "component:quick_receive_form_widget": { title: "Quick Receive Form", desc: "Fast encoding form for receiving stock" },
  "component:quick_receive_history_widget": { title: "Quick Receive History", desc: "View logs inside Quick Receive" },
  "component:catalog_category_widget": { title: "Catalog Category Table", desc: "Manage catalog categories" },
  "component:catalog_item_widget": { title: "Catalog Items Table", desc: "Manage catalog items" },
  "component:receive_single_item_widget": { title: "Single Item Receive Form", desc: "Receive individual stock units" },
  "component:receive_bulk_item_widget": { title: "Bulk / Bundle Receive Form", desc: "Receive grouped sets or bundles" },
  "component:receive_history_widget": { title: "Received Stock Logs", desc: "History of received stock" },
  "component:issue_consumable_item_widget": { title: "Issue Consumable Form", desc: "Form to issue consumables" },
  "component:issue_history_widget": { title: "Issuance History Table", desc: "Logs of issued consumables" },
  "component:assign_asset_form_widget": { title: "Assign Asset Form", desc: "Assign assets to personnel" },
  "component:assigned_list_widget": { title: "Assigned Assets List", desc: "List of currently assigned assets" },
  "component:transfer_return_form_widget": { title: "Transfer / Return Form", desc: "Process asset movements" },
  "component:movement_logs_widget": { title: "Movement Logs Table", desc: "Audit log of asset transfers" },

  // --- ACTIONS & ADMIN ---
  "action:manage users": { title: "Manage Users", desc: "Create, edit, or deactivate user accounts" },
  "action:manage roles": { title: "Manage Roles & Matrix", desc: "Configure role permissions and settings" },
  "action:create_custom_permission": { title: "Create Permissions", desc: "Add custom permissions to system" },
  "action:create_custom_role": { title: "Create Roles", desc: "Create new user roles" },
};

// Map Page Views directly to their sub-components for auto-toggling defaults
const PERMISSION_DEPENDENCIES = {
  "view:catalog_page": ["component:catalog_category_widget", "component:catalog_item_widget"],
  "view:receiving_page": [
    "component:receive_single_item_widget",
    "component:receive_bulk_item_widget",
    "component:receive_history_widget",
  ],
  "view:consumables_page": [
    "component:issue_consumable_item_widget",
    "component:issue_history_widget",
  ],
  "view:assets_page": [
    "component:assign_asset_form_widget",
    "component:assigned_list_widget",
    "component:transfer_return_form_widget",
    "component:movement_logs_widget",
  ],
  "view:quick_receive_page": [
    "component:quick_category_widget",
    "component:quick_receive_form_widget",
    "component:quick_receive_history_widget",
  ],
};

export default function RolePermissionModal({ isOpen, onClose }) {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [checkedPermissions, setCheckedPermissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get("/v1/permissions-matrix");
      const fetchedRoles = res.data.roles || [];

      setRoles(fetchedRoles);
      setAllPermissions(res.data.permissions || []);
      setMatrix(res.data.matrix || {});

      if (!selectedRole && fetchedRoles.length > 0) {
        setSelectedRole(fetchedRoles[0]);
      }
    } catch (err) {
      console.error("Failed to load permission matrix:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchMatrix();
  }, [isOpen]);

  // Sync checked permissions when selected role changes
  useEffect(() => {
    if (selectedRole && matrix[selectedRole]) {
      setCheckedPermissions(matrix[selectedRole]);
    }
  }, [selectedRole, matrix]);

  // Fine-grained Toggle with smart parent dependency inclusion
  const togglePermission = (perm) => {
    setCheckedPermissions((prev) => {
      const isCurrentlyChecked = prev.includes(perm);

      if (isCurrentlyChecked) {
        return prev.filter((p) => p !== perm);
      } else {
        // Auto-include child components if a main page view permission is checked
        const dependencies = PERMISSION_DEPENDENCIES[perm] || [];
        return Array.from(new Set([...prev, perm, ...dependencies]));
      }
    });
  };

  const categorizedPermissions = useMemo(() => {
    const filtered = allPermissions.filter((p) => {
      const label = PERMISSION_LABEL_MAP[p]?.title || p;
      return (
        p.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    });

    const categories = {
      view: [],
      component: [],
      action: [],
    };

    filtered.forEach((perm) => {
      if (perm.startsWith("view:")) categories.view.push(perm);
      else if (perm.startsWith("component:")) categories.component.push(perm);
      else if (perm.startsWith("action:")) categories.action.push(perm);
    });

    return categories;
  }, [allPermissions, searchQuery]);

  const toggleAllInCategory = (categoryKey) => {
    const categoryPerms = categorizedPermissions[categoryKey] || [];
    const allChecked = categoryPerms.every((p) => checkedPermissions.includes(p));

    if (allChecked) {
      setCheckedPermissions((prev) => prev.filter((p) => !categoryPerms.includes(p)));
    } else {
      setCheckedPermissions((prev) => Array.from(new Set([...prev, ...categoryPerms])));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/v1/permissions-matrix", {
        role: selectedRole,
        permissions: checkedPermissions,
      });
      await fetchMatrix();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save role permissions.");
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (title, icon, perms, categoryKey) => {
    const IconComponent = icon;
    const allSelected = perms.length > 0 && perms.every((p) => checkedPermissions.includes(p));

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
              onClick={() => toggleAllInCategory(categoryKey)}
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

        {/* Section Grid */}
        {perms.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-md border border-dashed">
            No matching permissions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {perms.map((perm) => {
              const isChecked = checkedPermissions.includes(perm);
              const meta = PERMISSION_LABEL_MAP[perm] || {
                title: perm.replace(/^(view:|component:|action:)/, "").replace(/_/g, " "),
                desc: perm,
              };

              return (
                <label
                  key={perm}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-all ${
                    isChecked
                      ? "border-primary/50 bg-primary/5 shadow-sm font-medium"
                      : "bg-background hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => togglePermission(perm)}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="capitalize text-foreground font-semibold truncate">
                      {meta.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {meta.desc}
                    </span>
                    <span className="text-[9px] text-muted-foreground/70 font-mono truncate pt-0.5">
                      {perm}
                    </span>
                  </div>
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
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="h-5.5 w-5.5 text-primary" />
            Role & Permission Matrix
          </DialogTitle>
          <DialogDescription>
            Select a role to inspect and configure its page view access, widget visibility, and administrative capabilities.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Top Toolbar: Role Selector & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-3.5 rounded-xl border">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Target Role
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full bg-background font-medium">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        <span className="capitalize font-medium">
                          {role.replace(/_/g, " ")}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Filter Permissions
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by permission or description..."
                    className="pl-8 h-10 text-xs bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Total Active Count Badge */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Permission Structure
              </span>
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
                {checkedPermissions.length} Active Permissions for {selectedRole.replace(/_/g, " ")}
              </Badge>
            </div>

            {/* Section 1: Page Views */}
            {renderSection("1. Page Views (Navigation Access)", LayoutGrid, categorizedPermissions.view, "view")}

            {/* Section 2: Component Widgets */}
            {renderSection("2. Component Widgets & Sub-Views", Layers, categorizedPermissions.component, "component")}

            {/* Section 3: Actions & Admin */}
            {renderSection("3. Actions & Administrative Controls", Wrench, categorizedPermissions.action, "action")}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !selectedRole}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Role Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}