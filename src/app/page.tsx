"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import PosStation from "@/components/pos/PosStation";
import KitchenDisplay from "@/components/kds/KitchenDisplay";
import TableManager from "@/components/tables/TableManager";
import InventoryManager from "@/components/inventory/InventoryManager";
import MenuManager from "@/components/menu/MenuManager";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import SettingsHub from "@/components/settings/SettingsHub";
import PinModal from "@/components/staff/PinModal";
import PrinterSettingsModal from "@/components/settings/PrinterSettingsModal";
import { Category, ModifierGroup, Order, Table, InventoryItem, Staff } from "@/types";
import { getStoreSettings, applyColorTheme } from "@/lib/storeSettings";
import {
  setCachedMenu,
  getCachedMenu,
  setCachedTables,
  getCachedTables,
  setCachedStaff,
  getCachedStaff,
  getOfflineOrders,
  syncOfflineOrders,
  subscribeNetworkState,
  NetworkState,
} from "@/lib/offlineManager";
import { playSound } from "@/lib/sound";

const DEFAULT_STAFF: Staff = {
  id: "admin-milindu",
  name: "Milindu",
  role: "ADMIN",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "pos" | "kds" | "tables" | "inventory" | "menu" | "analytics" | "settings"
  >("pos");

  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<{
    items: InventoryItem[];
    stats: { totalItems: number; lowStockCount: number; totalValuation: number };
  }>({
    items: [],
    stats: { totalItems: 0, lowStockCount: 0, totalValuation: 0 },
  });
  const [analytics, setAnalytics] = useState<{
    metrics: { totalRevenue: number; totalOrders: number; avgTicket: number; totalTips: number; activeOrdersCount: number };
    topItems: { name: string; count: number; revenue: number }[];
    paymentMethods: Record<string, number>;
    recentOrders: Order[];
  }>({
    metrics: { totalRevenue: 0, totalOrders: 0, avgTicket: 0, totalTips: 0, activeOrdersCount: 0 },
    topItems: [],
    paymentMethods: {},
    recentOrders: [],
  });

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff>(DEFAULT_STAFF);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLockedStation, setIsLockedStation] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState<NetworkState>({
    online: true,
    pendingCount: 0,
    isSyncing: false,
  });

  // Load Menu Data with Offline Caching
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setModifierGroups(data.modifierGroups || []);
        setCachedMenu(data);
        return;
      }
    } catch (e) {
      console.warn("Could not fetch /api/menu from network, loading offline cache:", e);
    }
    const cached = getCachedMenu();
    if (cached) {
      setCategories(cached.categories || []);
      setModifierGroups(cached.modifierGroups || []);
    }
  }, []);

  // Load Tables with Offline Caching
  const loadTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data || []);
        setCachedTables(data || []);
        return;
      }
    } catch (e) {
      console.warn("Could not fetch /api/tables from network, loading offline cache:", e);
    }
    const cached = getCachedTables();
    if (cached) {
      setTables(cached);
    }
  }, []);

  // Load Orders (Server Orders + Merged Offline Queue)
  const loadOrders = useCallback(async () => {
    let serverOrders: Order[] = [];
    try {
      const res = await fetch("/api/orders", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        serverOrders = (await res.json()) || [];
      }
    } catch (e) {
      console.warn("Could not fetch /api/orders from network, loading offline orders:", e);
    }
    const offlineList = getOfflineOrders();
    const merged = [
      ...offlineList.filter((o) => !serverOrders.some((so) => so.id === o.id)),
      ...serverOrders,
    ];
    setOrders(merged);
  }, []);

  // Load Inventory
  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Staff & Restore Session with Offline Fallback
  const loadStaff = useCallback(async () => {
    let data: Staff[] = [];
    try {
      const res = await fetch("/api/staff", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        data = (await res.json()) || [];
        setCachedStaff(data);
      }
    } catch (e) {
      console.warn("Could not fetch /api/staff from network, loading offline cache:", e);
    }

    if (!data || data.length === 0) {
      data = getCachedStaff() || [
        DEFAULT_STAFF,
        { id: "barista-2", name: "Barista", role: "BARISTA" },
        { id: "cashier-3", name: "Cashier", role: "CASHIER" },
      ];
    }
    setStaffList(data);

    // Restore persisted session from localStorage unless explicitly locked
    const isLocked = typeof window !== "undefined" && localStorage.getItem("lilly_pos_station_locked") === "true";
    const savedSession = typeof window !== "undefined" ? localStorage.getItem("lilly_pos_session_staff") : null;

    if (savedSession && !isLocked) {
      try {
        const parsed: Staff = JSON.parse(savedSession);
        const matched = data?.find((s: Staff) => s.id === parsed.id || s.name === parsed.name);
        if (matched) {
          setCurrentStaff(matched);
        } else {
          setCurrentStaff(parsed);
        }
      } catch {
        if (data && data.length > 0) {
          setCurrentStaff(data[0]);
        }
      }
    } else {
      // Locked state: Station requires PIN authentication
      setIsLockedStation(true);
      setIsPinModalOpen(true);
      if (data && data.length > 0) {
        setCurrentStaff(data[0]);
      }
    }
  }, []);

  // Refresh all state
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadMenu(),
      loadTables(),
      loadOrders(),
      loadInventory(),
      loadAnalytics(),
    ]);
  }, [loadMenu, loadTables, loadOrders, loadInventory, loadAnalytics]);

  // Initial Load
  useEffect(() => {
    // Apply stored color theme
    const store = getStoreSettings();
    applyColorTheme(store.colorTheme);

    async function init() {
      setIsLoading(true);
      await Promise.all([
        loadMenu(),
        loadTables(),
        loadOrders(),
        loadInventory(),
        loadAnalytics(),
        loadStaff(),
      ]);
      setIsLoading(false);
    }
    init();
  }, [loadMenu, loadTables, loadOrders, loadInventory, loadAnalytics, loadStaff]);

  // Real-time synchronization polling every 10s for active orders & tables, and current view data (when tab is visible)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadOrders();
      loadTables();
      if (activeTab === "menu") {
        loadMenu();
      } else if (activeTab === "inventory") {
        loadInventory();
      }
    }, 10000);
    return () => clearInterval(syncInterval);
  }, [loadOrders, loadTables, loadMenu, loadInventory, activeTab]);

  // Lazy-load analytics when opening the Analytics tab to preserve serverless DB connections
  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  // Network & Auto-Sync Subscription
  useEffect(() => {
    const unsub = subscribeNetworkState((state) => {
      setNetworkState(state);
      // Auto-sync when coming back online if orders are pending
      if (state.online && state.pendingCount > 0 && !state.isSyncing) {
        syncOfflineOrders().then((res) => {
          if (res.synced > 0) {
            playSound("chime");
            refreshAll();
          }
        });
      }
    });
    return unsub;
  }, [refreshAll]);

  const activeOrdersCount = orders.filter((o) =>
    ["PENDING", "PREPARING", "READY"].includes(o.status)
  ).length;

  const handleSelectTableForOrder = () => {
    setActiveTab("pos");
  };

  const handleStaffSelected = (staff: Staff) => {
    setCurrentStaff(staff);
    setIsLockedStation(false);
    setIsPinModalOpen(false);

    // Save session in localStorage and remove lock flag
    if (typeof window !== "undefined") {
      localStorage.setItem("lilly_pos_session_staff", JSON.stringify(staff));
      localStorage.removeItem("lilly_pos_station_locked");
    }

    // Role-based landing view
    if (staff.role === "BARISTA") {
      setActiveTab("kds");
    } else if (staff.role === "CASHIER") {
      setActiveTab("pos");
    }
  };

  const handleLockStation = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lilly_pos_session_staff");
      localStorage.setItem("lilly_pos_station_locked", "true");
    }
    setIsLockedStation(true);
    setIsPinModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center animate-pulse">
          <span className="font-mono font-extrabold text-base">LR</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Loading Lilly&apos;s Restaurant &amp; Cafe...
        </p>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen flex flex-col bg-[#09090b] text-neutral-100 overflow-hidden font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentStaff={currentStaff}
        onOpenPinModal={() => {
          setIsLockedStation(false);
          setIsPinModalOpen(true);
        }}
        onLockStation={handleLockStation}
        onOpenPrinterModal={() => setIsPrinterModalOpen(true)}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Offline Mode Active Banner */}
      {!networkState.online && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold">Offline Mode Active:</span>
            <span className="text-amber-200/80 hidden md:inline">
              Running without internet. Menu, orders, and receipts are processing locally and will auto-sync when network returns.
            </span>
          </div>
          {networkState.pendingCount > 0 && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
              {networkState.pendingCount} {networkState.pendingCount === 1 ? "order" : "orders"} queued
            </span>
          )}
        </div>
      )}

      {/* Dynamic View Panels */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "pos" && (
          <PosStation
            categories={categories}
            tables={tables}
            currentStaff={currentStaff}
            onOrderCreated={refreshAll}
          />
        )}

        {activeTab === "kds" && (
          <KitchenDisplay
            orders={orders}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === "tables" && (
          <TableManager
            tables={tables}
            onSelectTableForOrder={handleSelectTableForOrder}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryManager
            inventory={inventory}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === "menu" && (
          <MenuManager
            categories={categories}
            modifierGroups={modifierGroups}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsDashboard
            analytics={analytics}
            currentStaff={currentStaff}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === "settings" && (
          <SettingsHub />
        )}
      </div>

      {/* Staff PIN Switching & Lock Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          if (!isLockedStation) {
            setIsPinModalOpen(false);
          }
        }}
        staffList={staffList}
        onStaffSelected={handleStaffSelected}
        isLocked={isLockedStation}
      />

      {/* ESC/POS Thermal Receipt & Kitchen Printer Settings */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />
    </main>
  );
}
