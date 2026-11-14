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
  Trash2,
  Layers,
  AlertTriangle,
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
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Manage Categories Modal
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  // New Category Modal
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Coffee");
  const [isCatSubmitting, setIsCatSubmitting] = useState(false);

  // Edit Category Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("Coffee");
  const [editCatOrder, setEditCatOrder] = useState("1");
  const [isEditCatSubmitting, setIsEditCatSubmitting] = useState(false);

  // Delete Category Confirmation Modal
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

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

  // Edit Item Modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editPrepTime, setEditPrepTime] = useState("4");
  const [editImage, setEditImage] = useState("");
  const [editSelectedModGroups, setEditSelectedModGroups] = useState<string[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete Item Confirmation Modal
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Flatten items from local reactive state
  const allItems: MenuItem[] = [];
  localCategories.forEach((cat) => {
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

  // Toggle 86 / Out of stock with instant optimistic UI update
  const handleToggleAvailability = async (item: MenuItem) => {
    playSound("tap");
    // Instant UI update
    setLocalCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items?.map((it) =>
          it.id === item.id ? { ...it, isAvailable: !it.isAvailable } : it
        ),
      }))
    );
    try {
      await fetch("/api/menu", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({
          id: item.id,
          isAvailable: !item.isAvailable,
        }),
      });
      playSound("success");
      onRefresh();
    } catch (err) {
      console.error(err);
      onRefresh();
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

  // Open Full Edit Item Modal
  const handleOpenEditItem = (item: MenuItem) => {
    playSound("tap");
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description || "");
    setEditCategoryId(item.categoryId);
    setEditPrice(item.price.toString());
    setEditCostPrice(item.costPrice.toString());
    setEditPrepTime(item.prepTimeMinutes.toString());
    setEditImage(item.image || "");
    const attachedGroupIds =
      item.modifierGroups?.map((mg) => mg.modifierGroup?.id).filter(Boolean) || [];
    setEditSelectedModGroups(attachedGroupIds);
  };

  // Submit Edit Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim() || !editPrice) return;

    setIsEditSubmitting(true);
    playSound("tap");
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          name: editName.trim(),
          description: editDesc.trim() || null,
          categoryId: editCategoryId,
          price: parseFloat(editPrice),
          costPrice: parseFloat(editCostPrice) || 0,
          prepTimeMinutes: parseInt(editPrepTime) || 5,
          image: editImage.trim() || null,
          modifierGroupIds: editSelectedModGroups,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update menu item");
      }

      playSound("success");
      setEditingItem(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Menu Item with instant optimistic UI update
  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    setIsDeletingItem(true);
    playSound("delete");

    // Optimistically remove from local state immediately
    setLocalCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items?.filter((it) => it.id !== targetId),
      }))
    );
    setDeletingItem(null);

    try {
      const res = await fetch(`/api/menu?id=${targetId}`, {
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
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setIsDeletingItem(false);
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

  // Open Edit Category
  const handleOpenEditCategory = (cat: Category) => {
    playSound("tap");
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || "Coffee");
    setEditCatOrder(cat.sortOrder?.toString() || "1");
  };

  // Submit Edit Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    setIsEditCatSubmitting(true);
    playSound("tap");
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          name: editCatName.trim(),
          icon: editCatIcon,
          sortOrder: parseInt(editCatOrder) || 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update category");
      }

      playSound("success");
      setEditingCategory(null);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setIsEditCatSubmitting(false);
    }
  };

  // Delete Category with instant optimistic UI update
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    const targetCatId = deletingCategory.id;
    setIsDeletingCat(true);
    playSound("delete");

    // Optimistically remove category from local state immediately
    setLocalCategories((prev) => prev.filter((cat) => cat.id !== targetCatId));
    if (selectedCat === targetCatId) {
      setSelectedCat("ALL");
    }
    setDeletingCategory(null);

    try {
      const res = await fetch(`/api/categories?id=${targetCatId}`, {
        method: "DELETE",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete category");
      }
      playSound("success");
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
      onRefresh();
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setIsDeletingCat(false);
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
          {/* Manage Categories button */}
          <button
            onClick={() => {
              playSound("tap");
              setIsManageCategoriesOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
            title="Edit, re-order, or delete categories"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Manage Categories</span>
          </button>

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
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
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
            {categories.map((cat) => {
              const isSelected = selectedCat === cat.id;
              return (
                <div key={cat.id} className="relative flex items-center group">
                  <button
                    onClick={() => {
                      playSound("tap");
                      setSelectedCat(cat.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {cat.name} ({cat.items?.length || 0})
                  </button>

                  {/* Inline Category Quick Actions */}
                  {isSelected && (
                    <div className="ml-1 flex items-center space-x-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditCategory(cat);
                        }}
                        className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                        title={`Edit category ${cat.name}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCategory(cat);
                        }}
                        className="p-1 rounded-lg bg-neutral-800 hover:bg-rose-500/30 text-rose-400"
                        title={`Delete category ${cat.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
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
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {item.modifierGroups && item.modifierGroups.length > 0 ? (
                            item.modifierGroups.map((mg, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                              >
                                {mg.modifierGroup?.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic">None</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.isAvailable
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "86'd (Out of Stock)"}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* 86 Toggle */}
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                              item.isAvailable
                                ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-neutral-950"
                            }`}
                          >
                            {item.isAvailable ? "86'd" : "Restock"}
                          </button>

                          {/* Edit Full Item */}
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-300 transition"
                            title="Edit Item Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Edit Menu Item */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">Edit Menu Item</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-5">
              Update name, pricing, prep times, category, or customization modifiers.
            </p>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Dish / Drink Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
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
                    Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
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
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Kitchen Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    value={editPrepTime}
                    onChange={(e) => setEditPrepTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Image URL
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  {editImage && (
                    <img
                      src={editImage}
                      alt="Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-neutral-700"
                    />
                  )}
                </div>
              </div>

              {/* Modifier Groups checkboxes */}
              {modifierGroups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-2">
                    Attach Customization Groups
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
                    {modifierGroups.map((group) => {
                      const isChecked = editSelectedModGroups.includes(group.id);
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
                                setEditSelectedModGroups([...editSelectedModGroups, group.id]);
                              } else {
                                setEditSelectedModGroups(
                                  editSelectedModGroups.filter((id) => id !== group.id)
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
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  {isEditSubmitting ? "Updating..." : "Update Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Item Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">Delete Menu Item?</h3>
            <p className="text-xs text-neutral-400 mt-2 mb-6">
              Are you sure you want to remove <span className="font-bold text-white">&quot;{deletingItem.name}&quot;</span> from the menu? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeletingItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                {isDeletingItem ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manage Categories */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsManageCategoriesOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">Manage Categories</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4 shrink-0">
              Edit category names, change ordering, or remove unused categories.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 text-amber-400 flex items-center justify-center font-bold text-xs">
                      {cat.name[0]}
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-neutral-200 block">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {cat.items?.length || 0} items assigned &bull; Order #{cat.sortOrder}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center space-x-1"
                    >
                      <Edit2 className="w-3 h-3 text-amber-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingCategory(cat)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-3 border-t border-neutral-800 flex justify-between items-center shrink-0">
              <button
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setIsNewCategoryOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-amber-500/40 text-amber-400 text-xs font-semibold flex items-center space-x-1.5 hover:bg-amber-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Category</span>
              </button>
              <button
                onClick={() => setIsManageCategoriesOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Category */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingCategory(null)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">Edit Category</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-5">
              Change the name, icon, and display sequence for this category.
            </p>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Display Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CATEGORY_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = editCatIcon === item.name;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => setEditCatIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-400"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Sort Order Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={editCatOrder}
                  onChange={(e) => setEditCatOrder(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditCatSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  {isEditCatSubmitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Category Confirmation */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">Delete Category?</h3>
            <p className="text-xs text-neutral-400 mt-2 mb-6">
              Are you sure you want to delete <span className="font-bold text-white">&quot;{deletingCategory.name}&quot;</span>? Any menu items in this category will be safely reassigned to another active category.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeletingCat}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                {isDeletingCat ? "Deleting..." : "Yes, Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Category */}
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
                  placeholder="e.g. Specialty Desserts"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Category Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CATEGORY_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = newCatIcon === item.name;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => setNewCatIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-400"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
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
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  {isCatSubmitting ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Menu Item */}
      {isNewItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewItemOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">Add New Menu Item</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-5">
              Create a new dish or drink with real-time POS catalog sync.
            </p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Dish / Drink Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pistachio Matcha Latte"
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
                  placeholder="e.g. Ceremonial grade Uji matcha with roasted Sicilian pistachio cream."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsInlineNewCat(!isInlineNewCat)}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      {isInlineNewCat ? "Choose Existing" : "+ New"}
                    </button>
                  </div>

                  {!isInlineNewCat ? (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
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
                    placeholder="e.g. 950"
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
                    placeholder="e.g. 250"
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
