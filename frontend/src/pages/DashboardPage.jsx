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
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // Render Error Alert with Retry button
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="w-fit gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inventory Value"
          prefix="₱"
          value={formatNumber(kpis.total_inventory_value)}
          icon={Wallet}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyTrendChart data={monthly_trend} />
        </div>
        <AssetStatusChart data={asset_status_distribution} />
      </div>

      {/* Secondary Analytics & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <IssuanceActivityChart data={monthly_trend} />
        </div>
        <LowStockAlerts items={low_stock_items} />
      </div>

      {/* Recent System Activity */}
      <RecentActivity activity={recent_activity} />
    </div>
  );
}