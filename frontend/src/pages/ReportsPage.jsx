import React, { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import ReportFilterBar from "../components/reports/ReportFilterBar";
import ReportSummaryCards from "../components/reports/ReportSummaryCards";
import ReportDataTable from "../components/reports/ReportDataTable";

export default function ReportsPage({ activeTab }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const initialType = activeTab === "reports-consumables" ? "consumables" : "assets";

  const [filters, setFilters] = useState({
    report_type: initialType,
    filter_mode: "month",
    year: currentYear,
    month: currentMonth,
    start_year: currentYear - 2,
    end_year: currentYear,
    start_date: "",
    end_date: "",
  });

  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    total_items_count: 0,
    total_quantity: 0,
    total_value: 0,
    total_assets: 0,
    total_consumables: 0,
  });
  const [loading, setLoading] = useState(false);

  // Sync tab props with local filter state
  useEffect(() => {
    if (activeTab === "reports-consumables") {
      setFilters((f) => ({ ...f, report_type: "consumables" }));
    } else if (activeTab === "reports-assets") {
      setFilters((f) => ({ ...f, report_type: "assets" }));
    }
  }, [activeTab]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("v1/reports", {
        params: {
          report_type: filters.report_type,
          filter_mode: filters.filter_mode,
          year: filters.filter_mode === "year" || filters.filter_mode === "month" ? filters.year : undefined,
          month: filters.filter_mode === "month" ? filters.month : undefined,
          start_year: filters.filter_mode === "year_range" ? filters.start_year : undefined,
          end_year: filters.filter_mode === "year_range" ? filters.end_year : undefined,
          start_date: filters.filter_mode === "custom_range" ? filters.start_date : undefined,
          end_date: filters.filter_mode === "custom_range" ? filters.end_date : undefined,
        },
      });

      if (response.data?.success) {
        setReportData(response.data.data || []);
        setSummary(response.data.summary || {});
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      "Type",
      "Item Name",
      "Brand",
      "Category",
      "Code/Serial",
      "Quantity",
      "Unit Cost",
      "Total Cost",
      "Date Issued",
      "Recipient / Holder",
      "Management Receipt",
      "Issued By",
      "Remarks",
    ];

    const rows = reportData.map((row) => [
      row.type.toUpperCase(),
      `"${row.item_name}"`,
      `"${row.brand}"`,
      `"${row.category}"`,
      `"${row.code_or_serial}"`,
      row.quantity,
      row.unit_cost,
      row.total_cost,
      row.date || "—",
      `"${row.recipient_or_holder}"`,
      `"${row.management_receipt}"`,
      `"${row.issued_by}"`,
      `"${(row.remarks || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${filters.report_type}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {filters.report_type === "consumables"
            ? "Consumables Issuance Report"
            : filters.report_type === "assets"
            ? "Serialized Assets Report"
            : "Comprehensive Inventory Report"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Filter and inspect inventory movements and asset valuations.
        </p>
      </div>

      <ReportFilterBar
        filters={filters}
        setFilters={setFilters}
        onApply={fetchReport}
        loading={loading}
      />

      <ReportSummaryCards summary={summary} loading={loading} />

      <ReportDataTable
        reportData={reportData}
        loading={loading}
        exportToCSV={exportToCSV}
      />
    </div>
  );
}