"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  TrendingUp,
  X,
  Trash2,
  PackagePlus,
} from "lucide-react";
import { InventoryItem } from "@/types";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";

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

const COMMON_UNITS = ["kg", "g", "L", "ml", "pcs", "box", "bottle", "bag", "pack"];

export default function InventoryManager({
  inventory,
  onRefresh,
}: InventoryManagerProps) {
  const [localItems, setLocalItems] = useState<InventoryItem[]>(inventory?.items || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLocalItems(inventory?.items || []);
  }, [inventory]);

  // Restock Modal
  const [activeItemForRestock, setActiveItemForRestock] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");
  const [restockReason, setRestockReason] = useState("Weekly Supplier Delivery");

  // Delete Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Inventory Item Modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("BEANS");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("kg");
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [newCurrentStock, setNewCurrentStock] = useState("");
  const [newMinStockAlert, setNewMinStockAlert] = useState("5");
  const [newCostPerUnit, setNewCostPerUnit] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract distinct categories dynamically from the inventory items
  const distinctCategories = Array.from(
    new Set(
      localItems
        .map((i) => (i.category ? i.category.toUpperCase().trim() : ""))
        .filter(Boolean)
    )
  ).sort();

  const categories = [
    "ALL",
    ...(distinctCategories.length > 0
      ? distinctCategories
      : ["BEANS", "DAIRY", "SYRUP", "BAKERY", "PACKAGING"]),
  ];

  const filteredItems = localItems.filter((item) => {
    const itemCat = (item.category || "").toUpperCase();
    const matchesCat = selectedCategory === "ALL" || itemCat === selectedCategory;
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
          staffName: "Milindu",
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

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    playSound("tap");

    const finalCategory = (
      isCustomCategory ? customCategoryName : newItemCategory
    ).toUpperCase().trim() || "GENERAL";

    const finalUnit = (
      isCustomUnit ? customUnit : newItemUnit
    ).trim() || "units";

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          name: newItemName.trim(),
          sku: newItemSku.trim() || undefined,
          category: finalCategory,
          unit: finalUnit,
          currentStock: parseFloat(newCurrentStock) || 0,
          minStockAlert: parseFloat(newMinStockAlert) || 5,
          costPerUnit: parseFloat(newCostPerUnit) || 0,
          supplierName: newSupplierName.trim() || undefined,
          staffName: "Milindu",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create item");
      }

      playSound("success");
      setIsNewItemModalOpen(false);
      // Reset form
      setNewItemName("");
      setNewItemSku("");
      setNewItemCategory(distinctCategories[0] || "BEANS");
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setNewItemUnit("kg");
      setIsCustomUnit(false);
      setCustomUnit("");
      setNewCurrentStock("");
      setNewMinStockAlert("5");
      setNewCostPerUnit("");
      setNewSupplierName("");
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create inventory item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Inventory Item with instant optimistic UI update
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    setIsDeleting(true);
    playSound("delete");

    // Instantly remove from local items list
    setLocalItems((prev) => prev.filter((it) => it.id !== targetId));
    setDeletingItem(null);

    try {
      const res = await fetch(`/api/inventory?id=${targetId}`, {
        method: "DELETE",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete item");
      }
      playSound("success");
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      onRefresh();
      alert(err instanceof Error ? err.message : "Failed to delete inventory item");
    } finally {
      setIsDeleting(false);
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
          <div>
            <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
              <span>Inventory &amp; Recipe Ingredients</span>
            </h2>
            <p className="text-[10px] text-neutral-400">
              Real-time stock levels, custom categories &amp; BOM costing
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              playSound("tap");
              setIsNewItemModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Inventory Item</span>
          </button>

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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#141418] border border-neutral-800/80 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-400">Total Stock Valuation</span>
              <p className="text-2xl font-extrabold text-neutral-100 font-mono mt-1">
                {formatCurrency(inventory.stats.totalValuation)}
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
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                      <p className="font-semibold text-neutral-400">No inventory items found</p>
                      <p className="text-[11px] mt-1 text-neutral-500">
                        Click &ldquo;+ New Inventory Item&rdquo; above to add your raw stock and supplies.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
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
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium">
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
                          {formatCurrency(item.costPerUnit)} / {item.unit}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-200">
                          {formatCurrency(itemValue)}
                        </td>

                        <td className="py-3.5 px-4 text-neutral-400">
                          {item.supplierName || "Direct Supplier"}
                        </td>

                        <td className="py-3.5 px-5 text-right space-x-1.5">
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

                          <button
                            onClick={() => {
                              playSound("tap");
                              setDeletingItem(item);
                            }}
                            className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-rose-500/15 hover:border-rose-500/30 text-neutral-500 hover:text-rose-400 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
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
                  Cost per Unit (LKR)
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

      {/* New Inventory Item Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsNewItemModalOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <PackagePlus className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">
                Add New Inventory Item
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-5">
              Track raw ingredients, packaging, or kitchen supplies with dynamic categories.
            </p>

            <form onSubmit={handleCreateItemSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Item / Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethiopian Yirgacheffe Beans, Whole Milk, Vanilla Bean Paste"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Category *
                  </label>
                  {!isCustomCategory ? (
                    <div className="space-y-1.5">
                      <select
                        value={newItemCategory}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setIsCustomCategory(true);
                          } else {
                            setNewItemCategory(e.target.value);
                          }
                        }}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                      >
                        {categories
                          .filter((c) => c !== "ALL")
                          .map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        <option value="__NEW__">+ Add New Category...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. PRODUCE, BEVERAGES"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value.toUpperCase())}
                        className="w-full bg-neutral-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
                        title="Select Existing Category"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    SKU / Item Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Unit of Measure *
                  </label>
                  {!isCustomUnit ? (
                    <select
                      value={newItemUnit}
                      onChange={(e) => {
                        if (e.target.value === "__CUSTOM__") {
                          setIsCustomUnit(true);
                        } else {
                          setNewItemUnit(e.target.value);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="__CUSTOM__">Other...</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        placeholder="e.g. cans"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="w-full bg-neutral-900 border border-amber-500/50 rounded-xl px-2.5 py-2 text-xs text-neutral-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomUnit(false)}
                        className="p-2 rounded-xl bg-neutral-800 text-neutral-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Min Alert Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={newMinStockAlert}
                    onChange={(e) => setNewMinStockAlert(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Cost per Unit (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCostPerUnit}
                    onChange={(e) => setNewCostPerUnit(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lilly's Roasters Guild"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  {isSubmitting ? "Creating..." : "Save Inventory Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setDeletingItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-100">Delete Inventory Item</h3>
                <p className="text-xs text-neutral-400">Remove ingredient from recipe tracking</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 mb-6 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Item Name:</span>
                <span className="font-bold text-neutral-100">{deletingItem.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">SKU:</span>
                <span className="font-mono text-neutral-300">{deletingItem.sku}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Current Stock:</span>
                <span className="font-bold text-amber-400">
                  {deletingItem.currentStock} {deletingItem.unit}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Category:</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-semibold">
                  {deletingItem.category}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteItem}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
