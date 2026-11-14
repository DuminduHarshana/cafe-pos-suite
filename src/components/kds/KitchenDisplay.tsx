"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  Bell,
  RefreshCw,
  Utensils,
  ShoppingBag,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Order } from "@/types";
import { playSound } from "@/lib/sound";

interface KitchenDisplayProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function KitchenDisplay({ orders, onRefresh }: KitchenDisplayProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filterType, setFilterType] = useState<"ALL" | "DINE_IN" | "TAKEAWAY">("ALL");
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Keep live timers in sync
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter((o) =>
    ["PENDING", "PREPARING", "READY"].includes(o.status) &&
    (filterType === "ALL" || o.type === filterType)
  );

  const handleBumpStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus = "PREPARING";
    if (currentStatus === "PENDING") nextStatus = "PREPARING";
    else if (currentStatus === "PREPARING") nextStatus = "READY";
    else if (currentStatus === "READY") nextStatus = "SERVED";

    playSound(nextStatus === "READY" ? "chime" : "tap");

    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    playSound("alert");
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancellingOrder.id, status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      setCancellingOrder(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const getElapsedTime = (createdDateStr: string) => {
    const elapsedMs = currentTime - new Date(createdDateStr).getTime();
    const totalSec = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return {
      text: `${mins}:${secs < 10 ? "0" : ""}${secs}`,
      mins,
    };
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Header Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ChefHat className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
            <span>Kitchen Display Station (KDS)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">
              {activeOrders.length} Active Tickets
            </span>
          </h2>
        </div>

        {/* Filter pills & refresh */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
            {(["ALL", "DINE_IN", "TAKEAWAY"] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => {
                  playSound("tap");
                  setFilterType(ft);
                }}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  filterType === ft
                    ? "bg-amber-500 text-neutral-950 font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {ft === "ALL" ? "All" : ft.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playSound("tap");
              onRefresh();
            }}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            title="Refresh Tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-1 p-6 overflow-x-auto overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-neutral-200">Kitchen is all caught up!</p>
            <p className="text-xs text-neutral-500 mt-1">
              New orders submitted from POS will appear here with live sound chimes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {activeOrders.map((order) => {
              const elapsed = getElapsedTime(order.createdAt);
              const isUrgent = elapsed.mins >= 8;
              const isWarning = elapsed.mins >= 4 && elapsed.mins < 8;

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 shadow-lg ${
                    order.status === "READY"
                      ? "bg-[#141d17] border-emerald-500/40"
                      : isUrgent
                      ? "bg-[#1f1315] border-rose-500/60 ring-1 ring-rose-500/40"
                      : "bg-[#141418] border-neutral-800"
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      order.status === "READY"
                        ? "bg-emerald-950/40 border-emerald-500/30"
                        : isUrgent
                        ? "bg-rose-950/40 border-rose-500/30"
                        : "bg-neutral-900/60 border-neutral-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-sm text-neutral-100">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            order.type === "DINE_IN"
                              ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {order.type.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {order.table ? `Table: ${order.table.number}` : order.customerName || "Takeout"}
                      </p>
                    </div>

                    {/* Timer badge */}
                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${
                        order.status === "READY"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : isUrgent
                          ? "bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-neutral-800 text-neutral-300 border-neutral-700"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsed.text}</span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
                    {order.items.map((item, idx) => {
                      let modifiers: string[] = [];
                      if (item.selectedModifiers) {
                        try {
                          modifiers = JSON.parse(item.selectedModifiers);
                        } catch {
                          modifiers = [];
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className="border-b border-neutral-800/60 pb-2.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-baseline space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-xs text-neutral-100 flex-1 leading-snug">
                              {item.menuItemName}
                            </span>
                          </div>

                          {/* Modifiers Pill Tags */}
                          {modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 pl-8">
                              {modifiers.map((mod, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                >
                                  {mod}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[10px] font-medium text-rose-300 bg-rose-500/10 px-2 py-1 rounded-md mt-1.5 pl-2 border border-rose-500/20">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {order.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-amber-300 text-xs font-medium">
                        Order Note: {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Bump Status Action & Cancel Action */}
                  <div className="p-3 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("tap");
                        setCancellingOrder(order);
                      }}
                      className="p-2.5 rounded-xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-700/60 transition shrink-0 active:scale-95"
                      title="Cancel Order"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleBumpStatus(order.id, order.status)}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md active:scale-98 ${
                        order.status === "PENDING"
                          ? "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                          : order.status === "PREPARING"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
                          : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                      }`}
                    >
                      {order.status === "PENDING" && (
                        <>
                          <Flame className="w-4 h-4 stroke-[2.5]" />
                          <span>Start Preparing</span>
                        </>
                      )}
                      {order.status === "PREPARING" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Mark as Ready</span>
                        </>
                      )}
                      {order.status === "READY" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Mark Served &amp; Clear</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">
              Cancel Order #{cancellingOrder.orderNumber}?
            </h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              This will cancel the order, remove it from the kitchen queue, and release any assigned dining table.
            </p>
            {cancellingOrder.table && (
              <p className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5 px-3 mt-3">
                Assigned Table: {cancellingOrder.table.number} - {cancellingOrder.table.name}
              </p>
            )}
            <div className="flex items-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition active:scale-95"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-1.5 active:scale-95"
              >
                {isCancelling ? (
                  <span>Cancelling...</span>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Cancel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
