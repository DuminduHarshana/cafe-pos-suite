import { describe, it } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

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

    it("GET /api/staff returns strictly the 3 canonical staff roles without duplicates", async () => {
      const res = await fetch(`${BASE_URL}/api/staff`);
      assert.equal(res.status, 200);
      const staffList = await res.json();
      assert.equal(staffList.length, 3, "Expected exactly 3 staff roles");
      const names = staffList.map((s: { name: string }) => s.name);
      assert.ok(names.includes("Milindu"));
      assert.ok(names.includes("Barista"));
      assert.ok(names.includes("Cashier"));
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

    it("POST /api/staff rejects empty body or missing PIN with 401", async () => {
      const res1 = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res1.status, 401);

      const res2 = await fetch(`${BASE_URL}/api/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "" }),
      });
      assert.equal(res2.status, 401);
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

    it("POST /api/categories rejects empty category name with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   ", icon: "Tag" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "Category name is required");
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

    it("POST /api/menu rejects empty item name with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "  ",
          price: 500,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "Item name is required");
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

    it("PATCH /api/orders can cancel an order and frees up assigned dining table", async () => {
      assert.ok(testOrderId);
      assert.ok(testTableId);

      // Cancel the order
      const cancelRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testOrderId, status: "CANCELLED" }),
      });
      assert.equal(cancelRes.status, 200);
      const updatedOrder = await cancelRes.json();
      assert.equal(updatedOrder.status, "CANCELLED");

      // Verify the table status is set back to AVAILABLE
      const tablesRes = await fetch(`${BASE_URL}/api/tables`);
      assert.equal(tablesRes.status, 200);
      const tables = await tablesRes.json();
      const updatedTable = tables.find((t: { id: string }) => t.id === testTableId);
      assert.ok(updatedTable);
      assert.equal(updatedTable.status, "AVAILABLE", "Table must be marked AVAILABLE when order is cancelled");
    });

    it("DELETE /api/orders forbids non-admin staff with 403", async () => {
      assert.ok(testOrderId);
      const res = await fetch(`${BASE_URL}/api/orders?id=${testOrderId}`, {
        method: "DELETE",
        headers: { "x-staff-role": "CASHIER" },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes("Only Admins can delete"));
    });

    it("DELETE /api/orders allows Admin with PIN 1111 in body/header to delete order", async () => {
      assert.ok(testOrderId);
      const res = await fetch(`${BASE_URL}/api/orders?id=${testOrderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1111" }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.success);

      // Verify order is removed from GET /api/orders
      const verifyRes = await fetch(`${BASE_URL}/api/orders`);
      const orders = await verifyRes.json();
      const stillExists = orders.some((o: { id: string }) => o.id === testOrderId);
      assert.equal(stillExists, false, "Order must be completely deleted from database");
    });

    it("POST /api/orders rejects empty items array with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "TAKEAWAY",
          items: [],
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "Order must contain at least one item");
    });

    it("POST /api/orders creates a Takeaway order with paid status and customer name", async () => {
      const menuRes = await fetch(`${BASE_URL}/api/menu`);
      const menuData = await menuRes.json();
      const firstItem = menuData.categories.flatMap((c: { items: any[] }) => c.items)[0];

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TAKEAWAY",
          customerName: "Sarah Connor",
          customerPhone: "0771234567",
          paymentMethod: "CARD",
          paymentStatus: "PAID",
          subtotal: firstItem.price,
          discount: 0,
          tax: 0,
          tip: 50,
          total: firstItem.price + 50,
          items: [
            {
              menuItemId: firstItem.id,
              menuItemName: firstItem.name,
              quantity: 2,
              unitPrice: firstItem.price,
              total: firstItem.price * 2,
            },
          ],
        }),
      });

      assert.equal(res.status, 201);
      const order = await res.json();
      assert.equal(order.type, "TAKEAWAY");
      assert.equal(order.customerName, "Sarah Connor");
      assert.equal(order.status, "PREPARING");
      assert.equal(order.tableId, null);
    });

    it("PATCH /api/orders transitions order through full lifecycle (PENDING -> PREPARING -> READY -> COMPLETED)", async () => {
      // 1. Find a table
      const tablesRes = await fetch(`${BASE_URL}/api/tables`);
      const tables = await tablesRes.json();
      const table = tables[0];

      const menuRes = await fetch(`${BASE_URL}/api/menu`);
      const menuData = await menuRes.json();
      const firstItem = menuData.categories.flatMap((c: { items: any[] }) => c.items)[0];

      // 2. Create Dine-In order
      const createRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DINE_IN",
          tableId: table.id,
          subtotal: firstItem.price,
          total: firstItem.price,
          items: [
            {
              menuItemId: firstItem.id,
              menuItemName: firstItem.name,
              quantity: 1,
              unitPrice: firstItem.price,
              total: firstItem.price,
            },
          ],
        }),
      });
      const order = await createRes.json();

      // 3. Verify table is OCCUPIED
      const t1Res = await fetch(`${BASE_URL}/api/tables`);
      const t1Data = await t1Res.json();
      const t1 = t1Data.find((t: { id: string }) => t.id === table.id);
      assert.equal(t1.status, "OCCUPIED");

      // 4. Update to PREPARING
      const prepRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "PREPARING" }),
      });
      assert.equal(prepRes.status, 200);

      // 5. Update to READY
      const readyRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "READY" }),
      });
      assert.equal(readyRes.status, 200);

      // 6. Complete order & verify table is released to AVAILABLE
      const compRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: "COMPLETED", paymentStatus: "PAID" }),
      });
      assert.equal(compRes.status, 200);

      const t2Res = await fetch(`${BASE_URL}/api/tables`);
      const t2Data = await t2Res.json();
      const t2 = t2Data.find((t: { id: string }) => t.id === table.id);
      assert.equal(t2.status, "AVAILABLE", "Table must be released to AVAILABLE when order is completed");
    });

    it("POST /api/tables creates a new table and PATCH /api/tables updates table status and capacity", async () => {
      const customTableNumber = `T-${Date.now().toString().slice(-4)}`;
      const createRes = await fetch(`${BASE_URL}/api/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: customTableNumber,
          name: "VIP Ocean Cabana",
          section: "VIP Room",
          capacity: 6,
        }),
      });
      assert.equal(createRes.status, 201);
      const newTable = await createRes.json();
      assert.equal(newTable.number, customTableNumber);
      assert.equal(newTable.name, "VIP Ocean Cabana");
      assert.equal(newTable.capacity, 6);

      // PATCH update table status and capacity
      const patchRes = await fetch(`${BASE_URL}/api/tables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTable.id,
          status: "RESERVED",
          capacity: 8,
          name: "VIP Sunset Cabana",
        }),
      });
      assert.equal(patchRes.status, 200);
      const updatedTable = await patchRes.json();
      assert.equal(updatedTable.status, "RESERVED");
      assert.equal(updatedTable.capacity, 8);
      assert.equal(updatedTable.name, "VIP Sunset Cabana");
    });

    it("GET /api/orders supports status and active query filters", async () => {
      const activeRes = await fetch(`${BASE_URL}/api/orders?active=true`);
      assert.equal(activeRes.status, 200);
      const activeOrders = await activeRes.json();
      assert.ok(Array.isArray(activeOrders));
      for (const order of activeOrders) {
        assert.ok(["PENDING", "PREPARING", "READY", "SERVED"].includes(order.status));
      }

      const cancelledRes = await fetch(`${BASE_URL}/api/orders?status=CANCELLED`);
      assert.equal(cancelledRes.status, 200);
      const cancelledOrders = await cancelledRes.json();
      assert.ok(Array.isArray(cancelledOrders));
      for (const order of cancelledOrders) {
        assert.equal(order.status, "CANCELLED");
      }
    });

    it("POST /api/orders creates an order with custom Service Charge and item exemption breakdown", async () => {
      const menuRes = await fetch(`${BASE_URL}/api/menu`);
      const menuData = await menuRes.json();
      const allItems = menuData.categories.flatMap((c: { items: any[] }) => c.items);
      assert.ok(allItems.length >= 2, "Expected at least 2 items for service charge exemption test");

      const itemEligible = allItems[0];
      const itemExempt = allItems[1];

      // Eligible item has 10% service charge; Exempt item has 0%
      const eligibleSubtotal = itemEligible.price;
      const exemptSubtotal = itemExempt.price;
      const totalSubtotal = eligibleSubtotal + exemptSubtotal;
      const serviceCharge = eligibleSubtotal * 0.10;
      const tax = (totalSubtotal + serviceCharge) * 0.025;
      const finalTotal = totalSubtotal + serviceCharge + tax;

      const orderRes = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DINE_IN",
          customerName: "Service Charge Test Guest",
          paymentMethod: "CARD",
          paymentStatus: "PAID",
          subtotal: totalSubtotal,
          discount: 0,
          tax: tax,
          tip: serviceCharge, // Service charge recorded
          total: finalTotal,
          items: [
            {
              menuItemId: itemEligible.id,
              menuItemName: itemEligible.name,
              quantity: 1,
              unitPrice: itemEligible.price,
              total: itemEligible.price,
            },
            {
              menuItemId: itemExempt.id,
              menuItemName: itemExempt.name,
              quantity: 1,
              unitPrice: itemExempt.price,
              total: itemExempt.price,
            },
          ],
        }),
      });

      assert.equal(orderRes.status, 201);
      const createdOrder = await orderRes.json();
      assert.equal(Math.round(createdOrder.tip * 100) / 100, Math.round(serviceCharge * 100) / 100);
      assert.equal(Math.round(createdOrder.subtotal * 100) / 100, Math.round(totalSubtotal * 100) / 100);
      assert.equal(Math.round(createdOrder.total * 100) / 100, Math.round(finalTotal * 100) / 100);
    });

    it("POST /api/orders automatically decrements linked recipe inventory raw materials", async () => {
      // 1. Check inventory for Sourdough Bread or create linked item
      const invRes = await fetch(`${BASE_URL}/api/inventory`);
      const invData = await invRes.json();
      const breadItem = invData.items.find((i: { name: string }) => i.name.toLowerCase().includes("sourdough") || i.name.toLowerCase().includes("bread"));

      if (breadItem) {
        const initialStock = breadItem.currentStock;

        // Find the Truffle Avocado Toast menu item
        const menuRes = await fetch(`${BASE_URL}/api/menu`);
        const menuData = await menuRes.json();
        const allItems = menuData.categories.flatMap((c: { items: any[] }) => c.items);
        const avoItem = allItems.find((i: { name: string }) => i.name.toLowerCase().includes("avocado") || i.name.toLowerCase().includes("toast"));

        if (avoItem) {
          // Place an order for 2 portions
          const orderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "TAKEAWAY",
              subtotal: avoItem.price * 2,
              total: avoItem.price * 2,
              items: [
                {
                  menuItemId: avoItem.id,
                  menuItemName: avoItem.name,
                  quantity: 2,
                  unitPrice: avoItem.price,
                  total: avoItem.price * 2,
                },
              ],
            }),
          });
          assert.equal(orderRes.status, 201);

          // Verify inventory was automatically decremented
          const verifyInvRes = await fetch(`${BASE_URL}/api/inventory`);
          const verifyInvData = await verifyInvRes.json();
          const updatedBread = verifyInvData.items.find((i: { id: string }) => i.id === breadItem.id);
          assert.ok(updatedBread);
          assert.ok(updatedBread.currentStock < initialStock, `Expected stock to decrement from ${initialStock}, got ${updatedBread.currentStock}`);
        }
      }
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
      assert.equal(item.currentStock, 15.0);
      createdInventoryId = item.id;
    });

    it("POST /api/inventory restocks item and increments stock correctly", async () => {
      assert.ok(createdInventoryId);
      const restockRes = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdInventoryId,
          quantity: 10,
          type: "RESTOCK",
          reason: "Purchase order shipment received",
          staffName: "Milindu",
        }),
      });
      assert.equal(restockRes.status, 200);
      const updated = await restockRes.json();
      assert.equal(updated.currentStock, 25.0, "Expected stock to increment from 15 to 25");
    });

    it("POST /api/inventory adjusts stock downward for waste/spoilage", async () => {
      assert.ok(createdInventoryId);
      const adjustRes = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdInventoryId,
          quantity: -5,
          type: "ADJUSTMENT",
          reason: "Spillage during roasting",
          staffName: "Barista",
        }),
      });
      assert.equal(adjustRes.status, 200);
      const updated = await adjustRes.json();
      assert.equal(updated.currentStock, 20.0, "Expected stock to decrement from 25 to 20");
    });

    it("POST /api/inventory validates missing item name with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          name: "  ",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.error, "Item name is required");
    });

    it("POST /api/inventory validates missing item ID for restock with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: 5,
          type: "RESTOCK",
        }),
      });
      assert.equal(res.status, 400);
    });

    it("DELETE /api/inventory validates missing ID with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/inventory`, {
        method: "DELETE",
      });
      assert.equal(res.status, 400);
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

    it("POST /api/print handles network printer timeout / offline state gracefully with 502", async () => {
      const samplePayload = Buffer.from("LILLY'S TEST PRINT\n").toString("base64");
      const res = await fetch(`${BASE_URL}/api/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Buffer: samplePayload,
          ipAddress: "192.168.1.254", // Unreachable gateway
          port: 9100,
          timeoutMs: 300,
        }),
      });

      assert.equal(res.status, 502);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error);
      assert.ok(data.hint.includes("Check that printer IP is reachable"));
    });

    it("POST /api/print handles cash drawer kick command payload with timeout fallback", async () => {
      const res = await fetch(`${BASE_URL}/api/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isKickDrawer: true,
          ipAddress: "192.168.1.254",
          port: 9100,
          timeoutMs: 300,
        }),
      });

      // Handled cleanly through socket error handler
      assert.equal(res.status, 502);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  // 7. Analytics & Reporting API
  describe("Analytics & Metrics API", () => {
    it("GET /api/analytics returns business metrics and breakdowns", async () => {
      const res = await fetch(`${BASE_URL}/api/analytics`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.metrics, "Analytics must return metrics");
      assert.equal(typeof data.metrics.totalRevenue, "number");
      assert.equal(typeof data.metrics.totalOrders, "number");
      assert.equal(typeof data.metrics.avgTicket, "number");
      assert.equal(typeof data.metrics.totalTips, "number");
      assert.equal(typeof data.metrics.activeOrdersCount, "number");

      assert.ok(Array.isArray(data.topItems), "Analytics must return topItems array");
      assert.ok(typeof data.paymentMethods === "object", "Analytics must return paymentMethods breakdown");
      assert.ok(Array.isArray(data.recentOrders), "Analytics must return recentOrders array");
    });
  });
});
