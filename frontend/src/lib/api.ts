/**
 * API client for the Bulk Order Automation Platform backend.
 */

const API_BASE = "http://localhost:8000/api";

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────

export interface Order {
  id: number;
  order_id: string;
  product_name: string;
  quantity: number;
  customer_name: string;
  status: string;
  matched_product_name: string | null;
  match_score: number | null;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_order_ref: string | null;
  tracking_number: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderHistory {
  id: number;
  from_status: string | null;
  to_status: string;
  timestamp: string | null;
  notes: string;
}

export interface Product {
  id: number;
  supplier_id: number;
  name: string;
  sku: string;
  price: number;
  in_stock: boolean;
}

export interface OrderDetail extends Order {
  history: OrderHistory[];
  matched_product: Product | null;
}

export interface DashboardMetrics {
  total_orders: number;
  matched_orders: number;
  completed_orders: number;
  failed_orders: number;
  processing_orders: number;
  queued_orders: number;
}

export interface UploadResponse {
  success: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: string[];
  orders: Order[];
}

export interface MatchResult {
  order_id: string;
  product_name: string;
  matched_product: string;
  match_score: number;
  supplier_name: string;
  auto_matched: boolean;
}

export interface MatchingResponse {
  total: number;
  matched: number;
  results: MatchResult[];
}

export interface AutomationResult {
  order_id: string;
  success: boolean;
  supplier_order_ref: string | null;
  tracking_number: string | null;
  message: string;
}

export interface AutomationBatchResponse {
  total: number;
  successful: number;
  failed: number;
  results: AutomationResult[];
}

export interface Supplier {
  id: number;
  name: string;
  code: string;
  website_url: string;
}

// ─── API Functions ──────────────────────────────────────────────

export const api = {
  // Dashboard
  getMetrics: () => apiFetch<DashboardMetrics>("/dashboard/metrics"),
  getRecentOrders: () => apiFetch<Order[]>("/dashboard/recent"),

  // Orders
  getOrders: (status?: string) => {
    const params = status ? `?status=${status}` : "";
    return apiFetch<Order[]>(`/orders${params}`);
  },
  getOrder: (id: number) => apiFetch<OrderDetail>(`/orders/${id}`),
  uploadOrders: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/orders/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Upload Error: ${res.status}`);
    }
    return res.json();
  },

  // Matching
  runMatching: () =>
    apiFetch<MatchingResponse>("/matching/run", { method: "POST" }),

  // Automation
  runAutomation: (orderId: number) =>
    apiFetch<AutomationResult>(`/automation/run/${orderId}`, {
      method: "POST",
    }),
  runAllAutomation: () =>
    apiFetch<AutomationBatchResponse>("/automation/run-all", {
      method: "POST",
    }),

  // Suppliers
  getSuppliers: () => apiFetch<Supplier[]>("/suppliers"),

  // Payments (virtual-card funded)
  createPayment: (body: {
    amount: number;
    currency?: string;
    campaign_id?: string;
    order_ref?: string;
    auto_capture?: boolean;
  }) =>
    apiFetch<Payment>("/payments", {
      method: "POST",
      body: JSON.stringify({ currency: "INR", auto_capture: true, ...body }),
    }),
  submitPaymentOtp: (paymentId: string, otp: string) =>
    apiFetch<Payment>(`/payments/${paymentId}/otp`, {
      method: "POST",
      body: JSON.stringify({ otp }),
    }),
  getPayments: () => apiFetch<Payment[]>("/payments"),
};

export interface VirtualCard {
  id: number;
  provider: string;
  brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  spend_limit: number;
  currency: string;
  single_use: boolean;
  status: string;
}

export interface Payment {
  id: string;
  campaign_id?: string | null;
  order_ref?: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  gateway_ref?: string | null;
  failure_reason?: string | null;
  virtual_card?: VirtualCard | null;
  created_at?: string | null;
  updated_at?: string | null;
}
