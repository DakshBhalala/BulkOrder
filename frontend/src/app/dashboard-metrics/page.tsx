"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RefreshCcw, 
  TrendingUp, 
  Mail, 
  Coins, 
  Gift, 
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Alert {
  id: string;
  status: string;
  severity: string;
  created: string;
  type: string;
  warning: string;
  email: string;
  orderUnit: string;
}

export default function DashboardMetricsPage() {
  const [activeTab, setActiveTab] = useState("Active");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState({
    supercoinsApplied: 0,
    loginRatio: 100,
    loggedIn: 0,
    failed: 0,
    availableCoins: 0,
    giftVouchers: 0
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.alerts) setAlerts(data.alerts);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData().then(() => setIsRefreshing(false));
  };

  const handleResolve = async (id: string) => {
    toast.loading(`Resolving alert ${id}...`, { id: `resolve-${id}` });
    try {
      const res = await fetch('/api/metrics/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        toast.success(`Alert ${id} resolved!`, { id: `resolve-${id}` });
        fetchData();
      } else {
        toast.error("Failed to resolve alert", { id: `resolve-${id}` });
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredAlerts = alerts.filter((a: Alert) => a.status === activeTab);

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Critical': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex items-end justify-between bg-white border border-gray-200 p-4 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Platform Intelligence</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time metrics, financial balances, and automated alert resolution.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="flex bg-gray-100 p-1 rounded-md">
            <Select defaultValue="All Platforms">
              <SelectTrigger className="bg-transparent text-xs font-medium text-gray-700 border-none outline-none focus-visible:ring-0 h-7 px-3 uppercase tracking-wider shadow-none hover:bg-transparent">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Platforms">All Platforms</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
                <SelectItem value="Flipkart">Flipkart</SelectItem>
                <SelectItem value="Myntra">Myntra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRefresh} size="sm" className="h-9 px-4">
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        
        {/* Big Banner KPI */}
        <div className="xl:col-span-1 rounded-lg bg-gray-900 p-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="bg-gray-800 w-10 h-10 rounded-md flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-400 font-medium text-[10px] tracking-widest uppercase">Value Extracted</h2>
            <p className="text-4xl font-semibold mt-1 tracking-tight">₹{metrics.supercoinsApplied.toLocaleString()}<span className="text-xl text-gray-400">.00</span></p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Total Supercoins Applied</p>
          </div>

          <div className="relative z-10 mt-6 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">From Delivered Orders</span>
              <span className="font-medium flex items-center gap-1 text-emerald-400"><ArrowUpRight className="w-3 h-3" /> 12%</span>
            </div>
          </div>
        </div>

        {/* 3 Secondary KPIs */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Login Ratio */}
          <Card className="rounded-lg p-5 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-md">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Health</span>
              </div>
              <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Email DB Status</h3>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">{Math.floor((metrics.loggedIn / Math.max(1, (metrics.loggedIn + metrics.failed))) * 100)}%</p>
                <p className="text-xs font-medium text-gray-500 mb-1">Active</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.floor((metrics.loggedIn / Math.max(1, (metrics.loggedIn + metrics.failed))) * 100)}%` }}></div>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-500 font-medium">Logged In (<span className="text-gray-900">{metrics.loggedIn}</span>)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                  <span className="text-gray-500 font-medium">Failed (<span className="text-gray-900">{metrics.failed}</span>)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Supercoins */}
          <Card className="rounded-lg p-5 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="bg-amber-50 text-amber-600 p-2 rounded-md">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Available Coins</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">₹{metrics.availableCoins.toLocaleString()}<span className="text-sm text-gray-400">.00</span></p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Button onClick={() => toast.info("Opening Ledger...")} variant="ghost" size="sm" className="w-full h-8 justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium px-2 text-xs">
                View Ledger <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>

          {/* Gift Vouchers */}
          <Card className="rounded-lg p-5 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-md">
                  <Gift className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Vouchers</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">₹{metrics.giftVouchers.toLocaleString()}<span className="text-sm text-gray-400">.00</span></p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Button onClick={() => toast.info("Voucher Management", {description: "Loading voucher redemption gateway..."})} variant="ghost" size="sm" className="w-full h-8 justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium px-2 text-xs">
                Manage Vouchers <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>

        </div>
      </div>

      {/* Actionable Alerts Table */}
      <Card className="rounded-lg overflow-hidden bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 bg-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-50 text-red-500 p-1.5 rounded-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900 tracking-tight">System Alerts</h2>
              <p className="text-[10px] font-medium text-gray-500 mt-0.5">{alerts.length} anomalies</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search alerts..." 
              className="h-8 pl-8 pr-3 text-xs w-40"
            />
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-md">
              <button 
                onClick={() => setActiveTab('Active')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${activeTab === 'Active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setActiveTab('Resolved')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${activeTab === 'Resolved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Resolved
              </button>
            </div>
            
            <Button onClick={() => toast.info("Filters menu opened")} variant="outline" size="icon" className="h-8 w-8">
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-4 py-3">Issue Description</th>
                <th className="px-4 py-3">Error Trace</th>
                <th className="px-4 py-3">Affected Account</th>
                <th className="px-4 py-3">Target Order</th>
                <th className="px-5 py-3 text-right">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                    <p className="text-xs font-medium text-gray-900">All clear!</p>
                    <p className="text-[10px]">No {activeTab.toLowerCase()} alerts found.</p>
                  </td>
                </tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filteredAlerts.map((alert: Alert) => (
                  <tr key={alert.id} className="bg-white hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{alert.created}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{alert.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono border border-gray-200">
                        {alert.warning}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{alert.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        {alert.orderUnit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {alert.status === 'Active' ? (
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => toast.info(`Viewing trace for ${alert.id}`)} variant="outline" size="sm" className="h-7 px-2 text-xs">
                            Details
                          </Button>
                          <Button onClick={() => handleResolve(alert.id)} size="sm" className="h-7 px-3 text-xs">
                            Resolve
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
