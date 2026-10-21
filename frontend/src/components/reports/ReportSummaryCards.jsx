import React from 'react';
import StatCard from '../dashboard/StatCard';
import { DollarSign, Layers, Package } from 'lucide-react';

export default function ReportSummaryCards({ summary = {}, loading = false }) {
  const formatPhp = (val) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Valuation"
        value={summary.total_value || 0}
        valueFormatter={formatPhp}
        icon={DollarSign}
        timeframe="Combined filtered valuation"
        loading={loading}
      />

      <StatCard
        title="Total Quantity"
        value={summary.total_quantity || 0}
        icon={Layers}
        timeframe="Cumulative units count"
        loading={loading}
      />

      <StatCard
        title="Serialized Assets"
        value={summary.total_assets || 0}
        icon={Package}
        timeframe="Asset records matched"
        loading={loading}
      />

      <StatCard
        title="Consumable Issuances"
        value={summary.total_consumables || 0}
        icon={Package}
        timeframe="Consumable lines matched"
        loading={loading}
      />
    </div>
  );
}