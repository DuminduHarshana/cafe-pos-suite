import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CartItem } from "../../src/types";

// Helper function mirroring the service charge calculation in POS & Checkout
function calculateOrderTotals(
  items: CartItem[],
  serviceChargeRate: number,
  discountRate: number = 0,
  taxRatePercent: number = 2.5,
  tipAmount: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountVal = subtotal * (discountRate / 100);
  const taxableSubtotal = Math.max(0, subtotal - discountVal);
  const tax = Math.round(taxableSubtotal * (taxRatePercent / 100) * 100) / 100;

  // Only items where isServiceChargeApplicable is not false are included
  const applicableItems = items.filter((i) => i.isServiceChargeApplicable !== false);
  const applicableSubtotal = applicableItems.reduce((sum, i) => sum + i.total, 0);
  const serviceChargeAmount = Math.round(applicableSubtotal * (serviceChargeRate / 100) * 100) / 100;

  const grandTotal = Math.round((taxableSubtotal + tax + serviceChargeAmount + tipAmount) * 100) / 100;

  return {
    subtotal,
    discountVal,
    taxableSubtotal,
    tax,
    applicableSubtotal,
    exemptSubtotal: subtotal - applicableSubtotal,
    serviceChargeAmount,
    grandTotal,
    applicableCount: applicableItems.length,
    exemptCount: items.length - applicableItems.length,
  };
}

describe("Service Charge & Checkout Calculations", () => {
  it("should calculate standard 10% service charge when all items are eligible", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "m1",
        menuItemName: "Cappuccino",
        unitPrice: 800,
        quantity: 2,
        selectedModifiers: [],
        total: 1600,
        isServiceChargeApplicable: true,
      },
      {
        id: "2",
        menuItemId: "m2",
        menuItemName: "Chicken Burger",
        unitPrice: 1400,
        quantity: 1,
        selectedModifiers: [],
        total: 1400,
        isServiceChargeApplicable: true,
      },
    ];

    const totals = calculateOrderTotals(items, 10, 0, 2.5, 0);

    assert.equal(totals.subtotal, 3000);
    assert.equal(totals.applicableSubtotal, 3000);
    assert.equal(totals.exemptCount, 0);
    assert.equal(totals.serviceChargeAmount, 300); // 10% of 3000 = 300
    assert.equal(totals.tax, 75); // 2.5% of 3000 = 75
    assert.equal(totals.grandTotal, 3375); // 3000 + 75 + 300 = 3375
  });

  it("should exempt specific items from service charge calculation", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "m1",
        menuItemName: "Dine-in Seafood Platter",
        unitPrice: 3500,
        quantity: 1,
        selectedModifiers: [],
        total: 3500,
        isServiceChargeApplicable: true, // Prepared meal: YES service charge
      },
      {
        id: "2",
        menuItemId: "m2",
        menuItemName: "Bottled Mineral Water 1L",
        unitPrice: 200,
        quantity: 2,
        selectedModifiers: [],
        total: 400,
        isServiceChargeApplicable: false, // Packaged Retail Item: EXEMPT
      },
      {
        id: "3",
        menuItemId: "m3",
        menuItemName: "Packaged Coffee Beans 250g",
        unitPrice: 2100,
        quantity: 1,
        selectedModifiers: [],
        total: 2100,
        isServiceChargeApplicable: false, // Retail Merchandise: EXEMPT
      },
    ];

    const totals = calculateOrderTotals(items, 10, 0, 0, 0);

    assert.equal(totals.subtotal, 6000);
    assert.equal(totals.applicableSubtotal, 3500); // Only the 3500 platter
    assert.equal(totals.exemptSubtotal, 2500); // 400 + 2100 retail items
    assert.equal(totals.applicableCount, 1);
    assert.equal(totals.exemptCount, 2);
    // Service charge must ONLY be 10% of 3500, which is 350 (NOT 600)
    assert.equal(totals.serviceChargeAmount, 350);
    assert.equal(totals.grandTotal, 6350); // 6000 + 350
  });

  it("should support 0% service charge for Takeaway or customer request", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "m1",
        menuItemName: "Takeaway Latte",
        unitPrice: 950,
        quantity: 1,
        selectedModifiers: [],
        total: 950,
        isServiceChargeApplicable: true,
      },
    ];

    const totals = calculateOrderTotals(items, 0, 0, 0, 0);
    assert.equal(totals.serviceChargeAmount, 0);
    assert.equal(totals.grandTotal, 950);
  });

  it("should support custom service charge rates (e.g. 5%, 12.5%, 15%)", () => {
    const items: CartItem[] = [
      {
        id: "1",
        menuItemId: "m1",
        menuItemName: "Banquet Feast",
        unitPrice: 10000,
        quantity: 1,
        selectedModifiers: [],
        total: 10000,
        isServiceChargeApplicable: true,
      },
    ];

    const at5Percent = calculateOrderTotals(items, 5, 0, 0, 0);
    assert.equal(at5Percent.serviceChargeAmount, 500);

    const at12Point5Percent = calculateOrderTotals(items, 12.5, 0, 0, 0);
    assert.equal(at12Point5Percent.serviceChargeAmount, 1250);

    const at15Percent = calculateOrderTotals(items, 15, 0, 0, 0);
    assert.equal(at15Percent.serviceChargeAmount, 1500);
  });
});
