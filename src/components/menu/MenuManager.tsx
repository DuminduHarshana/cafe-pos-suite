"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Plus,
  Edit2,
  Check,
  X,
  Search,
  FolderPlus,
  Coffee,
  Flame,
  Leaf,
  Cake,
  Utensils,
  Sparkles,
} from "lucide-react";
import { Category, MenuItem, ModifierGroup } from "@/types";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";

interface MenuManagerProps {
  categories: Category[];
  modifierGroups: ModifierGroup[];
  onRefresh: () => void;
}

const CATEGORY_ICONS = [
  { name: "Coffee", icon: Coffee },
  { name: "Flame", icon: Flame },
  { name: "Leaf", icon: Leaf },
  { name: "Cake", icon: Cake },
  { name: "Utensils", icon: Utensils },
  { name: "Sparkles", icon: Sparkles },
];

export default function MenuManager({
  categories,
  modifierGroups,
  onRefresh,
}: MenuManagerProps) {
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  // New Category Modal
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Coffee");
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  // New Item Modal
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [isInlineNewCat, setIsInlineNewCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [prepTime, setPrepTime] = useState("4");
  const [image, setImage] = useState("");
  const [selectedModGroups, setSelectedModGroups] = useState<string[]>([]);
  const [isItemSubmitting, setIsItemSubmitting] = useState(false);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Flatten items
  const allItems: MenuItem[] = [];
  categories.forEach((cat) => {
    cat.items?.forEach((item) => {
      allItems.push({ ...item, category: { id: cat.id, name: cat.name } });
    });
  });

  const filteredItems = allItems.filter((item) => {
    const matchesCat = selectedCat === "ALL" || item.categoryId === selectedCat;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Toggle 86 / Out of stock
  const handleToggleAvailability = async (item: MenuItem) => {
    playSound("tap");
    try {
      await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isAvailable: !item.isAvailable,
        }),
      });
      playSound("success");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Inline Price Edit Save
  const handleSavePrice = async (itemId: string) => {
    const numPrice = parseFloat(tempPrice);
    if (isNaN(numPrice) || numPrice < 0) return;

    playSound("tap");
    try {
      const current = allItems.find((i) => i.id === itemId);
      if (!current) return;

      await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          name: current.name,
          description: current.description,
          price: numPrice,
          costPrice: current.costPrice,
          categoryId: current.categoryId,
          prepTimeMinutes: current.prepTimeMinutes,
          isAvailable: current.isAvailable,
        }),
      });
      playSound("success");
      setEditingPriceId(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Create new Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsCatSubmitting(true);
    playSound("tap");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          icon: newCatIcon,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create category");
      }

      playSound("success");
      setIsNewCategoryOpen(false);
      setNewCatName("");
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsCatSubmitting(false);
    }
  };

  // Create new item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setIsItemSubmitting(true);
    playSound("tap");
    try {
      let targetCatId = categoryId;

      // If user chose to create an inline category
      if (isInlineNewCat && inlineCatName.trim()) {
        const catRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: inlineCatName.trim(),
            icon: "Coffee",
          }),
        });
        if (catRes.ok) {
          const newCat = await catRes.json();
          targetCatId = newCat.id;
        }
      }

      if (!targetCatId) {
        targetCatId = (selectedCat !== "ALL" ? selectedCat : "") || categories[0]?.id;
      }

      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || undefined,
          categoryId: targetCatId,
          price: parseFloat(price),
          costPrice: costPrice ? parseFloat(costPrice) : 0,
          prepTimeMinutes: parseInt(prepTime) || 5,
          image: image.trim() || undefined,
          modifierGroupIds: selectedModGroups,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create menu item");
      }

      playSound("success");
      setIsNewItemOpen(false);
      setName("");
      setDesc("");
      setPrice("");
      setCostPrice("");
      setImage("");
      setIsInlineNewCat(false);
      setInlineCatName("");
      setSelectedModGroups([]);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create menu item");
    } finally {
      setIsItemSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
            <span>Menu Catalog &amp; Dynamic Pricing</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
              {allItems.length} Dishes &amp; Drinks
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              playSound("tap");
              setIsNewCategoryOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-800 text-neutral-200 font-semibold text-xs flex items-center space-x-1.5 transition active:scale-95"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Category</span>
          </button>

          <button
            onClick={() => {
              playSound("tap");
              if (!categoryId && categories.length > 0) {
                setCategoryId(selectedCat !== "ALL" ? selectedCat : categories[0].id);
              }
              setIsNewItemOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Menu Item</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Category & Search filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121215] p-3 rounded-2xl border border-neutral-800">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                playSound("tap");
                setSelectedCat("ALL");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCat === "ALL"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All Items ({allItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  playSound("tap");
                  setSelectedCat(cat.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCat === cat.id
                    ? "bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cat.name} ({cat.items?.length || 0})
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, drinks, ingredients..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="bg-[#141418] border border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-5">Dish / Drink</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">Cost Price</th>
                  <th className="py-3.5 px-4">Gross Margin</th>
                  <th className="py-3.5 px-4">Modifiers</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredItems.map((item) => {
                  const margin =
                    item.price > 0
                      ? (((item.price - item.costPrice) / item.price) * 100).toFixed(1)
                      : "0";
                  const isEditingPrice = editingPriceId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-800/40 transition group ${
                        !item.isAvailable ? "opacity-60 bg-neutral-900/20" : ""
                      }`}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center space-x-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 text-amber-400 font-bold flex items-center justify-center shrink-0">
                              {item.name[0]}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-neutral-100 text-xs block">
                              {item.name}
                            </span>
                            {item.description && (
                              <span className="text-[10px] text-neutral-400 line-clamp-1 max-w-[200px]">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-xs text-neutral-300 font-medium">
                          {item.category?.name || "General"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isEditingPrice ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs text-neutral-400">Rs.</span>
                            <input
                              type="number"
                              step="0.01"
                              autoFocus
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-24 bg-neutral-900 border border-amber-500 rounded-lg px-2 py-1 text-xs font-mono text-neutral-100 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSavePrice(item.id)}
                              className="p-1 rounded bg-amber-500 text-neutral-950 hover:bg-amber-400"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingPriceId(item.id);
                              setTempPrice(item.price.toString());
                            }}
                            className="flex items-center space-x-1.5 cursor-pointer group-hover:text-amber-400 transition"
                            title="Click to quickly edit price"
                          >
                            <span className="font-mono font-bold text-neutral-100 text-sm">
                              {formatCurrency(item.price)}
                            </span>
                            <Edit2 className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-400">
                        {formatCurrency(item.costPrice)}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            parseFloat(margin) >= 70
                              ? "text-emerald-400"
                              : parseFloat(margin) >= 50
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {margin}%
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-xs text-neutral-400">
                          {item.modifierGroups?.length || 0} group(s)
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.isAvailable
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "86'd (Out of Stock)"}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                            item.isAvailable
                              ? "bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-300"
                              : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-neutral-950"
                          }`}
                        >
                          {item.isAvailable ? "Mark 86'd" : "Restock Item"}
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

      {/* New Category Modal */}
      {isNewCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsNewCategoryOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <FolderPlus className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">Create Menu Category</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-5">
              Add a dynamic category to organize dishes, drinks, and POS filters.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Mocktails, Artisanal Pizzas, Desserts"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  Category Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CATEGORY_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = newCatIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setNewCatIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 ring-1 ring-amber-500/50"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                        }`}
                        title={item.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  {isCatSubmitting ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Menu Item Modal */}
      {isNewItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsNewItemOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-100 mb-1">Add New Menu Item</h3>
            <p className="text-xs text-neutral-400 mb-5">
              Add a new dish, drink, or retail package to your POS catalog.
            </p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vanilla Cloud Cold Brew, Truffle Eggs Benedict"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes, ingredients, flavor profile..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Category *
                  </label>
                  {!isInlineNewCat ? (
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsInlineNewCat(true);
                        } else {
                          setCategoryId(e.target.value);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__NEW__">+ Add New Category...</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Seasonal Drinks"
                        value={inlineCatName}
                        onChange={(e) => setInlineCatName(e.target.value)}
                        className="w-full bg-neutral-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsInlineNewCat(false)}
                        className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Cost Price / COGS (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Kitchen Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Modifier Groups checkboxes */}
              {modifierGroups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-2">
                    Attach Customization Groups
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
                    {modifierGroups.map((group) => {
                      const isChecked = selectedModGroups.includes(group.id);
                      return (
                        <label
                          key={group.id}
                          className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedModGroups([...selectedModGroups, group.id]);
                              } else {
                                setSelectedModGroups(
                                  selectedModGroups.filter((id) => id !== group.id)
                                );
                              }
                            }}
                            className="rounded bg-neutral-800 border-neutral-700 text-amber-500 focus:ring-0"
                          />
                          <span className="truncate">{group.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isItemSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  {isItemSubmitting ? "Creating..." : "Save Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
