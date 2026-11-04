import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ShieldAlert, Loader2, RefreshCw } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });
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
      const logList = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.data?.data)
        ? resData.data.data
        : [];

      setLogs(logList);
      setPagination({
        currentPage: resData.current_page || resData?.meta?.current_page || 1,
        lastPage: resData.last_page || resData?.meta?.last_page || 1,
        total: resData.total || resData?.meta?.total || logList.length,
      });
    } catch (error) {
      if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") {
        console.error("Failed to load audit logs:", error);
      }
    } finally {
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
        return (
          <Badge variant="outline" className="border-success-border bg-success-soft text-success-text text-[10px]">
            LOGIN
          </Badge>
        );
      case "logout":
        return <Badge variant="secondary" className="text-[10px]">LOGOUT</Badge>;
      case "failed_login":
        return (
          <Badge variant="outline" className="border-destructive-border bg-destructive-soft text-destructive-text text-[10px]">
            FAILED LOGIN
          </Badge>
        );
      case "created":
        return (
          <Badge variant="outline" className="border-info-border bg-info-soft text-info-text text-[10px]">
            CREATED
          </Badge>
        );
      case "updated":
        return (
          <Badge variant="outline" className="border-warning-border bg-warning-soft text-warning-text text-[10px]">
            UPDATED
          </Badge>
        );
      case "deleted":
        return (
          <Badge variant="outline" className="border-destructive-border bg-destructive-soft text-destructive-text text-[10px]">
            DELETED
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{event?.toUpperCase()}</Badge>;
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
    <div className="space-y-6 p-4 min-w-0 w-full">
      {/* Prominent Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Audit Trail</h2>
        <p className="text-sm text-muted-foreground">
          Monitor operational logs, user activities, and security access events across the system.
        </p>
      </div>

      <div className="min-w-0 w-full rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        {/* Prominent Task Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Audit Logs Catalog ({pagination.total})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={eventFilter} onValueChange={handleEventFilterChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-card border-border">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent className="z-50 text-xs border-border">
                <SelectGroup>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="failed_login">Failed Login</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search user, IP, OS, browser..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[220px] h-8 text-xs bg-card border-border"
            />

            <Button
              variant="outline"
              size="icon"
              onClick={fetchAuditLogs}
              title="Refresh Logs"
              className="h-8 w-8 border-border bg-card"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Main Table / Mobile Card Container */}
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading audit trail logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No activity logs matching your criteria.
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (Full Table for XL screens) */}
              <div className="hidden xl:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Timestamp</TableHead>
                      <TableHead className="font-semibold text-foreground">User</TableHead>
                      <TableHead className="font-semibold text-foreground">Event</TableHead>
                      <TableHead className="font-semibold text-foreground">IP Address</TableHead>
                      <TableHead className="font-semibold text-foreground">Client Details</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap text-xs font-mono font-medium text-foreground">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">
                              {log.user ? log.user.name : "System / Guest"}
                            </span>
                            {log.user?.email && (
                              <span className="text-[10px] text-muted-foreground">{log.user.email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getEventBadge(log.event)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ip_address || "N/A"}
                        </TableCell>
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
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-border"
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* STREAMLINED MOBILE & TABLET VIEW */}
              <div className="divide-y divide-border xl:hidden">
                {logs.map((log) => (
                  <div key={`mob-${log.id}`} className="p-4 space-y-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">
                            {log.user ? log.user.name : "System / Guest"}
                          </span>
                          {getEventBadge(log.event)}
                        </div>
                        {log.user?.email && (
                          <p className="text-[11px] text-muted-foreground truncate">{log.user.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Timestamp</span>
                        <span className="text-foreground font-mono text-[11px]">{formatDate(log.created_at)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground">IP Address</span>
                        <span className="text-foreground font-mono text-[11px]">{log.ip_address || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Client Details</span>
                        <span className="text-muted-foreground truncate block text-[11px]">
                          {log.browser || log.os || log.device
                            ? `${log.browser ?? "Browser"}${log.os ? ` • ${log.os}` : ""}`
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      {log.old_values || log.new_values ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-border"
                          onClick={() => {
                            setSelectedLog(log);
                            setViewMode("diff");
                          }}
                        >
                          View Changes
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No Payload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Field orientation="horizontal" className="w-fit flex items-center gap-2">
            <FieldLabel className="text-xs text-muted-foreground">
              Total Entries
            </FieldLabel>
            <span className="text-xs font-semibold text-foreground">{pagination.total}</span>
          </Field>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Page {pagination.currentPage} of {pagination.lastPage}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={page <= 1 || loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(pagination.lastPage, p + 1));
                    }}
                    className={page >= pagination.lastPage || loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col border-border bg-card">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">Audit Payload Inspector</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {selectedLog.auditable_type ? `${selectedLog.auditable_type.split('\\').pop()} #${selectedLog.auditable_id}` : "System Event"}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md text-xs border border-border">
                <button
                  onClick={() => setViewMode("diff")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors text-xs ${
                    viewMode === "diff" ? "bg-card shadow-2xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Visual Diff
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-2.5 py-1 rounded-sm font-medium transition-colors text-xs ${
                    viewMode === "json" ? "bg-card shadow-2xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto space-y-4 py-3">
              {viewMode === "diff" ? (
                <div className="border border-border rounded-md overflow-hidden text-xs bg-card">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-1/3">Field</TableHead>
                        <TableHead className="w-1/3 text-destructive-text">Previous Value</TableHead>
                        <TableHead className="w-1/3 text-success-text">New Value</TableHead>
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
                          <TableRow key={key} className={isChanged ? "bg-warning-soft/20" : ""}>
                            <TableCell className="font-mono font-medium text-foreground">{key}</TableCell>
                            <TableCell className="bg-destructive-soft/40 font-mono text-destructive-text break-all">
                              {oldVal !== undefined ? JSON.stringify(oldVal) : "—"}
                            </TableCell>
                            <TableCell className="bg-success-soft/40 font-mono text-success-text break-all">
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
                      <h4 className="font-bold text-destructive-text mb-1">Old Values:</h4>
                      <pre className="bg-muted/50 p-3 rounded-md overflow-x-auto border border-border text-foreground">
                        {JSON.stringify(parsePayload(selectedLog.old_values), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_values && (
                    <div>
                      <h4 className="font-bold text-success-text mb-1">New Values:</h4>
                      <pre className="bg-muted/50 p-3 rounded-md overflow-x-auto border border-border text-foreground">
                        {JSON.stringify(parsePayload(selectedLog.new_values), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.url && (
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  <span className="font-semibold">Target URL:</span>{" "}
                  <code className="bg-muted/50 px-1.5 py-0.5 rounded text-foreground font-mono">
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