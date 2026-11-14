"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import PosStation from "@/components/pos/PosStation";
import KitchenDisplay from "@/components/kds/KitchenDisplay";
import TableManager from "@/components/tables/TableManager";
import InventoryManager from "@/components/inventory/InventoryManager";
import MenuManager from "@/components/menu/MenuManager";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import PinModal from "@/components/staff/PinModal";
import PrinterSettingsModal from "@/components/settings/PrinterSettingsModal";
import { Category, Table, Order, InventoryItem, Staff, ModifierGroup } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"pos" | "kds" | "tables" | "inventory" | "menu" | "analytics">("pos");
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
  const [currentStaff, setCurrentStaff] = useState<Staff>({
    id: "default",
    name: "Julian Vance",
    role: "ADMIN",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
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

  // Load Staff
  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data || []);
        if (data && data.length > 0) {
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

  // Real-time synchronization polling every 5s for orders & tables
  useEffect(() => {
    const syncInterval = setInterval(() => {
      loadOrders();
      loadTables();
      loadAnalytics();
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [loadOrders, loadTables, loadAnalytics]);

  const activeOrdersCount = orders.filter((o) =>
    ["PENDING", "PREPARING", "READY"].includes(o.status)
  ).length;

  const handleSelectTableForOrder = (table: Table) => {
    setActiveTab("pos");
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center animate-pulse">
          <span className="font-mono font-extrabold text-base">AC</span>
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
        onOpenPinModal={() => setIsPinModalOpen(true)}
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
      </div>

      {/* Staff PIN Switching Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        staffList={staffList}
        onStaffSelected={(staff) => setCurrentStaff(staff)}
      />

      {/* ESC/POS Thermal Receipt & Kitchen Printer Settings */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />
    </main>
  );
}
