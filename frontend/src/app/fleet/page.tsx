"use client";

import { useState, useEffect } from "react";
import { Server, Users, Shield, Globe, Plus, Trash2, CheckCircle2, XCircle, CreditCard as CreditCardIcon, LineChart as ChartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Account {
  id: number;
  email: string;
  platform: string;
  is_active: boolean;
}

interface Proxy {
  id: number;
  ip_address: string;
  port: number;
  username?: string;
  is_active: boolean;
}

interface CreditCard {
  id: number;
  card_number: string;
  card_name: string;
  expiry_month: string;
  expiry_year: string;
  cvv?: string;
  is_active: boolean;
}

interface ProxyMetric {
  ip: string;
  success_rate: number;
}

interface VelocityAlert {
  email: string;
  orders_today: number;
}

interface AnalyticsData {
  proxy_metrics: ProxyMetric[];
  velocity_alerts: VelocityAlert[];
  captcha_balance: number;
}

export default function FleetPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"accounts" | "proxies" | "cards" | "analytics">("analytics");
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlatform, setNewPlatform] = useState("Amazon");
  
  const [newIp, setNewIp] = useState("");
  const [newPort, setNewPort] = useState("");
  const [newProxyUser, setNewProxyUser] = useState("");
  const [newProxyPass, setNewProxyPass] = useState("");
  // Card Form states
  const [newCardNum, setNewCardNum] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newCardExpMonth, setNewCardExpMonth] = useState("");
  const [newCardExpYear, setNewCardExpYear] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accRes, proxyRes, cardRes, statsRes] = await Promise.all([
        fetch("/api/fleet/accounts"),
        fetch("/api/fleet/proxies"),
        fetch("/api/fleet/cards"),
        fetch("/api/fleet/analytics")
      ]);
      const accData = await accRes.json();
      const proxyData = await proxyRes.json();
      const cardData = await cardRes.json();
      const statsData = await statsRes.json();
      setAccounts(accData);
      setProxies(proxyData);
      setCards(cardData);
      setAnalytics(statsData);
    } catch (e) {
      toast.error("Failed to fetch fleet data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return toast.error("Email and password required");
    
    try {
      const res = await fetch("/api/fleet/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password_hash: newPassword, platform: newPlatform })
      });
      if (res.ok) {
        toast.success("Bot account added successfully");
        setNewEmail(""); setNewPassword("");
        fetchData();
      } else throw new Error();
    } catch (e) {
      toast.error("Failed to add account");
    }
  };

  const handleAddProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp || !newPort) return toast.error("IP and Port required");
    
    try {
      const res = await fetch("/api/fleet/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ip_address: newIp, 
          port: parseInt(newPort), 
          username: newProxyUser || null, 
          password: newProxyPass || null 
        })
      });
      if (res.ok) {
        toast.success("Proxy added successfully");
        setNewIp(""); setNewPort(""); setNewProxyUser(""); setNewProxyPass("");
        fetchData();
      } else throw new Error();
    } catch (e) {
      toast.error("Failed to add proxy");
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      await fetch(`/api/fleet/accounts/${id}`, { method: "DELETE" });
      toast.success("Account removed");
      fetchData();
    } catch (e) {
      toast.error("Failed to remove account");
    }
  };

  const handleDeleteProxy = async (id: number) => {
    try {
      await fetch(`/api/fleet/proxies/${id}`, { method: "DELETE" });
      toast.success("Proxy removed");
      fetchData();
    } catch (e) {
      toast.error("Failed to remove proxy");
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNum || !newCardName) return toast.error("Card number and name required");
    
    // Expiry Validation
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expYearNum = parseInt(newCardExpYear);
    const expMonthNum = parseInt(newCardExpMonth);
    
    if (expYearNum < currentYear || (expYearNum === currentYear && expMonthNum < currentMonth)) {
      return toast.error("Card is expired! Cannot add.");
    }
    
    try {
      const res = await fetch("/api/fleet/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          card_number: newCardNum, 
          card_name: newCardName, 
          expiry_month: newCardExpMonth, 
          expiry_year: newCardExpYear,
          cvv: newCardCvv || null
        })
      });
      if (res.ok) {
        toast.success("Credit card added successfully");
        setNewCardNum(""); setNewCardName(""); setNewCardExpMonth(""); setNewCardExpYear(""); setNewCardCvv("");
        fetchData();
      } else throw new Error();
    } catch (e) {
      toast.error("Failed to add credit card");
    }
  };

  const handleDeleteCard = async (id: number) => {
    try {
      await fetch(`/api/fleet/cards/${id}`, { method: "DELETE" });
      toast.success("Card removed");
      fetchData();
    } catch (e) {
      toast.error("Failed to remove card");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <Server className="w-6 h-6 text-indigo-600" />
          Bot Fleet Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage buyer accounts, residential proxies, and active automation sessions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${activeTab === "accounts" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Users className="w-4 h-4" /> Buyer Accounts
          {activeTab === "accounts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("proxies")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${activeTab === "proxies" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Globe className="w-4 h-4" /> Residential Proxies
          {activeTab === "proxies" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${activeTab === "cards" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
        >
          <CreditCardIcon className="w-4 h-4" /> Payment Cards
          {activeTab === "cards" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-colors relative ${activeTab === "analytics" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
        >
          <ChartIcon className="w-4 h-4" /> Health Analytics
          {activeTab === "analytics" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
        </button>
      </div>

      {/* Content */}
      {activeTab === "analytics" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Charts Col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="minimal-card rounded-lg p-6 border border-gray-200 bg-white">
              <h2 className="text-base font-medium text-gray-900 mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Proxy IP Success Rates
              </h2>
              <div className="h-[300px] w-full">
                {analytics?.proxy_metrics && analytics.proxy_metrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.proxy_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="ip" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="success_rate" radius={[4, 4, 0, 0]}>
                        {analytics.proxy_metrics.map((entry: ProxyMetric, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.success_rate > 90 ? '#10b981' : entry.success_rate > 70 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">No proxy data available</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Side Cards Col */}
          <div className="space-y-6">
            {/* 2Captcha Balance */}
            <div className="rounded-lg p-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-gray-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="w-24 h-24" />
              </div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">2Captcha API Balance</h3>
              <div className="text-4xl font-semibold tracking-tight mb-2">
                {analytics?.captcha_balance >= 0 ? `$${analytics.captcha_balance.toFixed(2)}` : 'Error'}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-4">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> API Connected successfully
              </p>
            </div>

            {/* Velocity Limits Alerts */}
            <div className="minimal-card rounded-lg p-6 border border-gray-200 bg-white">
              <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-500" />
                Amazon Velocity Warnings
              </h3>
              <div className="space-y-3">
                {analytics?.velocity_alerts && analytics.velocity_alerts.length > 0 ? (
                  analytics.velocity_alerts.map((alert: VelocityAlert, i: number) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      <span className="font-medium block mb-1">{alert.email}</span>
                      {alert.message}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4" />
                    All accounts under limits
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Table */}
        <div className="lg:col-span-2">
          <div className="minimal-card rounded-lg overflow-hidden border border-gray-200 bg-white">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {activeTab === "accounts" ? <Shield className="w-4 h-4 text-emerald-500" /> : activeTab === "proxies" ? <Globe className="w-4 h-4 text-blue-500" /> : <CreditCardIcon className="w-4 h-4 text-violet-500" />}
                {activeTab === "accounts" ? "Active Sessions" : activeTab === "proxies" ? "Proxy Pool" : "Payment Methods"}
              </h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {activeTab === "accounts" ? accounts.length : activeTab === "proxies" ? proxies.length : cards.length} Total
              </span>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                  <tr>
                    {activeTab === "accounts" ? (
                      <>
                        <th className="px-5 py-3">Email Address</th>
                        <th className="px-5 py-3">Platform</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </>
                    ) : activeTab === "proxies" ? (
                      <>
                        <th className="px-5 py-3">IP Address</th>
                        <th className="px-5 py-3">Port</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="px-5 py-3">Card Info</th>
                        <th className="px-5 py-3">Expiry</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">Loading fleet data...</td></tr>
                  ) : activeTab === "accounts" && accounts.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">No buyer accounts configured. Add one below.</td></tr>
                  ) : activeTab === "proxies" && proxies.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">No residential proxies configured. Add one below.</td></tr>
                  ) : activeTab === "cards" && cards.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">No payment cards configured. Add one below.</td></tr>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (activeTab === "accounts" ? accounts : activeTab === "proxies" ? proxies : cards).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        {activeTab === "accounts" ? (
                          <>
                            <td className="px-5 py-3 text-slate-800 font-medium">{item.email}</td>
                            <td className="px-5 py-3 text-slate-600">{item.platform}</td>
                            <td className="px-5 py-3">
                              {item.is_active ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Active</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3"/> Banned</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => handleDeleteAccount(item.id)} className="text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </>
                        ) : activeTab === "proxies" ? (
                          <>
                            <td className="px-5 py-3 text-slate-800 font-mono text-xs">{item.ip_address}</td>
                            <td className="px-5 py-3 text-slate-600 text-xs font-mono">{item.port}</td>
                            <td className="px-5 py-3">
                              {item.is_active ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Online</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3"/> Offline</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => handleDeleteProxy(item.id)} className="text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-mono text-xs tracking-widest">{item.card_number}</span>
                                <span className="text-slate-500 text-[10px] uppercase mt-0.5">{item.card_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600 text-xs font-mono">{item.expiry_month}/{item.expiry_year}</td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> Ready</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => handleDeleteCard(item.id)} className="text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Add Form */}
        <div className="lg:col-span-1">
          <div className="minimal-card rounded-lg p-5 border border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              Add {activeTab === "accounts" ? "Buyer Account" : activeTab === "proxies" ? "New Proxy" : "Payment Card"}
            </h3>

            {activeTab === "accounts" ? (
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="bot@domain.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Platform</label>
                  <select 
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Myntra">Myntra</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-2">
                  Provision Account
                </Button>
              </form>
            ) : activeTab === "proxies" ? (
              <form onSubmit={handleAddProxy} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">IP Address</label>
                  <input 
                    type="text" 
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Port</label>
                  <input 
                    type="number" 
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="8080"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Auth User</label>
                    <input 
                      type="text" 
                      value={newProxyUser}
                      onChange={(e) => setNewProxyUser(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Auth Pass</label>
                    <input 
                      type="password" 
                      value={newProxyPass}
                      onChange={(e) => setNewProxyPass(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mt-2">
                  Bind Proxy
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                  <input 
                    type="text" 
                    value={newCardNum}
                    onChange={(e) => setNewCardNum(e.target.value.replace(/\D/g, ''))}
                    maxLength={19}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="1234 5678 9101 1121"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name on Card</label>
                  <input 
                    type="text" 
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="JOHN DOE"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">MM</label>
                    <select 
                      value={newCardExpMonth}
                      onChange={(e) => setNewCardExpMonth(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-center appearance-none"
                    >
                      <option value="" disabled>MM</option>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = String(i + 1).padStart(2, '0');
                        return <option key={month} value={month}>{month}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">YYYY</label>
                    <select 
                      value={newCardExpYear}
                      onChange={(e) => setNewCardExpYear(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-center appearance-none"
                    >
                      <option value="" disabled>YYYY</option>
                      {Array.from({ length: 15 }, (_, i) => {
                        const year = String(new Date().getFullYear() + i);
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CVV</label>
                    <input 
                      type="password" 
                      value={newCardCvv}
                      onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0,4))}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-center"
                      placeholder="•••"
                    />
                  </div>
                </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex justify-center items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Credit Card
                  </button>
                </form>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
