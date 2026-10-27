import React, { useState, useEffect, useCallback } from "react";
import { Search, Shield, RefreshCw, MoreVertical, UserCog, Pencil } from "lucide-react";

import api from "../../api/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import UserAccessModal from "./UserAccessModal.jsx";
import EditUserInfo from "./EditUserInfo.jsx";

export default function UserDirectoryTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Manage User Access Modal state
  const [selectedAccessUser, setSelectedAccessUser] = useState(null);
  const [isUserAccessOpen, setIsUserAccessOpen] = useState(false);

  // Edit User Info Modal state
  const [selectedEditUser, setSelectedEditUser] = useState(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/v1/users");
      setUsers(
        Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : []
      );
    } catch (err) {
      console.error("Failed to load user directory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers for User Access Modal
  const openUserAccess = (user) => {
    setSelectedAccessUser(user);
    setIsUserAccessOpen(true);
  };

  const closeUserAccess = () => {
    setIsUserAccessOpen(false);
    setSelectedAccessUser(null);
  };

  // Handlers for Edit User Info Modal
  const openEditUser = (user) => {
    setSelectedEditUser(user);
    setIsEditUserOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    // Safe Role Normalization
    const userRoles = (user.roles || []).map((r) =>
      typeof r === "string" ? r.toLowerCase() : r.name?.toLowerCase() || ""
    );

    // Safe Permission Normalization
    const userPerms = (user.permissions || user.all_permissions || []).map((p) =>
      typeof p === "string" ? p.toLowerCase() : p.name?.toLowerCase() || ""
    );

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.unit?.toLowerCase().includes(query) ||
      user.division?.toLowerCase().includes(query) ||
      user.designation?.toLowerCase().includes(query) ||
      userRoles.some((role) => role.includes(query)) ||
      userPerms.some((perm) => perm.includes(query))
    );
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">User Directory</CardTitle>
            <CardDescription>Total accounts: {users.length}</CardDescription>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users, roles, or permissions..."
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchUsers}
              disabled={loading}
              title="Refresh users"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User Details</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-center">Direct Permissions</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Loading user directory...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    // Normalize roles (Array of strings OR Array of objects)
                    const roles = (user.roles || []).map((r) =>
                      typeof r === "string" ? r : r.name
                    );

                    // Normalize direct permissions (Array of strings OR Array of objects)
                    const directPermissions = (user.permissions || []).map((p) =>
                      typeof p === "string" ? p : p.name
                    );

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/40">
                        {/* USER DETAILS */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>

                        {/* ORGANIZATION */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.unit || "—"}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.division ? `${user.division}` : "—"}
                              {user.designation ? ` • ${user.designation}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        {/* ROLES */}
                        <TableCell>
                          {roles.length === 0 ? (
                            <Badge variant="secondary" className="font-normal text-muted-foreground">
                              Not Assigned
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {roles.map((roleName) => (
                                <Badge
                                  key={roleName}
                                  variant="outline"
                                  className="border-primary/30 bg-primary/5 text-primary font-medium"
                                >
                                  <Shield className="mr-1 size-3" />
                                  <span className="capitalize">{roleName.replace(/_/g, " ")}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        {/* DIRECT PERMISSIONS */}
                        <TableCell className="text-center">
                          {directPermissions.length > 0 ? (
                            <Badge variant="secondary" className="font-mono">
                              +{directPermissions.length} direct
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>

                        {/* ACTIONS */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Account Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditUser(user)}>
                                  <Pencil className="mr-2 size-4 text-muted-foreground" />
                                  Edit User Info
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openUserAccess(user)}>
                                  <UserCog className="mr-2 size-4 text-primary" />
                                  Manage User Access
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* EDIT USER INFO MODAL */}
      {selectedEditUser && (
        <EditUserInfo
          user={selectedEditUser}
          open={isEditUserOpen}
          onOpenChange={(open) => {
            setIsEditUserOpen(open);
            if (!open) setSelectedEditUser(null);
          }}
          onUserUpdated={fetchUsers}
        />
      )}

      {/* USER ACCESS MODAL */}
      {selectedAccessUser && (
        <UserAccessModal
          user={selectedAccessUser}
          isOpen={isUserAccessOpen}
          onClose={closeUserAccess}
          onSaveSuccess={fetchUsers}
        />
      )}
    </>
  );
}