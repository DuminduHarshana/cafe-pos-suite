"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  QrCode as QrIcon,
  X,
  Printer,
  Coffee,
  Wifi,
  ExternalLink,
  Layers,
} from "lucide-react";
import { Table, StoreSettings } from "@/types";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "@/lib/storeSettings";
import { playSound } from "@/lib/sound";

interface TableQrModalProps {
  tables: Table[];
  onClose: () => void;
}

export default function TableQrModal({ tables, onClose }: TableQrModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>(
    tables[0]?.id || ""
  );
  const [mode, setMode] = useState<"single" | "all">("single");
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setStore(getStoreSettings());
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Generate QR codes for all tables
  useEffect(() => {
    if (!origin) return;

    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const table of tables) {
        const url = `${origin}/menu?table=${encodeURIComponent(table.number)}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: {
              dark: "#09090b",
              light: "#ffffff",
            },
          });
          map[table.id] = dataUrl;
        } catch (err) {
          console.error("Failed to generate QR for table", table.number, err);
        }
      }
      setQrMap(map);
    };

    generateAll();
  }, [tables, origin]);

  const activeTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  const handlePrint = () => {
    playSound("tap");
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Container */}
      <div className="w-full max-w-3xl bg-[#121217] rounded-3xl border border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp">
        {/* Header Bar */}
        <div className="p-4 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-100">
                Table QR Digital Menu Badges
              </h3>
              <p className="text-xs text-neutral-400">
                Print contactless acrylic table tent badges for your dining tables
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound("tap");
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 px-6 border-b border-neutral-800/80 bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                playSound("tap");
                setMode("single");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                mode === "single"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200"
              }`}
            >
              Single Table
            </button>
            <button
              onClick={() => {
                playSound("tap");
                setMode("all");
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                mode === "all"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Tables Sheet ({tables.length})</span>
            </button>
          </div>

          {mode === "single" && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-neutral-400 font-medium">
                Select Table:
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 font-semibold focus:outline-none focus:border-amber-500"
              >
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.number} — {tbl.name} ({tbl.section})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {activeTable && (
              <a
                href={`${origin}/menu?table=${encodeURIComponent(activeTable.number)}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 text-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Link</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{mode === "single" ? "Print Table Badge" : "Print All Badges"}</span>
            </button>
          </div>
        </div>

        {/* Badge Preview Canvas (Printable Target Area) */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/70 flex justify-center">
          {mode === "single" && activeTable ? (
            /* Single Table Badge (Acrylic Stand size 4" x 6") */
            <div
              id="table-qr-print-area"
              className="w-72 bg-white text-neutral-900 rounded-3xl p-6 shadow-2xl border-4 border-amber-500/80 flex flex-col items-center text-center space-y-4 my-auto"
            >
              {/* Logo & Header */}
              <div className="space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-1 flex items-center justify-center mx-auto overflow-hidden">
                  {store.logoUrl ? (
                    <Image
                      src={store.logoUrl}
                      alt="Logo"
                      width={44}
                      height={44}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Coffee className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <h4 className="font-extrabold text-base tracking-tight text-neutral-950">
                  {store.storeName}
                </h4>
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                  {store.address}
                </p>
              </div>

              {/* Table Pill */}
              <div className="px-4 py-1 rounded-full bg-neutral-900 text-white font-mono font-black text-sm tracking-wider shadow-sm">
                TABLE {activeTable.number}
              </div>

              {/* QR Image */}
              <div className="w-44 h-44 bg-white p-2 rounded-2xl border-2 border-neutral-200 shadow-inner flex items-center justify-center">
                {qrMap[activeTable.id] ? (
                  <Image
                    src={qrMap[activeTable.id]}
                    alt={`Table ${activeTable.number} QR`}
                    width={160}
                    height={160}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Call to action */}
              <div className="space-y-1">
                <span className="font-black text-xs text-neutral-950 uppercase tracking-wide block">
                  Scan to View Digital Menu
                </span>
                <p className="text-[10px] text-neutral-600">
                  Point camera to browse dishes, teas &amp; prices
                </p>
              </div>

              {/* Wi-Fi footer */}
              <div className="pt-2 border-t border-neutral-200 w-full text-[10px] text-neutral-600 flex items-center justify-center space-x-1.5">
                <Wifi className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Wi-Fi: <strong>Lillys_Guest</strong> • Pass: <strong>Coffee33</strong></span>
              </div>
            </div>
          ) : (
            /* Multi-table Grid (All Tables Sheet) */
            <div
              id="table-qr-print-area"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl"
            >
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="bg-white text-neutral-900 rounded-3xl p-5 shadow-lg border-2 border-amber-500/80 flex flex-col items-center text-center space-y-3"
                >
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-xs text-neutral-900">
                      {store.storeName}
                    </h5>
                    <span className="text-[10px] text-neutral-500 block">
                      {table.section}
                    </span>
                  </div>

                  <div className="px-3 py-0.5 rounded-full bg-neutral-900 text-white font-mono font-black text-xs">
                    TABLE {table.number}
                  </div>

                  <div className="w-36 h-36 bg-white p-1 rounded-xl border border-neutral-200 flex items-center justify-center">
                    {qrMap[table.id] ? (
                      <Image
                        src={qrMap[table.id]}
                        alt={`Table ${table.number} QR`}
                        width={136}
                        height={136}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  <div className="text-[10px] space-y-0.5">
                    <strong className="block text-neutral-950 uppercase tracking-wide">
                      Scan for Digital Menu
                    </strong>
                    <span className="text-neutral-500 text-[9px]">
                      Wi-Fi: Lillys_Guest / Coffee33
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Stylesheet injection for clean badge printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #table-qr-print-area,
          #table-qr-print-area * {
            visibility: visible !important;
          }
          #table-qr-print-area {
            position: absolute !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            box-shadow: none !important;
            border: 2px solid #d97706 !important;
          }
        }
      `}</style>
    </div>
  );
}
