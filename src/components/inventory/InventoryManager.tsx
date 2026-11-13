"use client";

import React, { useState } from "react";
import {
  Boxes,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  X,
  History,
} from "lucide-react";
import { InventoryItem } from "@/types";
import { playSound } from "@/lib/sound";

interface InventoryManagerProps {
  inventory: {
    items: InventoryItem[];
    stats: {
      totalItems: number;
      lowStockCount: number;
      totalValuation: number;
    };
  };
  onRefresh: () => void;
}

export default function InventoryManager({
  inventory,
  onRefresh,
}: InventoryManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItemForRestock, setActiveItemForRestock] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockReason, setRestockReason] = useState("Weekly Supplier Delivery");

  const categories = ["ALL", "BEANS", "DAIRY", "SYRUP", "BAKERY", "PACKAGING"];

  const filteredItems = inventory.items.filter((item) => {
    const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForRestock || !restockQty) return;

    playSound("tap");
    try {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeItemForRestock.id,
          quantity: parseFloat(restockQty),
          type: "RESTOCK",
          reason: restockReason,
          costPerUnit: restockCost ? parseFloat(restockCost) : undefined,
          staffName: "Manager",
        }),
      });
      playSound("success");
      setActiveItemForRestock(null);
      setRestockQty("");
      setRestockCost("");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to restock item");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
            <span>Inventory &amp; Recipe Ingredients</span>
          </h2>
        </div>

        <button
          onClick={() => {
            playSound("tap");
            onRefresh();
          }}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
          title="Refresh Inventory"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Total Stock Valuation</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                ${inventory.stats.totalValuation.toFixed(2)}
              </p>
              <span className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Real-time BOM asset value</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Low Stock Radar</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {inventory.stats.lowStockCount} Items
              </p>
              <span className="text-[11px] text-rose-400 flex items-center space-x-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Below reorder threshold</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Tracked Raw Items</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {inventory.stats.totalItems} Items
              </p>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Auto-deducted from kitchen orders
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121215] p-3 rounded-2xl border border-neutral-800">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playSound("tap");
                  setSelectedCategory(cat);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cat === "ALL" ? "All Raw Stock" : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by SKU or ingredient name..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Inventory Items Table */}
        <div className="bg-[#141418] border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-5">Ingredient / Item</th>
                  <th className="py-3.5 px-4">SKU &amp; Category</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Total Value</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minStockAlert;
                  const itemValue = item.currentStock * item.costPerUnit;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-800/40 transition group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isLow
                                ? "bg-rose-500 animate-pulse"
                                : "bg-emerald-500"
                            }`}
                          />
                          <div>
                            <span className="font-bold text-neutral-100 text-xs block">
                              {item.name}
                            </span>
                            {item.recipes && item.recipes.length > 0 && (
                              <span className="text-[10px] text-neutral-500">
                                Linked in {item.recipes.length} menu recipe(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-neutral-300 block">
                          {item.sku}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-baseline space-x-1.5">
                            <span className="font-mono font-bold text-sm text-neutral-100">
                              {item.currentStock.toFixed(item.unit === "pcs" ? 0 : 2)}
                            </span>
                            <span className="text-[11px] text-neutral-400 font-semibold">
                              {item.unit}
                            </span>
                          </div>
                          {isLow && (
                            <span className="text-[10px] font-semibold text-rose-400 block">
                              Low (Min: {item.minStockAlert} {item.unit})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        ${item.costPerUnit.toFixed(2)} / {item.unit}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-200">
                        ${itemValue.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400">
                        {item.supplierName || "Direct Supplier"}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => {
                            playSound("tap");
                            setActiveItemForRestock(item);
                            setRestockCost(item.costPerUnit.toString());
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-bold text-xs border border-amber-500/30 transition shadow-sm active:scale-95"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      {activeItemForRestock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveItemForRestock(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-100 mb-1">
              Restock {activeItemForRestock.name}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Current level: {activeItemForRestock.currentStock} {activeItemForRestock.unit}
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Quantity to Add ({activeItemForRestock.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`e.g. 10 ${activeItemForRestock.unit}`}
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Cost per Unit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Reason / PO Reference
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveItemForRestock(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
