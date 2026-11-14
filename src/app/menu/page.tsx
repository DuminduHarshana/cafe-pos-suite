"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Coffee,
  Search,
  Clock,
  Sparkles,
  MapPin,
  UtensilsCrossed,
  X,
  BellRing,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Category, MenuItem, StoreSettings } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "@/lib/storeSettings";

function DigitalMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") || searchParams.get("t") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeItemDetails, setActiveItemDetails] = useState<MenuItem | null>(null);
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [assistanceRequested, setAssistanceRequested] = useState<string | null>(null);

  useEffect(() => {
    setStore(getStoreSettings());
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load digital menu:", err);
    } finally {
      setLoading(false);
    }
  };

  const allItems = useMemo(() => {
    const list: MenuItem[] = [];
    categories.forEach((cat) => {
      cat.items?.forEach((item) => {
        list.push({ ...item, category: { id: cat.id, name: cat.name } });
      });
    });
    return list;
  }, [categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchCat =
        selectedCategory === "all" || item.categoryId === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allItems, selectedCategory, searchQuery]);

  const handleCallWaiter = (action: string) => {
    setAssistanceRequested(action);
    setTimeout(() => {
      setAssistanceRequested(null);
    }, 4000);
  };

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: store.storeName,
        text: `Browse the digital menu for ${store.storeName}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert("Menu link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090c] text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Brand Header */}
      <header className="sticky top-0 z-30 bg-[#121217]/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center p-1 overflow-hidden shrink-0">
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
              <h1 className="font-bold text-sm sm:text-base text-neutral-100 leading-snug">
                {store.storeName}
              </h1>
              <p className="text-[11px] text-amber-400/90 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-amber-500" />
                <span>Balapitiya, Sri Lanka</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {tableParam && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                Table {tableParam}
              </span>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition"
              title="Share Menu"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-b from-[#121217] via-neutral-950 to-[#09090c] border-b border-neutral-800/60 px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto text-center space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Contactless Menu</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Craft Coffee &amp; Artisan Cuisine
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            {store.address} • Call {store.phone}
          </p>
          <div className="text-[11px] text-neutral-500">
            Free Guest Wi-Fi: <strong className="text-neutral-300">Lillys_Guest</strong> (Password: <strong className="text-neutral-300">Coffee33</strong>)
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coffee, breakfast, Ceylon tea, desserts..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills (Horizontal scrollable) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
            }`}
          >
            All Items ({allItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
              }`}
            >
              {cat.name} ({cat.items?.length || 0})
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500">Loading Lilly&apos;s culinary menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3 rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8">
            <UtensilsCrossed className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="font-bold text-neutral-300 text-base">No items found</h3>
            <p className="text-xs text-neutral-500">
              Try searching with different terms or select another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItemDetails(item)}
                className="group p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 hover:border-amber-500/40 transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] shadow-sm hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="flex space-x-3.5">
                  {item.image && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-sm text-neutral-100 group-hover:text-amber-400 transition truncate pr-1">
                        {item.name}
                      </h3>
                    </div>
                    {item.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] text-neutral-500">
                    {item.prepTimeMinutes && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-500/80" />
                        <span>{item.prepTimeMinutes} mins</span>
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-base text-amber-400">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Guest Assistance Floating Bar */}
      <footer className="sticky bottom-0 z-20 bg-[#121217]/95 backdrop-blur border-t border-neutral-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-400 hidden sm:block">
            {tableParam ? `Dining at Table ${tableParam}` : "Dine-in or Takeaway"}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleCallWaiter("Call Waiter")}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-amber-500 text-neutral-200 hover:text-amber-400 text-xs font-semibold transition active:scale-95"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>Call Waiter</span>
            </button>

            <button
              onClick={() => handleCallWaiter("Request Bill")}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition active:scale-95 shadow-md shadow-amber-500/20"
            >
              <span>Request Bill</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Assistance Notification Toast */}
      {assistanceRequested && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-neutral-100 text-xs font-medium shadow-2xl flex items-center space-x-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {assistanceRequested} notified for{" "}
            {tableParam ? `Table ${tableParam}` : "your table"}. Our server will be right over!
          </span>
        </div>
      )}

      {/* Item Details Modal */}
      {activeItemDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121217] rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl space-y-4 animate-scaleUp">
            {activeItemDetails.image && (
              <div className="relative w-full h-48 sm:h-56 bg-neutral-900">
                <Image
                  src={activeItemDetails.image}
                  alt={activeItemDetails.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => setActiveItemDetails(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/90 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    {activeItemDetails.name}
                  </h3>
                  {activeItemDetails.category && (
                    <span className="text-xs text-amber-400 font-medium">
                      {activeItemDetails.category.name}
                    </span>
                  )}
                </div>
                <div className="text-right font-mono font-black text-xl text-amber-400">
                  {formatCurrency(activeItemDetails.price)}
                </div>
              </div>

              {activeItemDetails.description && (
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {activeItemDetails.description}
                </p>
              )}

              {activeItemDetails.prepTimeMinutes && (
                <div className="flex items-center space-x-2 text-xs text-neutral-400 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Estimated preparation time: <strong>{activeItemDetails.prepTimeMinutes} mins</strong></span>
                </div>
              )}

              {activeItemDetails.modifierGroups && activeItemDetails.modifierGroups.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">
                    Available Customizations
                  </span>
                  <div className="space-y-1.5">
                    {activeItemDetails.modifierGroups.map((mg, idx) => (
                      <div key={idx} className="text-xs text-neutral-300">
                        • {mg.modifierGroup.name}:{" "}
                        <span className="text-neutral-400">
                          {mg.modifierGroup.options?.map((o) => o.name).join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveItemDetails(null)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DigitalMenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090c] text-neutral-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DigitalMenuContent />
    </Suspense>
  );
}
