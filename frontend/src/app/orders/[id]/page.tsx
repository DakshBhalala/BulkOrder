"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { StatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { api, type OrderDetail } from "@/lib/api";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (orderId) fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleRunAutomation = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await api.runAutomation(order.id);
      await fetchOrder();
      toast.success("Automation Complete", {
        description: `Order #${order.order_id} has been processed.`,
      });
    } catch (err) {
      console.error("Automation failed:", err);
      toast.error("Automation Failed", { description: "An error occurred during automation." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="space-y-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Order #{order.order_id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-3 mt-1">
              Order <span className="text-indigo-600 font-mono tracking-normal">#{order.order_id}</span>
              <StatusBadge status={order.status} />
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Customer: {order.customer_name}
            </p>
          </div>
        </div>

        {(order.status === "matched" || order.status === "queued") && (
          <Button
            onClick={handleRunAutomation}
            disabled={actionLoading}
          >
            {actionLoading ? (
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
                Run Automation
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in">
            <h2 className="text-base font-medium text-gray-900 mb-4 tracking-tight">Order Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Product" value={order.product_name} />
              <InfoItem label="Quantity" value={String(order.quantity)} />
              <InfoItem label="Customer" value={order.customer_name} />
              <InfoItem label="Order ID" value={`#${order.order_id}`} mono />
            </div>
          </div>

          {/* Matched Product */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
            <h2 className="text-base font-medium text-gray-900 mb-4 tracking-tight">Product Matching</h2>
            {order.matched_product_name ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Matched Product" value={order.matched_product_name} />
                  <InfoItem
                    label="Match Score"
                    value={`${order.match_score?.toFixed(1)}%`}
                    valueClass={
                      (order.match_score || 0) >= 80
                        ? "text-emerald-600"
                        : (order.match_score || 0) >= 60
                        ? "text-amber-600"
                        : "text-red-500"
                    }
                  />
                </div>
                {order.matched_product && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 text-xs">SKU</span>
                        <p className="font-mono text-gray-900">{order.matched_product.sku || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Price</span>
                        <p className="text-gray-900">${order.matched_product.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">In Stock</span>
                        <p className={order.matched_product.in_stock ? "text-emerald-600" : "text-red-500"}>
                          {order.matched_product.in_stock ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No product match yet. Run matching to find supplier products.</p>
            )}
          </div>

          {/* Supplier & Tracking */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
            <h2 className="text-base font-medium text-gray-900 mb-4 tracking-tight">Supplier & Tracking</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Supplier" value={order.supplier_name || "Not assigned"} />
              <InfoItem
                label="Supplier Order Ref"
                value={order.supplier_order_ref || "—"}
                mono
              />
              <InfoItem
                label="Tracking Number"
                value={order.tracking_number || "—"}
                mono
                valueClass={order.tracking_number ? "text-emerald-600" : undefined}
              />
              <InfoItem
                label="Last Updated"
                value={order.updated_at ? new Date(order.updated_at).toLocaleString() : "—"}
              />
            </div>
          </div>
        </div>

        {/* Right Column — Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in" style={{ animationDelay: "150ms", animationFillMode: "backwards" }}>
            <h2 className="text-base font-medium text-gray-900 mb-4 tracking-tight">Processing History</h2>
            <OrderTimeline history={order.history} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""} ${valueClass || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
