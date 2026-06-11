"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Mail, 
  CreditCard, 
  FileText, 
  Search, 
  Upload, 
  Link as LinkIcon, 
  Check, 
  Sparkles,
  RefreshCw,
  Building2,
  Package,
  MapPin,
  ChevronRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { downloadFile } from "@/lib/utils";

interface ProductData {
  title: string;
  price: string;
  originalPrice: string;
  discount: string;
  rating: string;
  seller: string;
  basePrice: string;
  gstAmount: string;
  inStock: boolean;
  platformName: string;
}

// Reusable custom switch component
const CustomSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label?: string }) => (
  <div className="flex items-center gap-2 cursor-pointer" onClick={onChange}>
    {label && <span className="text-xs font-semibold text-slate-700">{label}</span>}
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ease-in-out ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-300 ease-in-out shadow-sm ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
  </div>
);

export default function SmartOrderPage() {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const cardsInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReal, setIsReal] = useState(false);
  const [platform, setPlatform] = useState("FLIPKART");
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const [smartIdEnabled, setSmartIdEnabled] = useState(true);
  const [cardType, setCardType] = useState("ICICI_PHYSICAL");
  const [authType, setAuthType] = useState("OTP");
  const [quantityTotal, setQuantityTotal] = useState("10");
  const [quantityPerOrder, setQuantityPerOrder] = useState("1");
  const [deliveryDays, setDeliveryDays] = useState("3");
  const [deliveryAddress, setDeliveryAddress] = useState("Perfect Barabanki");
  const [gstMandatory, setGstMandatory] = useState(false);
  const [cod, setCod] = useState(false);
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [flat, setFlat] = useState("");
  const [area, setArea] = useState("");
  const [isEntirePoolSelected, setIsEntirePoolSelected] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPlatformLimits, setShowPlatformLimits] = useState(false);
  const [gstNo, setGstNo] = useState("09AANCP0685N1ZM");
  const [excludeOutOfStock, setExcludeOutOfStock] = useState(false);
  const [maxOrdersPerAccount, setMaxOrdersPerAccount] = useState(10);



  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          isMock: !isReal,
          quantityTotal: parseInt(quantityTotal) || 10,
          quantityPerOrder: parseInt(quantityPerOrder) || 1,
          cardType,
          addressLabel: deliveryAddress,
          gstLabel: gstMandatory ? "Business GST" : "Standard",
          cod,
          product: productData ? productData.title : (url || "Automated Product Selection"),
          url: url,
          phone: phone,
          pincode: pincode,
          flat: flat,
          area: area,
          gstNo: gstMandatory ? gstNo : null,
          excludeOutOfStock,
          maxOrdersPerAccount
        })
      });

      if (response.ok) {
        toast.success("Campaign Launched!", {
          description: "Your order pipeline has been dispatched to the engine."
        });
        setUrl("");
        router.push('/orders-demo');
      } else {
        toast.error("Failed to launch campaign");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPlatform("FLIPKART");
    setUrl("");
    setSmartIdEnabled(true);
    setCardType("ICICI_PHYSICAL");
    setAuthType("OTP");
    setQuantityTotal("10");
    setQuantityPerOrder("1");
    setDeliveryDays("3");
    setDeliveryAddress("Perfect Barabanki");
    setGstMandatory(false);
    setCod(false);
    toast.info("Form Reset", { description: "All parameters have been cleared to default." });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.loading(`Uploading ${file.name}...`, { id: `upload-${type}` });
      setTimeout(() => {
        toast.success(`${file.name} successfully parsed!`, { id: `upload-${type}` });
      }, 1500);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Card_Number,Expiry,CVV,Name_on_Card,Bank\n4111222233334444,12/25,123,John Doe,ICICI";
    downloadFile("cards_template.csv", csvContent, "text/csv");
    toast.success("Template Downloaded!");
  };

  const handleFindProduct = async () => {
    if (!url) {
      toast.error("Please enter a URL first");
      return;
    }
    
    setIsFetchingProduct(true);
    setProductData(null);
    toast.loading(`Scraping ${platform} product details...`, { id: "find-product" });

    try {
      // Strictly scrape the live URL via the Python backend
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Only proceed if we got a real title back from the scraper
        if (data.title && data.title.length > 2) {
          setProductData({
            title: data.title,
            price: data.price || "Price Unavailable",
            originalPrice: data.originalPrice || "",
            discount: data.discount || "",
            rating: data.rating || "N/A",
            seller: data.seller || (platform === 'FLIPKART' ? "Flipkart Retail" : "Amazon Retail"),
            basePrice: data.basePrice || "",
            gstAmount: data.gstAmount || "",
            inStock: data.price ? true : false,
            platformName: platform === 'FLIPKART' ? "Flipkart" : "Amazon.in"
          });
          toast.success("Exact product fetched successfully!", { id: "find-product" });
        } else {
          toast.error("Could not fetch product. Please verify the URL.", { id: "find-product" });
        }
      } else {
        toast.error("Live scraper failed to connect.", { id: "find-product" });
      }
    } catch (e) {
      console.error("Live scrape failed", e);
      toast.error("Network error while scraping.", { id: "find-product" });
    } finally {
      setIsFetchingProduct(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'pool')} />
      <input type="file" ref={cardsInputRef} className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, 'cards')} />
      
      {/* Header Section */}
      <div className="flex items-end justify-between mac-glass border-slate-200/40 p-5 rounded-2xl mac-shadow">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold tracking-widest uppercase mb-1.5">
            <Sparkles className="w-3 h-3" /> New Campaign
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Smart Bulk Order</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleReset} variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Reset Form
          </Button>
          
          <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
            <button
              onClick={() => setIsReal(false)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${!isReal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            >
              Sandbox
            </button>
            <button
              onClick={() => setIsReal(true)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${isReal ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-400 hover:text-slate-700'}`}
            >
              Production
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Main Configuration Form */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* 1. Target Product */}
          <Card className="border-0 mac-shadow ring-1 ring-slate-100/50 rounded-xl overflow-hidden mac-glass group hover:ring-slate-200/80 transition-all duration-300">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2.5">
              <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Target Product</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</label>
                  <Select value={platform} onValueChange={(val) => val && setPlatform(val)}>
                    <SelectTrigger className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLIPKART">FLIPKART</SelectItem>
                      <SelectItem value="AMAZON">AMAZON</SelectItem>
                      <SelectItem value="MYNTRA">MYNTRA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Identifier</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input 
                        placeholder="Paste product URL..." 
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (productData) setProductData(null);
                        }}
                        className="pl-8 h-9 text-xs rounded-lg bg-slate-50 border-slate-200 focus-visible:ring-indigo-500" 
                      />
                    </div>
                    <Button onClick={handleFindProduct} disabled={isFetchingProduct} size="sm" className="h-9 rounded-lg px-4 bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs min-w-[80px]">
                      {isFetchingProduct ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Search className="w-3.5 h-3.5 mr-1.5" /> Find</>}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Premium Product Preview Card */}
              {productData && (
                <div className="mt-5 p-5 rounded-xl border border-slate-200/50 bg-white/60 backdrop-blur-md flex gap-5 animate-in slide-in-from-top-4 duration-500 mac-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="w-20 h-20 shrink-0 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-sm z-10">
                    📱
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{productData.title}</h3>
                        <div className="flex items-baseline gap-2 mt-1.5">
                          <span className="text-lg font-black text-slate-900 tracking-tight">{productData.price}</span>
                          {productData.originalPrice && (
                            <span className="text-xs font-medium text-slate-400 line-through">{productData.originalPrice}</span>
                          )}
                          {productData.discount && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              {productData.discount}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="text-xs font-bold text-slate-700">{productData.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-indigo-100/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          <Package className="w-3 h-3 text-slate-400" /> Seller Details
                        </div>
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">{productData.seller}</div>
                        <div className="text-[10px] text-slate-500 font-medium">via {productData.platformName}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          <FileText className="w-3 h-3 text-slate-400" /> Tax Breakdown
                        </div>
                        {productData.basePrice ? (
                          <>
                            <div className="text-[11px] text-slate-600 font-medium flex justify-between">
                              <span>Base:</span> <span className="font-semibold text-slate-800">{productData.basePrice}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium flex justify-between">
                              <span>GST (18%):</span> <span className="font-semibold text-slate-800">{productData.gstAmount}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">Tax info unavailable</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {productData.inStock ? (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          <Check className="w-3.5 h-3.5" /> In Stock & Ready
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                          <X className="w-3.5 h-3.5" /> Currently Unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Card>

          {/* 2. Authentication & Accounts */}
          <Card className="border-0 mac-shadow ring-1 ring-slate-100/50 rounded-xl overflow-hidden mac-glass group hover:ring-slate-200/80 transition-all duration-300">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Accounts & Limits</h2>
              </div>
              <CustomSwitch checked={smartIdEnabled} onChange={() => setSmartIdEnabled(!smartIdEnabled)} label="Smart AI Selection" />
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Email Database</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Select the account pool to use.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    setIsEntirePoolSelected(!isEntirePoolSelected);
                    if (!isEntirePoolSelected) toast.success("Loaded 451 active accounts from pool");
                  }} variant={isEntirePoolSelected ? "default" : "outline"} size="sm" className={`h-8 rounded-lg text-xs ${isEntirePoolSelected ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                    Entire Pool
                  </Button>
                  <Button onClick={() => csvInputRef.current?.click()} size="sm" className="h-8 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none shadow-none text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div onClick={() => setShowAdvancedFilters(true)} className="group/item flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center group-hover/item:bg-indigo-100 group-hover/item:text-indigo-600 transition-colors">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover/item:text-indigo-900">Advanced Filters</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-indigo-400" />
                </div>
                <div onClick={() => setShowPlatformLimits(true)} className="group/item flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center group-hover/item:bg-indigo-100 group-hover/item:text-indigo-600 transition-colors">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover/item:text-indigo-900">Platform Limits</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-indigo-400" />
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Payment & Delivery */}
          <Card className="border-0 mac-shadow ring-1 ring-slate-100/50 rounded-xl overflow-hidden mac-glass group hover:ring-slate-200/80 transition-all duration-300">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2.5">
              <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Payment Strategy</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Network</label>
                  <Select value={cardType} onValueChange={(val) => val && setCardType(val)}>
                    <SelectTrigger className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none">
                      <SelectValue placeholder="Card Network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICICI_PHYSICAL">ICICI Physical</SelectItem>
                      <SelectItem value="HDFC_VIRTUAL">HDFC Virtual</SelectItem>
                      <SelectItem value="SBI_CORP">SBI Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auth Mode</label>
                  <Select value={authType} onValueChange={(val) => val && setAuthType(val)}>
                    <SelectTrigger className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none">
                      <SelectValue placeholder="Auth Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTP">OTP Verification</SelectItem>
                      <SelectItem value="APP">App Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                <Button onClick={() => cardsInputRef.current?.click()} variant="outline" size="sm" className="h-8 rounded-lg bg-white border-slate-200 shadow-sm text-slate-700 text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Cards List
                </Button>
                <Button onClick={handleDownloadTemplate} variant="ghost" size="sm" className="h-8 rounded-lg text-slate-500 hover:text-slate-900 text-xs">
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> Download Template
                </Button>
              </div>
            </div>
          </Card>

          {/* 4. Fulfillment Details */}
          <Card className="border-0 mac-shadow ring-1 ring-slate-100/50 rounded-xl overflow-hidden mac-glass group hover:ring-slate-200/80 transition-all duration-300">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Fulfillment Parameters</h2>
              </div>
              <CustomSwitch checked={cod} onChange={() => setCod(!cod)} label="Force COD" />
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity</label>
                  <div className="relative">
                    <Input type="number" placeholder="e.g. 50" value={quantityTotal} onChange={e => setQuantityTotal(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qty Per Order</label>
                  <div className="relative">
                    <Input type="number" placeholder="e.g. 1" value={quantityPerOrder} onChange={e => setQuantityPerOrder(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Days</label>
                  <div className="relative">
                    <Input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50 pr-8" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">days</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input type="text" placeholder="John Doe" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                      <Input type="text" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pincode</label>
                      <Input type="text" placeholder="400001" value={pincode} onChange={e => setPincode(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flat/House</label>
                      <Input type="text" placeholder="Flat 101" value={flat} onChange={e => setFlat(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area/Street</label>
                      <Input type="text" placeholder="Main Road" value={area} onChange={e => setArea(e.target.value)} className="h-9 text-xs rounded-lg bg-slate-50" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business GST</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Mandatory</span>
                      <CustomSwitch checked={gstMandatory} onChange={() => setGstMandatory(!gstMandatory)} />
                    </div>
                  </div>
                  <Select value={gstNo} onValueChange={(val) => setGstNo(val || "")}>
                    <SelectTrigger className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none">
                      <SelectValue placeholder="Select GST" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09AANCP0685N1ZM">09AANCP0685N1ZM</SelectItem>
                      <SelectItem value="07AANCP0685N1ZA">07AANCP0685N1ZA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Floating Preview Sidebar */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 rounded-2xl p-1 bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 shadow-xl shadow-indigo-100/50">
            <Card className="border-0 shadow-none bg-transparent h-full flex flex-col">
              <div className="px-5 py-4 border-b border-indigo-100/50">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-slate-900">Campaign Summary</h3>
                  {isReal ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold tracking-widest uppercase animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Live
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold tracking-widest uppercase">
                      Sandbox
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Real-time configuration</p>
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dashed">
                    <span className="text-[11px] font-medium text-slate-500">Target Platform</span>
                    <span className="text-[11px] font-bold text-indigo-700">{platform}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dashed">
                    <span className="text-[11px] font-medium text-slate-500">URL Status</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                      {url ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Linked</> : "Pending..."}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dashed">
                    <span className="text-[11px] font-medium text-slate-500">Card Network</span>
                    <span className="text-[11px] font-bold text-slate-900">{cardType.replace('_', ' ')}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dashed">
                    <span className="text-[11px] font-medium text-slate-500">Smart AI Select</span>
                    <span className={`text-[11px] font-bold ${smartIdEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {smartIdEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 border-dashed">
                    <span className="text-[11px] font-medium text-slate-500">Order Quantities</span>
                    <span className="text-[11px] font-bold text-slate-900">{quantityTotal} Total / {quantityPerOrder} per cart</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 space-y-1.5">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Routing</h4>
                  <p className="text-xs font-bold text-slate-900">{deliveryAddress.split(',')[0]}</p>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                    Delivery &le; {deliveryDays || 0} days.<br/>
                    {cod ? "Pay: Cash on Delivery" : "Pay: Prepaid"}<br/>
                    {gstMandatory ? <span className="text-emerald-600 font-bold">B2B GST</span> : "B2C Billing"}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 mt-auto">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !url} 
                  className="w-full h-12 text-[13px] font-bold tracking-wide rounded-xl bg-slate-900 hover:bg-slate-800 text-white mac-shadow"
                >
                  {isSubmitting ? "Booting Sub-Agents..." : "Launch Campaign"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {/* Modals */}
      <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-slate-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Advanced Filters</DialogTitle>
            <p className="text-[13px] text-slate-500">Configure routing rules and seller preferences.</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Exclude Out of Stock</label>
              <CustomSwitch checked={excludeOutOfStock} onChange={() => setExcludeOutOfStock(!excludeOutOfStock)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Max Price Threshold</label>
              <Input type="number" defaultValue="5000" className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Excluded Sellers (Comma separated)</label>
              <Input placeholder="E.g. RetailNet, Cloudtail" className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAdvancedFilters(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">Save Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlatformLimits} onOpenChange={setShowPlatformLimits}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-slate-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Platform Limits</DialogTitle>
            <p className="text-[13px] text-slate-500">Manage global quotas and throttling.</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Max Orders per Account</label>
              <Input type="number" value={maxOrdersPerAccount} onChange={(e) => setMaxOrdersPerAccount(parseInt(e.target.value) || 10)} className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Daily Spend Limit (₹)</label>
              <Input type="number" defaultValue="100000" className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Delay between orders (seconds)</label>
              <Input type="number" defaultValue="30" className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPlatformLimits(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">Save Limits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
