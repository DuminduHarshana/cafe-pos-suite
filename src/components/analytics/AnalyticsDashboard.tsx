"use client";

import React from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Coffee,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShoppingBag,
} from "lucide-react";
import { Order } from "@/types";
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
  onRefresh: () => void;
}

export default function AnalyticsDashboard({
  analytics,
  onRefresh,
}: AnalyticsDashboardProps) {
  const { metrics, topItems, paymentMethods, recentOrders } = analytics;

  const totalPayments = Object.values(paymentMethods).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
            <span>Executive Business Analytics &amp; Revenue</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <Calendar className="w-4 h-4" />
          <span>Today &bull; Live Telemetry</span>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Total Net Revenue</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <span className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+18.4% vs last week</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Total Orders Processed</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {metrics.totalOrders}
              </p>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                {metrics.activeOrdersCount} currently in preparation
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Average Spend / Ticket</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(metrics.avgTicket)}
              </p>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Per dine-in &amp; takeaway guest
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Staff Tips &amp; Gratuity</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(metrics.totalTips)}
              </p>
              <span className="text-[11px] text-amber-400 mt-1 block font-semibold">
                Direct to barista &amp; wait pool
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products Leaderboard */}
          <div className="bg-[#141418] border border-neutral-800/80 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-200">Top Performing Offerings</h3>
              <span className="text-xs text-neutral-500">By Sales Volume</span>
            </div>

            <div className="space-y-3">
              {topItems.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">No orders recorded yet</p>
              ) : (
                topItems.map((item, idx) => {
                  const maxRevenue = topItems[0]?.revenue || 1;
                  const percent = (item.revenue / maxRevenue) * 100;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-semibold text-neutral-200 flex items-center space-x-2">
                          <span className="font-mono text-neutral-500 text-[11px]">#{idx + 1}</span>
                          <span>{item.name}</span>
                        </span>
                        <span className="font-mono font-bold text-neutral-100">
                          {item.count} sold &bull; {formatCurrency(item.revenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-[#141418] border border-neutral-800/80 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-200">Payment Tender Distribution</h3>
              <span className="text-xs text-neutral-500">Tender Share</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Credit Card", key: "CARD", icon: CreditCard, color: "text-sky-400" },
                { label: "Cash Tender", key: "CASH", icon: Banknote, color: "text-emerald-400" },
                { label: "Apple / QR", key: "QR_APPLE_PAY", icon: QrCode, color: "text-amber-400" },
              ].map((m) => {
                const Icon = m.icon;
                const amount = paymentMethods[m.key] || 0;
                const share = ((amount / totalPayments) * 100).toFixed(0);

                return (
                  <div
                    key={m.key}
                    className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <Icon className={`w-5 h-5 ${m.color}`} />
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                        {m.label}
                      </span>
                      <span className="font-mono font-bold text-sm text-neutral-100 block mt-0.5">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 block">
                        {share}% of revenue
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Orders Log */}
        <div className="bg-[#141418] border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="font-bold text-xs text-neutral-200">Recent Order Activity</h3>
            <span className="text-xs text-neutral-500">Last 8 transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/60 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Order #</th>
                  <th className="py-3 px-4">Type &amp; Table</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4">Tender</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-5 font-mono font-bold text-neutral-200">
                      #{o.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {o.type.replace("_", " ")}
                      </span>
                      {o.table && (
                        <span className="text-[11px] text-neutral-400 ml-1.5 font-medium">
                          ({o.table.number})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {o.customerName || "Walk-In"}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400">
                      {o.items.length} item(s)
                    </td>
                    <td className="py-3 px-4 text-[11px] text-neutral-400 uppercase font-mono">
                      {o.paymentMethod ? o.paymentMethod.replace("_", " ") : "CARD"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {formatCurrency(o.total)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          o.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : o.status === "READY"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
