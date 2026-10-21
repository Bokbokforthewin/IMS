import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Filter, RefreshCw } from "lucide-react";

export default function ReportFilterBar({ filters, setFilters, onApply, loading }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" },
    { value: 3, label: "March" }, { value: 4, label: "April" },
    { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" },
    { value: 9, label: "September" }, { value: 10, label: "October" },
    { value: 11, label: "November" }, { value: 12, label: "December" },
  ];

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Report Parameters & Filters
        </h3>
      </div>

      <div className="flex flex-wrap items-end gap-3.5">
        {/* Scope Selector */}
        <div className="space-y-1.5 flex-1 min-w-[160px] sm:min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Report Scope</label>
          <Select
            value={filters.report_type}
            onValueChange={(val) => setFilters((f) => ({ ...f, report_type: val }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">All Records</SelectItem>
              <SelectItem value="assets">Assets Only</SelectItem>
              <SelectItem value="consumables">Consumables Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Mode */}
        <div className="space-y-1.5 flex-1 min-w-[160px] sm:min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground">Time Horizon</label>
          <Select
            value={filters.filter_mode}
            onValueChange={(val) => setFilters((f) => ({ ...f, filter_mode: val }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">By Year</SelectItem>
              <SelectItem value="month">By Year & Month</SelectItem>
              <SelectItem value="year_range">Year Range Slider</SelectItem>
              <SelectItem value="custom_range">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Single Year Dropdown */}
        {filters.filter_mode === "year" && (
          <div className="space-y-1.5 w-full sm:w-[130px]">
            <label className="text-xs font-medium text-muted-foreground">Year</label>
            <Select
              value={String(filters.year)}
              onValueChange={(val) => setFilters((f) => ({ ...f, year: Number(val) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Year & Month Dropdowns */}
        {filters.filter_mode === "month" && (
          <>
            <div className="space-y-1.5 w-full sm:w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Select
                value={String(filters.year)}
                onValueChange={(val) => setFilters((f) => ({ ...f, year: Number(val) }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full sm:w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <Select
                value={String(filters.month)}
                onValueChange={(val) => setFilters((f) => ({ ...f, month: Number(val) }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (<SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Year Range Slider */}
        {filters.filter_mode === "year_range" && (
          <div className="space-y-2 flex-1 min-w-[240px] sm:min-w-[280px] bg-muted/30 p-3 rounded-lg border">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Year Span</span>
              <span className="text-foreground font-semibold">
                {filters.start_year || 2022} – {filters.end_year || currentYear}
              </span>
            </div>
            <Slider
              defaultValue={[filters.start_year || 2022, filters.end_year || currentYear]}
              min={2018}
              max={currentYear}
              step={1}
              onValueChange={(val) => {
                setFilters((f) => ({ ...f, start_year: val[0], end_year: val[1] }));
              }}
              className="py-1"
            />
          </div>
        )}

        {/* Custom Date Controls */}
        {filters.filter_mode === "custom_range" && (
          <>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={filters.start_date || ""}
                onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={filters.end_date || ""}
                onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="w-full sm:w-auto sm:ml-auto">
          <Button onClick={onApply} disabled={loading} className="w-full sm:w-auto min-w-[120px]">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}