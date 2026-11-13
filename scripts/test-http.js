// Direct HTTP endpoint verification script
async function verifyHttpEndpoints() {
  const baseUrl = "http://127.0.0.1:3005";
  console.log(`Connecting to Next.js server at ${baseUrl}...`);

  let passed = 0;
  let failed = 0;

  async function check(name, url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const data = await res.json();
        console.log(`  ✓ [HTTP ${res.status}] ${name}`);
        passed++;
        return data;
      } else {
        console.error(`  ✗ [HTTP ${res.status}] ${name} failed`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ [ERROR] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Menu API
  const menuData = await check("GET /api/menu", `${baseUrl}/api/menu`);
  if (menuData && menuData.categories) {
    console.log(`    Loaded ${menuData.categories.length} categories with items`);
  }

  // 2. Tables API
  const tablesData = await check("GET /api/tables", `${baseUrl}/api/tables`);
  if (tablesData) {
    console.log(`    Loaded ${tablesData.length} floor tables`);
  }

  // 3. Orders API
  const ordersData = await check("GET /api/orders", `${baseUrl}/api/orders`);
  if (ordersData) {
    console.log(`    Loaded ${ordersData.length} total orders`);
  }

  // 4. Inventory API
  const invData = await check("GET /api/inventory", `${baseUrl}/api/inventory`);
  if (invData && invData.stats) {
    console.log(`    Stock valuation: $${invData.stats.totalValuation.toFixed(2)}, Low stock: ${invData.stats.lowStockCount} items`);
  }

  // 5. Analytics API
  const analyticsData = await check("GET /api/analytics", `${baseUrl}/api/analytics`);
  if (analyticsData && analyticsData.metrics) {
    console.log(`    Today revenue: $${analyticsData.metrics.totalRevenue.toFixed(2)}, Orders: ${analyticsData.metrics.totalOrders}`);
  }

  // 6. Staff PIN Check
  const staffData = await check("POST /api/staff (PIN 1111)", `${baseUrl}/api/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1111" }),
  });
  if (staffData) {
    console.log(`    Authenticated: ${staffData.name} (${staffData.role})`);
  }

  // 7. Root Page HTML test
  try {
    const pageRes = await fetch(`${baseUrl}/`);
    if (pageRes.ok && pageRes.headers.get("content-type")?.includes("text/html")) {
      console.log(`  ✓ [HTTP 200] GET / (Root PWA HTML rendered properly)`);
      passed++;
    } else {
      console.error(`  ✗ Root page did not return HTML`);
      failed++;
    }
  } catch (err) {
    console.error(`  ✗ GET / failed:`, err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`HTTP Verification: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

verifyHttpEndpoints();

