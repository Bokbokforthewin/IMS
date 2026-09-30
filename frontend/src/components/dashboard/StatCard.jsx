import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatCard({
  title,
  value = 0,
  changePct,
  icon: Icon,
  suffix = '',
  prefix = '',
  timeframe = 'vs last month',
}) {
  // Safely parse changePct (handles numbers, numeric strings, null, undefined, NaN)
  const parsedChange = changePct !== null && changePct !== undefined ? Number(changePct) : null;
  const hasChange = parsedChange !== null && !isNaN(parsedChange);

  const isPositive = hasChange && parsedChange > 0;
  const isNegative = hasChange && parsedChange < 0;
  const isNeutral = hasChange && parsedChange === 0;

  const TrendIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  // Format float precision (e.g., 12.345 -> 12.3, 10 -> 10)
  const formattedChange = hasChange
    ? Number(Math.abs(parsedChange).toFixed(1))
    : null;

  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      <CardContent className="p-3.5">
        {/* Top Row: Metric Label & Subdued Icon */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground truncate" title={title}>
            {title}
          </span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />}
        </div>

        {/* Middle Row: Value & Compact Trend Pill */}
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {prefix}{value ?? 0}{suffix}
          </span>

          {hasChange && (
            <div
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded border shrink-0',
                isPositive && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
                isNegative && 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
                isNeutral && 'bg-muted text-muted-foreground border-border/40'
              )}
            >
              <TrendIcon className="h-3 w-3 stroke-[2.25]" />
              <span>{formattedChange}%</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Context Label */}
        {hasChange && timeframe && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/70 truncate">
            {timeframe}
          </p>
        )}
      </CardContent>
    </Card>
  );
}