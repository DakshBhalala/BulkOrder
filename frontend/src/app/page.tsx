"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MetricsCards } from "@/components/MetricsCards";
import { OrdersTable } from "@/components/OrdersTable";
import { ResolveModal } from "@/components/ResolveModal";
import { toast } from "sonner";
import { ShieldAlert, AlertCircle } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { api, type DashboardMetrics, type Order } from "@/lib/api";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Imported", value: "imported" },
  { label: "Matched", value: "matched" },
  { label: "Queued", value: "queued" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

interface AlertItem {
  id: number;
  type: string;
  warning: string;
  status: string;
  orderUnit?: string;
  created: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [m, o, aRes] = await Promise.all([
        api.getMetrics(),
        api.getOrders(filter || undefined),
        fetch("/api/alerts")
      ]);
      setMetrics(m);
      setOrders(o);
      
      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(aData.filter((al: AlertItem) => al.status === "Active"));
      }
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleRunMatching = async () => {
    setActionLoading("matching");
    try {
      const result = await api.runMatching();
      await fetchData();
      toast.success("Matching Complete", {
        description: `Matched ${result.results.length} products automatically.`,
      });
    } catch (err) {
      console.error("Matching failed:", err);
      toast.error("Matching Failed", { description: "An error occurred during matching." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessAll = async () => {
    setActionLoading("process");
    try {
      await api.runAllAutomation();
      await fetchData();
      toast.success("Automation Processed", {
        description: "All eligible orders have been processed via Playwright.",
      });
    } catch (err) {
      console.error("Processing failed:", err);
      toast.error("Processing Failed", { description: "An error occurred during automation." });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-1">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your bulk order automation pipeline
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRunMatching}
            disabled={actionLoading !== null}
            variant="outline"
          >
            {actionLoading === "matching" ? (
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
                Run Matching
              </>
            )}
          </Button>
          <Button
            onClick={handleProcessAll}
            disabled={actionLoading !== null}
          >
            {actionLoading === "process" ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Process All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards metrics={metrics} />

      {/* Alerts Center */}
      {alerts.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Action Required
            <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full border border-red-200">{alerts.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-white rounded-lg p-4 border border-red-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      {alert.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{alert.created}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{alert.warning}</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">Campaign: {alert.orderUnit}</p>
                </div>
                <Button 
                  onClick={() => setResolvingAlert(alert)}
                  className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
                  size="sm"
                >
                  Resolve Issue
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">Orders</h2>
          <div className="bg-gray-100 rounded-md p-1 inline-flex gap-0.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                  ${
                    filter === f.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <svg className="w-8 h-8 animate-spin mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500 mt-3 text-sm">Loading orders...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedIds.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
                <span className="text-sm font-medium text-indigo-800">
                  {selectedIds.length} order(s) selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Delete Selected
                  </Button>
                  <Button size="sm" onClick={handleProcessAll}>
                    Process Selected
                  </Button>
                </div>
              </div>
            )}
            <OrdersTable 
              orders={orders} 
              selectable={true}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      <ResolveModal 
        alert={resolvingAlert} 
        isOpen={!!resolvingAlert} 
        onClose={() => setResolvingAlert(null)} 
        onResolved={fetchData} 
      />
    </div>
  );
}
