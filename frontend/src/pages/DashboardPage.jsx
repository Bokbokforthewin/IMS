import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Wallet,
  PackageX,
  AlertTriangle,
  ClipboardList,
  FileStack,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import api from '../api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import StatCard from '../components/dashboard/StatCard.jsx';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart.jsx';
import AssetStatusChart from '../components/dashboard/AssetStatusChart.jsx';
import IssuanceActivityChart from '../components/dashboard/IssuanceActivityChart.jsx';
import LowStockAlerts from '../components/dashboard/LowStockAlerts.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/v1/dashboard');
      const responseData = response.data?.data || response.data;
      setData(responseData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load dashboard metrics.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Safe destructuring with default fallbacks
  const kpis = data?.kpis || {};
  const monthly_trend = data?.monthly_trend || [];
  const asset_status_distribution = data?.asset_status_distribution || [];
  const low_stock_items = data?.low_stock_items || [];
  const recent_activity = data?.recent_activity || [];

  const formatNumber = (val) => (val ?? 0).toLocaleString();

  // Render Skeleton Placeholders while loading
  if (loading) {
    return (
      <div className="space-y-6 p-4 min-w-0 w-full">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Render Error Alert with Retry button
  if (error) {
    return (
      <div className="space-y-6 p-4 min-w-0 w-full">
        <Alert variant="destructive" className="max-w-xl mx-auto border-destructive-border bg-destructive-soft text-destructive-text">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <p className="text-xs">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="w-fit gap-2 text-xs border-border bg-card"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 min-w-0 w-full">


      <div className="flex flex-col gap-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Inventory Value"
            prefix="₱"
            value={formatNumber(kpis.total_inventory_value)}
            icon={Wallet}
            timeframe=""
          />
          <StatCard
            title="Assets Received (Month)"
            prefix="₱"
            value={formatNumber(kpis.asset_value)}
            changePct={kpis.asset_value_change_pct}
            icon={Boxes}
          />
          <StatCard
            title="Consumables Received (Month)"
            prefix="₱"
            value={formatNumber(kpis.consumable_value)}
            changePct={kpis.consumable_value_change_pct}
            icon={Boxes}
          />
          <StatCard
            title="Low Stock Items"
            value={formatNumber(kpis.low_stock_count)}
            icon={AlertTriangle}
          />
          <StatCard
            title="Consumable Issuances (Month)"
            value={formatNumber(kpis.issuances_this_month)}
            changePct={kpis.issuances_change_pct}
            icon={ClipboardList}
          />
          <StatCard
            title="Accountability Receipts (Month)"
            value={formatNumber(kpis.receipts_this_month)}
            changePct={kpis.receipts_change_pct}
            icon={FileStack}
          />
          <StatCard
            title="Assets Under Repair"
            value={formatNumber(kpis.assets_repair)}
            icon={PackageX}
          />
          <StatCard
            title="Total Assets"
            value={formatNumber(kpis.total_assets)}
            icon={Boxes}
          />
        </div>

        {/* Primary Analytics Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 min-w-0">
            <MonthlyTrendChart data={monthly_trend} />
          </div>
          <div className="min-w-0">
            <AssetStatusChart data={asset_status_distribution} />
          </div>
        </div>

        {/* Secondary Analytics & Alerts Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 min-w-0">
            <IssuanceActivityChart data={monthly_trend} />
          </div>
          <div className="min-w-0">
            <LowStockAlerts items={low_stock_items} />
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="min-w-0">
          <RecentActivity activity={recent_activity} />
        </div>
      </div>
    </div>
  );
}