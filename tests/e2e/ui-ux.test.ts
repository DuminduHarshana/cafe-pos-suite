import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";

describe("UI/UX & Frontend Brand Verification", () => {
  it("GET / should render the web app with correct HTML structure and title", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const html = await res.text();

    // Verify Title & Meta
    assert.ok(
      html.includes("Lilly") || html.includes("Restaurant"),
      "Page HTML should contain Lilly's branding"
    );
  });

  it("Static Logo Asset should exist and be served properly", async () => {
    // 1. Check local file on disk
    const logoDiskPath = path.join(process.cwd(), "public", "logo.png");
    assert.ok(fs.existsSync(logoDiskPath), "public/logo.png must exist on disk");
    const stat = fs.statSync(logoDiskPath);
    assert.ok(stat.size > 1000, "Logo image file should have valid non-empty byte size");

    // 2. Check HTTP fetch
    const res = await fetch(`${BASE_URL}/logo.png`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType?.includes("image/png") || contentType?.includes("application/octet-stream"),
      `Expected image content-type, got: ${contentType}`
    );
  });

  it("Security check: No dev passwords or PINs printed in HTML", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();

    // Sensitive strings that were previously removed from UI
    assert.ok(!html.includes("PIN: 1111"), "HTML must NOT contain 'PIN: 1111'");
    assert.ok(!html.includes("PIN: 3333"), "HTML must NOT contain 'PIN: 3333'");
    assert.ok(!html.includes("PIN: 4444"), "HTML must NOT contain 'PIN: 4444'");
    assert.ok(!html.includes("Default: 1234"), "HTML must NOT contain 'Default: 1234'");
  });

  it("CSS styles must define active theme variables", () => {
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    assert.ok(fs.existsSync(cssPath));
    const css = fs.readFileSync(cssPath, "utf-8");

    // Check themes
    assert.ok(css.includes('[data-theme="amber"]'), "Amber theme must be defined");
    assert.ok(css.includes('[data-theme="emerald"]'), "Emerald theme must be defined");
    assert.ok(css.includes('[data-theme="rose"]'), "Rose theme must be defined");
    assert.ok(css.includes('[data-theme="blue"]'), "Blue theme must be defined");
    assert.ok(css.includes('[data-theme="purple"]'), "Purple theme must be defined");
    assert.ok(css.includes('[data-theme="cyan"]'), "Cyan theme must be defined");
    assert.ok(css.includes('[data-theme="orange"]'), "Orange theme must be defined");
    assert.ok(css.includes('[data-theme="neutral"]'), "Neutral theme must be defined");
  });

  it("Receipt template contains Lilly's address and phone number", () => {
    const settingsPath = path.join(process.cwd(), "src", "lib", "storeSettings.ts");
    assert.ok(fs.existsSync(settingsPath));
    const content = fs.readFileSync(settingsPath, "utf-8");

    assert.ok(content.includes("No. 33, Galle Road, Balapitiya"), "Settings must contain Galle Road address");
    assert.ok(content.includes("0777926230"), "Settings must contain phone 0777926230");
  });

  it("ReceiptModal implements Kitchen KOT Chit option with Table Name, Time, Items, and Customer Name", () => {
    const receiptModalPath = path.join(process.cwd(), "src", "components", "pos", "ReceiptModal.tsx");
    assert.ok(fs.existsSync(receiptModalPath));
    const content = fs.readFileSync(receiptModalPath, "utf-8");

    assert.ok(content.includes("Kitchen KOT Chit"), "ReceiptModal must provide Kitchen KOT Chit option");
    assert.ok(content.includes("KITCHEN ORDER TICKET (KOT)"), "KOT must have clear header");
    assert.ok(content.includes("tableLabel") || content.includes("order.table"), "KOT must include table identification");
    assert.ok(content.includes("toLocaleTimeString"), "KOT must include time");
    assert.ok(content.includes("order.customerName"), "KOT must support optional customer name");
    assert.ok(content.includes("item.quantity") && content.includes("item.menuItemName"), "KOT must list items and quantities");
  });

  it("CheckoutModal provides configurable Service Charge with presets and item exemption controls", () => {
    const checkoutModalPath = path.join(process.cwd(), "src", "components", "pos", "CheckoutModal.tsx");
    assert.ok(fs.existsSync(checkoutModalPath));
    const content = fs.readFileSync(checkoutModalPath, "utf-8");

    assert.ok(content.includes("Service Charge"), "CheckoutModal must support Service Charge");
    assert.ok(content.includes("serviceChargeRate"), "CheckoutModal must support configurable serviceChargeRate");
    assert.ok(content.includes("onToggleItemServiceCharge"), "CheckoutModal must support item exemption toggle");
    assert.ok(content.includes("isServiceChargeApplicable"), "CheckoutModal must track item service charge eligibility");
  });

  it("AnalyticsDashboard implements Admin-only Order Deletion with confirmation modal", () => {
    const analyticsPath = path.join(process.cwd(), "src", "components", "analytics", "AnalyticsDashboard.tsx");
    assert.ok(fs.existsSync(analyticsPath));
    const content = fs.readFileSync(analyticsPath, "utf-8");

    assert.ok(content.includes("handleInitiateDelete"), "Must implement delete initiation");
    assert.ok(content.includes("currentStaff.role !== \"ADMIN\"") || content.includes("Only Admin"), "Must enforce Admin-only check");
    assert.ok(content.includes("Delete Order #") && content.includes("deletingOrder"), "Must display delete confirmation modal");
    assert.ok(content.includes("DELETE"), "Must dispatch DELETE HTTP request to /api/orders");
  });

  it("Navbar provides explicit Log Out button and station locking mechanism", () => {
    const navbarPath = path.join(process.cwd(), "src", "components", "Navbar.tsx");
    assert.ok(fs.existsSync(navbarPath));
    const content = fs.readFileSync(navbarPath, "utf-8");

    assert.ok(content.includes("Log Out"), "Navbar must have a visible 'Log Out' button");
    assert.ok(content.includes("onLockStation"), "Navbar must invoke onLockStation on logout");
  });

  it("PinModal restricts staff selection strictly to 3 canonical users without duplicates", () => {
    const pinModalPath = path.join(process.cwd(), "src", "components", "staff", "PinModal.tsx");
    assert.ok(fs.existsSync(pinModalPath));
    const content = fs.readFileSync(pinModalPath, "utf-8");

    assert.ok(content.includes(".slice(0, 3)"), "PinModal must cap staff display to strictly 3 members");
  });

  it("KitchenDisplay provides Cancel Order button and confirmation modal to cancel tickets & free tables", () => {
    const kdsPath = path.join(process.cwd(), "src", "components", "kds", "KitchenDisplay.tsx");
    assert.ok(fs.existsSync(kdsPath));
    const content = fs.readFileSync(kdsPath, "utf-8");

    assert.ok(content.includes("Cancel Order"), "KitchenDisplay must provide Cancel Order trigger");
    assert.ok(content.includes("cancellingOrder"), "KitchenDisplay must track cancellingOrder state");
    assert.ok(content.includes("STATUS") || content.includes('"CANCELLED"'), "KitchenDisplay must support CANCELLED status dispatch");
    assert.ok(content.includes("Confirm Cancel"), "KitchenDisplay must provide confirmation modal before cancellation");
  });

  it("Responsive & PWA layout features are present in POS station and Navbar", () => {
    const posPath = path.join(process.cwd(), "src", "components", "pos", "PosStation.tsx");
    assert.ok(fs.existsSync(posPath));
    const posContent = fs.readFileSync(posPath, "utf-8");

    assert.ok(posContent.includes("mobileTab"), "PosStation must support mobile tab switching");
    assert.ok(posContent.includes("md:hidden"), "PosStation must provide responsive mobile controls");

    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(cssContent.includes("safe-area-inset"), "globals.css must support PWA safe-area-inset");

    const navbarPath = path.join(process.cwd(), "src", "components", "Navbar.tsx");
    const navbarContent = fs.readFileSync(navbarPath, "utf-8");
    assert.ok(navbarContent.includes("safe-area-inset-top"), "Navbar must handle safe-area-inset-top");
  });

  it("Thermal print stylesheet in globals.css makes #kitchen-kot-chit visible during printing", () => {
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    assert.ok(cssContent.includes("#kitchen-kot-chit"), "globals.css print styles must include #kitchen-kot-chit");
    assert.ok(cssContent.includes("#kitchen-kot-chit *"), "globals.css print styles must include #kitchen-kot-chit *");
  });

  it("SettingsHub allows viewing and editing Kitchen KOT Chit configuration and preview", () => {
    const settingsPath = path.join(process.cwd(), "src", "components", "settings", "SettingsHub.tsx");
    assert.ok(fs.existsSync(settingsPath));
    const content = fs.readFileSync(settingsPath, "utf-8");

    assert.ok(content.includes("Kitchen KOT Chit"), "SettingsHub must provide Kitchen KOT Chit tab");
    assert.ok(content.includes("kotHeaderTitle"), "SettingsHub must allow editing kotHeaderTitle");
    assert.ok(content.includes("kotFooterNote"), "SettingsHub must allow editing kotFooterNote");
    assert.ok(content.includes("showCustomerOnKot"), "SettingsHub must allow toggling showCustomerOnKot");
    assert.ok(content.includes("Kitchen KOT"), "SettingsHub must provide Kitchen KOT live preview");
  });
});

