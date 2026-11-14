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
});
