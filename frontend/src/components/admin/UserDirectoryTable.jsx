import React, { useState, useEffect, useCallback } from "react";
import { Search, Shield, RefreshCw, MoreVertical, UserCog } from "lucide-react";

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

export default function UserDirectoryTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserAccessOpen, setIsUserAccessOpen] = useState(false);

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

  const openUserAccess = (user) => {
    setSelectedUser(user);
    setIsUserAccessOpen(true);
  };

  const closeUserAccess = () => {
    setIsUserAccessOpen(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.unit?.toLowerCase().includes(query) ||
      user.division?.toLowerCase().includes(query) ||
      user.designation?.toLowerCase().includes(query) ||
      user.roles?.some((role) => role.name?.toLowerCase().includes(query))
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
                placeholder="Search users..."
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
                    const roles = user.roles || [];
                    const directPermissions = user.permissions || [];

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/40">
                        {/* USER DETAILS */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>

                        {/* ORGANIZATION */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{user.unit || "—"}</span>
                            <span className="text-xs text-muted-foreground">{user.division || "—"}</span>
                            <span className="text-xs text-muted-foreground">{user.designation || "—"}</span>
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
                              {roles.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant="outline"
                                  className="border-primary/20 bg-primary/5 text-primary"
                                >
                                  <Shield className="mr-1 size-3" />
                                  <span className="capitalize">{role.name.replace(/_/g, " ")}</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        {/* DIRECT PERMISSIONS */}
                        <TableCell className="text-center">
                          {directPermissions.length > 0 ? (
                            <Badge variant="outline">{directPermissions.length}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>

                        {/* ACTIONS */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreVertical className="size-4" />
                                  <span className="sr-only">Open actions</span>
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>User Access</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openUserAccess(user)}>
                                  <UserCog className="mr-2 size-4" />
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

      {/* USER ACCESS MODAL */}
      {selectedUser && (
        <UserAccessModal
          user={selectedUser}
          isOpen={isUserAccessOpen}
          onClose={closeUserAccess}
          onSaveSuccess={fetchUsers}
        />
      )}
    </>
  );
}