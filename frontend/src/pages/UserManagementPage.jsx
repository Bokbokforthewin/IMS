import React, { useState } from "react";
import { Users, ShieldCheck, Plus, Settings, Sliders } from "lucide-react";
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"; // Ensure shadcn switch is installed or use standard checkbox

import UserDirectoryTable from "../components/admin/UserDirectoryTable.jsx";
import RolePermissionModal from "../components/admin/RolePermissionModal.jsx";
import AddRolePermission from "../components/admin/AddRolePermission.jsx";

export default function UserManagementPage() {
  const { hasPermission, settings, refetchSettings } = useAuth();

  if (!hasPermission('manage users')) {
    return <div className="p-10 text-center text-muted-foreground">Access denied.</div>;
  }

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAddRolePermissionOpen, setIsAddRolePermissionOpen] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const canManageRoles = hasPermission('manage roles');

  const handleCreated = () => {
    setIsAddRolePermissionOpen(false);
  };

  const handleWorkflowToggle = async (checked) => {
    setUpdatingSettings(true);
    try {
      await api.put('/v1/settings', {
        simplified_encoding_workflow: checked,
      });
      // Refresh AuthContext so Layout sidebar nav re-evaluates immediately
      await refetchSettings();
    } catch (err) {
      console.error('Failed to update system settings:', err);
      alert('Failed to update system settings. Make sure you have the required permissions.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const isSimplified = settings?.simplified_encoding_workflow ?? true;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="size-6 text-primary" />
            User & Access Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, system permissions, and application workflows.
          </p>
        </div>
      </div>

      {/* System Settings & Workflow Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="size-5 text-primary" />
            System & Workflow Settings
          </CardTitle>
          <CardDescription>
            Configure app-wide workflows and operational preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <span className="font-semibold text-sm">Simplified Encoding Workflow</span>
              <p className="text-xs text-muted-foreground">
                When enabled, the sidebar displays <strong>Quick Receive</strong> for single-page encoding. 
                When disabled, it separates items into <strong>Catalog</strong> and <strong>Receive Stock</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isSimplified}
                onCheckedChange={handleWorkflowToggle}
                disabled={updatingSettings || !canManageRoles}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Directory */}
      <UserDirectoryTable />

      {/* Role & Permission Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-primary" />
              Roles & Permissions
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Define role permissions and create new access controls.
            </p>
          </div>

          {canManageRoles && (
            <Button
              size="sm"
              onClick={() => setIsAddRolePermissionOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Add Role / Permission
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <Button
            variant="outline"
            onClick={() => setIsRoleModalOpen(true)}
            disabled={!canManageRoles}
          >
            <ShieldCheck className="mr-2 size-4" />
            Manage Role Permissions
          </Button>
        </CardContent>
      </Card>

      {/* Global Role Matrix Modal */}
      <RolePermissionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      {/* Create Role / Permission Modal */}
      <AddRolePermission
        isOpen={isAddRolePermissionOpen}
        onClose={() => setIsAddRolePermissionOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}