import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCurrency, formatCurrencyShort, CURRENCY_CODE, CURRENCY_SYMBOL } from "../../src/lib/currency";

describe("Currency Utilities (Sri Lankan Rupee)", () => {
  it("should have correct currency constants for Sri Lanka", () => {
    assert.equal(CURRENCY_CODE, "LKR");
    assert.equal(CURRENCY_SYMBOL, "Rs. ");
  });

  it("should format positive numbers with two decimals and thousand separators", () => {
    assert.equal(formatCurrency(1500), "Rs. 1,500.00");
    assert.equal(formatCurrency(500), "Rs. 500.00");
    assert.equal(formatCurrency(1250000.5), "Rs. 1,250,000.50");
  });

  it("should handle null, undefined, or NaN gracefully", () => {
    assert.equal(formatCurrency(null), "Rs. 0.00");
    assert.equal(formatCurrency(undefined), "Rs. 0.00");
    assert.equal(formatCurrency("not-a-number"), "Rs. 0.00");
  });

  it("should format short currency with zero decimals when integer", () => {
    assert.equal(formatCurrencyShort(1500), "Rs. 1,500");
    assert.equal(formatCurrencyShort(750.25), "Rs. 750.25");
  });

  it("should parse string values correctly", () => {
    assert.equal(formatCurrency("850.50"), "Rs. 850.50");
  });
});
