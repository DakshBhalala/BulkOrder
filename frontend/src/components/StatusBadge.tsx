"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  imported: {
    label: "Imported",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  matched: {
    label: "Matched",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  queued: {
    label: "Queued",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ordered: {
    label: "Ordered",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  tracking_assigned: {
    label: "Tracking",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
