import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EscPosBuilder, ESC_POS, generateKitchenChitBytes, generateThermalReceiptBytes } from "../../src/lib/escpos";

describe("ESC/POS Thermal Receipt Builder", () => {
  it("should initialize with ESC @ command", () => {
    const builder = new EscPosBuilder("80mm");
    const bytes = builder.build();
    assert.deepEqual(Array.from(bytes.slice(0, 2)), ESC_POS.INIT);
  });

  it("should append alignment commands correctly", () => {
    const builder = new EscPosBuilder("80mm");
    builder.alignCenter().text("Lilly's Cafe").alignLeft();
    const bytes = Array.from(builder.build());
    // Contains ESC a 1 (center)
    assert.ok(bytes.some((b, i) => b === 0x1b && bytes[i + 1] === 0x61 && bytes[i + 2] === 0x01));
  });

  it("should format two-column text with proper padding", () => {
    const builder = new EscPosBuilder("80mm"); // 48 chars
    builder.twoColumnLine("Iced Latte", "Rs. 950.00");
    const bytes = builder.build();
    const text = Buffer.from(bytes).toString("latin1");
    assert.ok(text.includes("Iced Latte"));
    assert.ok(text.includes("Rs. 950.00"));
  });

  it("should add cut and drawer kick commands", () => {
    const builder = new EscPosBuilder("80mm");
    builder.cut().kickDrawer();
    const bytes = Array.from(builder.build());
    // Contains GS V 0 (cut)
    assert.ok(bytes.some((b, i) => b === 0x1d && bytes[i + 1] === 0x56));
    // Contains ESC p (kick drawer)
    assert.ok(bytes.some((b, i) => b === 0x1b && bytes[i + 1] === 0x70));
  });

  it("should generate Kitchen Order Ticket (KOT) with Table Name, Time, Items and Optional Customer Name", () => {
    const kotOrder = {
      orderNumber: "ORD-9021",
      type: "DINE_IN",
      table: { number: "4", name: "Terrace Sea View" },
      createdAt: "2026-11-14T15:30:00.000Z",
      customerName: "Liam Perera",
      notes: "Customer is allergic to peanuts",
      items: [
        {
          quantity: 2,
          menuItemName: "Iced Caramel Macchiato",
          selectedModifiers: JSON.stringify(["Oat Milk", "Extra Espresso Shot"]),
          notes: "Extra ice",
        },
        {
          quantity: 1,
          menuItemName: "Club Sandwich",
          selectedModifiers: null,
          notes: "Toasted well",
        },
      ],
    };

    const bytes = generateKitchenChitBytes(kotOrder);
    const text = Buffer.from(bytes).toString("latin1");

    // Must contain KOT Header
    assert.ok(text.includes("KITCHEN ORDER (KOT)"), "Should have KOT header");
    assert.ok(text.includes("ORD-9021"), "Should include order number");

    // Must contain Table Name
    assert.ok(text.includes("Terrace Sea View"), "Should include table name");
    assert.ok(text.includes("T-4") || text.includes("TABLE"), "Should include table identifier");

    // Must contain Items, modifiers, notes
    assert.ok(text.includes("2x Iced Caramel Macchiato"), "Should include first item with quantity");
    assert.ok(text.includes("Oat Milk"), "Should include modifier");
    assert.ok(text.includes("Extra Espresso Shot"), "Should include modifier");
    assert.ok(text.includes("Extra ice"), "Should include item note");

    assert.ok(text.includes("1x Club Sandwich"), "Should include second item with quantity");
    assert.ok(text.includes("Toasted well"), "Should include item note");

    // Must contain Customer Name
    assert.ok(text.includes("Liam Perera"), "Should include customer name");

    // Must contain Special Instructions
    assert.ok(text.includes("allergic to peanuts"), "Should include special order instructions");

    // Operational ticket check: MUST NOT contain financial / pricing totals
    assert.ok(!text.includes("TOTAL DUE"), "KOT must NOT include financial totals");
    assert.ok(!text.includes("PAID VIA"), "KOT must NOT include payment tender info");
  });

  it("should generate Kitchen Order Ticket for Takeaway without requiring table or customer name", () => {
    const takeawayOrder = {
      orderNumber: "ORD-9022",
      type: "TAKEAWAY",
      table: null,
      createdAt: "2026-11-14T15:45:00.000Z",
      customerName: null,
      notes: null,
      items: [
        {
          quantity: 1,
          menuItemName: "Espresso",
        },
      ],
    };

    const bytes = generateKitchenChitBytes(takeawayOrder);
    const text = Buffer.from(bytes).toString("latin1");

    assert.ok(text.includes("ORD-9022"));
    assert.ok(text.includes("TAKEAWAY / COUNTER"));
    assert.ok(text.includes("1x Espresso"));
  });
});
