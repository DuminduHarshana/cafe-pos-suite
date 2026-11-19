import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  saveStoreSettings,
  applyColorTheme,
  subscribeStoreSettings,
} from "../../src/lib/storeSettings";
import { StoreSettings } from "../../src/types";

// Setup browser mocks for Node environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};

const mockEventTarget = new EventTarget();
const mockRootElement = {
  attributes: {} as Record<string, string>,
  setAttribute: (name: string, value: string) => {
    mockRootElement.attributes[name] = value;
  },
  getAttribute: (name: string) => mockRootElement.attributes[name] || null,
};

(globalThis as any).window = {
  localStorage: mockLocalStorage,
  addEventListener: (type: string, listener: any) => mockEventTarget.addEventListener(type, listener),
  removeEventListener: (type: string, listener: any) => mockEventTarget.removeEventListener(type, listener),
  dispatchEvent: (event: Event) => mockEventTarget.dispatchEvent(event),
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).document = {
  documentElement: mockRootElement,
};
(globalThis as any).CustomEvent = class CustomEvent extends Event {
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    super(type);
    this.detail = init?.detail;
  }
};

describe("Store Settings Default Configuration & Behavior", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockRootElement.attributes = {};
  });

  it("should have correct store branding defaults", () => {
    assert.equal(DEFAULT_STORE_SETTINGS.storeName, "Lilly's Restaurant and Cafe");
    assert.equal(DEFAULT_STORE_SETTINGS.address, "No. 33, Galle Road, Balapitiya");
    assert.equal(DEFAULT_STORE_SETTINGS.phone, "0777926230");
    assert.equal(DEFAULT_STORE_SETTINGS.logoUrl, "/logo.png");
  });

  it("should have valid theme and tax defaults", () => {
    assert.equal(DEFAULT_STORE_SETTINGS.colorTheme, "amber");
    assert.equal(DEFAULT_STORE_SETTINGS.showLogoOnReceipt, true);
    assert.equal(DEFAULT_STORE_SETTINGS.taxRatePercent, 2.5);
    assert.equal(DEFAULT_STORE_SETTINGS.serviceChargePercent, 10);
    assert.equal(DEFAULT_STORE_SETTINGS.kotHeaderTitle, "KITCHEN ORDER TICKET (KOT)");
    assert.equal(DEFAULT_STORE_SETTINGS.showCustomerOnKot, true);
  });

  it("should retrieve stored settings merged with defaults", () => {
    const customSettings: Partial<StoreSettings> = {
      storeName: "Lilly's Beach Club",
      serviceChargePercent: 12.5,
      colorTheme: "emerald",
    };
    mockLocalStorage.setItem("lilly_pos_store_settings", JSON.stringify(customSettings));

    const retrieved = getStoreSettings();
    assert.equal(retrieved.storeName, "Lilly's Beach Club");
    assert.equal(retrieved.serviceChargePercent, 12.5);
    assert.equal(retrieved.colorTheme, "emerald");
    // Fallbacks to default
    assert.equal(retrieved.phone, "0777926230");
    assert.equal(retrieved.address, "No. 33, Galle Road, Balapitiya");
  });

  it("should handle invalid JSON in localStorage gracefully without throwing", () => {
    mockLocalStorage.setItem("lilly_pos_store_settings", "{ broken json corrupted... }");
    const retrieved = getStoreSettings();
    assert.equal(retrieved.storeName, DEFAULT_STORE_SETTINGS.storeName);
    assert.equal(retrieved.phone, DEFAULT_STORE_SETTINGS.phone);
  });

  it("saveStoreSettings should persist to localStorage, apply theme, and dispatch event", () => {
    let eventReceived: StoreSettings | null = null;
    const unsubscribe = subscribeStoreSettings((settings) => {
      eventReceived = settings;
    });

    const updatedSettings: StoreSettings = {
      ...DEFAULT_STORE_SETTINGS,
      storeName: "Lilly's Seaside Roastery",
      colorTheme: "rose",
      serviceChargePercent: 15,
    };

    saveStoreSettings(updatedSettings);

    // Verify localStorage
    const storedRaw = mockLocalStorage.getItem("lilly_pos_store_settings");
    assert.ok(storedRaw);
    const stored = JSON.parse(storedRaw);
    assert.equal(stored.storeName, "Lilly's Seaside Roastery");
    assert.equal(stored.serviceChargePercent, 15);

    // Verify document theme applied
    assert.equal(mockRootElement.getAttribute("data-theme"), "rose");

    // Verify listener got event
    assert.ok(eventReceived);
    assert.equal((eventReceived as StoreSettings).storeName, "Lilly's Seaside Roastery");

    unsubscribe();
  });

  it("applyColorTheme should set data-theme attribute on root element", () => {
    applyColorTheme("purple");
    assert.equal(mockRootElement.getAttribute("data-theme"), "purple");

    applyColorTheme("cyan");
    assert.equal(mockRootElement.getAttribute("data-theme"), "cyan");
  });

  it("subscribeStoreSettings unsubscribe function stops future notifications", () => {
    let callCount = 0;
    const unsubscribe = subscribeStoreSettings(() => {
      callCount++;
    });

    saveStoreSettings({ ...DEFAULT_STORE_SETTINGS, colorTheme: "blue" });
    assert.equal(callCount, 1);

    unsubscribe();

    saveStoreSettings({ ...DEFAULT_STORE_SETTINGS, colorTheme: "orange" });
    assert.equal(callCount, 1, "Listener should not be called after unsubscribe");
  });
});
