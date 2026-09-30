import React, { useEffect, useState, useMemo } from "react";
import { Loader2, ShieldCheck, UserCog, Search, CheckSquare, Square, AlertCircle } from "lucide-react";

import api from "../../api/client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function UserAccessModal({
  user,
  isOpen,
  onClose,
  onSaveSuccess,
}) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);

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
        const response = await api.get(`/v1/users/${user.id}`);
        const data = response.data;

        setAvailableRoles(data.roles || []);
        setAvailablePermissions(data.permissions || []);

        const currentUserRoles = data.user?.roles || user.roles || [];
        const currentUserPermissions = data.user?.permissions || user.permissions || [];

        setSelectedRoles(currentUserRoles.map((role) => role.name));
        setSelectedPermissions(currentUserPermissions.map((permission) => permission.name));
      } catch (error) {
        console.error("Failed to load user access:", error);
        setErrorMessage("Failed to fetch user access configuration.");
      } finally {
        setLoading(false);
      }
    };

    loadAccess();
  }, [isOpen, user]);

  const toggleRole = (roleName) => {
    setSelectedRoles((current) =>
      current.includes(roleName)
        ? current.filter((role) => role !== roleName)
        : [...current, roleName]
    );
  };

  const togglePermission = (permissionName) => {
    setSelectedPermissions((current) =>
      current.includes(permissionName)
        ? current.filter((permission) => permission !== permissionName)
        : [...current, permissionName]
    );
  };

  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return availablePermissions;
    return availablePermissions.filter((perm) =>
      perm.name.toLowerCase().includes(query)
    );
  }, [availablePermissions, permissionSearch]);

  const handleSelectAllFilteredPerms = () => {
    const filteredNames = filteredPermissions.map((p) => p.name);
    const allSelected = filteredNames.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !filteredNames.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...filteredNames])));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage("");

    try {
      // NOTE: Update HTTP methods (PUT/POST/PATCH) according to your backend definitions
      await api.patch(`/v1/users/${user.id}/roles`, { roles: selectedRoles });
      await api.patch(`/v1/users/${user.id}/permissions`, { permissions: selectedPermissions });

      onSaveSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to update user access:", error);
      const backendMessage = error.response?.data?.message || error.message;
      setErrorMessage(
        error.response?.status === 405
          ? "Route error (405): Server expected a different HTTP method (e.g. POST/PATCH)."
          : backendMessage || "Failed to save user access."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <UserCog className="size-5 text-primary" />
            Manage User Access
          </DialogTitle>
          <DialogDescription>
            Configure specific roles and direct permission overrides for <strong>{user?.name}</strong> ({user?.email}).
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
                Roles
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {selectedRoles.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                Direct Permissions
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {selectedPermissions.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* ROLES TAB */}
            <TabsContent value="roles" className="mt-4 space-y-3">
              <div className="text-xs text-muted-foreground">
                Assigned roles grant sets of grouped permissions to the user.
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                {availableRoles.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No roles defined in the system.</p>
                ) : (
                  availableRoles.map((role) => {
                    const isChecked = selectedRoles.includes(role.name);
                    return (
                      <label
                        key={role.id || role.name}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors ${
                          isChecked ? "border-primary/40 bg-primary/5" : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleRole(role.name)}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold capitalize">
                              {role.name.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">System Role</span>
                          </div>
                        </div>
                        {isChecked && <Badge variant="outline" className="border-primary/30 text-primary">Active</Badge>}
                      </label>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* DIRECT PERMISSIONS TAB */}
            <TabsContent value="permissions" className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    className="h-9 pl-8 text-xs"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={handleSelectAllFilteredPerms}
                >
                  <CheckSquare className="mr-1.5 size-3.5" />
                  Toggle Filtered
                </Button>
              </div>

              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
                {filteredPermissions.length === 0 ? (
                  <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">
                    No matching permissions found.
                  </p>
                ) : (
                  filteredPermissions.map((permission) => {
                    const isChecked = selectedPermissions.includes(permission.name);
                    return (
                      <label
                        key={permission.id || permission.name}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs transition-colors ${
                          isChecked ? "border-primary/40 bg-primary/10 font-medium" : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => togglePermission(permission.name)}
                        />
                        <span className="truncate">{permission.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Changes saved here apply immediately to <strong>{user?.name}</strong> upon confirmation.
          </p>
        </div>

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