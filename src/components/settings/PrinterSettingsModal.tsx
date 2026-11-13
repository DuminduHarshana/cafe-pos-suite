"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  X,
  Wifi,
  Usb,
  Bluetooth,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Banknote,
  FileText,
  Loader2,
} from "lucide-react";
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

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrinterSettingsModal({
  isOpen,
  onClose,
}: PrinterSettingsModalProps) {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredPrinterSettings());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    playSound("success");
    saveStoredPrinterSettings(settings);
    onClose();
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestResult(null);
    playSound("tap");
    try {
      const res = await printTestPage(settings);
      setTestResult({ success: true, message: res.message || "Test print sent successfully!" });
      playSound("chime");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Printer connection failed";
      setTestResult({ success: false, message: msg });
      playSound("alert");
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenDrawer = async () => {
    playSound("tap");
    try {
      await openCashDrawer(settings);
      setTestResult({ success: true, message: "Cash drawer kick pulse sent!" });
      playSound("chime");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Drawer trigger failed";
      setTestResult({ success: false, message: msg });
      playSound("alert");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-100">Thermal Receipt Printer</h3>
              <p className="text-xs text-neutral-400">ESC/POS hardware &amp; kitchen ticket routing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 overflow-y-auto space-y-5 flex-1">
          {/* Connection Interface Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-2">
              Printer Connection Interface
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "network" as const, label: "Network LAN", icon: Wifi, desc: "Epson/Star TCP:9100" },
                { id: "usb" as const, label: "WebUSB", icon: Usb, desc: "Direct USB Cable" },
                { id: "bluetooth" as const, label: "Bluetooth", icon: Bluetooth, desc: "Wireless BLE" },
                { id: "system" as const, label: "System Dialog", icon: FileText, desc: "Browser Thermal" },
              ].map((conn) => {
                const Icon = conn.icon;
                const isSelected = settings.type === conn.id;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => {
                      playSound("tap");
                      setSettings((s) => ({ ...s, type: conn.id }));
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-2" />
                    <div>
                      <span className="text-xs block">{conn.label}</span>
                      <span className="text-[9px] text-neutral-500 block">{conn.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network IP & Port (If Network) */}
          {settings.type === "network" && (
            <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 space-y-3">
              <span className="text-xs font-semibold text-neutral-300 block">
                Network Thermal Printer Address (Raw TCP)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={settings.ipAddress}
                    onChange={(e) => setSettings({ ...settings, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={settings.port}
                    onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 9100 })}
                    placeholder="9100"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500">
                Standard ESC/POS thermal printers (Epson, Star, Munbyn, Bixolon, Sunmi) listen on raw port 9100.
              </p>
            </div>
          )}

          {/* Paper Width Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-2">
              Thermal Paper Width
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "80mm" as const, label: "80mm Standard (48 columns)", desc: "Standard countertop thermal rolls" },
                { id: "58mm" as const, label: "58mm Compact (32 columns)", desc: "Portable belt & handheld printers" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playSound("tap");
                    setSettings((s) => ({ ...s, paperWidth: p.id }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    settings.paperWidth === p.id
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span className="text-xs font-bold block">{p.label}</span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
              POS Printing Automation
            </span>

            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <span>Auto-print Customer Receipt upon payment</span>
              <input
                type="checkbox"
                checked={settings.autoPrintReceipt}
                onChange={(e) => setSettings({ ...settings, autoPrintReceipt: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <span>Auto-print Kitchen Ticket when order fired</span>
              <input
                type="checkbox"
                checked={settings.autoPrintKitchenChit}
                onChange={(e) => setSettings({ ...settings, autoPrintKitchenChit: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <span>Kick open Cash Drawer on Cash payments</span>
              <input
                type="checkbox"
                checked={settings.openCashDrawer}
                onChange={(e) => setSettings({ ...settings, openCashDrawer: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-800 border-neutral-700"
              />
            </label>
          </div>

          {/* Test Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isTesting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center space-x-2 transition border border-neutral-700 active:scale-95"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Test Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={handleOpenDrawer}
              className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-neutral-700 active:scale-95"
            >
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>Kick Drawer</span>
            </button>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800 flex justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

