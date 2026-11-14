"use client";

import React, { useState } from "react";
import { X, Plus, Minus, Clock, Check, Sparkles } from "lucide-react";
import { MenuItem, CartItem, ModifierOption } from "@/types";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";

interface ModifierModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export default function ModifierModal({
  item,
  onClose,
  onAddToCart,
}: ModifierModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");

  if (!item) return null;

  const modifierGroups = item.modifierGroups?.map((mg) => mg.modifierGroup) || [];

  const handleToggleModifier = (groupId: string, option: ModifierOption, isSingle: boolean) => {
    playSound("tap");
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || [];
      if (isSingle) {
        return { ...prev, [groupId]: [option.name] };
      } else {
        const exists = current.includes(option.name);
        if (exists) {
          return { ...prev, [groupId]: current.filter((n) => n !== option.name) };
        } else {
          return { ...prev, [groupId]: [...current, option.name] };
        }
      }
    });
  };

  // Calculate total price including selected modifiers
  const calculateTotal = () => {
    let price = item.price;
    for (const group of modifierGroups) {
      const selected = selectedModifiers[group.id] || [];
      for (const optName of selected) {
        const option = group.options.find((o) => o.name === optName);
        if (option) {
          price += option.priceDelta;
        }
      }
    }
    return price * quantity;
  };

  const handleAdd = () => {
    playSound("success");
    const allSelectedModifiers: string[] = [];
    Object.values(selectedModifiers).forEach((arr) => {
      allSelectedModifiers.push(...arr);
    });

    const unitPrice = calculateTotal() / quantity;

    onAddToCart({
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      menuItemName: item.name,
      unitPrice,
      quantity,
      selectedModifiers: allSelectedModifiers,
      total: calculateTotal(),
      notes: notes.trim() || undefined,
      isServiceChargeApplicable: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header with image & close */}
        <div className="relative h-44 w-full bg-neutral-900 shrink-0">
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/50 to-transparent" />
          <button
            onClick={() => {
              playSound("tap");
              onClose();
            }}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-neutral-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {item.category?.name || "Craft Drink"}
              </span>
              <span className="flex items-center space-x-1 text-[11px] text-neutral-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.prepTimeMinutes} mins</span>
              </span>
            </div>
            <h3 className="text-xl font-bold text-neutral-100">{item.name}</h3>
          </div>
        </div>

        {/* Scrollable Modifiers List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {item.description && (
            <p className="text-xs text-neutral-400 leading-relaxed">
              {item.description}
            </p>
          )}

          {modifierGroups.map((group) => {
            const isSingle = group.maxSelection === 1;
            const currentSelected = selectedModifiers[group.id] || [];

            return (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {group.name}
                  </h4>
                  <span className="text-[10px] text-neutral-500">
                    {isSingle ? "Select 1" : "Multi-choice"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((option) => {
                    const isSelected = currentSelected.includes(option.name);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleToggleModifier(group.id, option, isSingle)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/10"
                            : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-amber-400 bg-amber-400 text-neutral-950"
                                : "border-neutral-600 bg-neutral-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium">{option.name}</span>
                        </div>
                        {option.priceDelta > 0 && (
                          <span className="text-[11px] font-mono font-semibold text-neutral-400">
                            +{formatCurrency(option.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Kitchen Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Kitchen Instructions / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra hot, no lid, light foam..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Footer: Quantity + Add to Cart */}
        <div className="p-5 border-t border-neutral-800/80 bg-neutral-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-neutral-800 rounded-2xl p-1 border border-neutral-700/80">
            <button
              onClick={() => {
                playSound("tap");
                setQuantity((q) => Math.max(1, q - 1));
              }}
              className="w-9 h-9 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm text-neutral-100 font-mono">
              {quantity}
            </span>
            <button
              onClick={() => {
                playSound("tap");
                setQuantity((q) => q + 1);
              }}
              className="w-9 h-9 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm flex items-center justify-between shadow-lg shadow-amber-500/20 active:scale-[0.98] transition"
          >
            <span>Add to Order</span>
            <span className="font-mono text-base font-extrabold">
              {formatCurrency(calculateTotal())}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
