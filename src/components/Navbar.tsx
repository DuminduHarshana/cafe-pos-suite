"use client";

import React, { useState, useEffect } from "react";
import {
  Coffee,
  ChefHat,
  LayoutGrid,
  Boxes,
  FileSpreadsheet,
  BarChart3,
  Lock,
  LogOut,
  Wifi,
  Printer,
  Shield,
  Sliders,
} from "lucide-react";
import { Staff, StoreSettings } from "@/types";
import { playSound } from "@/lib/sound";
import { DEFAULT_STORE_SETTINGS, getStoreSettings, subscribeStoreSettings } from "@/lib/storeSettings";

interface NavbarProps {
  activeTab: "pos" | "kds" | "tables" | "inventory" | "menu" | "analytics" | "settings";
  setActiveTab: (tab: "pos" | "kds" | "tables" | "inventory" | "menu" | "analytics" | "settings") => void;
  currentStaff: Staff;
  onOpenPinModal: () => void;
  onLockStation?: () => void;
  activeOrdersCount: number;
  onOpenPrinterModal: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentStaff,
  onOpenPinModal,
  onLockStation,
  activeOrdersCount,
  onOpenPrinterModal,
}: NavbarProps) {
  const [time, setTime] = useState<string>("");
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  useEffect(() => {
    setStore(getStoreSettings());
    const unsub = subscribeStoreSettings((s) => setStore(s));
    return unsub;
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: "pos" as const, label: "POS Station", icon: Coffee, adminOnly: false },
    {
      id: "kds" as const,
      label: "Kitchen KDS",
      icon: ChefHat,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      adminOnly: false,
    },
    { id: "tables" as const, label: "Floor & Tables", icon: LayoutGrid, adminOnly: false },
    { id: "inventory" as const, label: "Inventory", icon: Boxes, adminOnly: true },
    { id: "menu" as const, label: "Menu & Prices", icon: FileSpreadsheet, adminOnly: true },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3, adminOnly: true },
    { id: "settings" as const, label: "Settings", icon: Sliders, adminOnly: true },
  ];

  const handleTabClick = (item: typeof navItems[number]) => {
    playSound("tap");
    if (item.adminOnly && currentStaff.role !== "ADMIN") {
      // Prompt for Admin PIN
      onOpenPinModal();
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <header className="h-16 bg-[#121215] border-b border-neutral-800/80 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand logo & Cafe name */}
      <div className="flex items-center space-x-3">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.storeName}
            className="w-10 h-10 rounded-full object-cover border border-amber-500/40 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/20"
          />
        ) : null}
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-wide bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent uppercase">
              {store.storeName || "LILLY'S RESTAURANT & CAFE"}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              PRO POS
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 hidden sm:block truncate max-w-[280px]">
            {store.address} &bull; {store.phone}
          </p>
        </div>
      </div>

      {/* Center Station Switcher Buttons */}
      <nav className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-2xl border border-neutral-800 max-w-full overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLockedForRole = item.adminOnly && currentStaff.role !== "ADMIN";

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item)}
              title={isLockedForRole ? "Requires Admin Access" : undefined}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20"
                  : isLockedForRole
                  ? "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40 opacity-75"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-neutral-950" : isLockedForRole ? "text-neutral-500" : "text-neutral-400"}`} />
              <span className="hidden md:inline">{item.label}</span>
              {isLockedForRole && (
                <Shield className="w-3 h-3 text-neutral-500 hidden sm:inline" />
              )}
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-neutral-950 text-amber-400"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right side: Clock, Network, and Staff Switcher */}
      <div className="flex items-center space-x-2.5">
        {/* Real-time Clock */}
        <div className="hidden lg:flex flex-col text-right">
          <span className="font-mono text-xs font-semibold text-neutral-200">{time}</span>
          <span className="text-[10px] text-neutral-500">Live Sync</span>
        </div>

        {/* Network status */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <Wifi className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Online</span>
        </div>

        {/* Receipt Printer Settings Trigger */}
        <button
          onClick={() => {
            playSound("tap");
            onOpenPrinterModal();
          }}
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition"
          title="Thermal Printer Settings"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Staff Switcher Pill */}
        <button
          onClick={() => {
            playSound("tap");
            onOpenPinModal();
          }}
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition text-left group"
          title="Switch Staff / Enter PIN"
        >
          {currentStaff.avatar ? (
            <img
              src={currentStaff.avatar}
              alt={currentStaff.name}
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-amber-500/40"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-neutral-800 text-amber-400 flex items-center justify-center font-bold text-xs">
              {currentStaff.name[0]}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-neutral-200 leading-tight group-hover:text-amber-400 transition">
              {currentStaff.name}
            </p>
            <span className="text-[10px] font-mono text-neutral-400 capitalize">
              {currentStaff.role.toLowerCase()}
            </span>
          </div>
          <Lock className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 ml-0.5" />
        </button>

        {/* Explicit Sign Out / Lock Station Button */}
        {onLockStation && (
          <button
            onClick={() => {
              playSound("tap");
              onLockStation();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 font-semibold text-xs transition active:scale-95 shadow-sm"
            title="Sign Out & Lock Terminal"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline font-bold">Log Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
