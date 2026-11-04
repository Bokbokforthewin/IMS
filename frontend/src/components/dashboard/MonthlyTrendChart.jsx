import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartConfig = {
  asset_value: { label: 'Assets', color: '#2563eb' }, // Blue
  consumable_value: { label: 'Consumables', color: '#eab308' }, // Yellow
};

function formatCurrency(v) {
  return `₱${Number(v).toLocaleString()}`;
}

export default function MonthlyTrendChart({ data }) {
  const summary = data.reduce(
    (totals, month) => ({
      assetValue: totals.assetValue + Number(month.asset_value || 0),
      consumableValue: totals.consumableValue + Number(month.consumable_value || 0),
      issuances: totals.issuances + Number(month.issuances || 0),
      receipts: totals.receipts + Number(month.receipts || 0),
    }),
    { assetValue: 0, consumableValue: 0, issuances: 0, receipts: 0 }
  );

  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight">
            Inventory Value Trend
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            Monthly breakdown, {new Date().getFullYear()}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 pt-1">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="fillAsset" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-asset_value)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--color-asset_value)" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fillConsumable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-consumable_value)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--color-consumable_value)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              strokeDasharray="2 4"
              stroke="hsl(var(--border))"
              opacity={0.6}
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
            />

            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />} />
            <ChartLegend content={<ChartLegendContent className="text-[11px] gap-3 pt-2" />} />

            <Area
              type="monotone"
              dataKey="asset_value"
              stroke="none"
              fill="url(#fillAsset)"
            />
            <Area
              type="monotone"
              dataKey="consumable_value"
              stroke="none"
              fill="url(#fillConsumable)"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/40 pt-5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground">Assets received</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatCurrency(summary.assetValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground">Consumables received</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatCurrency(summary.consumableValue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
