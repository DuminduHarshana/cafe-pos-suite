import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "../../src/lib/storeSettings";

describe("Store Settings Default Configuration", () => {
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
  });

  it("should return default settings in SSR/non-browser environment", () => {
    const settings = getStoreSettings();
    assert.equal(settings.storeName, "Lilly's Restaurant and Cafe");
    assert.equal(settings.address, "No. 33, Galle Road, Balapitiya");
    assert.equal(settings.phone, "0777926230");
  });
});
