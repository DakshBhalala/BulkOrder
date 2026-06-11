"use client";

import { Progress } from "@/components/ui/progress";
import type { MatchResult } from "@/lib/api";

export function MatchingResults({ results }: { results: MatchResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground">Matching Results</h3>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={r.order_id}
            className="minimal-card rounded-lg p-4 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary font-mono">#{r.order_id}</span>
                  {" — "}
                  {r.product_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Matched to: <span className="text-foreground">{r.matched_product}</span>
                  {" · "}
                  <span className="text-muted-foreground">{r.supplier_name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span
                  className="text-sm font-bold text-foreground"
                >
                  {r.match_score.toFixed(1)}%
                </span>
                {r.auto_matched && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
                    Auto
                  </span>
                )}
              </div>
            </div>
            <Progress
              value={r.match_score}
              className="h-1.5 bg-border"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
