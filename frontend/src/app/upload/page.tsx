"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { MatchingResults } from "@/components/MatchingResults";
import { OrdersTable } from "@/components/OrdersTable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { api, type UploadResponse, type MatchResult } from "@/lib/api";

export default function UploadPage() {
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  const handleUploadComplete = (result: UploadResponse) => {
    setUploadResult(result);
    setMatchResults([]);
  };

  const handleRunMatching = async () => {
    setIsMatching(true);
    try {
      const result = await api.runMatching();
      setMatchResults(result.results);
      toast.success("Matching Complete", {
        description: `Matched ${result.results.length} products automatically.`,
      });
    } catch (err) {
      console.error("Matching failed:", err);
      toast.error("Matching Failed", { description: "An error occurred during matching." });
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Upload Orders</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mt-2">Upload Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import a CSV file to add orders to the automation pipeline
        </p>
      </div>

      {/* Upload Form */}
      <div className="minimal-card rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Import CSV</h2>
        <UploadForm onUploadComplete={handleUploadComplete} />
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="space-y-5 animate-fade-in">
          {/* Stats */}
          <div className="minimal-card rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Upload Results</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{uploadResult.total_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="bg-emerald/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald">{uploadResult.valid_rows}</p>
                <p className="text-xs text-muted-foreground mt-1">Valid</p>
              </div>
              <div className={`${uploadResult.invalid_rows > 0 ? "bg-rose/10" : "bg-secondary/50"} rounded-lg p-4 text-center`}>
                <p className={`text-2xl font-bold ${uploadResult.invalid_rows > 0 ? "text-rose" : "text-foreground"}`}>
                  {uploadResult.invalid_rows}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Invalid</p>
              </div>
            </div>

            {/* Errors */}
            {uploadResult.errors.length > 0 && (
              <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-2">Validation Errors:</p>
                <ul className="text-xs text-destructive/80 space-y-0.5">
                  {uploadResult.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Imported Orders Table */}
          {uploadResult.orders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Imported Orders</h2>
                <Button
                  onClick={handleRunMatching}
                  disabled={isMatching}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {isMatching ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Matching...
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Run Product Matching
                    </>
                  )}
                </Button>
              </div>
              <OrdersTable orders={uploadResult.orders} />
            </div>
          )}

          {/* Matching Results */}
          {matchResults.length > 0 && (
            <>
              <Separator className="bg-border" />
              <MatchingResults results={matchResults} />
            </>
          )}
        </div>
      )}

      {/* CSV Format Help */}
      <div className="minimal-card rounded-xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-3">CSV Format</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Your CSV file should contain the following columns:
        </p>
        <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm">
          <div className="text-muted-foreground">order_id,product_name,quantity,customer_name</div>
          <div className="text-foreground mt-1">1001,iPhone 15 Black 128GB,2,John</div>
          <div className="text-foreground">1002,AirPods Pro 2,1,Sarah</div>
        </div>
      </div>
    </div>
  );
}
