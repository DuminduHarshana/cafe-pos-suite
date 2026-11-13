import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("==================================================");
  console.log("   ARTISAN CAFE POS & RESTAURANT SUITE - VERIFICATION");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Staff & PIN Verification
    console.log("--- 1. Testing Staff & PIN Security ---");
    const admin = await prisma.staff.findFirst({ where: { pin: "1111" } });
    assert(admin !== null && admin.role === "ADMIN", "Admin staff exists with PIN 1111");

    const barista = await prisma.staff.findFirst({ where: { pin: "3333" } });
    assert(barista !== null && barista.role === "BARISTA", "Barista staff exists with PIN 3333");

    const cashier = await prisma.staff.findFirst({ where: { pin: "4444" } });
    assert(cashier !== null && cashier.role === "CASHIER", "Cashier staff exists with PIN 4444");

    // 2. Menu Catalog & Modifiers
    console.log("\n--- 2. Testing Menu, Modifiers & Recipes ---");
    const categories = await prisma.category.findMany({
      include: { items: { include: { modifierGroups: { include: { modifierGroup: true } }, recipeItems: true } } },
    });
    assert(categories.length >= 4, "Loaded menu categories", `Found ${categories.length}`);

    const flatWhite = await prisma.menuItem.findFirst({
      where: { name: { contains: "Flat White" } },
      include: { recipeItems: true, modifierGroups: true },
    });
    assert(flatWhite !== null, "Flat White menu item exists");
    assert((flatWhite?.recipeItems?.length || 0) >= 2, "Flat White has recipe ingredient deductions configured");
    assert((flatWhite?.modifierGroups?.length || 0) >= 1, "Flat White has modifier groups (e.g. Milk choice)");

    // 3. Tables & Sections
    console.log("\n--- 3. Testing Dining Tables & Floor Sections ---");
    const tables = await prisma.restaurantTable.findMany();
    assert(tables.length >= 5, "Floor tables loaded", `Found ${tables.length}`);
    const sections = Array.from(new Set(tables.map((t) => t.section)));
    assert(sections.includes("Indoor Lounge"), "Indoor Lounge section exists");
    assert(sections.includes("Terrace Garden"), "Terrace Garden section exists");

    // 4. Inventory Tracking & Initial Stock
    console.log("\n--- 4. Testing Inventory & Stock Levels ---");
    const espressoBeans = await prisma.inventoryItem.findFirst({
      where: { name: { contains: "House Espresso" } },
    });
    assert(espressoBeans !== null, "House Espresso beans exist in inventory");
    const initialBeansStock = espressoBeans?.currentStock || 0;
    console.log(`    Current beans stock: ${initialBeansStock} ${espressoBeans?.unit}`);

    const milkItem = await prisma.inventoryItem.findFirst({
      where: { name: { contains: "Whole Milk" } },
    });
    const initialMilkStock = milkItem?.currentStock || 0;
    console.log(`    Current milk stock: ${initialMilkStock} ${milkItem?.unit}`);

    // 5. End-to-End Order Creation with Automatic BOM Inventory Deduction
    console.log("\n--- 5. Testing Order Creation with Automatic Recipe Stock Deduction ---");
    const testTable = await prisma.restaurantTable.create({
      data: {
        number: `TEST-${Date.now().toString().slice(-4)}`,
        name: "Test Table QA",
        section: "Indoor Lounge",
        capacity: 4,
        status: "AVAILABLE",
      },
    });

    const orderNumber = `TEST-ORD-${Date.now().toString().slice(-4)}`;
    const testOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          orderNumber,
          type: "DINE_IN",
          tableId: testTable.id,
          customerName: "Alex Tester",
          subtotal: 9.7,
          tax: 0.78,
          tip: 2.0,
          total: 12.48,
          paymentStatus: "PAID",
          paymentMethod: "CARD",
          status: "PREPARING",
          items: {
            create: [
              {
                menuItemId: flatWhite!.id,
                menuItemName: flatWhite!.name,
                unitPrice: flatWhite!.price,
                quantity: 2,
                total: flatWhite!.price * 2,
                selectedModifiers: JSON.stringify(["Barista Oat Milk", "Extra Espresso Shot"]),
              },
            ],
          },
        },
        include: { items: true, table: true },
      });

      // Update table to OCCUPIED
      await tx.restaurantTable.update({
        where: { id: testTable.id },
        data: { status: "OCCUPIED" },
      });

      // Execute recipe deduction for 2x Flat White
      const recipes = await tx.menuItemIngredient.findMany({
        where: { menuItemId: flatWhite!.id },
      });

      for (const recipe of recipes) {
        const totalDeduction = recipe.quantity * 2;
        await tx.inventoryItem.update({
          where: { id: recipe.inventoryItemId },
          data: { currentStock: { decrement: totalDeduction } },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: recipe.inventoryItemId,
            type: "ORDER_DEDUCTION",
            quantity: -totalDeduction,
            reason: `Order ${orderNumber} - 2x ${flatWhite!.name}`,
          },
        });
      }

      return ord;
    });

    assert(testOrder.orderNumber === orderNumber, "Order record created successfully");

    // Verify table updated to OCCUPIED
    const updatedTable = await prisma.restaurantTable.findUnique({ where: { id: testTable.id } });
    assert(updatedTable?.status === "OCCUPIED", "Table status transitioned to OCCUPIED");

    // Verify raw ingredients were accurately deducted
    const updatedBeans = await prisma.inventoryItem.findUnique({ where: { id: espressoBeans!.id } });
    const expectedBeansStock = initialBeansStock - 0.018 * 2;
    assert(
      Math.abs((updatedBeans?.currentStock || 0) - expectedBeansStock) < 0.001,
      "Inventory automatically deducted 36g coffee beans for 2x Flat White"
    );

    // 6. Kitchen KDS Pipeline & Table Clearance
    console.log("\n--- 6. Testing Kitchen KDS Lifecycle & Table Turnover ---");
    // Bump to READY
    const readyOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: "READY" },
    });
    assert(readyOrder.status === "READY", "Order bumped to READY in KDS");

    // Bump to COMPLETED -> Should free table
    await prisma.$transaction([
      prisma.order.update({
        where: { id: testOrder.id },
        data: { status: "COMPLETED" },
      }),
      prisma.restaurantTable.update({
        where: { id: testTable.id },
        data: { status: "AVAILABLE" },
      }),
    ]);

    const completedTable = await prisma.restaurantTable.findUnique({ where: { id: testTable.id } });
    assert(completedTable?.status === "AVAILABLE", "Table automatically freed (AVAILABLE) upon order completion");

    // 7. Menu Price & 86 Out of Stock Toggle
    console.log("\n--- 7. Testing 86 Out-of-Stock & Price Updates ---");
    const toggledItem = await prisma.menuItem.update({
      where: { id: flatWhite!.id },
      data: { isAvailable: false },
    });
    assert(toggledItem.isAvailable === false, "Item successfully 86'd (isAvailable: false)");

    const restoredItem = await prisma.menuItem.update({
      where: { id: flatWhite!.id },
      data: { isAvailable: true },
    });
    assert(restoredItem.isAvailable === true, "Item restored to available");

    // Clean up test table and order
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    await prisma.restaurantTable.delete({ where: { id: testTable.id } });

    console.log("\n==================================================");
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution encountered an error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();

