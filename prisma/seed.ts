import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with artisan cafe & restaurant data...");

  // 1. Clean up existing data in reverse order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.menuItemIngredient.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.itemModifierGroup.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.staff.deleteMany();

  // 2. Staff members
  const adminStaff = await prisma.staff.create({
    data: {
      name: "Julian Vance",
      pin: "1111",
      role: "ADMIN",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    },
  });

  const baristaStaff = await prisma.staff.create({
    data: {
      name: "Mateo Silva",
      pin: "3333",
      role: "BARISTA",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
  });

  await prisma.staff.create({
    data: {
      name: "Chloe Bennett",
      pin: "4444",
      role: "CASHIER",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    },
  });

  // 3. Inventory Items
  const beansEspresso = await prisma.inventoryItem.create({
    data: {
      name: "House Espresso Roast Beans",
      sku: "RAW-COF-001",
      category: "BEANS",
      unit: "kg",
      currentStock: 18.5,
      minStockAlert: 5.0,
      costPerUnit: 24.0,
      supplierName: "Artisan Roasters Guild",
    },
  });

  const beansSingleOrigin = await prisma.inventoryItem.create({
    data: {
      name: "Ethiopian Guji Natural Beans",
      sku: "RAW-COF-002",
      category: "BEANS",
      unit: "kg",
      currentStock: 6.2,
      minStockAlert: 3.0,
      costPerUnit: 32.0,
      supplierName: "Direct Trade Africa",
    },
  });

  const wholeMilk = await prisma.inventoryItem.create({
    data: {
      name: "Organic Whole Milk",
      sku: "RAW-DAIRY-001",
      category: "DAIRY",
      unit: "L",
      currentStock: 42.0,
      minStockAlert: 15.0,
      costPerUnit: 1.8,
      supplierName: "Valley Organic Farms",
    },
  });

  const oatMilk = await prisma.inventoryItem.create({
    data: {
      name: "Barista Edition Oat Milk",
      sku: "RAW-DAIRY-002",
      category: "DAIRY",
      unit: "L",
      currentStock: 28.0,
      minStockAlert: 10.0,
      costPerUnit: 3.2,
      supplierName: "Oat & Co.",
    },
  });

  const vanillaSyrup = await prisma.inventoryItem.create({
    data: {
      name: "Madagascar Bourbon Vanilla Syrup",
      sku: "RAW-SYR-001",
      category: "SYRUP",
      unit: "ml",
      currentStock: 4500,
      minStockAlert: 1000,
      costPerUnit: 0.03,
      supplierName: "Monin Craft",
    },
  });

  const matchaPowder = await prisma.inventoryItem.create({
    data: {
      name: "Uji Ceremonial Matcha",
      sku: "RAW-TEA-001",
      category: "BEANS",
      unit: "g",
      currentStock: 850,
      minStockAlert: 200,
      costPerUnit: 0.15,
      supplierName: "Kyoto Tea Estates",
    },
  });

  const cups12oz = await prisma.inventoryItem.create({
    data: {
      name: "Compostable Cups 12oz + Lids",
      sku: "PKG-CUP-012",
      category: "PACKAGING",
      unit: "pcs",
      currentStock: 480,
      minStockAlert: 150,
      costPerUnit: 0.18,
      supplierName: "EcoPack Supplies",
    },
  });

  const sourdoughBreads = await prisma.inventoryItem.create({
    data: {
      name: "Fresh Sourdough Loaf (Slices)",
      sku: "RAW-BAK-001",
      category: "BAKERY",
      unit: "pcs",
      currentStock: 35,
      minStockAlert: 10,
      costPerUnit: 0.8,
      supplierName: "Heritage Hearth Bakery",
    },
  });

  // 4. Modifier Groups
  const milkModGroup = await prisma.modifierGroup.create({
    data: {
      name: "Milk Choice",
      minSelection: 0,
      maxSelection: 1,
      isRequired: false,
      options: {
        create: [
          { name: "Whole Milk", priceDelta: 0.0 },
          { name: "Oat Milk (Barista)", priceDelta: 0.8 },
          { name: "Almond Milk", priceDelta: 0.8 },
          { name: "Skim Milk", priceDelta: 0.0 },
        ],
      },
    },
  });

  const sweetModGroup = await prisma.modifierGroup.create({
    data: {
      name: "Sweetness Level",
      minSelection: 0,
      maxSelection: 1,
      isRequired: false,
      options: {
        create: [
          { name: "Unsweetened (100% Pure)", priceDelta: 0.0 },
          { name: "50% Light Sweet", priceDelta: 0.0 },
          { name: "Regular Sweet", priceDelta: 0.0 },
          { name: "Extra Sweet", priceDelta: 0.0 },
        ],
      },
    },
  });

  const shotsModGroup = await prisma.modifierGroup.create({
    data: {
      name: "Espresso Add-ons",
      minSelection: 0,
      maxSelection: 2,
      isRequired: false,
      options: {
        create: [
          { name: "Extra Espresso Shot", priceDelta: 1.25 },
          { name: "Decaf Roast", priceDelta: 0.5 },
          { name: "Add Caramel Drizzle", priceDelta: 0.75 },
          { name: "Add Madagascar Vanilla", priceDelta: 0.75 },
        ],
      },
    },
  });

  // 5. Categories
  const catCoffee = await prisma.category.create({
    data: {
      name: "Espresso & Coffee",
      slug: "coffee-espresso",
      icon: "Coffee",
      sortOrder: 1,
    },
  });

  const catBrew = await prisma.category.create({
    data: {
      name: "Specialty Pour Over",
      slug: "specialty-brew",
      icon: "Flame",
      sortOrder: 2,
    },
  });

  const catTea = await prisma.category.create({
    data: {
      name: "Artisan Tea & Matcha",
      slug: "tea-matcha",
      icon: "Leaf",
      sortOrder: 3,
    },
  });

  const catBakery = await prisma.category.create({
    data: {
      name: "Bakery & Pastry",
      slug: "bakery-pastry",
      icon: "Cake",
      sortOrder: 4,
    },
  });

  const catBrunch = await prisma.category.create({
    data: {
      name: "Kitchen & Brunch",
      slug: "brunch-mains",
      icon: "Utensils",
      sortOrder: 5,
    },
  });

  // 6. Menu Items
  const flatWhite = await prisma.menuItem.create({
    data: {
      name: "Velvet Flat White",
      description: "Double ristretto poured with finely micro-textured steamed milk in silky harmony.",
      price: 4.85,
      costPrice: 1.15,
      image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80",
      categoryId: catCoffee.id,
      prepTimeMinutes: 3,
      modifierGroups: {
        create: [
          { modifierGroupId: milkModGroup.id },
          { modifierGroupId: shotsModGroup.id },
        ],
      },
      recipeItems: {
        create: [
          { inventoryItemId: beansEspresso.id, quantity: 0.018, unit: "kg" },
          { inventoryItemId: wholeMilk.id, quantity: 0.22, unit: "L" },
          { inventoryItemId: cups12oz.id, quantity: 1, unit: "pcs" },
        ],
      },
    },
  });

  const vanillaLatte = await prisma.menuItem.create({
    data: {
      name: "Madagascar Vanilla Latte",
      description: "Slow-steamed latte infused with natural Bourbon vanilla bean reduction.",
      price: 5.65,
      costPrice: 1.45,
      image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
      categoryId: catCoffee.id,
      prepTimeMinutes: 4,
      modifierGroups: {
        create: [
          { modifierGroupId: milkModGroup.id },
          { modifierGroupId: sweetModGroup.id },
          { modifierGroupId: shotsModGroup.id },
        ],
      },
      recipeItems: {
        create: [
          { inventoryItemId: beansEspresso.id, quantity: 0.018, unit: "kg" },
          { inventoryItemId: wholeMilk.id, quantity: 0.28, unit: "L" },
          { inventoryItemId: vanillaSyrup.id, quantity: 20, unit: "ml" },
          { inventoryItemId: cups12oz.id, quantity: 1, unit: "pcs" },
        ],
      },
    },
  });

  const chemexPourOver = await prisma.menuItem.create({
    data: {
      name: "Ethiopian Guji Chemex",
      description: "Single origin pour-over with bright floral jasmine and wild berry notes.",
      price: 6.5,
      costPrice: 1.6,
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
      categoryId: catBrew.id,
      prepTimeMinutes: 6,
      recipeItems: {
        create: [
          { inventoryItemId: beansSingleOrigin.id, quantity: 0.024, unit: "kg" },
          { inventoryItemId: cups12oz.id, quantity: 1, unit: "pcs" },
        ],
      },
    },
  });

  const matchaLatte = await prisma.menuItem.create({
    data: {
      name: "Kyoto Ceremonial Matcha Latte",
      description: "Whisked stone-ground Uji matcha combined with silky steamed oat milk.",
      price: 6.25,
      costPrice: 1.85,
      image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
      categoryId: catTea.id,
      prepTimeMinutes: 4,
      modifierGroups: {
        create: [
          { modifierGroupId: milkModGroup.id },
          { modifierGroupId: sweetModGroup.id },
        ],
      },
      recipeItems: {
        create: [
          { inventoryItemId: matchaPowder.id, quantity: 4.0, unit: "g" },
          { inventoryItemId: oatMilk.id, quantity: 0.25, unit: "L" },
          { inventoryItemId: cups12oz.id, quantity: 1, unit: "pcs" },
        ],
      },
    },
  });

  const almondCroissant = await prisma.menuItem.create({
    data: {
      name: "Twice-Baked Almond Croissant",
      description: "Flaky artisanal butter croissant filled with frangipane and topped with toasted almonds.",
      price: 4.95,
      costPrice: 1.5,
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
      categoryId: catBakery.id,
      prepTimeMinutes: 2,
    },
  });

  const avoToast = await prisma.menuItem.create({
    data: {
      name: "Truffle Avocado & Poached Egg Toast",
      description: "Whipped hass avocado on toasted sourdough, heirloom radish, free-range poached egg, white truffle oil.",
      price: 13.5,
      costPrice: 3.8,
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      categoryId: catBrunch.id,
      prepTimeMinutes: 8,
      recipeItems: {
        create: [
          { inventoryItemId: sourdoughBreads.id, quantity: 2, unit: "pcs" },
        ],
      },
    },
  });

  const shakshuka = await prisma.menuItem.create({
    data: {
      name: "Moroccan Spiced Shakshuka",
      description: "Cast-iron simmered tomatoes, smoked paprika, roasted bell peppers, feta crumble, with garlic sourdough.",
      price: 14.5,
      costPrice: 4.1,
      image: "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=600&q=80",
      categoryId: catBrunch.id,
      prepTimeMinutes: 10,
      recipeItems: {
        create: [
          { inventoryItemId: sourdoughBreads.id, quantity: 2, unit: "pcs" },
        ],
      },
    },
  });

  // 7. Tables
  const t1 = await prisma.restaurantTable.create({
    data: { number: "T-01", name: "Lounge 1", section: "Indoor Lounge", capacity: 2, status: "OCCUPIED", posX: 50, posY: 60 },
  });
  const t2 = await prisma.restaurantTable.create({
    data: { number: "T-02", name: "Lounge 2", section: "Indoor Lounge", capacity: 4, status: "AVAILABLE", posX: 200, posY: 60 },
  });
  const t3 = await prisma.restaurantTable.create({
    data: { number: "T-03", name: "Window 1", section: "Indoor Lounge", capacity: 2, status: "AVAILABLE", posX: 350, posY: 60 },
  });
  const t4 = await prisma.restaurantTable.create({
    data: { number: "T-04", name: "Terrace Garden 1", section: "Terrace Garden", capacity: 4, status: "BILLED", posX: 50, posY: 220 },
  });
  const t5 = await prisma.restaurantTable.create({
    data: { number: "T-05", name: "Terrace Garden 2", section: "Terrace Garden", capacity: 6, status: "AVAILABLE", posX: 220, posY: 220 },
  });
  const t6 = await prisma.restaurantTable.create({
    data: { number: "VIP-1", name: "Velvet Private Booth", section: "VIP Room", capacity: 8, status: "RESERVED", posX: 380, posY: 220 },
  });

  // 8. Sample Active Orders
  // Active Order on T-01
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-2041",
      type: "DINE_IN",
      tableId: t1.id,
      status: "PREPARING",
      paymentStatus: "UNPAID",
      subtotal: 23.15,
      tax: 1.85,
      total: 25.0,
      staffId: baristaStaff.id,
      customerName: "Liam Johnson",
      notes: "Extra hot flat white please",
      items: {
        create: [
          {
            menuItemId: flatWhite.id,
            menuItemName: "Velvet Flat White",
            unitPrice: 4.85,
            quantity: 2,
            total: 9.7,
            status: "PREPARING",
            selectedModifiers: JSON.stringify(["Oat Milk (Barista)", "Extra Espresso Shot"]),
          },
          {
            menuItemId: avoToast.id,
            menuItemName: "Truffle Avocado & Poached Egg Toast",
            unitPrice: 13.5,
            quantity: 1,
            total: 13.5,
            status: "QUEUED",
            notes: "Egg soft poached",
          },
        ],
      },
    },
  });

  // Ready Takeaway Order
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2042",
      type: "TAKEAWAY",
      status: "READY",
      paymentStatus: "PAID",
      paymentMethod: "QR_APPLE_PAY",
      subtotal: 11.9,
      tax: 0.95,
      total: 12.85,
      staffId: adminStaff.id,
      customerName: "Sarah Connor",
      customerPhone: "+1 (555) 392-1082",
      items: {
        create: [
          {
            menuItemId: matchaLatte.id,
            menuItemName: "Kyoto Ceremonial Matcha Latte",
            unitPrice: 6.25,
            quantity: 1,
            total: 6.25,
            status: "READY",
            selectedModifiers: JSON.stringify(["Oat Milk (Barista)", "50% Light Sweet"]),
          },
          {
            menuItemId: vanillaLatte.id,
            menuItemName: "Madagascar Vanilla Latte",
            unitPrice: 5.65,
            quantity: 1,
            total: 5.65,
            status: "READY",
          },
        ],
      },
    },
  });

  // Completed Orders for Analytics & History
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2039",
      type: "DINE_IN",
      tableId: t4.id,
      status: "COMPLETED",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      subtotal: 34.45,
      tax: 2.76,
      tip: 5.0,
      total: 42.21,
      staffId: adminStaff.id,
      customerName: "David K.",
      createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      items: {
        create: [
          {
            menuItemId: shakshuka.id,
            menuItemName: "Moroccan Spiced Shakshuka",
            unitPrice: 14.5,
            quantity: 2,
            total: 29.0,
            status: "SERVED",
          },
          {
            menuItemId: chemexPourOver.id,
            menuItemName: "Ethiopian Guji Chemex",
            unitPrice: 6.5,
            quantity: 1,
            total: 6.5,
            status: "SERVED",
          },
        ],
      },
    },
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
