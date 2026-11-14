import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";

describe("API Integration Suite", () => {
  let createdCategoryId: string = "";
  let createdMenuItemId: string = "";

  // 1. Staff Security & Authentication
  describe("Staff Security & PIN Authentication", () => {
    it("GET /api/staff should NOT expose PINs in response", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`);
      assert.equal(res.status, 200);
      const staffList = await res.json();
      assert.ok(Array.isArray(staffList));
      assert.ok(staffList.length >= 3);

      for (const staff of staffList) {
        assert.equal(
          staff.pin,
          undefined,
          `Security violation: Staff "${staff.name}" has PIN exposed in GET /api/staff response!`
        );
      }
    });

    it("POST /api/staff verifies Admin Milindu with PIN 1111", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1111" }),
      });
      assert.equal(res.status, 200);
      const staff = await res.json();
      assert.equal(staff.name, "Milindu");
      assert.equal(staff.role, "ADMIN");
    });

    it("POST /api/staff verifies Barista with PIN 3333", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "3333" }),
      });
      assert.equal(res.status, 200);
      const staff = await res.json();
      assert.equal(staff.name, "Barista");
      assert.equal(staff.role, "BARISTA");
    });

    it("POST /api/staff verifies Cashier with PIN 4444", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "4444" }),
      });
      assert.equal(res.status, 200);
      const staff = await res.json();
      assert.equal(staff.name, "Cashier");
      assert.equal(staff.role, "CASHIER");
    });

    it("POST /api/staff rejects invalid PIN with 401", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "9999" }),
      });
      assert.equal(res.status, 401);
    });
  });

  // 2. Categories CRUD
  describe("Category Management (CRUD)", () => {
    it("GET /api/categories returns default categories", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`);
      assert.equal(res.status, 200);
      const categories = await res.json();
      assert.ok(Array.isArray(categories));
      assert.ok(categories.length > 0);
    });

    it("POST /api/categories creates a new category", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Desserts " + Date.now(),
          icon: "Cake",
          sortOrder: 10,
        }),
      });
      assert.equal(res.status, 201);
      const cat = await res.json();
      assert.ok(cat.id);
      createdCategoryId = cat.id;
    });

    it("PUT /api/categories updates category details", async () => {
      assert.ok(createdCategoryId);
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdCategoryId,
          name: "Updated Sweet Desserts",
          icon: "Sparkles",
          sortOrder: 11,
          isActive: true,
        }),
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.name, "Updated Sweet Desserts");
      assert.equal(updated.icon, "Sparkles");
    });

    it("DELETE /api/categories removes the category", async () => {
      assert.ok(createdCategoryId);
      const res = await fetch(`${BASE_URL}/api/categories?id=${createdCategoryId}`, {
        method: "DELETE",
      });
      assert.equal(res.status, 200);
    });
  });

  // 3. Menu Item CRUD
  describe("Menu Items Management (CRUD)", () => {
    let targetCatId: string = "";

    it("GET /api/menu returns categories and menu items", async () => {
      const res = await fetch(`${BASE_URL}/api/menu`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.categories));
      assert.ok(data.categories.length > 0);
      targetCatId = data.categories[0].id;
    });

    it("POST /api/menu creates a new menu item", async () => {
      const res = await fetch(`${BASE_URL}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Organic Ceylon White Tea",
          price: 950.0,
          costPrice: 200.0,
          categoryId: targetCatId,
          prepTimeMinutes: 4,
          description: "Fresh handpicked white tea from Nuwara Eliya",
        }),
      });
      assert.equal(res.status, 201);
      const item = await res.json();
      assert.ok(item.id);
      assert.equal(item.name, "Organic Ceylon White Tea");
      assert.equal(item.price, 950.0);
      createdMenuItemId = item.id;
    });

    it("PUT /api/menu updates menu item name, price, and availability", async () => {
      assert.ok(createdMenuItemId);
      const res = await fetch(`${BASE_URL}/api/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdMenuItemId,
          name: "Organic Ceylon Silver Tips",
          price: 1200.0,
          isAvailable: true,
          prepTimeMinutes: 5,
        }),
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.name, "Organic Ceylon Silver Tips");
      assert.equal(updated.price, 1200.0);
    });

    it("DELETE /api/menu deletes the menu item", async () => {
      assert.ok(createdMenuItemId);
      const res = await fetch(`${BASE_URL}/api/menu?id=${createdMenuItemId}`, {
        method: "DELETE",
      });
      assert.equal(res.status, 200);
    });
  });

  // 4. Tables and Orders Workflow
  describe("Tables & Orders Workflow", () => {
    let testOrderId: string = "";
    let testTableId: string = "";
    let testTableNumber: string = "";

    it("GET /api/tables returns table listings", async () => {
      const res = await fetch(`${BASE_URL}/api/tables`);
      assert.equal(res.status, 200);
      const tables = await res.json();
      assert.ok(Array.isArray(tables));
      assert.ok(tables.length > 0);
      testTableId = tables[0].id;
      testTableNumber = tables[0].number;
    });

    it("POST /api/orders creates a new dine-in order", async () => {
      // Fetch a valid menu item
      const menuRes = await fetch(`${BASE_URL}/api/menu`);
      const menuData = await menuRes.json();
      const allItems = menuData.categories.flatMap((c: { items: any[] }) => c.items);
      const firstItem = allItems[0];
      assert.ok(firstItem, "Expected at least one menu item in the database");

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "DINE_IN",
          tableId: testTableId,
          customerName: "Test Guest",
          paymentMethod: "CASH",
          paymentStatus: "PAID",
          subtotal: firstItem.price,
          tax: firstItem.price * 0.025,
          discount: 0,
          total: firstItem.price * 1.025,
          items: [
            {
              menuItemId: firstItem.id,
              menuItemName: firstItem.name,
              quantity: 1,
              unitPrice: firstItem.price,
              subtotal: firstItem.price,
              total: firstItem.price,
              notes: "Extra hot please",
              selectedModifiers: [],
            },
          ],
        }),
      });

      assert.equal(res.status, 201);
      const order = await res.json();
      assert.ok(order.id);
      assert.ok(order.orderNumber);
      testOrderId = order.id;
    });

    it("GET /api/orders includes the new order", async () => {
      assert.ok(testOrderId);
      const res = await fetch(`${BASE_URL}/api/orders`);
      assert.equal(res.status, 200);
      const orders = await res.json();
      const found = orders.find((o: { id: string }) => o.id === testOrderId);
      assert.ok(found);
      assert.equal(found.table?.number, testTableNumber);
    });
  });

  // 5. Inventory Management CRUD
  describe("Inventory Management (CRUD)", () => {
    let createdInventoryId: string = "";

    it("GET /api/inventory returns items and stats", async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.items));
      assert.ok(data.stats);
    });

    it("POST /api/inventory creates new inventory item", async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Arabica Single Origin " + Date.now(),
          sku: "TEST-SKU-" + Date.now(),
          category: "BEANS",
          unit: "kg",
          currentStock: 15.0,
          minStockAlert: 3.0,
          costPerUnit: 4200.0,
          supplierName: "Ceylon Highlands",
        }),
      });
      assert.equal(res.status, 201);
      const item = await res.json();
      assert.ok(item.id);
      createdInventoryId = item.id;
    });

    it("DELETE /api/inventory deletes inventory item", async () => {
      assert.ok(createdInventoryId);
      const res = await fetch(`${BASE_URL}/api/inventory?id=${createdInventoryId}`, {
        method: "DELETE",
      });
      assert.equal(res.status, 200);
    });

    it("DELETE /api/inventory handles already-deleted items idempotently", async () => {
      assert.ok(createdInventoryId);
      const res = await fetch(`${BASE_URL}/api/inventory?id=${createdInventoryId}`, {
        method: "DELETE",
      });
      assert.equal(res.status, 200);
    });
  });

  // 6. Thermal Printing Endpoint
  describe("Thermal Printer API", () => {
    it("POST /api/print validates missing buffer correctly with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const result = await res.json();
      assert.equal(result.error, "Missing print buffer");
    });
  });
});
