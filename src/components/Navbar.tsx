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
  Wifi,
  Sparkles,
  Printer,
} from "lucide-react";
import { Staff } from "@/types";
import { playSound } from "@/lib/sound";

interface NavbarProps {
  activeTab: "pos" | "kds" | "tables" | "inventory" | "menu" | "analytics";
  setActiveTab: (tab: "pos" | "kds" | "tables" | "inventory" | "menu" | "analytics") => void;
  currentStaff: Staff;
  onOpenPinModal: () => void;
  activeOrdersCount: number;
  onOpenPrinterModal: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentStaff,
  onOpenPinModal,
  activeOrdersCount,
  onOpenPrinterModal,
}: NavbarProps) {
  const [time, setTime] = useState<string>("");

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
    { id: "pos" as const, label: "POS Station", icon: Coffee },
    {
      id: "kds" as const,
      label: "Kitchen KDS",
      icon: ChefHat,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    { id: "tables" as const, label: "Floor & Tables", icon: LayoutGrid },
    { id: "inventory" as const, label: "Inventory", icon: Boxes },
    { id: "menu" as const, label: "Menu & Prices", icon: FileSpreadsheet },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="h-16 bg-[#121215] border-b border-neutral-800/80 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand logo & Cafe name */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-bold">
          <Sparkles className="w-5 h-5 text-neutral-950" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-wide bg-gradient-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              LILLY&apos;S RESTAURANT &amp; CAFE
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              PRO POS
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 hidden sm:block">
            Connected &bull; Local Station #1
          </p>
        </div>
      </div>

      {/* Center Station Switcher Buttons */}
      <nav className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-2xl border border-neutral-800 max-w-full overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                playSound("tap");
                setActiveTab(item.id);
              }}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-neutral-950" : "text-neutral-400"}`} />
              <span className="hidden md:inline">{item.label}</span>
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
      <div className="flex items-center space-x-3">
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
          <Lock className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 ml-1" />
        </button>
      </div>
    </header>
  );
}
