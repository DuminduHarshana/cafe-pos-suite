"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  ArrowUpRight,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Order, Staff } from "@/types";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";

interface AnalyticsDashboardProps {
  analytics: {
    metrics: {
      totalRevenue: number;
      totalOrders: number;
      avgTicket: number;
      totalTips: number;
      activeOrdersCount: number;
    };
    topItems: { name: string; count: number; revenue: number }[];
    paymentMethods: Record<string, number>;
    recentOrders: Order[];
  };
  currentStaff: Staff;
  onRefresh: () => void;
}

export default function AnalyticsDashboard({
  analytics,
  currentStaff,
  onRefresh,
}: AnalyticsDashboardProps) {
  const { topItems, paymentMethods } = analytics;
  
  // Local state for instant optimistic updates
  const [ordersList, setOrdersList] = useState<Order[]>(analytics?.recentOrders || []);
  const [localMetrics, setLocalMetrics] = useState(
    analytics?.metrics || {
      totalRevenue: 0,
      totalOrders: 0,
      avgTicket: 0,
      totalTips: 0,
      activeOrdersCount: 0,
    }
  );

  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setOrdersList(analytics?.recentOrders || []);
    setLocalMetrics(
      analytics?.metrics || {
        totalRevenue: 0,
        totalOrders: 0,
        avgTicket: 0,
        totalTips: 0,
        activeOrdersCount: 0,
      }
    );
  }, [analytics]);

  const totalPayments = Object.values(paymentMethods).reduce((a, b) => a + b, 0) || 1;

  const handleInitiateDelete = (order: Order) => {
    playSound("tap");
    setDeletingOrder(order);
    setAdminPin(currentStaff.role === "ADMIN" ? "1111" : "");
    setPinError(null);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrder) return;

    // Check if staff is admin or entered 1111
    const enteredPin = (adminPin || (currentStaff.role === "ADMIN" ? "1111" : "")).trim();
    if (currentStaff.role !== "ADMIN" && enteredPin !== "1111") {
      playSound("alert");
      setPinError("Invalid Admin PIN. Enter 1111 to authorize deletion.");
      return;
    }

    const orderId = deletingOrder.id;
    const orderTotal = deletingOrder.total;
    setIsDeleting(true);
    playSound("delete");

    // Instant optimistic update
    setOrdersList((prev) => prev.filter((o) => o.id !== orderId));
    setLocalMetrics((prev) => ({
      ...prev,
      totalOrders: Math.max(0, prev.totalOrders - 1),
      totalRevenue: Math.max(0, prev.totalRevenue - orderTotal),
      avgTicket:
        prev.totalOrders > 1
          ? Math.max(0, (prev.totalRevenue - orderTotal) / (prev.totalOrders - 1))
          : 0,
    }));

    try {
      const res = await fetch(`/api/orders?id=${orderId}&role=ADMIN&pin=1111`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-staff-role": "ADMIN",
          "x-staff-pin": "1111",
        },
        body: JSON.stringify({ id: orderId, role: "ADMIN", pin: "1111" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete order");
      }

      playSound("success");
      setDeletingOrder(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      playSound("alert");
      onRefresh();
      alert(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-4 sm:px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-xs sm:text-sm text-neutral-100 flex items-center space-x-2 truncate">
            <span>Executive Analytics &amp; Revenue</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[10px] sm:text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Today &bull;</span> Live Telemetry
          </span>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#141418] border border-neutral-800/80 p-4 sm:p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-400">Total Net Revenue</span>
              <p className="text-xl sm:text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(localMetrics.totalRevenue)}
              </p>
              <span className="text-[10px] sm:text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Live Sales Total</span>
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-4 sm:p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-400">Total Orders Processed</span>
              <p className="text-xl sm:text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {localMetrics.totalOrders}
              </p>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1 block">
                {localMetrics.activeOrdersCount} currently active
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-4 sm:p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-400">Average Ticket Size</span>
              <p className="text-xl sm:text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(localMetrics.avgTicket)}
              </p>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1 block">Avg spend per guest</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-4 sm:p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-400">Service &amp; Staff Tips</span>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono mt-1">
                {formatCurrency(localMetrics.totalTips)}
              </p>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 mt-1 block">Accumulated gratuity pool</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-sm sm:text-base">Rs.</span>
            </div>
          </div>
        </div>

        {/* Breakdown Row: Tender Mix & Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Payment Tender Distribution */}
          <div className="bg-[#141418] border border-neutral-800/80 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
              Payment Method Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { id: "CARD", label: "Card Tender", icon: CreditCard, color: "bg-blue-500" },
                { id: "CASH", label: "Cash Tender", icon: Banknote, color: "bg-emerald-500" },
                { id: "QR_APPLE_PAY", label: "QR / Apple Pay", icon: QrCode, color: "bg-amber-500" },
              ].map((m) => {
                const count = paymentMethods[m.id] || 0;
                const percent = Math.round((count / totalPayments) * 100);
                const Icon = m.icon;
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-neutral-400" />
                        <span>{m.label}</span>
                      </span>
                      <span className="font-mono text-neutral-200">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Revenue Generators */}
          <div className="lg:col-span-2 bg-[#141418] border border-neutral-800/80 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
              Top Selling Menu Items Today
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {topItems.slice(0, 6).map((item, idx) => {
                const share = localMetrics.totalRevenue > 0 ? Math.round((item.revenue / localMetrics.totalRevenue) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-neutral-200 truncate">{item.name}</p>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.count} orders fulfilled
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {formatCurrency(item.revenue)}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 block">
                        {share}% of sales
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Orders Log with Instant Order Deletion */}
        <div className="bg-[#141418] border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-xs text-neutral-200">Recent Order Activity</h3>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Real-time transactions log &bull; Delete test or mistaken orders with Admin authorization
              </p>
            </div>
            <span className="text-xs text-neutral-400 font-mono">{ordersList.length} transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-neutral-900/60 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4 sm:px-5">Order #</th>
                  <th className="py-3 px-3 sm:px-4">Type &amp; Table</th>
                  <th className="py-3 px-3 sm:px-4">Customer</th>
                  <th className="py-3 px-3 sm:px-4">Items Count</th>
                  <th className="py-3 px-3 sm:px-4">Tender</th>
                  <th className="py-3 px-3 sm:px-4">Total</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Delete Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {ordersList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-neutral-500">
                      No order transactions found.
                    </td>
                  </tr>
                ) : (
                  ordersList.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-800/30 transition">
                      <td className="py-3 px-4 sm:px-5 font-mono font-bold text-neutral-200">
                        #{o.orderNumber}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {o.type.replace("_", " ")}
                        </span>
                        {o.table && (
                          <span className="text-[11px] text-neutral-400 ml-1.5 font-medium">
                            ({o.table.number})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-neutral-300">
                        {o.customerName || "Walk-In"}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-mono text-neutral-400">
                        {o.items?.length || 0} item(s)
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-[11px] text-neutral-400 uppercase font-mono">
                        {o.paymentMethod ? o.paymentMethod.replace("_", " ") : "CARD"}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-amber-400">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            o.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : o.status === "READY"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : o.status === "CANCELLED"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 sm:px-5 text-right">
                        <button
                          onClick={() => handleInitiateDelete(o)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition"
                          title={`Delete Order #${o.orderNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin Delete Order Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-neutral-100">
                Delete Order #{deletingOrder.orderNumber}?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Permanently delete this order ({formatCurrency(deletingOrder.total)}) from database records. Revenue will be updated immediately.
              </p>
            </div>

            {/* If not Admin, show quick PIN input */}
            {currentStaff.role !== "ADMIN" && (
              <div className="space-y-1.5 bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
                <label className="text-[11px] font-semibold text-neutral-300 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter Admin PIN (Default: 1111)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-neutral-100 focus:outline-none focus:border-amber-500"
                />
                {pinError && (
                  <p className="text-[10px] text-rose-400 font-medium text-center">{pinError}</p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setDeletingOrder(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteOrder}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
