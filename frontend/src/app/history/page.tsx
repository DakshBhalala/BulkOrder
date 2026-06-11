"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CloudDownload, CloudLightning, Calendar, Filter, ChevronDown, 
  Search, Download, FileText, X, Settings2, CheckCircle2, 
  AlertCircle, Clock, ExternalLink, Package, Image as ImageIcon, CreditCard
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { downloadFile } from "@/lib/utils";

interface HistoryItem {
  id: string;
  platform: string;
  orderId: string;
  email: string;
  product: string;
  date: string;
  amount: string;
  status: string;
  deliveryDate: string;
  tracking: string;
  gstNo: string;
  phone: string;
  cod: string;
  otp: string;
}

export default function OrderUnitsHistoryPage() {
  const [activeTab, setActiveTab] = useState("units");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering states
  const [filterPlatform, setFilterPlatform] = useState("All Platforms");
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<HistoryItem | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const getStatusIcon = (status: string) => {
    if (status === 'Delivered') return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    if (status === 'Cancelled') return <X className="w-3 h-3 text-rose-500" />;
    return <Clock className="w-3 h-3 text-amber-500" />;
  };

  const handleSync = () => {
    setIsSyncing(true);
    fetchHistory().finally(() => setTimeout(() => setIsSyncing(false), 800));
  };

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      const pMatch = filterPlatform === "All Platforms" || (h.platform && h.platform.toLowerCase() === filterPlatform.toLowerCase());
      const idMatch = !filterOrderId || h.orderId.toLowerCase().includes(filterOrderId.toLowerCase());
      const emailMatch = !filterEmail || h.email.toLowerCase().includes(filterEmail.toLowerCase());
      const prodMatch = !filterProduct || h.product.toLowerCase().includes(filterProduct.toLowerCase());
      return pMatch && idMatch && emailMatch && prodMatch;
    });
  }, [history, filterPlatform, filterOrderId, filterEmail, filterProduct]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const currentHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return toast.error("No data to export");
    const header = "Date,Account,Platform,Order_ID,Product,Amount,Status,Delivery_Date,Tracking,GST,Phone,COD\n";
    const rows = filteredHistory.map(h => `${h.date},${h.email},${h.platform},${h.orderId},"${h.product}",${h.amount},${h.status},${h.deliveryDate},${h.tracking},${h.gstNo},${h.phone},${h.cod}`).join("\n");
    downloadFile(`ledger_export_${new Date().getTime()}.csv`, header + rows, "text/csv");
    toast.success("CSV Downloaded Successfully!");
  };

  const handleCompileInvoices = async (idsToCompile?: string[]) => {
    const targets = idsToCompile || filteredHistory.map(h => h.orderId);
    if (targets.length === 0) return toast.error("No orders to compile");
    toast.loading(`Compiling PDF bundle for ${targets.length} orders...`, { id: 'compile' });
    
    try {
      const res = await fetch("/api/history/invoice-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: targets })
      });
      
      if (!res.ok) throw new Error("Failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_bundle_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoices bundle downloaded!", { id: 'compile' });
    } catch (e) {
      toast.error("Failed to generate ZIP bundle", { id: 'compile' });
    }
  };

  const handleDownloadInvoice = (orderId: string) => {
    toast.loading(`Generating invoice for ${orderId}...`, { id: `invoice-${orderId}` });
    const link = document.createElement('a');
    link.href = `/api/history/${orderId}/invoice`;
    link.download = `invoice_${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      toast.success(`Invoice for ${orderId} downloaded!`, { id: `invoice-${orderId}` });
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-12 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ledger & History</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Granular view of all processed order units across platforms.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <Button onClick={handleSync} variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <CloudDownload className="w-3.5 h-3.5 mr-1.5" /> Fetch Missing
          </Button>
          <Button onClick={handleSync} size="sm" className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-[11px] font-bold uppercase tracking-wider">
            <CloudLightning className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-pulse' : ''}`} /> Force Update Sync
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden bg-white flex flex-col min-h-[600px]">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-4">
          <button className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-indigo-600 relative">
            Order Units Ledger
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>
          </button>
        </div>

        {/* Dynamic Filters Section */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                variant="outline" size="sm"
                className={`h-8 rounded-lg transition-all text-[11px] font-bold uppercase tracking-wider ${showAdvanced ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Advanced Filters
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-3">
                  <span className="text-[11px] font-bold text-indigo-700">{selectedIds.length} selected</span>
                  <Button onClick={() => handleCompileInvoices(selectedIds)} variant="outline" size="sm" className="h-8 rounded-lg bg-indigo-50 border-indigo-200 shadow-sm text-indigo-700 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100">
                    <FileText className="w-3 h-3 mr-1.5" /> Compile Selected
                  </Button>
                </div>
              )}
              <Button onClick={() => handleCompileInvoices()} variant="outline" size="sm" className="h-8 rounded-lg bg-white border-slate-200 shadow-sm text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                <FileText className="w-3 h-3 mr-1.5 text-indigo-500" /> Compile All
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-8 rounded-lg bg-white border-slate-200 shadow-sm text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                <Download className="w-3 h-3 mr-1.5 text-emerald-500" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Expandable Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-200/60 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Platform</label>
                <Select value={filterPlatform} onValueChange={(val) => val && setFilterPlatform(val)}>
                  <SelectTrigger className="w-full h-8 text-[10px] font-semibold rounded-md border-slate-200 bg-white px-2.5">
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
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Order ID(s)</label>
                <Input value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} className="h-8 text-[10px] rounded-md bg-white border-slate-200" placeholder="Search ID..." />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <Input value={filterEmail} onChange={e => setFilterEmail(e.target.value)} className="h-8 text-[10px] rounded-md bg-white border-slate-200" placeholder="Search email..." />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Product Name</label>
                <Input value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="h-8 text-[10px] rounded-md bg-white border-slate-200" placeholder="Keyword..." />
              </div>
              <div className="space-y-1 flex items-end">
                <Button onClick={() => { setFilterPlatform("All Platforms"); setFilterOrderId(""); setFilterEmail(""); setFilterProduct(""); }} size="sm" variant="outline" className="w-full h-8 rounded-md text-[10px] font-bold uppercase tracking-widest">
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F7]/60 border-b border-slate-200/60 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                <th className="px-5 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={currentHistory.length > 0 && selectedIds.length === currentHistory.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(currentHistory.map(h => h.orderId));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="px-5 py-4">Status & Date</th>
                <th className="px-5 py-4">Account & Order ID</th>
                <th className="px-5 py-4 min-w-[220px]">Item Details</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Logistics</th>
                <th className="px-5 py-4">Tax & Billing</th>
                <th className="px-5 py-4 text-right">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-[13px] font-medium text-slate-900">No History Available</p>
                  </td>
                </tr>
              ) : currentHistory.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedIds.includes(item.orderId) ? "bg-indigo-50/50" : "bg-white"}`}
                  onClick={() => {
                    if (selectedIds.includes(item.orderId)) {
                      setSelectedIds(selectedIds.filter(id => id !== item.orderId));
                    } else {
                      setSelectedIds([...selectedIds, item.orderId]);
                    }
                  }}
                >
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      checked={selectedIds.includes(item.orderId)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, item.orderId]);
                        else setSelectedIds(selectedIds.filter(id => id !== item.orderId));
                      }}
                    />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(item.status)}
                      <span className={`text-[11px] font-semibold tracking-wide ${item.status === 'Delivered' ? 'text-emerald-700' : item.status === 'Cancelled' ? 'text-rose-700' : 'text-amber-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">{item.date}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-semibold text-slate-900">{item.platform}</span>
                      <span className="text-[11px] text-slate-500">{item.email}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-mono font-medium text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100">{item.orderId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-medium text-slate-700 leading-snug line-clamp-2 max-w-[240px]" title={item.product}>
                      {item.product}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-semibold text-slate-900">{item.amount}</span>
                    {item.cod === 'Yes' && <p className="text-[10px] font-semibold tracking-wider text-rose-600 mt-1">COD Pending</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium">Delivered:</span>
                        <span className="font-semibold text-slate-700">{item.deliveryDate}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium">OTP:</span>
                        <span className="font-mono font-medium text-slate-700">{item.otp}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium">AWB:</span>
                        <span className="font-mono text-indigo-600 cursor-pointer">{item.tracking}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium">GST:</span>
                        <span className="font-mono font-medium text-slate-700">{item.gstNo}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium">Phone:</span>
                        <span className="font-mono font-medium text-slate-700">{item.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <Button 
                          onClick={() => {
                            if (item.cod === 'Yes') {
                              toast.success(`Payment initiated for Order ${item.orderId}`);
                            } else {
                              toast("Order is already prepaid", { icon: "💳" });
                            }
                          }} 
                          variant="ghost" size="icon" className="h-6 w-6 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Pay Now"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          onClick={() => window.open(`http://localhost:8000/screenshots/${item.orderId}_cart_proof.png`, '_blank')} 
                          variant="ghost" size="icon" className="h-6 w-6 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="View Screenshot Proof"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Button onClick={() => setSelectedOrder(item)} variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                        Details <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </Button>
                      <Button onClick={() => handleDownloadInvoice(item.orderId)} variant="outline" size="sm" className="h-6 px-1.5 text-[9px] font-bold tracking-widest uppercase border-slate-200 text-slate-600 hover:bg-slate-50">
                        <FileText className="w-2.5 h-2.5 mr-1" /> Invoice
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/30 mt-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Showing <span className="text-slate-900">{filteredHistory.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> of <span className="text-slate-900">{filteredHistory.length}</span>
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

      {/* Package Details Modal Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Package Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedOrder.orderId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Order Info</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Platform</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedOrder.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Order Date</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedOrder.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Account</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedOrder.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Phone</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedOrder.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Logistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(selectedOrder.status)}
                        <span className="text-xs font-semibold text-slate-900">{selectedOrder.status}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Tracking AWB</span>
                      <span className="text-xs font-semibold text-indigo-600 font-mono">{selectedOrder.tracking}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Delivery Date</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedOrder.deliveryDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">OTP Code</span>
                      <span className="text-xs font-semibold text-slate-900 font-mono">{selectedOrder.otp}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Product & Billing</h4>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 mb-2">{selectedOrder.product}</p>
                  <div className="flex justify-between items-center mt-2 border-t border-slate-200 pt-2">
                    <span className="text-xs text-slate-500">Billed Amount</span>
                    <span className="text-lg font-bold text-slate-900">{selectedOrder.amount}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-500">GST Registration</span>
                    <span className="text-xs font-mono font-medium text-slate-700">{selectedOrder.gstNo}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button onClick={() => setSelectedOrder(null)} variant="outline" className="text-xs">Close Panel</Button>
              <Button onClick={() => handleDownloadInvoice(selectedOrder.orderId)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                <FileText className="w-3 h-3 mr-1.5" /> Download Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
