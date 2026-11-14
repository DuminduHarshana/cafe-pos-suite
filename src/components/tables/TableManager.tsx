"use client";

import React, { useState } from "react";
import {
  LayoutGrid,
  Plus,
  Users,
  Coffee,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  QrCode as QrIcon,
} from "lucide-react";
import { Table } from "@/types";
import { playSound } from "@/lib/sound";
import { formatCurrency } from "@/lib/currency";
import TableQrModal from "./TableQrModal";

interface TableManagerProps {
  tables: Table[];
  onSelectTableForOrder: (table: Table) => void;
  onRefresh: () => void;
}

export default function TableManager({
  tables,
  onSelectTableForOrder,
  onRefresh,
}: TableManagerProps) {
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newSection, setNewSection] = useState("Indoor Lounge");
  const [newCapacity, setNewCapacity] = useState("4");

  const sections = ["ALL", ...Array.from(new Set(tables.map((t) => t.section)))];

  const filteredTables = tables.filter(
    (t) => selectedSection === "ALL" || t.section === selectedSection
  );

  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;

    playSound("tap");
    try {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: newNumber.trim(),
          name: newName.trim() || `Table ${newNumber.trim()}`,
          section: newSection,
          capacity: parseInt(newCapacity) || 2,
        }),
      });
      playSound("success");
      setIsAddTableOpen(false);
      setNewNumber("");
      setNewName("");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create table");
    }
  };

  const handleResetTable = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound("tap");
    try {
      await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tableId, status: "AVAILABLE" }),
      });
      playSound("success");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0c0c0f] overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-6 bg-[#121216] border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-neutral-100 flex items-center space-x-2">
            <span>Floor Plan &amp; Dine-In Tables</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
              {tables.length} Total
            </span>
          </h2>
        </div>

        {/* Section filter & Add button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  playSound("tap");
                  setSelectedSection(sec);
                }}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedSection === sec
                    ? "bg-amber-500 text-neutral-950 font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {sec === "ALL" ? "All Sections" : sec}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playSound("tap");
              setIsQrModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-neutral-300 hover:text-amber-400 font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
          >
            <QrIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Table QR Badges</span>
          </button>

          <button
            onClick={() => {
              playSound("tap");
              setIsAddTableOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const isOccupied = table.status === "OCCUPIED";
            const isBilled = table.status === "BILLED";
            const isAvailable = table.status === "AVAILABLE";
            const activeOrder = table.orders && table.orders[0];

            return (
              <div
                key={table.id}
                onClick={() => {
                  playSound("tap");
                  onSelectTableForOrder(table);
                }}
                className={`group p-5 rounded-3xl border text-left cursor-pointer transition-all duration-200 relative flex flex-col justify-between h-44 shadow-sm hover:shadow-xl hover:scale-[1.02] ${
                  isOccupied
                    ? "bg-[#1c1417] border-rose-500/40 hover:border-rose-500"
                    : isBilled
                    ? "bg-[#1c1913] border-amber-500/40 hover:border-amber-500"
                    : "bg-[#121614] border-emerald-500/30 hover:border-emerald-500"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xl font-black text-neutral-100">
                      {table.number}
                    </span>
                    <p className="text-xs text-neutral-400 font-medium mt-0.5">
                      {table.name}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isOccupied
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : isBilled
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                {/* Middle details */}
                <div className="space-y-1.5 my-2">
                  <div className="flex items-center space-x-1.5 text-neutral-400 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{table.capacity} Seats &bull; {table.section}</span>
                  </div>

                  {activeOrder && (
                    <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 text-[11px] font-mono flex items-center justify-between">
                      <span className="text-neutral-300">#{activeOrder.orderNumber}</span>
                      <span className="font-bold text-amber-400">
                        {formatCurrency(activeOrder.total)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                  <span className="text-[11px] text-neutral-400 group-hover:text-amber-400 transition font-semibold">
                    {isOccupied ? "Manage Order →" : "Open Table →"}
                  </span>

                  {(isOccupied || isBilled) && (
                    <button
                      onClick={(e) => handleResetTable(table.id, e)}
                      className="text-[10px] text-neutral-400 hover:text-rose-400 p-1 rounded-md hover:bg-neutral-800 transition"
                      title="Clear & Free Table"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Table Modal */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddTableOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-100 mb-1">Add Floor Table</h3>
            <p className="text-xs text-neutral-400 mb-5">
              Define table number, room section, and seating capacity
            </p>

            <form onSubmit={handleCreateNewTable} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Table Number / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T-09 or BAR-3"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Table Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patio Corner or Garden Booth"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Section
                  </label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Indoor Lounge">Indoor Lounge</option>
                    <option value="Terrace Garden">Terrace Garden</option>
                    <option value="VIP Room">VIP Room</option>
                    <option value="Bar Counter">Bar Counter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table QR Badges Modal */}
      {isQrModalOpen && (
        <TableQrModal
          tables={tables}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}
    </div>
  );
}
