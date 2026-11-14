"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  Coffee,
  Check,
} from "lucide-react";
import { Category, MenuItem, CartItem, Table, Staff, Order, StoreSettings } from "@/types";
import ModifierModal from "./ModifierModal";
import CheckoutModal from "./CheckoutModal";
import ReceiptModal from "./ReceiptModal";
import { playSound } from "@/lib/sound";
import { printReceipt, printKitchenChit, getStoredPrinterSettings } from "@/lib/printer";
import { formatCurrency } from "@/lib/currency";
import { DEFAULT_STORE_SETTINGS, getStoreSettings, subscribeStoreSettings } from "@/lib/storeSettings";
import { enqueueOfflineOrder } from "@/lib/offlineManager";
import {
  broadcastCfdState,
  resetCfdState,
  CfdItem,
} from "@/lib/customerDisplayManager";

interface PosStationProps {
  categories: Category[];
  tables: Table[];
  currentStaff: Staff;
  onOrderCreated: () => void;
}

export default function PosStation({
  categories,
  tables,
  currentStaff,
  onOrderCreated,
}: PosStationProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(10);
  const [receiptDefaultView, setReceiptDefaultView] = useState<"customer" | "kitchen">("customer");
  const [mobileTab, setMobileTab] = useState<"menu" | "cart">("menu");

  // Modals
  const [activeItemForModifiers, setActiveItemForModifiers] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<Order | null>(null);

  useEffect(() => {
    const current = getStoreSettings();
    setStore(current);
    setServiceChargeRate(current.serviceChargePercent ?? 10);
    const unsub = subscribeStoreSettings((s) => {
      setStore(s);
      setServiceChargeRate(s.serviceChargePercent ?? 10);
    });
    return unsub;
  }, []);

  // Flat list of all items across categories
  const allItems = useMemo(() => {
    const list: MenuItem[] = [];
    categories.forEach((cat) => {
      cat.items?.forEach((item) => {
        list.push({ ...item, category: { id: cat.id, name: cat.name } });
      });
    });
    return list;
  }, [categories]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.categoryId === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allItems, selectedCategory, searchQuery]);

  // Cart actions
  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable) {
      playSound("alert");
      return;
    }

    // If item has modifier groups, open customizer drawer
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      playSound("tap");
      setActiveItemForModifiers(item);
    } else {
      // Direct add
      playSound("tap");
      setCartItems((prev) => {
        const existingIndex = prev.findIndex(
          (ci) => ci.menuItemId === item.id && ci.selectedModifiers.length === 0
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          const curr = updated[existingIndex];
          updated[existingIndex] = {
            ...curr,
            quantity: curr.quantity + 1,
            total: (curr.quantity + 1) * curr.unitPrice,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: `${item.id}-${Date.now()}`,
              menuItemId: item.id,
              menuItemName: item.name,
              unitPrice: item.price,
              quantity: 1,
              selectedModifiers: [],
              total: item.price,
              isServiceChargeApplicable: true,
            },
          ];
        }
      });
    }
  };

  const handleToggleItemServiceCharge = (cartItemId: string) => {
    playSound("tap");
    setCartItems((prev) =>
      prev.map((ci) =>
        ci.id === cartItemId
          ? {
              ...ci,
              isServiceChargeApplicable: ci.isServiceChargeApplicable === false ? true : false,
            }
          : ci
      )
    );
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    playSound("tap");
    setCartItems((prev) =>
      prev
        .map((ci) => {
          if (ci.id === cartItemId) {
            const nextQty = ci.quantity + delta;
            return {
              ...ci,
              quantity: nextQty,
              total: nextQty * ci.unitPrice,
            };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0)
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    playSound("delete");
    setCartItems((prev) => prev.filter((ci) => ci.id !== cartItemId));
  };

  const handleClearCart = () => {
    if (cartItems.length > 0) {
      playSound("delete");
      setCartItems([]);
      setDiscountRate(0);
      setTipAmount(0);
      setCustomerName("");
      setMobileTab("menu");
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.total, 0);
  }, [cartItems]);

  const applicableSubtotal = useMemo(() => {
    return cartItems
      .filter((ci) => ci.isServiceChargeApplicable !== false)
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [cartItems]);

  const serviceChargeAmount = useMemo(() => {
    return Math.round(applicableSubtotal * (serviceChargeRate / 100) * 100) / 100;
  }, [applicableSubtotal, serviceChargeRate]);

  const taxRate = (store.taxRatePercent ?? 2.5) / 100;
  const discountVal = subtotal * (discountRate / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountVal);
  const tax = taxableSubtotal * taxRate;
  const total = taxableSubtotal + tax + serviceChargeAmount + tipAmount;

  // Synchronize live cart state with Customer-Facing Display
  useEffect(() => {
    if (cartItems.length === 0 && !isCheckoutOpen) {
      resetCfdState();
      return;
    }

    const cfdItems: CfdItem[] = cartItems.map((ci) => ({
      id: ci.id,
      name: ci.menuItemName,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      total: ci.total,
      notes: ci.notes,
      modifiers: ci.selectedModifiers,
    }));

    const tableName =
      orderType === "DINE_IN"
        ? tables.find((t) => t.id === selectedTableId)?.name ||
          `Table ${tables.find((t) => t.id === selectedTableId)?.number || ""}`
        : "Takeaway";

    broadcastCfdState({
      status: isCheckoutOpen ? "CHECKOUT" : "ORDER_IN_PROGRESS",
      type: orderType,
      tableName,
      items: cfdItems,
      subtotal,
      tax,
      serviceCharge: serviceChargeAmount,
      serviceChargeRate,
      discount: discountVal,
      tip: tipAmount,
      total: isCheckoutOpen ? total : total,
    });
  }, [
    cartItems,
    isCheckoutOpen,
    orderType,
    selectedTableId,
    subtotal,
    tax,
    serviceChargeAmount,
    serviceChargeRate,
    discountVal,
    tipAmount,
    total,
    tables,
  ]);

  // Submit Order / Checkout
  const handleConfirmOrder = async (
    paymentMethod: string,
    paidTotal: number,
    appliedServiceCharge: number
  ): Promise<Order | null> => {
    try {
      const payload = {
        type: orderType,
        tableId: orderType === "DINE_IN" && selectedTableId ? selectedTableId : null,
        customerName: customerName || (orderType === "DINE_IN" ? `Table ${tables.find((t) => t.id === selectedTableId)?.number || "Guest"}` : "Guest"),
        staffId: currentStaff.id,
        subtotal,
        discount: discountVal,
        tax,
        tip: appliedServiceCharge + tipAmount,
        total: paidTotal,
        paymentMethod,
        paymentStatus: "PAID",
        notes: appliedServiceCharge > 0 ? `[SVC: ${serviceChargeRate}% = Rs. ${appliedServiceCharge.toFixed(2)}]` : null,
        items: cartItems.map((ci) => ({
          menuItemId: ci.menuItemId,
          menuItemName: ci.menuItemName,
          unitPrice: ci.unitPrice,
          quantity: ci.quantity,
          total: ci.total,
          notes: ci.notes,
          selectedModifiers: ci.selectedModifiers,
        })),
      };

      let createdOrder: Order;

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Server order creation failed");
        createdOrder = await res.json();
      } catch (networkErr) {
        console.warn("Network offline, processing order locally in Offline Queue:", networkErr);
        const offlineOrderNumber = "OFF-" + Math.floor(1000 + Math.random() * 9000);
        createdOrder = {
          id: `offline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderNumber: offlineOrderNumber,
          type: orderType,
          tableId: orderType === "DINE_IN" && selectedTableId ? selectedTableId : null,
          customerName: payload.customerName,
          customerPhone: null,
          staff: currentStaff,
          subtotal,
          discount: discountVal,
          tax,
          tip: appliedServiceCharge + tipAmount,
          total: paidTotal,
          paymentMethod,
          paymentStatus: "PAID",
          status: "PENDING",
          notes: (payload.notes ? payload.notes + " " : "") + "[OFFLINE PROCESSED]",
          createdAt: new Date().toISOString(),
          items: payload.items.map((i, idx) => ({
            id: `offline-item-${Date.now()}-${idx}`,
            menuItemId: i.menuItemId || "",
            menuItemName: i.menuItemName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            total: i.total,
            notes: i.notes || null,
            status: "QUEUED",
            selectedModifiers: i.selectedModifiers ? JSON.stringify(i.selectedModifiers) : null,
          })),
        };
        // Safely queue into local offline storage
        enqueueOfflineOrder(createdOrder);
      }

      const safeItems = (createdOrder.items && createdOrder.items.length > 0)
        ? createdOrder.items
        : payload.items.map((i, idx) => ({
            id: `item-${idx}`,
            menuItemId: i.menuItemId || "",
            menuItemName: i.menuItemName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            total: i.total,
            notes: i.notes || null,
            status: "QUEUED",
            selectedModifiers: i.selectedModifiers ? JSON.stringify(i.selectedModifiers) : null,
          }));

      const orderWithService: Order = {
        ...createdOrder,
        items: safeItems,
        table: createdOrder.table || (selectedTableId ? tables.find((t) => t.id === selectedTableId) || null : null),
        serviceCharge: appliedServiceCharge,
        serviceChargeRate: serviceChargeRate,
      };
      setCompletedOrderForReceipt(orderWithService);
      setReceiptDefaultView("customer");
      setIsCheckoutOpen(false);

      // Notify Customer-Facing Display of payment success
      broadcastCfdState({
        status: "PAID",
        orderNumber: orderWithService.orderNumber,
        total: orderWithService.total,
        amountPaid: paidTotal,
        changeDue: Math.max(0, paidTotal - orderWithService.total),
      });

      handleClearCart();
      onOrderCreated();

      // Check auto-print receipt setting
      const printerSettings = getStoredPrinterSettings();
      if (printerSettings.autoPrintReceipt) {
        printReceipt(orderWithService).catch(() => {});
      }

      return orderWithService;
    } catch (err) {
      console.error("Critical order error:", err);
      alert("Unable to process order. Please try again.");
      return null;
    }
  };

  // Send to Kitchen (Hold order without immediate payment)
  const handleSendToKitchen = async () => {
    if (cartItems.length === 0) return;
    playSound("tap");
    try {
      const payload = {
        type: orderType,
        tableId: orderType === "DINE_IN" && selectedTableId ? selectedTableId : null,
        customerName: customerName || "Dine-In Guest",
        staffId: currentStaff.id,
        subtotal,
        discount: discountVal,
        tax,
        tip: serviceChargeAmount + tipAmount,
        total,
        paymentStatus: "UNPAID",
        notes: serviceChargeAmount > 0 ? `[SVC: ${serviceChargeRate}% = Rs. ${serviceChargeAmount.toFixed(2)}]` : null,
        items: cartItems.map((ci) => ({
          menuItemId: ci.menuItemId,
          menuItemName: ci.menuItemName,
          unitPrice: ci.unitPrice,
          quantity: ci.quantity,
          total: ci.total,
          notes: ci.notes,
          selectedModifiers: ci.selectedModifiers,
        })),
      };

      let createdOrder: Order;

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Send to kitchen failed on server");
        createdOrder = await res.json();
      } catch (networkErr) {
        console.warn("Network offline, queuing kitchen order locally in Offline Queue:", networkErr);
        const offlineOrderNumber = "OFF-" + Math.floor(1000 + Math.random() * 9000);
        createdOrder = {
          id: `offline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderNumber: offlineOrderNumber,
          type: orderType,
          tableId: orderType === "DINE_IN" && selectedTableId ? selectedTableId : null,
          customerName: payload.customerName,
          customerPhone: null,
          staff: currentStaff,
          subtotal,
          discount: discountVal,
          tax,
          tip: serviceChargeAmount + tipAmount,
          total,
          paymentMethod: null,
          paymentStatus: "UNPAID",
          status: "PENDING",
          notes: (payload.notes ? payload.notes + " " : "") + "[OFFLINE KITCHEN HOLD]",
          createdAt: new Date().toISOString(),
          items: payload.items.map((i, idx) => ({
            id: `offline-item-${Date.now()}-${idx}`,
            menuItemId: i.menuItemId || "",
            menuItemName: i.menuItemName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            total: i.total,
            notes: i.notes || null,
            status: "QUEUED",
            selectedModifiers: i.selectedModifiers ? JSON.stringify(i.selectedModifiers) : null,
          })),
        };
        // Safely queue into local offline storage
        enqueueOfflineOrder(createdOrder);
      }

      const safeItems = (createdOrder.items && createdOrder.items.length > 0)
        ? createdOrder.items
        : payload.items.map((i, idx) => ({
            id: `item-${idx}`,
            menuItemId: i.menuItemId || "",
            menuItemName: i.menuItemName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            total: i.total,
            notes: i.notes || null,
            status: "QUEUED",
            selectedModifiers: i.selectedModifiers ? JSON.stringify(i.selectedModifiers) : null,
          }));

      const orderWithService: Order = {
        ...createdOrder,
        items: safeItems,
        table: createdOrder.table || (selectedTableId ? tables.find((t) => t.id === selectedTableId) || null : null),
        serviceCharge: serviceChargeAmount,
        serviceChargeRate: serviceChargeRate,
      };
      playSound("chime");
      setCompletedOrderForReceipt(orderWithService);
      setReceiptDefaultView("kitchen");
      handleClearCart();
      onOrderCreated();

      // Check auto-print kitchen chit setting
      const printerSettings = getStoredPrinterSettings();
      if (printerSettings.autoPrintKitchenChit) {
        printKitchenChit(orderWithService).catch(() => {});
      }
    } catch (err) {
      console.error("Critical kitchen order error:", err);
      alert("Failed to submit kitchen order. Please try again.");
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-[#0e0e11]">
      {/* Mobile Station Tab Switcher (Visible only on < md screens) */}
      <div className="md:hidden flex items-center bg-[#121215] border-b border-neutral-800 p-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            playSound("tap");
            setMobileTab("menu");
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 ${
            mobileTab === "menu"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
              : "bg-neutral-900 text-neutral-400 border border-neutral-800"
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Menu ({filteredItems.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            playSound("tap");
            setMobileTab("cart");
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 ${
            mobileTab === "cart"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
              : "bg-neutral-900 text-neutral-400 border border-neutral-800"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Cart ({cartItems.length} &bull; {formatCurrency(total)})</span>
        </button>
      </div>

      {/* LEFT SECTION: Search, Categories, Menu Grid */}
      <div className={`flex-1 flex-col min-w-0 border-r border-neutral-800/80 overflow-hidden ${mobileTab === "menu" ? "flex" : "hidden md:flex"}`}>
        {/* Top Control Bar: Search & Category Pills */}
        <div className="p-4 bg-[#121215] border-b border-neutral-800 space-y-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coffee, pastries, dishes, or barcode..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="text-xs font-mono text-neutral-400 shrink-0">
              {filteredItems.length} items
            </div>
          </div>

          {/* Category Pills Slider */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                playSound("tap");
                setSelectedCategory("all");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All Offerings
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  playSound("tap");
                  setSelectedCategory(cat.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Coffee className="w-10 h-10 text-neutral-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-400">No menu items found</p>
              <p className="text-xs text-neutral-500">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
              {filteredItems.map((item) => {
                const isOutOfStock = !item.isAvailable;
                const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    disabled={isOutOfStock}
                    className={`group relative rounded-2xl bg-[#141418] border border-neutral-800/80 hover:border-amber-500/40 p-3 flex flex-col text-left transition-all duration-200 active:scale-[0.98] shadow-sm overflow-hidden ${
                      isOutOfStock ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg hover:shadow-amber-500/5"
                    }`}
                  >
                    {/* Item Thumbnail */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 mb-2.5">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <Coffee className="w-8 h-8" />
                        </div>
                      )}

                      {/* Out of Stock 86 Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            86 / Out of Stock
                          </span>
                        </div>
                      )}

                      {/* Prep time badge */}
                      {!isOutOfStock && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-neutral-300 flex items-center space-x-1 border border-white/10">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.prepTimeMinutes}m</span>
                        </div>
                      )}

                      {/* Has modifiers badge */}
                      {hasModifiers && !isOutOfStock && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-neutral-950 font-extrabold text-[9px] uppercase tracking-wide">
                          Custom
                        </div>
                      )}
                    </div>

                    {/* Title & Category */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200 line-clamp-1 group-hover:text-amber-400 transition">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                          {item.description || item.category?.name}
                        </p>
                      </div>

                      {/* Price Row */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/60">
                        <span className="font-mono text-sm font-extrabold text-neutral-100">
                          {formatCurrency(item.price)}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-neutral-800 group-hover:bg-amber-500 group-hover:text-neutral-950 text-neutral-300 flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Quick Cart Floating Bar */}
        {cartItems.length > 0 && (
          <div className="md:hidden p-3 bg-[#121215]/95 backdrop-blur-md border-t border-neutral-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                playSound("tap");
                setMobileTab("cart");
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-between shadow-lg shadow-amber-500/20 transition active:scale-98"
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-md bg-neutral-950 text-amber-400 font-mono text-[11px] flex items-center justify-center">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
                <span>Review Cart &amp; Checkout</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="font-mono">{formatCurrency(total)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Cart Drawer / Billing Pad */}
      <div className={`w-full md:w-[380px] lg:w-[420px] bg-[#121215] flex-col shrink-0 select-none border-t md:border-t-0 md:border-l border-neutral-800 ${mobileTab === "cart" ? "flex flex-1" : "hidden md:flex"}`}>
        {/* Mobile Back to Menu Header */}
        <div className="md:hidden px-4 py-2.5 bg-[#16161b] border-b border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              setMobileTab("menu");
            }}
            className="text-xs text-amber-400 font-bold flex items-center space-x-1 hover:underline"
          >
            <span>&larr; Back to Catalog</span>
          </button>
          <span className="text-xs text-neutral-400 font-mono">
            {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
          </span>
        </div>

        {/* Order Mode Toggle & Table Selection */}
        <div className="p-4 bg-[#141418] border-b border-neutral-800 space-y-3 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
            {[
              { id: "DINE_IN" as const, label: "Dine-In", icon: UtensilsCrossed },
              { id: "TAKEAWAY" as const, label: "Takeaway", icon: ShoppingBag },
              { id: "DELIVERY" as const, label: "Delivery", icon: Truck },
            ].map((type) => {
              const Icon = type.icon;
              const isSelected = orderType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    playSound("tap");
                    setOrderType(type.id);
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    isSelected
                      ? "bg-amber-500 text-neutral-950 font-bold shadow-sm shadow-amber-500/20"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Table selector if Dine-In */}
          {orderType === "DINE_IN" && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-neutral-400 whitespace-nowrap">Table:</span>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Select Dining Table...</option>
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.number} - {tbl.name} ({tbl.section}) [{tbl.status}]
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-3">
                <Coffee className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-400">Order is empty</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-[200px]">
                Tap any coffee, pastry or meal from the menu to start order
              </p>
            </div>
          ) : (
            cartItems.map((ci) => (
              <div
                key={ci.id}
                className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 flex items-start justify-between space-x-3 transition hover:border-neutral-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h5 className="text-xs font-bold text-neutral-200 truncate">
                      {ci.menuItemName}
                    </h5>
                    <span className="font-mono text-xs font-semibold text-neutral-300">
                      {formatCurrency(ci.total)}
                    </span>
                  </div>

                  {/* Modifiers tags */}
                  {ci.selectedModifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ci.selectedModifiers.map((mod, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  )}

                  {ci.notes && (
                    <p className="text-[10px] italic text-neutral-400 mt-1">
                      Note: {ci.notes}
                    </p>
                  )}

                  {/* Stepper, SVC Toggle & Delete */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-800/60">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5 bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
                        <button
                          onClick={() => handleUpdateQuantity(ci.id, -1)}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center text-neutral-200 text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono text-xs font-bold text-neutral-100">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(ci.id, 1)}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center text-neutral-200 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Service Charge Quick Toggle per Item */}
                      <button
                        type="button"
                        onClick={() => handleToggleItemServiceCharge(ci.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition border ${
                          ci.isServiceChargeApplicable !== false
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                            : "bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-neutral-300 line-through"
                        }`}
                        title="Click to toggle Service Charge eligibility for this item"
                      >
                        {ci.isServiceChargeApplicable !== false ? "SVC: Yes" : "SVC: Exempt"}
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(ci.id)}
                      className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Actions */}
        <div className="p-4 bg-[#141418] border-t border-neutral-800 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span className="font-mono text-neutral-200">{formatCurrency(subtotal)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({discountRate}%)</span>
                <span className="font-mono">-{formatCurrency(discountVal)}</span>
              </div>
            )}
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-neutral-300">
                <span>
                  Service Charge ({serviceChargeRate}%)
                  {cartItems.length > applicableSubtotal && (
                    <span className="text-[10px] text-neutral-500 ml-1">
                      (eligible items)
                    </span>
                  )}
                </span>
                <span className="font-mono text-amber-300">{formatCurrency(serviceChargeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Tax (SSCL/VAT)</span>
              <span className="font-mono text-neutral-200">{formatCurrency(tax)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Extra Gratuity / Tip</span>
                <span className="font-mono text-neutral-200">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-neutral-100 pt-2 border-t border-neutral-800">
              <span>Grand Total</span>
              <span className="font-mono text-amber-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleClearCart}
              disabled={cartItems.length === 0}
              className="py-3 px-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-neutral-700 disabled:opacity-40 transition"
              title="Clear Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Send to Kitchen button */}
            <button
              onClick={handleSendToKitchen}
              disabled={cartItems.length === 0}
              className="py-3 px-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 disabled:opacity-40 transition whitespace-nowrap"
            >
              Fire to Kitchen
            </button>

            {/* Primary Charge / Checkout Button */}
            <button
              onClick={() => {
                playSound("tap");
                setIsCheckoutOpen(true);
              }}
              disabled={cartItems.length === 0}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-between shadow-lg shadow-amber-500/20 disabled:opacity-40 active:scale-[0.98] transition"
            >
              <span>Charge Order</span>
              <span className="font-mono text-sm font-extrabold">
                {formatCurrency(total)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModifierModal
        item={activeItemForModifiers}
        onClose={() => setActiveItemForModifiers(null)}
        onAddToCart={(cartItem) => {
          setCartItems((prev) => [...prev, cartItem]);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onToggleItemServiceCharge={handleToggleItemServiceCharge}
        subtotal={subtotal}
        discountRate={discountRate}
        setDiscountRate={setDiscountRate}
        serviceChargeRate={serviceChargeRate}
        setServiceChargeRate={setServiceChargeRate}
        tipAmount={tipAmount}
        setTipAmount={setTipAmount}
        taxRate={taxRate}
        customerName={customerName}
        setCustomerName={setCustomerName}
        onConfirmOrder={handleConfirmOrder}
      />

      <ReceiptModal
        order={completedOrderForReceipt}
        defaultView={receiptDefaultView}
        onClose={() => setCompletedOrderForReceipt(null)}
      />
    </div>
  );
}
