import React, { useState, useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import api from "../../api/client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function RoleManagementModal({ isOpen, onClose }) {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [checkedPermissions, setCheckedPermissions] = useState([]);
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

  useEffect(() => {
    if (selectedRole && matrix[selectedRole]) {
      setCheckedPermissions(matrix[selectedRole]);
    }
  }, [selectedRole, matrix]);

  const togglePermission = (perm) => {
    setCheckedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/v1/permissions-matrix", {
        role: selectedRole,
        permissions: checkedPermissions,
      });
      await fetchMatrix();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save role permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Manage Roles
          </DialogTitle>
          <DialogDescription>
            Define what each role is allowed to do. Changes apply to every user holding this role.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role to edit..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <span className="capitalize">{role.replace(/_/g, " ")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Permissions for this role</span>
              <Badge variant="outline">{checkedPermissions.length} enabled</Badge>
            </div>

            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
              {allPermissions.map((perm) => (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 rounded-md border bg-background p-2 text-xs transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checkedPermissions.includes(perm)}
                    onCheckedChange={() => togglePermission(perm)}
                  />
                  <span>{perm}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !selectedRole}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}