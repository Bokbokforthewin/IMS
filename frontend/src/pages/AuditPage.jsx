import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Inspector Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewMode, setViewMode] = useState("diff"); // 'diff' | 'json'

  const abortControllerRef = useRef(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when event filter changes
  const handleEventFilterChange = (value) => {
    setEventFilter(value);
    setPage(1);
  };

  const fetchAuditLogs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const response = await api.get("/v1/audit-logs", {
        params: {
          page,
          search: debouncedSearch || undefined,
          event: eventFilter !== "all" ? eventFilter : undefined,
        },
        signal: controller.signal,
      });

      const resData = response.data;
      setLogs(resData.data || []);
      setPagination({
        currentPage: resData.current_page || 1,
        lastPage: resData.last_page || 1,
        total: resData.total || 0,
      });
    } catch (error) {
      if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") {
        console.error("Failed to load audit logs:", error);
      }
    } finally {
      // Prevents cancelled requests from turning off loading for newer active requests
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, debouncedSearch, eventFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const getEventBadge = (event) => {
    switch (event) {
      case "login":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">LOGIN</Badge>;
      case "logout":
        return <Badge variant="secondary">LOGOUT</Badge>;
      case "failed_login":
        return <Badge variant="destructive">FAILED LOGIN</Badge>;
      case "created":
        return <Badge className="bg-blue-600 hover:bg-blue-700">CREATED</Badge>;
      case "updated":
        return <Badge className="bg-amber-600 hover:bg-amber-700">UPDATED</Badge>;
      case "deleted":
        return <Badge className="bg-rose-600 hover:bg-rose-700">DELETED</Badge>;
      default:
        return <Badge variant="outline">{event?.toUpperCase()}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Safely parse JSON strings or objects
  const parsePayload = (val) => {
    if (!val) return {};
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  };

  const getDiffKeys = (oldVals = {}, newVals = {}) => {
    const oldObj = parsePayload(oldVals);
    const newObj = parsePayload(newVals);
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    return Array.from(keys);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
        </div>

        <div className="flex items-center gap-2">
          <Select value={eventFilter} onValueChange={handleEventFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="failed_login">Failed Login</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search user, IP, OS, or browser..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[260px]"
          />

          <Button variant="outline" size="icon" onClick={fetchAuditLogs} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Client Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading audit trail logs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No activity logs matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs font-medium">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {log.user ? log.user.name : "System / Guest"}
                      </span>
                      {log.user?.email && (
                        <span className="text-xs text-muted-foreground">{log.user.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getEventBadge(log.event)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address || "N/A"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.browser || log.os || log.device ? (
                      <span>
                        {log.browser ?? "Unknown Browser"}
                        {log.os ? ` • ${log.os}` : ""}
                        {log.device ? ` (${log.device})` : ""}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.old_values || log.new_values ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setViewMode("diff");
                        }}
                      >
                        View Changes
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No Payload</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Showing total <span className="font-semibold text-foreground">{pagination.total}</span> entries
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs font-medium px-2">
            Page {pagination.currentPage} of {pagination.lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.lastPage, p + 1))}
            disabled={page >= pagination.lastPage || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <DialogTitle className="text-lg font-semibold">Audit Payload Inspector</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {selectedLog.auditable_type ? `${selectedLog.auditable_type.split('\\').pop()} #${selectedLog.auditable_id}` : "System Event"}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-md text-xs">
                <button
                  onClick={() => setViewMode("diff")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    viewMode === "diff" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Visual Diff
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${
                    viewMode === "json" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto space-y-4 py-3">
              {viewMode === "diff" ? (
                <div className="border rounded-md overflow-hidden text-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-1/3">Field</TableHead>
                        <TableHead className="w-1/3 text-rose-500">Previous Value</TableHead>
                        <TableHead className="w-1/3 text-emerald-500">New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getDiffKeys(selectedLog.old_values, selectedLog.new_values).map((key) => {
                        const oldObj = parsePayload(selectedLog.old_values);
                        const newObj = parsePayload(selectedLog.new_values);
                        const oldVal = oldObj[key];
                        const newVal = newObj[key];
                        const isChanged = oldVal !== newVal;

                        return (
                          <TableRow key={key} className={isChanged ? "bg-amber-500/5" : ""}>
                            <TableCell className="font-mono font-medium">{key}</TableCell>
                            <TableCell className="bg-rose-500/10 font-mono text-rose-600 dark:text-rose-400 break-all">
                              {oldVal !== undefined ? JSON.stringify(oldVal) : "—"}
                            </TableCell>
                            <TableCell className="bg-emerald-500/10 font-mono text-emerald-600 dark:text-emerald-400 break-all">
                              {newVal !== undefined ? JSON.stringify(newVal) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  {selectedLog.old_values && (
                    <div>
                      <h4 className="font-bold text-rose-500 mb-1">Old Values:</h4>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto border">
                        {JSON.stringify(parsePayload(selectedLog.old_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_values && (
                    <div>
                      <h4 className="font-bold text-emerald-500 mb-1">New Values:</h4>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto border">
                        {JSON.stringify(parsePayload(selectedLog.new_values), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.url && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <span className="font-semibold">Target URL:</span>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">
                    {selectedLog.url}
                  </code>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}