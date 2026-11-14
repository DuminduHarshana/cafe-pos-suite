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

  // Load Menu Data
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setModifierGroups(data.modifierGroups || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Tables
  const loadTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Orders
  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Inventory
  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
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
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Staff & Restore Session
  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data || []);

        // Restore persisted session from localStorage
        const savedSession = typeof window !== "undefined" ? localStorage.getItem("lilly_pos_session_staff") : null;
        if (savedSession) {
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
        } else if (data && data.length > 0) {
          setCurrentStaff(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
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

  // Real-time synchronization polling every 12s for active orders & tables (when tab is visible)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadOrders();
      loadTables();
    }, 12000);
    return () => clearInterval(syncInterval);
  }, [loadOrders, loadTables]);

  // Lazy-load analytics when opening the Analytics tab to preserve serverless DB connections
  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

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

    // Save session in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("lilly_pos_session_staff", JSON.stringify(staff));
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
