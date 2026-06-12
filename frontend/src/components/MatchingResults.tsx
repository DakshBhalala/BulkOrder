"use client";

import { Progress } from "@/components/ui/progress";
import type { MatchResult } from "@/lib/api";

export function MatchingResults({ results }: { results: MatchResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-base font-medium text-gray-900">Matching Results</h3>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={r.order_id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-indigo-600 font-mono">#{r.order_id}</span>
                  {" — "}
                  {r.product_name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Matched to: <span className="text-gray-900">{r.matched_product}</span>
                  {" · "}
                  <span className="text-gray-500">{r.supplier_name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {r.match_score.toFixed(1)}%
                </span>
                {r.auto_matched && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                    Auto
                  </span>
                )}
              </div>
            </div>
            <Progress
              value={r.match_score}
              className="h-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
