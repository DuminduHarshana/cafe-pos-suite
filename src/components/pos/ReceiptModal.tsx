"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, CheckCircle2, Loader2, Receipt, UtensilsCrossed } from "lucide-react";
import { Order, StoreSettings } from "@/types";
import { playSound } from "@/lib/sound";
import { printReceipt, printKitchenChit } from "@/lib/printer";
import { formatCurrency } from "@/lib/currency";
import { DEFAULT_STORE_SETTINGS, getStoreSettings, subscribeStoreSettings } from "@/lib/storeSettings";

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  defaultView?: "customer" | "kitchen";
}

export default function ReceiptModal({ order, onClose, defaultView = "customer" }: ReceiptModalProps) {
  const [activeView, setActiveView] = useState<"customer" | "kitchen">(defaultView);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  useEffect(() => {
    setActiveView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    setStore(getStoreSettings());
    const unsub = subscribeStoreSettings((s) => setStore(s));
    return unsub;
  }, []);

  if (!order) return null;

  const handleEscPosPrint = async (viewToPrint: "customer" | "kitchen" = activeView) => {
    setIsPrinting(true);
    setPrintStatus(null);
    playSound("tap");
    try {
      let res;
      if (viewToPrint === "kitchen") {
        res = await printKitchenChit(order);
      } else {
        res = await printReceipt(order);
      }
      setPrintStatus(res.message);
      playSound("chime");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Printing failed";
      setPrintStatus(`Failed: ${msg}. Try System Print.`);
      playSound("alert");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    playSound("tap");
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Derive Table Label
  const tableLabel = order.table
    ? order.table.name
      ? `${order.table.name} (T-${order.table.number})`
      : `Table ${order.table.number}`
    : "Counter / Takeaway";

  // Derive Service Charge and Tip
  const serviceChargeVal = order.serviceCharge ?? (order.tip > 0 ? order.tip : 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-neutral-100 text-sm">
              {order.paymentStatus === "PAID" ? "Order & Payment Completed" : "Order Sent to Kitchen"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Customer Receipt vs Kitchen KOT Chit */}
        <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 mt-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              setActiveView("customer");
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeView === "customer"
                ? "bg-amber-500 text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Customer Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              setActiveView("kitchen");
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeView === "kitchen"
                ? "bg-amber-500 text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Kitchen KOT Chit</span>
          </button>
        </div>

        {/* Realistic Thermal Receipt Area */}
        <div className="overflow-y-auto py-4 flex-1">
          {activeView === "customer" ? (
            /* =================== CUSTOMER RECEIPT VIEW =================== */
            <div
              id="thermal-receipt"
              className="bg-neutral-100 text-neutral-900 font-mono text-xs p-6 rounded-2xl shadow-inner mx-auto max-w-xs border border-neutral-300 relative"
            >
              {/* Store Branding Header with Logo */}
              <div className="text-center space-y-1 mb-4 border-b border-neutral-300 pb-3">
                {store.showLogoOnReceipt && store.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={store.logoUrl}
                      alt={store.storeName}
                      className="w-16 h-16 rounded-full object-cover border border-neutral-300 shadow-sm"
                    />
                  </div>
                )}
                <h2 className="text-sm font-extrabold tracking-widest uppercase">
                  {store.storeName || "LILLY'S RESTAURANT & CAFE"}
                </h2>
                {store.tagline && (
                  <p className="text-[9px] text-neutral-600">{store.tagline}</p>
                )}
                <p className="text-[10px] text-neutral-600">{store.address}</p>
                <p className="text-[10px] text-neutral-600">Tel: {store.phone}</p>
                <p className="text-[10px] text-neutral-500 font-bold mt-2">
                  ORDER #{order.orderNumber}
                </p>
              </div>

              {/* Order meta */}
              <div className="text-[10px] text-neutral-600 space-y-0.5 mb-3 border-b border-dashed border-neutral-300 pb-2">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Type:</span>
                  <span className="font-bold uppercase">{order.type.replace("_", " ")}</span>
                </div>
                {store.showTableOnReceipt && order.table && (
                  <div className="flex justify-between">
                    <span>Table:</span>
                    <span className="font-bold">{tableLabel}</span>
                  </div>
                )}
                {order.customerName && (
                  <div className="flex justify-between">
                    <span>Guest:</span>
                    <span>{order.customerName}</span>
                  </div>
                )}
                {store.showStaffOnReceipt && (
                  <div className="flex justify-between">
                    <span>Cashier / Staff:</span>
                    <span>{order.staff?.name || "Server #1"}</span>
                  </div>
                )}
              </div>

              {/* Itemized list */}
              <div className="space-y-2 mb-3 border-b border-neutral-300 pb-3">
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
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {item.quantity}x {item.menuItemName}
                        </span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                      {modifiers.length > 0 && (
                        <p className="text-[9px] text-neutral-500 pl-4">
                          + {modifiers.join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[9px] italic text-neutral-500 pl-4">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calculations */}
              <div className="space-y-1 text-[11px] mb-4 border-b border-neutral-300 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {serviceChargeVal > 0 && (
                  <div className="flex justify-between text-neutral-800">
                    <span>Service Charge {order.serviceChargeRate ? `(${order.serviceChargeRate}%)` : ""}</span>
                    <span>{formatCurrency(serviceChargeVal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (SSCL/VAT)</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-neutral-400">
                  <span>TOTAL</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>

              {/* Payment Method & Barcode */}
              <div className="text-center space-y-2 pt-1">
                <p className="text-[10px] font-bold uppercase text-neutral-700">
                  Paid via {order.paymentMethod ? order.paymentMethod.replace("_", " ") : "CARD"}
                </p>
                {/* Graphic barcode representation */}
                <div className="w-full h-8 flex justify-center items-center space-x-1 py-1">
                  {[2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2].map((w, i) => (
                    <div
                      key={i}
                      className="h-full bg-neutral-900"
                      style={{ width: `${w * 2}px` }}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-neutral-500 font-medium">
                  {store.receiptFooterNote || "Thank you for dining with Lilly's! Have a lovely day."}
                </p>
              </div>
            </div>
          ) : (
            /* =================== KITCHEN KOT CHIT VIEW =================== */
            <div
              id="kitchen-kot-chit"
              className="bg-neutral-100 text-neutral-900 font-mono text-xs p-6 rounded-2xl shadow-inner mx-auto max-w-xs border-2 border-neutral-400 relative"
            >
              {/* KOT Header */}
              <div className="text-center space-y-1 mb-3 border-b-2 border-neutral-800 pb-2.5">
                <div className="inline-block px-3 py-1 bg-neutral-900 text-neutral-100 text-xs font-black tracking-wider uppercase rounded-md mb-1">
                  {store.kotHeaderTitle || "KITCHEN ORDER TICKET (KOT)"}
                </div>
                <h3 className="text-base font-black tracking-wide text-neutral-950">
                  ORDER #{order.orderNumber}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  TYPE: {order.type.replace("_", " ")}
                </p>
              </div>

              {/* Prominent Table & Time Details */}
              <div className="bg-neutral-200/90 rounded-xl p-3 mb-3 border border-neutral-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutral-600">Table:</span>
                  <span className="text-sm font-black text-neutral-950">
                    {tableLabel}
                  </span>
                </div>
                {store.showTimeOnKot !== false && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-600">Time:</span>
                    <span className="font-bold text-neutral-900">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-600">Date:</span>
                  <span className="text-neutral-800">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {store.showCustomerOnKot !== false && order.customerName && order.customerName.trim() && order.customerName.toLowerCase() !== "guest" && (
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-neutral-300">
                    <span className="text-neutral-600 font-bold">Guest:</span>
                    <span className="font-bold text-neutral-950">{order.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items List (Operational - No Financials / No Prices) */}
              <div className="space-y-3 mb-4 border-b-2 border-neutral-800 pb-3">
                <div className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                  Kitchen Items Checklist
                </div>
                {(!order.items || order.items.length === 0) ? (
                  <div className="py-3 text-center text-neutral-500 italic text-xs">
                    (No kitchen items found)
                  </div>
                ) : (
                  order.items.map((item, idx) => {
                    let modifiers: string[] = [];
                    if (item.selectedModifiers) {
                      try {
                        modifiers = typeof item.selectedModifiers === "string" 
                          ? JSON.parse(item.selectedModifiers) 
                          : item.selectedModifiers;
                      } catch {
                        modifiers = [];
                      }
                    }
                    return (
                      <div key={idx} className="border-b border-dashed border-neutral-300 pb-2">
                        <div className="flex items-start text-xs font-black text-neutral-950">
                          <span className="mr-2 text-neutral-500 font-normal">[ ]</span>
                          <span className="font-extrabold text-sm">{item.quantity}x</span>
                          <span className="ml-1.5 flex-1">{item.menuItemName}</span>
                        </div>
                        {modifiers.length > 0 && (
                          <p className="text-[10px] font-bold text-amber-800 pl-8 mt-0.5">
                            &gt;&gt; MODS: {modifiers.join(", ")}
                          </p>
                        )}
                        {store.showNotesOnKot !== false && item.notes && (
                          <div className="mt-1 pl-8">
                            <span className="inline-block bg-neutral-300 text-neutral-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                              NOTE: {item.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Special Order Instructions if any */}
              {store.showNotesOnKot !== false && order.notes && (
                <div className="bg-amber-100/90 border border-amber-300 text-amber-950 p-2.5 rounded-xl text-[10px] mb-3">
                  <span className="font-bold block uppercase">Order Notes:</span>
                  <span>{order.notes}</span>
                </div>
              )}

              {/* KOT Footer */}
              <div className="text-center pt-1 text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
                {store.kotFooterNote || "*** END OF KITCHEN ORDER ***"}
              </div>
            </div>
          )}
        </div>

        {/* Print Feedback Status */}
        {printStatus && (
          <div className="mx-6 mb-2 text-center text-xs text-amber-400 font-mono">
            {printStatus}
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-3 border-t border-neutral-800 flex flex-col space-y-2 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEscPosPrint(activeView)}
              disabled={isPrinting}
              className="flex-1 py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>
                ESC/POS Print {activeView === "kitchen" ? "KOT Chit" : "Receipt"}
              </span>
            </button>
            <button
              onClick={handleSystemPrint}
              className="py-3 px-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition border border-neutral-700"
              title="Standard Browser Print Dialog"
            >
              System Print
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>

          {/* Quick Alternate Print Link */}
          <div className="flex justify-between items-center text-[11px] text-neutral-400 px-1 pt-1">
            <span>Also need the other copy?</span>
            {activeView === "customer" ? (
              <button
                type="button"
                onClick={() => {
                  setActiveView("kitchen");
                  handleEscPosPrint("kitchen");
                }}
                className="text-amber-400 hover:underline font-bold"
              >
                Print Kitchen KOT Now →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveView("customer");
                  handleEscPosPrint("customer");
                }}
                className="text-amber-400 hover:underline font-bold"
              >
                Print Customer Receipt Now →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
