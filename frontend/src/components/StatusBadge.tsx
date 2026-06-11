"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  imported: {
    label: "Imported",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
  matched: {
    label: "Matched",
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
  queued: {
    label: "Queued",
    className: "bg-purple-50 text-purple-600 border-purple-200",
  },
  processing: {
    label: "Processing",
    className: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  ordered: {
    label: "Ordered",
    className: "bg-sky-50 text-sky-600 border-sky-200",
  },
  tracking_assigned: {
    label: "Tracking",
    className: "bg-teal-50 text-teal-600 border-teal-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
