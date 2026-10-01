import React, { useState } from "react";
import { Users, ShieldCheck, Plus } from "lucide-react";
import { useAuth } from '../context/AuthContext.jsx';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import UserDirectoryTable from "../components/admin/UserDirectoryTable.jsx";
import RolePermissionModal from "../components/admin/RolePermissionModal.jsx";
import AddRolePermission from "../components/admin/AddRolePermission.jsx";

export default function UserManagementPage() {
  const { hasPermission } = useAuth();
  if (!hasPermission('manage users')) {
    return <div className="p-10 text-center text-muted-foreground">Access denied.</div>;
  }
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAddRolePermissionOpen, setIsAddRolePermissionOpen] = useState(false);

  const handleCreated = () => {
    setIsAddRolePermissionOpen(false);
  };

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
            Manage users, roles, and system permissions.
          </p>
        </div>
      </div>

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

          <Button
            size="sm"
            onClick={() => setIsAddRolePermissionOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Add Role / Permission
          </Button>
        </CardHeader>

        <CardContent>
          {/* HERE IS THE BUTTON THAT OPENS THE MATRIX MODAL */}
          <Button
            variant="outline"
            onClick={() => setIsRoleModalOpen(true)}
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