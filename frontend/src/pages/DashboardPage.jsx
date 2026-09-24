import React, { useState, useEffect } from 'react';
import { Boxes, Wallet, PackageX, AlertTriangle, ClipboardList, FileStack } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '../components/dashboard/StatCard.jsx';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart.jsx';
import AssetStatusChart from '../components/dashboard/AssetStatusChart.jsx';
import IssuanceActivityChart from '../components/dashboard/IssuanceActivityChart.jsx';
import LowStockAlerts from '../components/dashboard/LowStockAlerts.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';

const API_BASE_URL = '/api/v1';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/dashboard`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>
    );
  }

  const { kpis, monthly_trend, asset_status_distribution, low_stock_items, recent_activity } = data;

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inventory Value"
          value={`₱${kpis.total_inventory_value.toLocaleString()}`}
          icon={Wallet}
          accent="blue"
        />
        <StatCard
          title="Assets Received (Month)"
          value={`₱${kpis.asset_value.toLocaleString()}`}
          changePct={kpis.asset_value_change_pct}
          icon={Boxes}
          accent="default"
        />
        <StatCard
          title="Consumables Received (Month)"
          value={`₱${kpis.consumable_value.toLocaleString()}`}
          changePct={kpis.consumable_value_change_pct}
          icon={Boxes}
          accent="emerald"
        />
        <StatCard
          title="Low Stock Items"
          value={kpis.low_stock_count}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          title="Consumable Issuances (Month)"
          value={kpis.issuances_this_month}
          changePct={kpis.issuances_change_pct}
          icon={ClipboardList}
          accent="default"
        />
        <StatCard
          title="Accountability Receipts (Month)"
          value={kpis.receipts_this_month}
          changePct={kpis.receipts_change_pct}
          icon={FileStack}
          accent="blue"
        />
        <StatCard
          title="Assets Under Repair"
          value={kpis.assets_repair}
          icon={PackageX}
          accent="amber"
        />
        <StatCard
          title="Total Assets"
          value={kpis.total_assets}
          icon={Boxes}
          accent="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyTrendChart data={monthly_trend} />
        </div>
        <AssetStatusChart data={asset_status_distribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <IssuanceActivityChart data={monthly_trend} />
        </div>
        <LowStockAlerts items={low_stock_items} />
      </div>

      <RecentActivity activity={recent_activity} />
    </div>
  );
}