"use client";

import React, { useState } from "react";
import { X, Lock, AlertCircle } from "lucide-react";
import { Staff } from "@/types";
import { playSound } from "@/lib/sound";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onStaffSelected: (staff: Staff) => void;
  isLocked?: boolean;
}

const FALLBACK_STAFF: Staff[] = [
  {
    id: "admin-milindu",
    name: "Milindu",
    role: "ADMIN",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "barista-staff",
    name: "Barista",
    role: "BARISTA",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "cashier-staff",
    name: "Cashier",
    role: "CASHIER",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
];

export default function PinModal({
  isOpen,
  onClose,
  staffList,
  onStaffSelected,
  isLocked = false,
}: PinModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const displayStaff = staffList.length > 0 ? staffList : FALLBACK_STAFF;

  const handleKeyPress = (num: string) => {
    playSound("tap");
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    playSound("tap");
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    playSound("delete");
    setPin("");
    setError(null);
  };

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      });

      if (!res.ok) {
        playSound("alert");
        setError("Invalid security PIN. Try again.");
        setPin("");
        setIsVerifying(false);
        return;
      }

      const authenticatedStaff: Staff = await res.json();
      playSound("success");

      // Save persistent session in localStorage for Vercel deployment
      if (typeof window !== "undefined") {
        localStorage.setItem("lilly_pos_session_staff", JSON.stringify(authenticatedStaff));
      }

      onStaffSelected(authenticatedStaff);
      setPin("");
      onClose();
    } catch {
      // Local fallback verification if offline
      let localStaff: Staff | null = null;
      if (enteredPin === "1111") {
        localStaff = FALLBACK_STAFF[0];
      } else if (enteredPin === "3333") {
        localStaff = FALLBACK_STAFF[1];
      } else if (enteredPin === "4444") {
        localStaff = FALLBACK_STAFF[2];
      }

      if (localStaff) {
        playSound("success");
        if (typeof window !== "undefined") {
          localStorage.setItem("lilly_pos_session_staff", JSON.stringify(localStaff));
        }
        onStaffSelected(localStaff);
        setPin("");
        onClose();
      } else {
        setError("Verification failed.");
        playSound("alert");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close button only shown if NOT locked */}
        {!isLocked && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-2 rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-100">
            {isLocked ? "POS Terminal Locked" : "Staff Access & PIN"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isLocked
              ? "Enter your 4-digit security PIN to unlock station"
              : "Select your role and enter your security PIN"}
          </p>
        </div>

        {/* Staff Quick Select Cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {displayStaff.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                playSound("tap");
                setSelectedStaff(s);
              }}
              className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center ${
                selectedStaff?.id === s.id
                  ? "bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60"
              }`}
            >
              {s.avatar ? (
                <img
                  src={s.avatar}
                  alt={s.name}
                  className="w-10 h-10 rounded-xl object-cover mb-2 ring-1 ring-neutral-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-neutral-800 text-amber-400 font-bold flex items-center justify-center mb-2">
                  {s.name[0]}
                </div>
              )}
              <span className="text-xs font-semibold text-neutral-200 truncate w-full">
                {s.name}
              </span>
              <span className="text-[10px] text-neutral-500 uppercase font-mono">
                {s.role}
              </span>
            </button>
          ))}
        </div>

        {/* PIN Dots Display */}
        <div className="flex justify-center items-center space-x-4 mb-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > idx
                  ? "bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/40"
                  : "border-neutral-700 bg-neutral-900"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-center space-x-1.5 text-rose-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Numpad Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={isVerifying}
              className="h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-amber-500 active:text-neutral-950 font-bold text-lg text-neutral-200 border border-neutral-800 flex items-center justify-center transition shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800 font-medium text-xs text-neutral-400 border border-neutral-800 flex items-center justify-center transition"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            disabled={isVerifying}
            className="h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-amber-500 active:text-neutral-950 font-bold text-lg text-neutral-200 border border-neutral-800 flex items-center justify-center transition shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-neutral-900/60 hover:bg-neutral-800 font-medium text-xs text-neutral-400 border border-neutral-800 flex items-center justify-center transition"
          >
            Del
          </button>
        </div>

        {/* Fast dev test hint */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-neutral-500">
            PINs: <span className="text-amber-400 font-mono">1111</span> (Admin: Milindu),{" "}
            <span className="text-amber-400 font-mono">3333</span> (Barista),{" "}
            <span className="text-amber-400 font-mono">4444</span> (Cashier)
          </p>
        </div>
      </div>
    </div>
  );
}
