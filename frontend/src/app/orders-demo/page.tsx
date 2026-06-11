"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, RefreshCcw, Calendar, Filter, ChevronDown, CheckCircle2,
  XCircle, AlertCircle, Eye, Settings, X, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { downloadFile } from "@/lib/utils";

interface Campaign {
  id: string;
  platform: string;
  status: string;
  product: string;
  variant: string;
  quantityTotal: number;
  quantityPerOrder: number;
  unitsCompleted: number;
  unitsTotal: number;
  progress: number;
  ordersSuccess: number;
  ordersFailed: number;
  ordersPending: number;
  cardType: string;
  user: string;
  addressLabel: string;
  cod: boolean;
  timeTaken: string;
  created: string;
  isMock: boolean;
}

export default function AdvancedOrdersPage() {
  const [activeTab, setActiveTab] = useState("bulk");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orders, setOrders] = useState<Campaign[]>([]);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Modal state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.campaigns) setOrders(data.campaigns);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders().finally(() => setTimeout(() => setIsRefreshing(false), 500));
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wider uppercase border border-emerald-100"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{status}</span>;
      case 'Processing':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wider uppercase border border-blue-100"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>{status}</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold tracking-wider uppercase border border-red-100"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{status}</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase border border-slate-200"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>{status}</span>;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.product.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = platformFilter === "All" || (o.platform && o.platform.toLowerCase() === platformFilter.toLowerCase());
      return matchesSearch && matchesPlatform;
    });
  }, [orders, searchQuery, platformFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    if (filteredOrders.length === 0) return toast.error("No data to export");
    const header = "Campaign_ID,Platform,Status,Product,Total_Quantity,Progress,Success,Failed,Pending\n";
    const rows = filteredOrders.map(o => `${o.id},${o.platform},${o.status},"${o.product}",${o.quantityTotal},${o.progress}%,${o.ordersSuccess},${o.ordersFailed},${o.ordersPending}`).join("\n");
    downloadFile(`campaigns_export_${new Date().getTime()}.csv`, header + rows, "text/csv");
    toast.success("Export Complete!");
  };

  const handleCancel = async (id: string) => {
    toast.loading(`Cancelling campaign ${id}...`, { id: `cancel-${id}` });
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        toast.success(`Campaign ${id} cancelled.`, { id: `cancel-${id}` });
        fetchOrders();
      } else {
        toast.error(`Failed to cancel campaign ${id}`, { id: `cancel-${id}` });
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Monitor</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Track and manage your automated bulk order pipelines.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live Sync Active
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="h-8 px-3 rounded-md border-slate-200 hover:bg-slate-50 text-xs">
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={handleExport} size="sm" className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Filtered
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden bg-white flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-4">
          <button className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-indigo-600 relative">
            Bulk Campaigns
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 px-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-lg flex items-center p-0.5 shadow-sm">
              <Button onClick={() => setPlatformFilter("All")} variant="ghost" size="sm" className={`h-7 px-2.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${platformFilter === 'All' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>All</Button>
              <Button onClick={() => setPlatformFilter("Amazon")} variant="ghost" size="sm" className={`h-7 px-2.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${platformFilter === 'Amazon' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Amazon</Button>
              <Button onClick={() => setPlatformFilter("Flipkart")} variant="ghost" size="sm" className={`h-7 px-2.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${platformFilter === 'Flipkart' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Flipkart</Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search product or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-lg border-slate-200 text-[11px] font-medium focus-visible:ring-1 focus-visible:ring-indigo-500 w-64 bg-white"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                <th className="px-4 py-3">Campaign details</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 min-w-[220px]">Product Info</th>
                <th className="px-3 py-3 min-w-[150px]">Progress</th>
                <th className="px-3 py-3">Outcomes</th>
                <th className="px-3 py-3">Routing</th>
                <th className="px-3 py-3">Settings</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">No campaigns found.</td>
                </tr>
              ) : currentOrders.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{order.platform}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{order.created}</span>
                      {order.isMock && <span className="mt-1.5 inline-flex w-fit items-center px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold tracking-widest bg-amber-100 text-amber-800 uppercase">SANDBOX</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col max-w-[220px]">
                      <span className="text-xs font-semibold text-slate-900 truncate" title={order.product}>{order.product}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 truncate">{order.variant}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {order.quantityTotal} total
                        </span>
                        <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                          {order.quantityPerOrder}/order
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px] font-bold text-slate-700">{order.unitsCompleted} <span className="text-slate-400 font-medium">/ {order.unitsTotal}</span></span>
                        <span className="text-[10px] font-bold text-indigo-600">{order.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${order.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${order.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                      <div className="flex items-center gap-1" title="Success">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-700">{order.ordersSuccess}</span>
                      </div>
                      {order.ordersFailed > 0 && (
                        <div className="flex items-center gap-1" title="Failed">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-slate-700">{order.ordersFailed}</span>
                        </div>
                      )}
                      {order.ordersPending > 0 && (
                        <div className="flex items-center gap-1" title="Pending">
                          <AlertCircle className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-700">{order.ordersPending}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Card:</span>
                        <span className="font-semibold text-slate-700">{order.cardType}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">User:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[100px]" title={order.user}>{order.user}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 w-fit truncate max-w-[100px]">
                        {order.addressLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {order.cod ? (
                          <span className="text-[8px] font-bold tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">COD</span>
                        ) : (
                          <span className="text-[8px] font-bold tracking-widest uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded">PREPAID</span>
                        )}
                        <span className="text-[9px] font-semibold text-slate-400">{order.timeTaken}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button onClick={() => setSelectedCampaign(order)} variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button onClick={() => handleCancel(order.id)} variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50" disabled={order.status === 'Completed' || order.status === 'Cancelled'}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Showing <span className="text-slate-900">{filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="text-slate-900">{filteredOrders.length}</span>
          </p>
          <div className="flex gap-1.5">
            <Button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              variant="outline" size="sm" 
              className="h-7 rounded-md bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <Button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              variant="outline" size="sm" 
              className="h-7 rounded-md bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>

      </Card>

      {/* Campaign Details Modal Overlay */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Campaign Details {selectedCampaign.isMock && <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-[4px] text-[9px] font-bold tracking-widest bg-amber-100 text-amber-800 uppercase">SANDBOX</span>}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedCampaign.id}</p>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Platform</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Card Used</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.cardType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Address Label</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.addressLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Payment</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.cod ? 'Cash on Delivery' : 'Prepaid (Card)'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Execution Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      {getStatusBadge(selectedCampaign.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Time Elapsed</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.timeTaken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Units Progress</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.unitsCompleted} / {selectedCampaign.unitsTotal} ({selectedCampaign.progress}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Success / Failed</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedCampaign.ordersSuccess} / {selectedCampaign.ordersFailed}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Target Product</h4>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{selectedCampaign.product}</p>
                  <p className="text-xs text-slate-500 mt-1">Variant: {selectedCampaign.variant}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button onClick={() => setSelectedCampaign(null)} variant="outline" className="text-xs">Close</Button>
              {selectedCampaign.status !== 'Completed' && selectedCampaign.status !== 'Cancelled' && (
                <Button onClick={() => { handleCancel(selectedCampaign.id); setSelectedCampaign(null); }} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                  Force Stop Campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
