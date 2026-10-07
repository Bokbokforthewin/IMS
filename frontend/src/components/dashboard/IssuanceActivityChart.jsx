import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

const chartConfig = {
  receipts: { label: 'Asset', color: '#2563eb' },
  issuances: { label: 'Consumable', color: '#eab308' },
};

export default function IssuanceActivityChart({ data }) {
  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      {/* Uniform Header Structure */}
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight">Issuance Activity</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            Documents generated per month
          </CardDescription>
        </div>
      </CardHeader>

      {/* Uniform Content Padding & Footprint */}
      <CardContent className="p-3.5 pt-1">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
            <defs>
              <linearGradient id="fillIssuances" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-issuances)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--color-issuances)" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fillReceipts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-receipts)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--color-receipts)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            {/* Micro Gridlines */}
            <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.6} />

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
              allowDecimals={false}
            />

            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent className="text-[11px] gap-3 pt-2" />} />

            {/* Clean, high-density bar proportions with matched linear gradients */}
            <Bar 
              dataKey="issuances" 
              fill="url(#fillIssuances)" 
              radius={[2, 2, 0, 0]} 
              maxBarSize={14}
            />
            <Bar 
              dataKey="receipts" 
              fill="url(#fillReceipts)" 
              radius={[2, 2, 0, 0]} 
              maxBarSize={14}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}