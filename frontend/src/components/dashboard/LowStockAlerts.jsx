import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LowStockAlerts({ items = [] }) {
  const alertCount = items.length;

  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      {/* Uniform Header Structure */}
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            Consumables at or below reorder level
          </CardDescription>
        </div>
        {alertCount > 0 && (
          <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 tabular-nums">
            {alertCount} {alertCount === 1 ? 'alert' : 'alerts'}
          </span>
        )}
      </CardHeader>

      {/* Uniform Content Padding & Grid Height Alignment */}
      <CardContent className="p-3.5 pt-1">
        {alertCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center border border-dashed border-border/50 rounded-md bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">All items adequately stocked</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">No immediate reorders required</p>
          </div>
        ) : (
          <div className="h-[180px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {items.map((item) => {
              const isOutOfStock = item.total_stock === 0;

              return (
                <div
                  key={item.item_code}
                  className="flex items-center justify-between gap-2 p-2 rounded border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate leading-none">
                      {item.item_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1 leading-none">
                      {item.item_code}
                    </p>
                  </div>

                  {/* Micro Stock Status Badge */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border shrink-0 tabular-nums',
                      isOutOfStock
                        ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400'
                    )}
                  >
                    <span>{item.total_stock}</span>
                    <span className="opacity-40">/</span>
                    <span className="opacity-70">{item.reorder_level}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}