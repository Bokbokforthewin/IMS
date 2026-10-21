import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSpreadsheet, FolderSearch, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function ReportDataTable({ reportData, loading, exportToCSV }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const totalPages = Math.ceil(reportData.length / pageSize) || 1;
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reportData.slice(start, start + pageSize);
  }, [reportData, currentPage, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-4">
      {/* Table Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtered Entries
          </span>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {reportData.length} {reportData.length === 1 ? "record" : "records"}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          disabled={reportData.length === 0 || loading}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Main Table Container with Horizontal Scroll */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[90px]">Type</TableHead>
              <TableHead>Item Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Code / Serial</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Date Issued</TableHead>
              <TableHead>Recipient / Holder</TableHead>
              <TableHead>Management Receipt</TableHead>
              <TableHead>Issued By</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading report records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FolderSearch className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No records match your selected report criteria.</p>
                    <p className="text-xs text-muted-foreground/70">Try adjusting your date horizon or scope filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, idx) => (
                <TableRow key={`${row.type}-${row.id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    {row.type === "asset" ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-semibold text-[10px]">
                        ASSET
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold text-[10px]">
                        CONSUMABLE
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">{row.item_name}</span>
                      {row.brand && row.brand !== "N/A" && (
                        <span className="text-xs text-muted-foreground">{row.brand}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.category}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground/80">{row.code_or_serial}</TableCell>
                  <TableCell className="text-center font-semibold text-sm">{row.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatCurrency(row.unit_cost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                    {formatCurrency(row.total_cost)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.date || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{row.recipient_or_holder}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.management_receipt}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.issued_by}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.remarks}>
                    {row.remarks}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {!loading && reportData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-xs text-muted-foreground font-medium">
                Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}