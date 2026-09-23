import React from 'react';
import { Boxes, PackageCheck, ClipboardCheck, AlertTriangle } from 'lucide-react';

// Fix relative path: step out of 'pages/' into 'components/'
import StatCard from '../components/dashboard/StatCard.jsx';
// Alternatively, if path aliases are configured in Vite:
// import StatCard from '@/components/dashboard/StatCard.jsx';

export default function DashboardPage({
  items = [],
  categories = [],
  stockBatches = [],
  serializedAssets = [],
}) {
  // Dynamic summary calculations with safety checks
  const totalItemsCount = items.length;
  const totalCategoriesCount = categories.length;

  const assignedAssetsCount = serializedAssets.filter(
    (asset) => asset.status === 'ASSIGNED' || asset.is_assigned
  ).length;

  const lowStockCount = items.filter(
    (item) => item.reorder_level && item.quantity <= item.reorder_level
  ).length;

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1 className="dashboard-page__title">Dashboard Overview</h1>
        <p className="dashboard-page__subtitle">
          Summary metrics for DOH ICT inventory, stock movements, and asset allocations.
        </p>
      </header>

      {/* Grid container holding StatCards */}
      <div className="dashboard-page__grid">
        <StatCard
          title="Total Catalog Items"
          value={totalItemsCount}
          icon={Boxes}
          color="bg-blue-50 text-blue-700 border-blue-200"
        />

        <StatCard
          title="Assigned Assets"
          value={assignedAssetsCount}
          icon={ClipboardCheck}
          color="bg-emerald-50 text-emerald-700 border-emerald-200"
        />

        <StatCard
          title="Stock Receives"
          value={stockBatches.length}
          icon={PackageCheck}
          color="bg-purple-50 text-purple-700 border-purple-200"
        />

        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          icon={AlertTriangle}
          color="bg-amber-50 text-amber-700 border-amber-200"
        />
      </div>
    </div>
  );
}