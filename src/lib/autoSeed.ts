import { prisma } from "@/lib/prisma";

export async function ensureDefaultCategories() {
  const catCount = await prisma.category.count();
  if (catCount > 0) return;

  // 1. Create Default Categories
  const catCoffee = await prisma.category.create({
    data: {
      name: "Espresso & Coffee",
      slug: "coffee-espresso",
      icon: "Coffee",
      sortOrder: 1,
    },
  });

  const catSpecialty = await prisma.category.create({
    data: {
      name: "Specialty Drinks",
      slug: "specialty-drinks",
      icon: "Sparkles",
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
      slug: "brunch-food",
      icon: "Utensils",
      sortOrder: 5,
    },
  });

  // 2. Create Modifier Groups
  const milkMod = await prisma.modifierGroup.create({
    data: {
      name: "Milk Preference",
      minSelection: 0,
      maxSelection: 1,
      options: {
        create: [
          { name: "Whole Milk", priceDelta: 0.0 },
          { name: "Oat Milk (Barista Edition)", priceDelta: 0.75 },
          { name: "Almond Milk", priceDelta: 0.75 },
          { name: "Soy Milk", priceDelta: 0.60 },
        ],
      },
    },
  });

  const shotsMod = await prisma.modifierGroup.create({
    data: {
      name: "Espresso Shots",
      minSelection: 0,
      maxSelection: 2,
      options: {
        create: [
          { name: "Extra Espresso Shot", priceDelta: 1.00 },
          { name: "Decaf Espresso", priceDelta: 0.50 },
        ],
      },
    },
  });

  const sweetnessMod = await prisma.modifierGroup.create({
    data: {
      name: "Sweetness Level",
      minSelection: 0,
      maxSelection: 1,
      options: {
        create: [
          { name: "Standard Sweetness", priceDelta: 0.0 },
          { name: "Less Sweet (50%)", priceDelta: 0.0 },
          { name: "Extra Sweet", priceDelta: 0.25 },
          { name: "Sugar-Free Vanilla", priceDelta: 0.50 },
        ],
      },
    },
  });

  // 3. Create Starter Menu Items
  await prisma.menuItem.create({
    data: {
      name: "Velvet Flat White",
      description: "Double ristretto poured with silky micro-textured steamed milk.",
      price: 4.85,
      costPrice: 1.15,
      image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80",
      categoryId: catCoffee.id,
      prepTimeMinutes: 3,
      modifierGroups: {
        create: [
          { modifierGroupId: milkMod.id },
          { modifierGroupId: shotsMod.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Iced Caramel Macchiato",
      description: "Freshly pulled espresso layered over chilled vanilla milk and buttery caramel drizzle.",
      price: 5.50,
      costPrice: 1.35,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
      categoryId: catSpecialty.id,
      prepTimeMinutes: 4,
      modifierGroups: {
        create: [
          { modifierGroupId: milkMod.id },
          { modifierGroupId: sweetnessMod.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Kyoto Cold Brew",
      description: "Slow-dripped single origin coffee brewed cold over 16 hours for unmatched clarity.",
      price: 4.95,
      costPrice: 0.95,
      image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
      categoryId: catCoffee.id,
      prepTimeMinutes: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Ceremonial Matcha Latte",
      description: "First-harvest Uji ceremonial matcha whisked with oat or whole milk.",
      price: 5.25,
      costPrice: 1.40,
      image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
      categoryId: catTea.id,
      prepTimeMinutes: 4,
      modifierGroups: {
        create: [
          { modifierGroupId: milkMod.id },
          { modifierGroupId: sweetnessMod.id },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Golden Butter Croissant",
      description: "Flaky artisanal French butter pastry baked fresh daily.",
      price: 3.85,
      costPrice: 0.90,
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
      categoryId: catBakery.id,
      prepTimeMinutes: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      name: "Smashed Avocado Toast",
      description: "Hass avocado, pickled shallots, Persian feta, and microgreens on toasted artisan sourdough.",
      price: 11.50,
      costPrice: 3.20,
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      categoryId: catBrunch.id,
      prepTimeMinutes: 8,
    },
  });
}

export async function ensureDefaultTables() {
  const tableCount = await prisma.restaurantTable.count();
  if (tableCount > 0) return;

  const defaultTables = [
    { number: "T1", name: "Table 1", section: "Main Hall", capacity: 2 },
    { number: "T2", name: "Table 2", section: "Main Hall", capacity: 2 },
    { number: "T3", name: "Table 3", section: "Main Hall", capacity: 4 },
    { number: "T4", name: "Table 4", section: "Main Hall", capacity: 4 },
    { number: "T5", name: "Window Booth 5", section: "Window Section", capacity: 6 },
    { number: "B1", name: "Espresso Bar 1", section: "Bar Counter", capacity: 1 },
    { number: "B2", name: "Espresso Bar 2", section: "Bar Counter", capacity: 1 },
    { number: "P1", name: "Garden Patio 1", section: "Outdoor Patio", capacity: 4 },
    { number: "P2", name: "Garden Patio 2", section: "Outdoor Patio", capacity: 4 },
  ];

  for (const table of defaultTables) {
    await prisma.restaurantTable.create({
      data: {
        number: table.number,
        name: table.name,
        section: table.section,
        capacity: table.capacity,
        status: "AVAILABLE",
      },
    });
  }
}

export async function ensureDefaultInventory() {
  const invCount = await prisma.inventoryItem.count();
  if (invCount > 0) return;

  const defaultItems = [
    { name: "House Espresso Roast Beans", sku: "RAW-COF-001", category: "BEANS", unit: "kg", currentStock: 20.0, minStockAlert: 5.0, costPerUnit: 22.0, supplierName: "Lilly's Roasters" },
    { name: "Whole Barista Milk", sku: "RAW-DRY-001", category: "DAIRY", unit: "L", currentStock: 48.0, minStockAlert: 12.0, costPerUnit: 1.65, supplierName: "Local Dairy Co." },
    { name: "Oat Milk (Barista Edition)", sku: "RAW-DRY-002", category: "DAIRY", unit: "L", currentStock: 30.0, minStockAlert: 8.0, costPerUnit: 2.85, supplierName: "Oat Barista Supply" },
    { name: "Madagascar Vanilla Syrup", sku: "RAW-SYR-001", category: "SYRUPS", unit: "bottle", currentStock: 10.0, minStockAlert: 2.0, costPerUnit: 9.50, supplierName: "Artisan Syrups" },
    { name: "Ceremonial Uji Matcha Powder", sku: "RAW-TEA-001", category: "TEA", unit: "kg", currentStock: 4.5, minStockAlert: 1.0, costPerUnit: 65.0, supplierName: "Kyoto Imports" },
    { name: "French Butter Croissant Dough", sku: "RAW-BAK-001", category: "BAKERY", unit: "pcs", currentStock: 60.0, minStockAlert: 15.0, costPerUnit: 0.90, supplierName: "Artisan Bakery" },
  ];

  for (const item of defaultItems) {
    await prisma.inventoryItem.create({ data: item });
  }
}
