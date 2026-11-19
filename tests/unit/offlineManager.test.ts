import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  enqueueOfflineOrder,
  getOfflineOrders,
  removeOfflineOrder,
  clearOfflineOrders,
  getPendingOfflineCount,
  setCachedMenu,
  getCachedMenu,
  setCachedTables,
  getCachedTables,
  setCachedStaff,
  getCachedStaff,
  isDeviceOnline,
  syncOfflineOrders,
  subscribeNetworkState,
} from "../../src/lib/offlineManager";
import { Order, Table, Staff } from "../../src/types";

// Mock window and localStorage for Node test runner environment
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
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0,
};

const mockEventTarget = new EventTarget();

(globalThis as any).window = {
  localStorage: mockLocalStorage,
  addEventListener: (type: string, listener: any) => mockEventTarget.addEventListener(type, listener),
  removeEventListener: (type: string, listener: any) => mockEventTarget.removeEventListener(type, listener),
  dispatchEvent: (event: Event) => mockEventTarget.dispatchEvent(event),
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).navigator = { onLine: true };
(globalThis as any).CustomEvent = class CustomEvent extends Event {
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    super(type);
    this.detail = init?.detail;
  }
};

describe("Offline Manager & Local Storage Queue", () => {
  beforeEach(() => {
    clearOfflineOrders();
    (globalThis as any).navigator.onLine = true;
  });

  it("should queue offline orders and retrieve them", () => {
    const testOrder: Order = {
      id: "offline-101",
      orderNumber: "OFF-1001",
      type: "DINE_IN",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 1000,
      discount: 0,
      tax: 25,
      tip: 100,
      total: 1125,
      items: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          menuItemName: "Espresso",
          quantity: 2,
          unitPrice: 500,
          total: 1000,
          status: "QUEUED",
        },
      ],
      createdAt: new Date().toISOString(),
    };

    enqueueOfflineOrder(testOrder);
    const queue = getOfflineOrders();
    assert.equal(queue.length, 1);
    assert.equal(queue[0].id, "offline-101");
    assert.equal(queue[0].orderNumber, "OFF-1001");
    assert.equal(getPendingOfflineCount(), 1);
  });

  it("should prevent duplicate order enqueue", () => {
    const testOrder: Order = {
      id: "offline-102",
      orderNumber: "OFF-1002",
      type: "TAKEAWAY",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 500,
      discount: 0,
      tax: 12.5,
      tip: 0,
      total: 512.5,
      items: [],
      createdAt: new Date().toISOString(),
    };

    enqueueOfflineOrder(testOrder);
    enqueueOfflineOrder(testOrder);
    assert.equal(getOfflineOrders().length, 1);
  });

  it("should remove synced orders from queue by ID", () => {
    const order1: Order = {
      id: "offline-201",
      orderNumber: "OFF-2001",
      type: "DINE_IN",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 100,
      discount: 0,
      tax: 0,
      tip: 0,
      total: 100,
      items: [],
      createdAt: new Date().toISOString(),
    };
    const order2: Order = {
      id: "offline-202",
      orderNumber: "OFF-2002",
      type: "DINE_IN",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 200,
      discount: 0,
      tax: 0,
      tip: 0,
      total: 200,
      items: [],
      createdAt: new Date().toISOString(),
    };

    enqueueOfflineOrder(order1);
    enqueueOfflineOrder(order2);
    assert.equal(getOfflineOrders().length, 2);

    removeOfflineOrder("offline-201");
    const remaining = getOfflineOrders();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "offline-202");
  });

  it("should cache and restore menu categories locally", () => {
    const mockCategories = [
      {
        id: "cat-1",
        name: "Artisanal Coffee",
        slug: "coffee",
        icon: "Coffee",
        sortOrder: 1,
        items: [],
      },
    ];

    setCachedMenu({ categories: mockCategories, modifierGroups: [] });
    const cached = getCachedMenu();
    assert.ok(cached);
    assert.equal(cached.categories.length, 1);
    assert.equal(cached.categories[0].name, "Artisanal Coffee");
  });

  it("should cache and restore dining tables locally", () => {
    const mockTables: Table[] = [
      {
        id: "tbl-1",
        number: "T1",
        name: "Window Table",
        section: "Main Hall",
        capacity: 4,
        status: "AVAILABLE",
      },
    ];

    setCachedTables(mockTables);
    const cached = getCachedTables();
    assert.ok(cached);
    assert.equal(cached.length, 1);
    assert.equal(cached[0].number, "T1");
  });

  it("should cache and restore staff list locally", () => {
    const mockStaff: Staff[] = [
      { id: "staff-1", name: "Milindu", role: "ADMIN" },
      { id: "staff-2", name: "Barista", role: "BARISTA" },
    ];

    setCachedStaff(mockStaff);
    const cached = getCachedStaff();
    assert.ok(cached);
    assert.equal(cached.length, 2);
    assert.equal(cached[0].name, "Milindu");
  });

  it("isDeviceOnline returns true when navigator.onLine is true and false when offline", () => {
    (globalThis as any).navigator.onLine = true;
    assert.equal(isDeviceOnline(), true);

    (globalThis as any).navigator.onLine = false;
    assert.equal(isDeviceOnline(), false);
  });

  it("syncOfflineOrders returns early without syncing if device is offline", async () => {
    (globalThis as any).navigator.onLine = false;
    enqueueOfflineOrder({
      id: "offline-301",
      orderNumber: "OFF-3001",
      type: "TAKEAWAY",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 500,
      discount: 0,
      tax: 0,
      tip: 0,
      total: 500,
      items: [],
      createdAt: new Date().toISOString(),
    });

    const result = await syncOfflineOrders();
    assert.equal(result.success, false);
    assert.equal(result.synced, 0);
    assert.equal(result.total, 1);
    assert.equal(getPendingOfflineCount(), 1, "Order must remain queued when offline");
  });

  it("syncOfflineOrders successfully uploads queued orders and purges them upon success", async () => {
    (globalThis as any).navigator.onLine = true;
    enqueueOfflineOrder({
      id: "offline-401",
      orderNumber: "OFF-4001",
      type: "DINE_IN",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 1200,
      discount: 0,
      tax: 30,
      tip: 120,
      total: 1350,
      items: [
        {
          id: "it-1",
          menuItemName: "Iced Caramel Latte",
          quantity: 1,
          unitPrice: 1200,
          total: 1200,
          status: "QUEUED",
        },
      ],
      createdAt: new Date().toISOString(),
    });

    assert.equal(getPendingOfflineCount(), 1);

    // Mock fetch to simulate successful server order creation
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 201,
      json: async () => ({ id: "server-order-999" }),
    });

    try {
      const syncResult = await syncOfflineOrders();
      assert.equal(syncResult.success, true);
      assert.equal(syncResult.synced, 1);
      assert.equal(syncResult.failed, 0);
      assert.equal(getPendingOfflineCount(), 0, "Synced order should be removed from queue");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("syncOfflineOrders retains queued order when server returns an error response", async () => {
    (globalThis as any).navigator.onLine = true;
    enqueueOfflineOrder({
      id: "offline-501",
      orderNumber: "OFF-5001",
      type: "TAKEAWAY",
      status: "PENDING",
      paymentStatus: "PAID",
      subtotal: 600,
      discount: 0,
      tax: 15,
      tip: 0,
      total: 615,
      items: [],
      createdAt: new Date().toISOString(),
    });

    const originalFetch = globalThis.fetch;
    // Mock fetch to simulate 500 error
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    try {
      const syncResult = await syncOfflineOrders();
      assert.equal(syncResult.success, false);
      assert.equal(syncResult.synced, 0);
      assert.equal(syncResult.failed, 1);
      assert.equal(getPendingOfflineCount(), 1, "Order must remain in queue after failed sync");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("subscribeNetworkState delivers initial state and provides cleanup", () => {
    let receivedState: any = null;
    const unsubscribe = subscribeNetworkState((state) => {
      receivedState = state;
    });

    assert.ok(receivedState);
    assert.equal(receivedState.online, true);
    assert.equal(typeof receivedState.pendingCount, "number");

    unsubscribe();
  });
});
