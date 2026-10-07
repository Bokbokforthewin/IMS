import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  invertTrend = false, // Set to true if lower is better (e.g., expenses, bounce rate)
  valueFormatter,      // Custom formatter function: (val) => string
  loading = false,     // Built-in loading skeleton
  className,
}) {
  // Safely parse changePct (handles numbers, numeric strings, null, undefined, NaN)
  const parsedChange = changePct !== null && changePct !== undefined ? Number(changePct) : null;
  const hasChange = parsedChange !== null && !isNaN(parsedChange);

  // Directional logic
  const isUp = hasChange && parsedChange > 0;
  const isDown = hasChange && parsedChange < 0;
  const isNeutral = hasChange && parsedChange === 0;

  // Sentiment logic (accounts for inverted metrics)
  const isPositive = invertTrend ? isDown : isUp;
  const isNegative = invertTrend ? isUp : isDown;

  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  // Format large/raw values cleanly (e.g., 1234567 -> "1,234,567")
  const formattedValue = React.useMemo(() => {
    if (value === null || value === undefined) return '0';
    if (typeof valueFormatter === 'function') return valueFormatter(value);
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  }, [value, valueFormatter]);

  // Format percentage precision
  const formattedChange = hasChange ? Math.abs(parsedChange).toFixed(1) : null;

  if (loading) {
    return (
      <Card className={cn('border-border/60 shadow-none', className)}>
        <CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <div className="flex items-baseline justify-between gap-2 pt-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
          <Skeleton className="h-3 w-16 mt-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border/60 shadow-none hover:border-border transition-colors', className)}>
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
          <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground truncate">
            {prefix}{formattedValue}{suffix}
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
        {timeframe && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/70 truncate">
            {timeframe}
          </p>
        )}
      </CardContent>
    </Card>
  );
}