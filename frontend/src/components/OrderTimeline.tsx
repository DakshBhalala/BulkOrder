"use client";

import type { OrderHistory } from "@/lib/api";

const stepIcons: Record<string, { icon: string; color: string }> = {
  imported: { icon: "📥", color: "bg-secondary" },
  matched: { icon: "🔗", color: "bg-secondary" },
  queued: { icon: "⏳", color: "bg-secondary" },
  processing: { icon: "⚙️", color: "bg-secondary" },
  ordered: { icon: "🛒", color: "bg-secondary" },
  tracking_assigned: { icon: "📦", color: "bg-secondary" },
  completed: { icon: "✅", color: "bg-secondary" },
  failed: { icon: "❌", color: "bg-secondary" },
};

function formatTime(timestamp: string | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({ history }: { history: OrderHistory[] }) {
  if (history.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No processing history yet.</p>
    );
  }

  return (
    <div className="relative">
      {history.map((entry, i) => {
        const config = stepIcons[entry.to_status] || { icon: "•", color: "bg-gray-500" };
        const isLast = i === history.length - 1;

        return (
          <div
            key={entry.id}
            className="flex gap-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full ${config.color} border border-border flex items-center justify-center text-base shrink-0`}
              >
                {config.icon}
              </div>
              {!isLast && (
                <div className="w-0.5 h-full min-h-[2rem] bg-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground capitalize">
                  {entry.to_status.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
