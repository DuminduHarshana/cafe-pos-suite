"use client";

import React, { useState } from "react";
import {
  X,
  Banknote,
  CreditCard,
  QrCode,
  Users,
  CheckCircle2,
  Percent,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Order } from "@/types";
import { playSound } from "@/lib/sound";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discountRate: number;
  setDiscountRate: (rate: number) => void;
  tipAmount: number;
  setTipAmount: (tip: number) => void;
  taxRate: number;
  customerName: string;
  setCustomerName: (name: string) => void;
  onConfirmOrder: (paymentMethod: string, paidAmount: number) => Promise<Order | null>;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  subtotal,
  discountRate,
  setDiscountRate,
  tipAmount,
  setTipAmount,
  taxRate,
  customerName,
  setCustomerName,
  onConfirmOrder,
}: CheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<"cash" | "card" | "qr" | "split">("card");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const discountVal = subtotal * (discountRate / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountVal);
  const tax = taxableSubtotal * taxRate;
  const grandTotal = taxableSubtotal + tax + tipAmount;

  const quickCashOptions = [
    Math.ceil(grandTotal),
    Math.ceil(grandTotal / 5) * 5,
    Math.ceil(grandTotal / 10) * 10,
    50,
    100,
  ].filter((v, i, a) => v >= grandTotal && a.indexOf(v) === i).slice(0, 4);

  const changeDue = Math.max(0, cashTendered - grandTotal);

  const handleProcessPayment = async (method: string) => {
    setIsProcessing(true);
    playSound("tap");
    try {
      const order = await onConfirmOrder(method, grandTotal);
      if (order) {
        playSound("success");
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-neutral-100 flex items-center space-x-2">
              <span>Checkout &amp; Payment</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select payment tender and complete order
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Customer Name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Customer Name (Optional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Liam or Table Guest"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Discounts & Tips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800/80">
            {/* Discounts */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span>Discount</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 5, 10, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      playSound("tap");
                      setDiscountRate(d);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-medium border transition ${
                      discountRate === d
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {d === 0 ? "None" : `${d}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Tip / Gratuity
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1.0, 2.0, 3.0].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      playSound("tap");
                      setTipAmount(t);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-medium border transition ${
                      tipAmount === t
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {t === 0 ? "No Tip" : `$${t}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="grid grid-cols-4 gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
            {[
              { id: "card" as const, label: "Card", icon: CreditCard },
              { id: "cash" as const, label: "Cash", icon: Banknote },
              { id: "qr" as const, label: "Apple / QR", icon: QrCode },
              { id: "split" as const, label: "Split", icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playSound("tap");
                    setActiveTab(tab.id);
                  }}
                  className={`py-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-bold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Specific Panes */}
          {activeTab === "cash" && (
            <div className="space-y-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Quick Cash Presets:</span>
                <span className="text-xs font-mono text-neutral-300">
                  Due: ${grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quickCashOptions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      playSound("tap");
                      setCashTendered(amount);
                    }}
                    className={`py-2 rounded-xl border text-xs font-bold transition font-mono ${
                      cashTendered === amount
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Cash tendered & change calculation */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-1">Tendered</span>
                  <div className="flex items-center">
                    <span className="text-neutral-400 font-mono text-sm mr-1">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashTendered || ""}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      placeholder={grandTotal.toFixed(2)}
                      className="bg-transparent font-mono font-bold text-base text-neutral-100 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-1">Change Due</span>
                  <div className="font-mono font-bold text-base text-emerald-400">
                    ${changeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "card" && (
            <div className="bg-neutral-900/60 p-6 rounded-2xl border border-neutral-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-neutral-200">
                Ready for Contactless Tap or Chip Reader
              </p>
              <p className="text-xs text-neutral-400">
                Compatible with Square, Stripe Terminal, Clover, or Ingenico
              </p>
            </div>
          )}

          {activeTab === "qr" && (
            <div className="bg-neutral-900/60 p-6 rounded-2xl border border-neutral-800 text-center space-y-3">
              {/* Dynamic QR Code representation */}
              <div className="w-36 h-36 bg-white rounded-2xl mx-auto p-2 flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PAY-${grandTotal.toFixed(2)}-ARTISAN-CAFE`}
                  alt="Payment QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs font-semibold text-neutral-200">
                Scan to pay with Apple Pay, Google Pay, or Venmo
              </p>
            </div>
          )}

          {activeTab === "split" && (
            <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Split evenly between guests:</span>
                <div className="flex items-center space-x-2 bg-neutral-900 rounded-xl p-1 border border-neutral-800">
                  {[2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        playSound("tap");
                        setSplitCount(count);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        splitCount === count
                          ? "bg-amber-500 text-neutral-950"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center">
                <span className="text-xs text-neutral-300">Each Guest Pays:</span>
                <span className="font-mono text-lg font-extrabold text-amber-400">
                  ${(grandTotal / splitCount).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Cost breakdown summary */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({discountRate}%)</span>
                <span className="font-mono">-${discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Tax (8%)</span>
              <span className="font-mono">${tax.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Tip</span>
                <span className="font-mono">${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-neutral-100 pt-2 border-t border-neutral-800">
              <span>Total Payable</span>
              <span className="font-mono text-amber-400">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Checkout Trigger */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={() => handleProcessPayment(activeTab.toUpperCase())}
            disabled={isProcessing || (activeTab === "cash" && cashTendered > 0 && cashTendered < grandTotal)}
            className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{isProcessing ? "Processing Tender..." : `Charge $${grandTotal.toFixed(2)}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
