"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Image as ImageIcon, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Order } from "@/lib/api";

type SortConfig = { key: keyof Order; direction: "asc" | "desc" } | null;

interface OrdersTableProps {
  orders: Order[];
  selectable?: boolean;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

export function OrdersTable({ orders, selectable, selectedIds = [], onSelectionChange }: OrdersTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [screenshotOrder, setScreenshotOrder] = useState<Order | null>(null);
  const itemsPerPage = 15;

  const handleSort = (key: keyof Order) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedOrders = useMemo(() => {
    const sortableItems = [...orders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === "asc" ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === "asc" ? -1 : 1;

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [orders, sortConfig]);

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderSortIcon = (columnKey: keyof Order) => {
    if (sortConfig?.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? (
      <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    ) : (
      <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="text-center p-12 bg-white border border-gray-200 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-400 text-sm">No orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
            {selectable && (
              <TableHead className="py-3 px-5 w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 accent-gray-900 w-4 h-4 cursor-pointer"
                  checked={orders.length > 0 && selectedIds.length === paginatedOrders.length}
                  onChange={(e) => {
                    if (e.target.checked && onSelectionChange) {
                      onSelectionChange(paginatedOrders.map(o => o.id));
                    } else if (onSelectionChange) {
                      onSelectionChange([]);
                    }
                  }}
                />
              </TableHead>
            )}
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("order_id")}>
              Order ID {renderSortIcon("order_id")}
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("product_name")}>
              Product {renderSortIcon("product_name")}
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider cursor-pointer select-none text-right" onClick={() => handleSort("quantity")}>
              Qty {renderSortIcon("quantity")}
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("customer_name")}>
              Customer {renderSortIcon("customer_name")}
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("status")}>
              Status {renderSortIcon("status")}
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider">
              Supplier
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider text-right">
              Tracking
            </TableHead>
            <TableHead className="py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedOrders.map((order, i) => (
            <TableRow
              key={order.id}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group ${selectedIds.includes(order.id) ? "bg-indigo-50" : ""}`}
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => {
                if (selectable && onSelectionChange) {
                  if (selectedIds.includes(order.id)) {
                    onSelectionChange(selectedIds.filter(id => id !== order.id));
                  } else {
                    onSelectionChange([...selectedIds, order.id]);
                  }
                }
              }}
            >
              {selectable && (
                <TableCell className="px-5 py-4 w-12" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 accent-gray-900 w-4 h-4 cursor-pointer"
                    checked={selectedIds.includes(order.id)}
                    onChange={(e) => {
                      if (onSelectionChange) {
                        if (e.target.checked) onSelectionChange([...selectedIds, order.id]);
                        else onSelectionChange(selectedIds.filter(id => id !== order.id));
                      }
                    }}
                  />
                </TableCell>
              )}
              <TableCell className="px-5 py-4">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-mono text-xs text-gray-500 hover:text-gray-900 hover:underline transition-colors"
                >
                  #{order.order_id}
                </Link>
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-700 truncate max-w-[200px]">
                {order.product_name}
              </TableCell>
              <TableCell className="px-5 py-4 text-right text-sm text-gray-700 tabular-nums">
                {order.quantity}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-700">
                {order.customer_name}
              </TableCell>
              <TableCell className="px-5 py-4">
                <StatusBadge status={order.status} />
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-700">
                {order.supplier_name || "—"}
              </TableCell>
              <TableCell className="px-5 py-4 text-right text-xs text-gray-500 font-mono">
                {order.tracking_number || "—"}
              </TableCell>
              <TableCell className="px-5 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(`Payment initiated for Order #${order.order_id}`);
                    }}
                    title="Pay Now"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenshotOrder(order);
                    }}
                    title="View Screenshot"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-white">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, sortedOrders.length)}</span> of{" "}
            <span className="font-medium text-gray-900">{sortedOrders.length}</span> orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      <Dialog open={!!screenshotOrder} onOpenChange={() => setScreenshotOrder(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-lg border border-gray-200 shadow-xl p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-gray-50 border-b border-gray-200">
            <DialogTitle className="text-sm font-medium tracking-tight text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Order #{screenshotOrder?.order_id} Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gray-50 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="bg-white p-8 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200 text-center space-y-4 max-w-sm w-full">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Payment Successful</h3>
              <p className="text-sm font-medium text-gray-500">₹{((screenshotOrder?.quantity || 1) * 79900).toLocaleString()}</p>
              <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 font-mono text-left space-y-2">
                <div className="flex justify-between"><span className="uppercase font-medium tracking-wider">Transaction ID</span><span className="text-gray-700">TXN{screenshotOrder?.order_id.replace(/\D/g, '')}</span></div>
                <div className="flex justify-between"><span className="uppercase font-medium tracking-wider">Paid With</span><span className="text-gray-700">ICICI Bank •••• 1234</span></div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-6 uppercase font-medium tracking-widest text-center">Mock Screenshot Render</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
