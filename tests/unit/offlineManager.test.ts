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

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).navigator = { onLine: true };
(globalThis as any).addEventListener = () => {};
(globalThis as any).removeEventListener = () => {};
(globalThis as any).dispatchEvent = () => true;


describe("Offline Manager & Local Storage Queue", () => {
  beforeEach(() => {
    clearOfflineOrders();
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
});
