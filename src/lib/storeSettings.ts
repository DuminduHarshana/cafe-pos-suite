import { StoreSettings, ColorTheme } from "@/types";

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "Lilly's Restaurant and Cafe",
  tagline: "Specialty Roastery & Restaurant",
  address: "No. 33, Galle Road, Balapitiya",
  phone: "0777926230",
  logoUrl: "/logo.png",
  receiptHeaderNote: "",
  receiptFooterNote: "Thank you for dining with Lilly's! Please visit us again.",
  taxRatePercent: 2.5,
  serviceChargePercent: 10,
  colorTheme: "amber",
  showLogoOnReceipt: true,
  showTableOnReceipt: true,
  showStaffOnReceipt: true,
};

const STORAGE_KEY = "lilly_pos_store_settings";
const SETTINGS_EVENT = "lilly_pos_settings_changed";

export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") {
    return DEFAULT_STORE_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STORE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyColorTheme(settings.colorTheme);
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
  } catch (err) {
    console.error("Failed to save store settings:", err);
  }
}

export function applyColorTheme(theme: ColorTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
}

export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  const handler = (e: Event) => {
    const custom = e as CustomEvent<StoreSettings>;
    callback(custom.detail || getStoreSettings());
  };

  window.addEventListener(SETTINGS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

