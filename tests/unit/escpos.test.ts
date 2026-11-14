import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EscPosBuilder, ESC_POS } from "../../src/lib/escpos";

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
});
