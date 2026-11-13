"use client";

import React, { useState } from "react";
import { X, Printer, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Order } from "@/types";
import { playSound } from "@/lib/sound";
import { printReceipt } from "@/lib/printer";

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  if (!order) return null;

  const handleEscPosPrint = async () => {
    setIsPrinting(true);
    setPrintStatus(null);
    playSound("tap");
    try {
      const res = await printReceipt(order);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-neutral-100 text-sm">Payment Successful</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic Thermal Receipt Area */}
        <div className="overflow-y-auto py-4 flex-1">
          <div
            id="thermal-receipt"
            className="bg-neutral-100 text-neutral-900 font-mono text-xs p-6 rounded-2xl shadow-inner mx-auto max-w-xs border border-neutral-300 relative"
          >
            {/* Serrated zigzag cut illusion at top */}
            <div className="text-center space-y-1 mb-4 border-b border-neutral-300 pb-3">
              <h2 className="text-sm font-extrabold tracking-widest uppercase">
                ARTISAN CAFE &amp; ROASTERY
              </h2>
              <p className="text-[10px] text-neutral-600">742 Evergreen Terrace &bull; Suite B</p>
              <p className="text-[10px] text-neutral-600">Tel: (555) 438-2940</p>
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
              {order.table && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-bold">{order.table.number} ({order.table.name})</span>
                </div>
              )}
              {order.customerName && (
                <div className="flex justify-between">
                  <span>Guest:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Cashier / Staff:</span>
                <span>{order.staff?.name || "Server #1"}</span>
              </div>
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
                      <span>${item.total.toFixed(2)}</span>
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
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (8%)</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.tip > 0 && (
                <div className="flex justify-between">
                  <span>Tip / Gratuity</span>
                  <span>${order.tip.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-neutral-400">
                <span>TOTAL</span>
                <span>${order.total.toFixed(2)}</span>
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
              <p className="text-[9px] text-neutral-500">Thank you for visiting! Have a lovely day.</p>
            </div>
          </div>
        </div>

        {/* Print Feedback Status */}
        {printStatus && (
          <div className="mx-6 mb-2 text-center text-xs text-amber-400 font-mono">
            {printStatus}
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-4 border-t border-neutral-800 flex items-center space-x-2 shrink-0">
          <button
            onClick={handleEscPosPrint}
            disabled={isPrinting}
            className="flex-1 py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>ESC/POS Print</span>
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
      </div>
    </div>
  );
}
