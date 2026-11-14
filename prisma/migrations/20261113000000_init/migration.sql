-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL DEFAULT '1234',
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Coffee',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "image" TEXT,
    "categoryId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "prepTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "barcode" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelection" INTEGER NOT NULL DEFAULT 0,
    "maxSelection" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemModifierGroup" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,

    CONSTRAINT "ItemModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "modifierGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'BEANS',
    "unit" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "minStockAlert" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "supplierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "staffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'Indoor',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DINE_IN',
    "tableId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tip" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "menuItemName" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "selectedModifiers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ItemModifierGroup_menuItemId_modifierGroupId_key" ON "ItemModifierGroup"("menuItemId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_inventoryItemId_key" ON "MenuItemIngredient"("menuItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_number_key" ON "RestaurantTable"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemModifierGroup" ADD CONSTRAINT "ItemModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemModifierGroup" ADD CONSTRAINT "ItemModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

