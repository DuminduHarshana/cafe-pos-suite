"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Store,
  Receipt,
  Palette,
  Printer,
  Save,
  Upload,
  RotateCcw,
  Check,
  MapPin,
  Phone,
  FileText,
  Percent,
  Sliders,
  DollarSign,
  Eye,
  Sparkles,
} from "lucide-react";
import { StoreSettings, ColorTheme } from "@/types";
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  saveStoreSettings,
  applyColorTheme,
} from "@/lib/storeSettings";
import {
  PrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
} from "@/lib/escpos";
import {
  getStoredPrinterSettings,
  saveStoredPrinterSettings,
  printTestPage,
  openCashDrawer,
} from "@/lib/printer";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";

const THEME_OPTIONS: { id: ColorTheme; name: string; hex: string; desc: string }[] = [
  { id: "amber", name: "Amber & Gold", hex: "#f59e0b", desc: "Warm cafe roast & bakery gold (Default)" },
  { id: "emerald", name: "Emerald & Mint", hex: "#10b981", desc: "Botanical matcha & fresh garden" },
  { id: "blue", name: "Sapphire & Ocean", hex: "#3b82f6", desc: "Modern coastal & crisp navy" },
  { id: "rose", name: "Rose & Ruby", hex: "#f43f5e", desc: "Berry blossom & luxury bistro" },
  { id: "purple", name: "Violet & Lavender", hex: "#8b5cf6", desc: "Artisanal espresso & royal purple" },
  { id: "orange", name: "Sunset Orange", hex: "#f97316", desc: "Vibrant citrus & energetic lounge" },
  { id: "cyan", name: "Island Cyan", hex: "#06b6d4", desc: "Tropical lagoon & beachside cafe" },
  { id: "neutral", name: "Titanium Slate", hex: "#a1a1aa", desc: "Minimalist industrial monochrome" },
];

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState<"store" | "receipt" | "theme" | "printer">("store");
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = getStoreSettings();
    setSettings(current);
    setPrinterSettings(getStoredPrinterSettings());
    applyColorTheme(current.colorTheme);
  }, []);

  const handleChange = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setIsSaved(false);

    // If theme changed, apply immediately so user sees live preview
    if (field === "colorTheme") {
      applyColorTheme(value as ColorTheme);
    }
  };

  const handleSaveAll = () => {
    playSound("success");
    saveStoreSettings(settings);
    saveStoredPrinterSettings(printerSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset store branding, receipt, and theme settings to original defaults?")) {
      playSound("alert");
      setSettings(DEFAULT_STORE_SETTINGS);
      saveStoreSettings(DEFAULT_STORE_SETTINGS);
      applyColorTheme(DEFAULT_STORE_SETTINGS.colorTheme);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playSound("tap");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleChange("logoUrl", dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestPrint = async () => {
    setIsTestingPrinter(true);
    setPrinterStatus(null);
    playSound("tap");
    try {
      saveStoredPrinterSettings(printerSettings);
      const res = await printTestPage();
      setPrinterStatus(res.message);
      playSound("chime");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Print test failed";
      setPrinterStatus(`Error: ${msg}`);
      playSound("alert");
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handleTestDrawer = async () => {
    playSound("tap");
    try {
      await openCashDrawer();
      playSound("chime");
    } catch {
      playSound("alert");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#09090b] overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
              <span>Store Configuration &amp; Customization</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Live Sync
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs flex items-center space-x-1.5 transition"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleSaveAll}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95 ${
              isSaved
                ? "bg-emerald-500 text-neutral-950"
                : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
            }`}
          >
            {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? "Saved Successfully!" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tab selection & Form controls */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-4xl">
          {/* Sub Navigation Pills */}
          <div className="flex items-center space-x-2 bg-[#121215] p-1.5 rounded-2xl border border-neutral-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                playSound("tap");
                setActiveTab("store");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "store"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Store Profile &amp; Address</span>
            </button>

            <button
              onClick={() => {
                playSound("tap");
                setActiveTab("receipt");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "receipt"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipt &amp; Tax Settings</span>
            </button>

            <button
              onClick={() => {
                playSound("tap");
                setActiveTab("theme");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "theme"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color Theme &amp; UI</span>
            </button>

            <button
              onClick={() => {
                playSound("tap");
                setActiveTab("printer");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "printer"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Hardware &amp; Printers</span>
            </button>
          </div>

          {/* TAB 1: Store Profile & Address */}
          {activeTab === "store" && (
            <div className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>Store Identity &amp; Contact Details</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  These details appear on the POS headers, thermal receipts, customer receipts, and system reports.
                </p>
              </div>

              {/* Logo Section */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-neutral-950 border border-neutral-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Store Logo"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <Store className="w-8 h-8 text-neutral-500" />
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Store Logo (Receipts &amp; Navigation)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={settings.logoUrl}
                      onChange={(e) => handleChange("logoUrl", e.target.value)}
                      placeholder="/logo.png or image URL"
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Supports JPG, PNG, WebP, SVG, or data URLs. Used on thermal chits and navbar.
                  </p>
                </div>
              </div>

              {/* Store Name & Tagline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Store / Cafe Name *
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => handleChange("storeName", e.target.value)}
                    placeholder="e.g. Lilly's Restaurant and Cafe"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    placeholder="e.g. Specialty Roastery & Restaurant"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Address & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Physical Address *</span>
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="e.g. No. 33, Galle Road, Balapitiya"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="e.g. 0777926230"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Receipt & Tax Settings */}
          {activeTab === "receipt" && (
            <div className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Thermal Receipt Layout &amp; Taxes</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure tax calculations, thank-you notes, and receipt elements.
                </p>
              </div>

              {/* Tax & Service Charge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tax Rate (SSCL / VAT) %</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.taxRatePercent}
                    onChange={(e) => handleChange("taxRatePercent", parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Typically 2.5% SSCL or standard VAT rate.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dine-In Service Charge %</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.serviceChargePercent}
                    onChange={(e) =>
                      handleChange("serviceChargePercent", parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Standard Sri Lankan hospitality service charge (usually 10%).
                  </p>
                </div>
              </div>

              {/* Receipt Footer Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Receipt Footer Note / Greeting</span>
                </label>
                <textarea
                  rows={2}
                  value={settings.receiptFooterNote}
                  onChange={(e) => handleChange("receiptFooterNote", e.target.value)}
                  placeholder="Thank you for dining with Lilly's! Please visit us again."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLogoOnReceipt}
                    onChange={(e) => handleChange("showLogoOnReceipt", e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-neutral-200">Print Store Logo on receipt header</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTableOnReceipt}
                    onChange={(e) => handleChange("showTableOnReceipt", e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-neutral-200">Show Dine-In Table number and section</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showStaffOnReceipt}
                    onChange={(e) => handleChange("showStaffOnReceipt", e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-neutral-200">Show Server / Cashier staff name</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Color Theme & UI */}
          {activeTab === "theme" && (
            <div className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>UI Color Theme &amp; Accent Palette</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select your brand accent color. All buttons, tabs, glows, and badges update across the entire POS instantly.
                </p>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = settings.colorTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        playSound("tap");
                        handleChange("colorTheme", theme.id);
                      }}
                      className={`p-4 rounded-2xl border text-left transition flex items-center justify-between group ${
                        isSelected
                          ? "bg-neutral-800/90 border-amber-500/80 ring-2 ring-amber-500/30"
                          : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40"
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition group-hover:scale-105 shrink-0"
                          style={{ backgroundColor: theme.hex }}
                        >
                          {isSelected && <Check className="w-5 h-5 text-neutral-950 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-neutral-100 block">
                            {theme.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">{theme.desc}</span>
                        </div>
                      </div>

                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: theme.hex }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Theme Live Preview Box */}
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
                <span className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
                  Live UI Component Preview
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20">
                    Primary Button
                  </button>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                    Status Pill
                  </span>
                  <div className="p-2 rounded-xl bg-neutral-900 border border-amber-500/40 text-amber-400 text-xs font-mono">
                    Rs. 1,450.00
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Hardware & Printers */}
          {activeTab === "printer" && (
            <div className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center space-x-2">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Thermal Printer &amp; Cash Drawer</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure thermal ESC/POS receipt printers (USB, Network TCP, Bluetooth, or System Dialog).
                </p>
              </div>

              {/* Paper Width */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Receipt Paper Width</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("tap");
                      setPrinterSettings({ ...printerSettings, paperWidth: "80mm" });
                    }}
                    className={`p-3 rounded-xl border text-center transition ${
                      printerSettings.paperWidth === "80mm"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-xs">80mm Standard</span>
                    <span className="text-[10px] opacity-75">~48 characters / line</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound("tap");
                      setPrinterSettings({ ...printerSettings, paperWidth: "58mm" });
                    }}
                    className={`p-3 rounded-xl border text-center transition ${
                      printerSettings.paperWidth === "58mm"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-xs">58mm Compact</span>
                    <span className="text-[10px] opacity-75">~32 characters / line</span>
                  </button>
                </div>
              </div>

              {/* Printer Connection Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Connection Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["system", "network", "usb", "bluetooth"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        playSound("tap");
                        setPrinterSettings({ ...printerSettings, type: mode });
                      }}
                      className={`p-2.5 rounded-xl border text-center capitalize transition text-xs font-semibold ${
                        printerSettings.type === mode
                          ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {mode === "system" ? "System / Browser" : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network IP & Port */}
              {printerSettings.type === "network" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-neutral-400">Printer IP Address</label>
                    <input
                      type="text"
                      value={printerSettings.ipAddress}
                      onChange={(e) =>
                        setPrinterSettings({ ...printerSettings, ipAddress: e.target.value })
                      }
                      placeholder="192.168.1.100"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Port (Default 9100)</label>
                    <input
                      type="number"
                      value={printerSettings.port}
                      onChange={(e) =>
                        setPrinterSettings({
                          ...printerSettings,
                          port: parseInt(e.target.value) || 9100,
                        })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.autoPrintReceipt}
                    onChange={(e) =>
                      setPrinterSettings({ ...printerSettings, autoPrintReceipt: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-neutral-200">
                    Auto-print receipt upon successful checkout
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.openCashDrawer}
                    onChange={(e) =>
                      setPrinterSettings({ ...printerSettings, openCashDrawer: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-neutral-200">
                    Auto-kick cash drawer on Cash payments (ESC p pulse)
                  </span>
                </label>
              </div>

              {/* Test Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTestingPrinter}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center space-x-2 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isTestingPrinter ? "Printing Test..." : "Print Test Page"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDrawer}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center space-x-2 transition"
                >
                  <span>Kick Cash Drawer</span>
                </button>
              </div>

              {printerStatus && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  {printerStatus}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Interactive Thermal Receipt Preview */}
        <div className="hidden lg:flex flex-col w-96 p-6 border-l border-neutral-800/80 bg-[#0d0d10] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Receipt Preview</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {printerSettings.paperWidth}
            </span>
          </div>

          {/* Thermal Receipt Paper Card */}
          <div className="bg-neutral-100 text-neutral-900 font-mono text-[11px] p-5 rounded-2xl shadow-xl border border-neutral-300 space-y-3 select-none">
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-neutral-300">
              {settings.showLogoOnReceipt && settings.logoUrl && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-14 h-14 rounded-full object-cover border border-neutral-300 shadow-sm"
                  />
                </div>
              )}
              <h4 className="font-extrabold text-xs tracking-wider uppercase">
                {settings.storeName || "LILLY'S RESTAURANT & CAFE"}
              </h4>
              {settings.tagline && (
                <p className="text-[9px] text-neutral-600">{settings.tagline}</p>
              )}
              <p className="text-[9px] text-neutral-600">
                {settings.address || "No. 33, Galle Road, Balapitiya"}
              </p>
              <p className="text-[9px] text-neutral-600">
                Tel: {settings.phone || "0777926230"}
              </p>
              <p className="text-[10px] font-bold text-neutral-700 mt-1">ORDER #1042</p>
            </div>

            {/* Meta */}
            <div className="text-[9px] text-neutral-600 space-y-0.5 pb-2 border-b border-dashed border-neutral-300">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()} 12:45 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Order Type:</span>
                <span className="font-bold">DINE IN</span>
              </div>
              {settings.showTableOnReceipt && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>T3 (Table 3)</span>
                </div>
              )}
              {settings.showStaffOnReceipt && (
                <div className="flex justify-between">
                  <span>Server:</span>
                  <span>Milindu</span>
                </div>
              )}
            </div>

            {/* Sample items */}
            <div className="space-y-1.5 pb-2 border-b border-neutral-300">
              <div className="flex justify-between">
                <span>1x Artisanal Flat White</span>
                <span className="font-bold">Rs. 950.00</span>
              </div>
              <div className="flex justify-between text-[9px] text-neutral-500 pl-2">
                <span>+ Oat Milk (+Rs. 150)</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>1x Smashed Avocado Toast</span>
                <span className="font-bold">Rs. 1,850.00</span>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[10px] pt-1">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span>Rs. 2,950.00</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Tax (SSCL {settings.taxRatePercent}%):</span>
                <span>{formatCurrency(2950 * (settings.taxRatePercent / 100))}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Service Charge ({settings.serviceChargePercent}%):</span>
                <span>{formatCurrency(2950 * (settings.serviceChargePercent / 100))}</span>
              </div>
              <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-dashed border-neutral-300">
                <span>TOTAL:</span>
                <span>
                  {formatCurrency(
                    2950 +
                      2950 * (settings.taxRatePercent / 100) +
                      2950 * (settings.serviceChargePercent / 100)
                  )}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-neutral-300 space-y-1 text-[9px] text-neutral-600">
              <p className="font-medium">
                {settings.receiptFooterNote || "Thank you for dining with us! Come again."}
              </p>
              <p className="text-[8px] text-neutral-500 font-mono">Powered by Lilly&apos;s Pro POS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
