"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  Edit2,
  Check,
  X,
  Search,
  DollarSign,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from "lucide-react";
import { Category, MenuItem, ModifierGroup } from "@/types";
import { playSound } from "@/lib/sound";

interface MenuManagerProps {
  categories: Category[];
  modifierGroups: ModifierGroup[];
  onRefresh: () => void;
}

export default function MenuManager({
  categories,
  modifierGroups,
  onRefresh,
}: MenuManagerProps) {
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  // New Item Modal
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [prepTime, setPrepTime] = useState("4");
  const [image, setImage] = useState("");
  const [selectedModGroups, setSelectedModGroups] = useState<string[]>([]);

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
        body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Save quick price update
  const handleSavePrice = async (itemId: string) => {
    playSound("tap");
    const numPrice = parseFloat(tempPrice);
    if (isNaN(numPrice) || numPrice <= 0) return;

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

  // Create new item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    playSound("tap");
    try {
      await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || undefined,
          categoryId: categoryId || categories[0]?.id,
          price: parseFloat(price),
          costPrice: costPrice ? parseFloat(costPrice) : 0,
          prepTimeMinutes: parseInt(prepTime) || 5,
          image: image.trim() || undefined,
          modifierGroupIds: selectedModGroups,
        }),
      });
      playSound("success");
      setIsNewItemOpen(false);
      setName("");
      setDesc("");
      setPrice("");
      setCostPrice("");
      setImage("");
      setSelectedModGroups([]);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create menu item");
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

        <button
          onClick={() => {
            playSound("tap");
            setIsNewItemOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Menu Item</span>
        </button>
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
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All Categories
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
                    ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items or recipes..."
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
                  <th className="py-3.5 px-5">Item Name &amp; Photo</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Menu Price ($)</th>
                  <th className="py-3.5 px-4">Cost Price ($)</th>
                  <th className="py-3.5 px-4">Profit Margin</th>
                  <th className="py-3.5 px-4">Prep Time</th>
                  <th className="py-3.5 px-5 text-right">86 / Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredItems.map((item) => {
                  const isEditing = editingPriceId === item.id;
                  const profit = item.price - item.costPrice;
                  const marginPercent = item.price > 0 ? (profit / item.price) * 100 : 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-800/40 transition group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              item.image ||
                              "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=150&q=80"
                            }
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-neutral-100 text-xs block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-500 line-clamp-1 max-w-xs">
                              {item.description || "Craft item"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {item.category?.name || "General"}
                        </span>
                      </td>

                      {/* Interactive inline price edit */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-neutral-400 font-mono text-xs">$</span>
                            <input
                              type="number"
                              step="0.05"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 bg-neutral-900 border border-amber-500 rounded-lg px-2 py-1 font-mono font-bold text-xs text-amber-300 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePrice(item.id)}
                              className="p-1 rounded-md bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-1 rounded-md bg-neutral-800 text-neutral-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              playSound("tap");
                              setEditingPriceId(item.id);
                              setTempPrice(item.price.toFixed(2));
                            }}
                            className="flex items-center space-x-1.5 font-mono font-bold text-sm text-neutral-100 hover:text-amber-400 group/btn transition"
                            title="Click to edit price"
                          >
                            <span>${item.price.toFixed(2)}</span>
                            <Edit2 className="w-3 h-3 text-neutral-500 opacity-0 group-hover/btn:opacity-100" />
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-400">
                        ${item.costPrice.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            marginPercent >= 70
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : marginPercent >= 50
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {marginPercent.toFixed(0)}% (${profit.toFixed(2)})
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400 font-mono">
                        {item.prepTimeMinutes} mins
                      </td>

                      {/* 86 toggle */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                            item.isAvailable
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-emerald-500/20 hover:text-emerald-300"
                          }`}
                        >
                          <span>{item.isAvailable ? "Available" : "86'd Out"}</span>
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

            <h3 className="text-lg font-bold text-neutral-100 mb-1">Create Menu Offering</h3>
            <p className="text-xs text-neutral-400 mb-5">
              Set title, category, retail pricing, cost, and custom modifiers
            </p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Honey Cold Brew"
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
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Prep Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Menu Retail Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    placeholder="e.g. 5.75"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Ingredient Cost Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 1.25"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Modifier Group toggles */}
              {modifierGroups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Attach Modifier Groups
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {modifierGroups.map((mg) => {
                      const isChecked = selectedModGroups.includes(mg.id);
                      return (
                        <button
                          key={mg.id}
                          type="button"
                          onClick={() => {
                            playSound("tap");
                            setSelectedModGroups((prev) =>
                              isChecked ? prev.filter((id) => id !== mg.id) : [...prev, mg.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-xs text-left transition ${
                            isChecked
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          {mg.name} ({mg.options.length} opts)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Publish Offering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
