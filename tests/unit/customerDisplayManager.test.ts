import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  broadcastCfdState,
  getCfdState,
  resetCfdState,
  generateLankaQrPayload,
  subscribeCfdState,
  CfdState,
  DEFAULT_CFD_STATE,
} from "../../src/lib/customerDisplayManager";

// Mock localStorage and window for Node test environment
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
(globalThis as any).addEventListener = () => {};
(globalThis as any).removeEventListener = () => {};
(globalThis as any).dispatchEvent = () => true;

describe("Customer-Facing Display Manager", () => {
  beforeEach(() => {
    resetCfdState();
  });

  it("should broadcast state and retrieve it from store", () => {
    const updated = broadcastCfdState({
      status: "ORDER_IN_PROGRESS",
      tableName: "Table T1",
      subtotal: 1500,
      tax: 37.5,
      serviceCharge: 150,
      total: 1687.5,
      items: [
        {
          id: "item-1",
          name: "Cappuccino",
          quantity: 2,
          unitPrice: 750,
          total: 1500,
          modifiers: ["Oat Milk"],
        },
      ],
    });

    assert.equal(updated.status, "ORDER_IN_PROGRESS");
    assert.equal(updated.tableName, "Table T1");
    assert.equal(updated.total, 1687.5);
    assert.equal(updated.items.length, 1);
    assert.equal(updated.items[0].name, "Cappuccino");

    const retrieved = getCfdState();
    assert.equal(retrieved.status, "ORDER_IN_PROGRESS");
    assert.equal(retrieved.total, 1687.5);
    assert.equal(retrieved.items.length, 1);
  });

  it("should reset CFD state to IDLE with empty cart", () => {
    broadcastCfdState({
      status: "CHECKOUT",
      total: 3000,
      items: [
        {
          id: "item-2",
          name: "Eggs Benedict",
          quantity: 1,
          unitPrice: 3000,
          total: 3000,
        },
      ],
    });

    const reset = resetCfdState();
    assert.equal(reset.status, "IDLE");
    assert.equal(reset.items.length, 0);
    assert.equal(reset.total, 0);

    const retrieved = getCfdState();
    assert.equal(retrieved.status, "IDLE");
    assert.equal(retrieved.items.length, 0);
  });

  it("should generate valid EMVCo LankaQR payload with merchant and amount", () => {
    const payload = generateLankaQrPayload(2450.5, "ORD-2045");
    assert.ok(payload.startsWith("000201010212"));
    assert.ok(payload.includes("COM.LANKAQR"));
    assert.ok(payload.includes("LILLYS RESTAURANT AND CAFE"));
    assert.ok(payload.includes("BALAPITIYA"));
    assert.ok(payload.includes("2450.50"));
    assert.ok(payload.includes("ORD2045"));
  });

  it("should generate valid EMVCo LankaQR payload with integer amounts formatted to 2 decimal places", () => {
    const payload = generateLankaQrPayload(5000, "ORD-9000");
    assert.ok(payload.includes("5000.00"), "Amount must have 2 decimal places in EMVCo tag 54");
    assert.ok(payload.includes("ORD9000"));
  });

  it("should broadcast PAYMENT_SUCCESS state and persist confirmation details", () => {
    const state = broadcastCfdState({
      status: "PAYMENT_SUCCESS",
      orderNumber: "ORD-7711",
      paymentMethod: "LANKAQR",
      total: 4200,
      customerName: "Kasun Jayasuriya",
    });

    assert.equal(state.status, "PAYMENT_SUCCESS");
    assert.equal(state.orderNumber, "ORD-7711");
    assert.equal(state.paymentMethod, "LANKAQR");
    assert.equal(state.customerName, "Kasun Jayasuriya");

    const retrieved = getCfdState();
    assert.equal(retrieved.status, "PAYMENT_SUCCESS");
    assert.equal(retrieved.orderNumber, "ORD-7711");
  });

  it("should handle subscription listener cleanup without errors", () => {
    let callCount = 0;
    const unsub = subscribeCfdState((state) => {
      callCount++;
    });

    assert.equal(typeof unsub, "function");
    unsub();
  });
});
