import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Refined, low-saturation enterprise status palette
const STATUS_COLORS = {
  Available: 'hsl(151, 55%, 41.5%)',    // Muted Emerald
  Assigned: 'hsl(217, 91.2%, 59.8%)',   // Primary Blue
  'Under Repair': 'hsl(38, 92%, 50%)',  // Subtle Amber
  Condemned: 'hsl(346, 84%, 61%)',     // Soft Rose
};

export default function AssetStatusChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      {/* Matching Header Structure */}
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight">Asset Status</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            {total} total serialized assets
          </CardDescription>
        </div>
      </CardHeader>

      {/* Matching Content Padding */}
      <CardContent className="p-3.5 pt-1">
        <div className="relative">
          {/* Matched Chart Height (180px) */}
          <ChartContainer config={{}} className="h-[180px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                innerRadius={48}
                outerRadius={66}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell 
                    key={entry.status} 
                    fill={STATUS_COLORS[entry.status] || 'hsl(var(--muted))'} 
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Centered Donut Total Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
            <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {total}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Total
            </span>
          </div>
        </div>

        {/* High-Density Breakdown Legend */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1 pt-2 border-t border-border/40">
          {data.map((entry) => (
            <div key={entry.status} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_COLORS[entry.status] || 'hsl(var(--muted))' }}
              />
              <span className="text-muted-foreground truncate">{entry.status}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}