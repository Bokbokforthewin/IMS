import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, PackageCheck, ClipboardList, Activity } from 'lucide-react';

const ICONS = {
  issuance: ClipboardList,
  par: FileText,
  ics: PackageCheck,
};

export default function RecentActivity({ activity = [] }) {
  const activityCount = activity.length;

  return (
    <Card className="border-border/60 shadow-none hover:border-border transition-colors">
      {/* Uniform Header Structure */}
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            Latest issuances and accountability receipts
          </CardDescription>
        </div>
      </CardHeader>

      {/* Uniform Content Padding & Grid Height Alignment */}
      <CardContent className="p-3.5 pt-1">
        {activityCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center border border-dashed border-border/50 rounded-md bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">No recent activity recorded</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">New log entries will appear here</p>
          </div>
        ) : (
          <div className="h-[180px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {activity.map((entry, i) => {
              const Icon = ICONS[entry.type] || FileText;

              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  {/* Subdued Micro Icon Tag */}
                  <div className="h-6 w-6 rounded border border-border/60 bg-background flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-1">
                      {entry.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 tabular-nums mt-0.5">
                      {new Date(entry.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
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