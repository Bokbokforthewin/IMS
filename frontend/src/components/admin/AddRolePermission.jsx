import React, { useState } from "react";
import { Loader2, Plus, Shield, KeyRound } from "lucide-react";

import api from "../../api/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AddRolePermission({ isOpen, onClose, onCreated }) {
  const [activeTab, setActiveTab] = useState("role");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const endpoint = activeTab === "role" ? "/v1/roles" : "/v1/permissions";
      await api.post(endpoint, { name: name.trim().toLowerCase().replace(/\s+/g, "_") });

      setName("");
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(`Failed to create ${activeTab}:`, err);
      setError(err.response?.data?.message || `Failed to create ${activeTab}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Add System Access Control
          </DialogTitle>
          <DialogDescription>
            Create a new system role or an individual permission.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(""); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="role" className="flex items-center gap-2">
              <Shield className="size-4" /> Role
            </TabsTrigger>
            <TabsTrigger value="permission" className="flex items-center gap-2">
              <KeyRound className="size-4" /> Permission
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <TabsContent value="role" className="mt-0 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Role Name</label>
              <Input
                placeholder="e.g. Editor, Department Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Role names will automatically be formatted (e.g., "department_manager").
              </p>
            </TabsContent>

            <TabsContent value="permission" className="mt-0 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Permission Name</label>
              <Input
                placeholder="e.g. create_reports, approve_leave"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Use action syntax like <code>module.action</code> or <code>action_entity</code>.
              </p>
            </TabsContent>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create {activeTab === "role" ? "Role" : "Permission"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}