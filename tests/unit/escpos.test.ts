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

  it("should generate full Dine-In thermal customer receipt with complete breakdown and cash drawer kick", () => {
    const fullOrder = {
      orderNumber: "ORD-8801",
      type: "DINE_IN",
      customerName: "Amara Silva",
      table: { number: "T1", name: "Ocean Terrace" },
      staff: { name: "Milindu" },
      createdAt: "2026-11-14T12:00:00.000Z",
      subtotal: 2500,
      discount: 250,
      tax: 56.25,
      tip: 250, // Service charge
      total: 2556.25,
      paymentMethod: "CASH",
      items: [
        {
          quantity: 2,
          menuItemName: "Cappuccino",
          total: 1600,
          selectedModifiers: JSON.stringify(["Oat Milk"]),
          notes: "Extra chocolate dusting",
        },
        {
          quantity: 1,
          menuItemName: "Avocado Toast",
          total: 900,
          selectedModifiers: null,
          notes: "Poached egg well done",
        },
      ],
    };

    const bytes = generateThermalReceiptBytes(fullOrder, {
      paperWidth: "80mm",
      openCashDrawer: true,
      autoCut: true,
    });
    const text = Buffer.from(bytes).toString("latin1");

    // Cafe branding
    assert.ok(text.includes("LILLY'S RESTAURANT AND CAFE"), "Must contain uppercase store name");
    assert.ok(text.includes("No. 33, Galle Road, Balapitiya"), "Must contain address");
    assert.ok(text.includes("0777926230"), "Must contain phone number");

    // Order identifiers
    assert.ok(text.includes("ORDER #ORD-8801"), "Must contain order number");
    assert.ok(text.includes("Server:"), "Must list server label");
    assert.ok(text.includes("Milindu"), "Must list server name");
    assert.ok(text.includes("Dining Table:"), "Must list dining table label");
    assert.ok(text.includes("T1 (Ocean Terrace)"), "Must list table number and name");
    assert.ok(text.includes("Amara Silva"), "Must list customer name");

    // Items, modifiers, notes
    assert.ok(text.includes("2x Cappuccino"), "Must list item with quantity");
    assert.ok(text.includes("Rs. 1600.00"), "Must list item total");
    assert.ok(text.includes("Oat Milk"), "Must list modifier");
    assert.ok(text.includes("Extra chocolate dusting"), "Must list item note");
    assert.ok(text.includes("1x Avocado Toast"), "Must list second item");

    // Financial breakdown
    assert.ok(text.includes("Subtotal:"), "Must list subtotal");
    assert.ok(text.includes("Rs. 2500.00"), "Must format subtotal amount");
    assert.ok(text.includes("Discount:"), "Must list discount");
    assert.ok(text.includes("-Rs. 250.00"), "Must format discount amount");
    assert.ok(text.includes("Tax (SSCL/VAT):"), "Must list tax label");
    assert.ok(text.includes("Tip / Service:"), "Must list tip / service charge label");
    assert.ok(text.includes("TOTAL DUE:"), "Must list total due");
    assert.ok(text.includes("Rs. 2556.25"), "Must format total due amount");
    assert.ok(text.includes("PAID VIA CASH"), "Must list payment method");

    // Hardware drawer kick & cut commands
    const byteArray = Array.from(bytes);
    // Cash drawer kick bytes (ESC p 0 25 250)
    assert.ok(
      byteArray.some((b, i) => b === 0x1b && byteArray[i + 1] === 0x70),
      "Must include ESC p cash drawer kick command for CASH payment"
    );
    // Paper cut command (GS V 0)
    assert.ok(
      byteArray.some((b, i) => b === 0x1d && byteArray[i + 1] === 0x56),
      "Must include GS V paper cut command"
    );
  });

  it("should omit cash drawer kick command for Card payments", () => {
    const cardOrder = {
      orderNumber: "ORD-8802",
      type: "TAKEAWAY",
      createdAt: "2026-11-14T12:30:00.000Z",
      subtotal: 1000,
      discount: 0,
      tax: 25,
      tip: 0,
      total: 1025,
      paymentMethod: "CARD",
      items: [
        {
          quantity: 1,
          menuItemName: "Americano",
          total: 1000,
        },
      ],
    };

    const bytes = generateThermalReceiptBytes(cardOrder, {
      paperWidth: "80mm",
      openCashDrawer: true, // Configured for cash, but order is CARD
      autoCut: true,
    });

    const byteArray = Array.from(bytes);
    const hasKickDrawer = byteArray.some((b, i) => b === 0x1b && byteArray[i + 1] === 0x70);
    assert.equal(hasKickDrawer, false, "Must NOT kick cash drawer for CARD payment");
  });

  it("should generate receipt properly formatted for 58mm compact thermal paper", () => {
    const compactOrder = {
      orderNumber: "ORD-8803",
      type: "TAKEAWAY",
      createdAt: "2026-11-14T13:00:00.000Z",
      subtotal: 750,
      discount: 0,
      tax: 18.75,
      tip: 0,
      total: 768.75,
      paymentMethod: "CASH",
      items: [
        {
          quantity: 1,
          menuItemName: "Flat White",
          total: 750,
        },
      ],
    };

    const bytes = generateThermalReceiptBytes(compactOrder, {
      paperWidth: "58mm",
      openCashDrawer: false,
      autoCut: true,
    });
    const text = Buffer.from(bytes).toString("latin1");

    assert.ok(text.includes("ORDER #ORD-8803"));
    assert.ok(text.includes("Flat White"));
    assert.ok(text.includes("Rs. 768.75"));
  });
});
