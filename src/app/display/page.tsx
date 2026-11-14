"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  Coffee,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  CreditCard,
  QrCode as QrIcon,
  Banknote,
  Maximize2,
  Minimize2,
  Wifi,
  MapPin,
  Clock,
  Heart,
} from "lucide-react";
import {
  CfdState,
  DEFAULT_CFD_STATE,
  subscribeCfdState,
  getCfdState,
  generateLankaQrPayload,
} from "@/lib/customerDisplayManager";
import { formatCurrency } from "@/lib/currency";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "@/lib/storeSettings";
import { StoreSettings } from "@/types";

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=1200&q=80",
    title: "Artisanal Ceylon Espresso",
    subtitle: "Locally roasted highland beans brewed with precision",
  },
  {
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80",
    title: "Pure Ceylon Golden Tips",
    subtitle: "Single estate handpicked white tea from Nuwara Eliya",
  },
  {
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    title: "Coastal Breakfast & Brunch",
    subtitle: "Farm fresh eggs, avocado toast & house-baked pastries",
  },
];

export default function CustomerDisplayPage() {
  const [state, setState] = useState<CfdState>(DEFAULT_CFD_STATE);
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [time, setTime] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state
  useEffect(() => {
    setStore(getStoreSettings());
    setState(getCfdState());
    const unsub = subscribeCfdState((s) => setState(s));
    return unsub;
  }, []);

  // Clock
  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Slide carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Generate dynamic LankaQR code when in checkout or having QR payload
  useEffect(() => {
    if (state.status === "CHECKOUT" || state.status === "ORDER_IN_PROGRESS") {
      const payload =
        state.qrPayload ||
        generateLankaQrPayload(state.total, state.orderNumber || "LILLY-POS");
      QRCode.toDataURL(payload, {
        width: 280,
        margin: 1,
        color: {
          dark: "#09090b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR generation error:", err));
    }
  }, [state.status, state.total, state.orderNumber, state.qrPayload]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const activeSlide = HERO_SLIDES[slideIndex];
  const isIdle = state.status === "IDLE" || state.items.length === 0;

  return (
    <div className="min-h-screen w-full bg-[#09090c] text-neutral-100 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-16 px-6 bg-[#121217]/95 backdrop-blur border-b border-neutral-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-amber-500/10 border border-amber-500/20 p-1 flex items-center justify-center">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt="Logo"
                width={36}
                height={36}
                className="object-contain"
                unoptimized
              />
            ) : (
              <Coffee className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-neutral-100">
              {store.storeName}
            </h1>
            <p className="text-xs text-amber-400/90 flex items-center space-x-1.5">
              <MapPin className="w-3 h-3 text-amber-500" />
              <span>{store.address}</span>
            </p>
          </div>
        </div>

        {/* Right Info: Time & Fullscreen */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Wi-Fi: <strong className="text-neutral-200">Lillys_Guest</strong></span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-neutral-200 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{time}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Dual-Screen View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Visual Brand & Welcome Experience (7 cols on desktop) */}
        <div className="lg:col-span-7 relative flex flex-col justify-between p-8 overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border-r border-neutral-800/80">
          {/* Ambient Background Image with overlay */}
          <div className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000">
            <Image
              src={activeSlide.image}
              alt={activeSlide.title}
              fill
              className="object-cover transition-all duration-1000 scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090c] via-[#09090c]/70 to-transparent" />
          </div>

          {/* Top Welcome Tag */}
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{store.tagline || "Specialty Roastery & Restaurant"}</span>
            </div>
          </div>

          {/* Center Showcase Message */}
          <div className="relative z-10 max-w-lg space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
              {activeSlide.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 font-medium drop-shadow">
              {activeSlide.subtitle}
            </p>
          </div>

          {/* Bottom Indicators & Contact */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-neutral-800/60">
            <div className="flex space-x-2">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    slideIndex === i ? "w-8 bg-amber-400" : "w-2 bg-neutral-700"
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-neutral-400 flex items-center space-x-1.5">
              <span>Hotline:</span>
              <strong className="text-amber-400">{store.phone}</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Active Live Cart / Order Surface (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col bg-[#121217] overflow-hidden">
          {/* PAID CELEBRATION STATE */}
          {state.status === "PAID" ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fadeIn">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-neutral-800 text-neutral-400">
                  Order {state.orderNumber || "Complete"}
                </span>
                <h3 className="text-3xl font-black text-neutral-100">
                  Payment Received!
                </h3>
                <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                  Thank you for dining with us at Lilly&apos;s! Your order has been sent to the kitchen.
                </p>
              </div>

              {/* Total & Change summary */}
              <div className="w-full max-w-sm bg-neutral-900/90 rounded-2xl border border-neutral-800 p-5 space-y-3">
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Total Paid:</span>
                  <span className="font-bold text-neutral-100 font-mono">
                    {formatCurrency(state.total)}
                  </span>
                </div>
                {state.changeDue !== undefined && state.changeDue > 0 && (
                  <div className="flex justify-between text-base font-bold text-amber-400 pt-2 border-t border-neutral-800">
                    <span>Change Due:</span>
                    <span className="font-mono text-lg">{formatCurrency(state.changeDue)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs text-neutral-500">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Please visit Lilly&apos;s again soon</span>
              </div>
            </div>
          ) : isIdle ? (
            /* IDLE STATE: Friendly Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div className="space-y-2 max-w-xs">
                <h3 className="text-2xl font-bold text-neutral-100">
                  Welcome to Lilly&apos;s
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Your order items will appear here live as our cashier rings them up.
                </p>
              </div>

              <div className="w-full max-w-xs p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  Guest Info
                </span>
                <p className="text-xs text-neutral-300">
                  • Contactless LankaQR payments accepted
                </p>
                <p className="text-xs text-neutral-300">
                  • 10% Service Charge applicable on dine-in
                </p>
              </div>
            </div>
          ) : (
            /* ACTIVE CART / CHECKOUT STATE */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Order Header */}
              <div className="p-4 px-6 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {state.type === "TAKEAWAY" ? "Takeaway" : state.tableName || "Dine-In"}
                  </span>
                  {state.orderNumber && (
                    <span className="text-xs font-mono text-neutral-400">
                      #{state.orderNumber}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-neutral-400">
                  {state.items.reduce((sum, it) => sum + it.quantity, 0)} Items
                </span>
              </div>

              {/* Items List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {state.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 flex items-start justify-between space-x-3 transition hover:border-neutral-700"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {item.quantity}×
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-neutral-100 truncate">
                          {item.name}
                        </h4>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-xs text-neutral-400 truncate">
                            +{item.modifiers.join(", ")}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-amber-400/80 italic truncate">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-neutral-100">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic LankaQR Section (Shows during checkout or QR selection) */}
              {state.status === "CHECKOUT" && qrDataUrl && (
                <div className="p-4 mx-6 mb-2 rounded-2xl bg-neutral-900 border border-amber-500/30 flex items-center space-x-4 animate-fadeIn">
                  <div className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center shadow-md">
                    <Image
                      src={qrDataUrl}
                      alt="LankaQR"
                      width={88}
                      height={88}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      <QrIcon className="w-3 h-3" />
                      <span>LankaQR Instant Pay</span>
                    </span>
                    <h5 className="font-bold text-xs text-neutral-200">
                      Scan to Pay with Any Bank App
                    </h5>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      Commercial, Sampath, HNB, FriMi, Genie, BOC, etc.
                    </p>
                  </div>
                </div>
              )}

              {/* Bill Financial Summary */}
              <div className="p-5 px-6 bg-neutral-900/90 border-t border-neutral-800 space-y-2 shrink-0">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-neutral-200">
                    {formatCurrency(state.subtotal)}
                  </span>
                </div>

                {state.discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(state.discount)}</span>
                  </div>
                )}

                {state.serviceCharge > 0 && (
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>
                      Service Charge ({state.serviceChargeRate ?? 10}%)
                    </span>
                    <span className="font-mono text-neutral-200">
                      {formatCurrency(state.serviceCharge)}
                    </span>
                  </div>
                )}

                {state.tax > 0 && (
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Taxes</span>
                    <span className="font-mono text-neutral-200">
                      {formatCurrency(state.tax)}
                    </span>
                  </div>
                )}

                {state.tip > 0 && (
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Staff Tip</span>
                    <span className="font-mono text-neutral-200">
                      {formatCurrency(state.tip)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-amber-400 block">
                      Total Due
                    </span>
                    {state.paymentMethod && (
                      <span className="text-[10px] text-neutral-400 flex items-center space-x-1 mt-0.5">
                        {state.paymentMethod === "CASH" ? (
                          <Banknote className="w-3 h-3 text-emerald-400" />
                        ) : state.paymentMethod === "CARD" ? (
                          <CreditCard className="w-3 h-3 text-blue-400" />
                        ) : (
                          <QrIcon className="w-3 h-3 text-amber-400" />
                        )}
                        <span>Payment via {state.paymentMethod}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                      {formatCurrency(state.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
