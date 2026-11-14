import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/inventory - Fetch raw materials and stock levels
export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: {
        recipes: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const lowStockCount = items.filter((item) => item.currentStock <= item.minStockAlert).length;
    const totalValuation = items.reduce((acc, curr) => acc + curr.currentStock * curr.costPerUnit, 0);

    return NextResponse.json(
      {
        items,
        stats: {
          totalItems: items.length,
          lowStockCount,
          totalValuation,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST /api/inventory - Create new inventory item OR restock existing item
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Case 1: CREATE NEW INVENTORY ITEM
    if (body.action === "CREATE" || (!body.id && body.name)) {
      const {
        name,
        sku,
        category,
        unit,
        currentStock,
        minStockAlert,
        costPerUnit,
        supplierName,
        staffName,
      } = body;

      if (!name || String(name).trim() === "") {
        return NextResponse.json({ error: "Item name is required" }, { status: 400 });
      }

      const cleanName = String(name).trim();
      const rawCat = (category || "GENERAL").toString().toUpperCase().trim();
      const catCode = rawCat.replace(/[^A-Z0-9]/g, "").slice(0, 4) || "GEN";
      const cleanSku =
        sku && String(sku).trim() !== ""
          ? String(sku).trim()
          : `INV-${catCode}-${Date.now().toString().slice(-4)}`;

      // Check for SKU conflict
      const existing = await prisma.inventoryItem.findUnique({
        where: { sku: cleanSku },
      });
      const finalSku = existing ? `${cleanSku}-${Math.floor(Math.random() * 900 + 100)}` : cleanSku;

      const initStock = parseFloat(currentStock) || 0.0;
      const cost = parseFloat(costPerUnit) || 0.0;
      const minAlert = parseFloat(minStockAlert) || 5.0;

      const created = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.create({
          data: {
            name: cleanName,
            sku: finalSku,
            category: rawCat,
            unit: unit ? String(unit).trim() : "units",
            currentStock: initStock,
            minStockAlert: minAlert,
            costPerUnit: cost,
            supplierName: supplierName ? String(supplierName).trim() : null,
          },
        });

        if (initStock > 0) {
          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: item.id,
              type: "RESTOCK",
              quantity: initStock,
              reason: "Initial Opening Stock Count",
              staffName: staffName || "Milindu",
            },
          });
        }

        return item;
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Case 2: RESTOCK / ADJUST EXISTING INVENTORY ITEM
    const { id, quantity, type, reason, costPerUnit, staffName } = body;
    if (!id) {
      return NextResponse.json({ error: "Inventory item ID or valid creation payload required" }, { status: 400 });
    }

    const qtyNumber = parseFloat(quantity) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUnique({ where: { id } });
      if (!current) throw new Error("Inventory item not found");

      const newStock = type === "RESTOCK" ? current.currentStock + qtyNumber : current.currentStock + qtyNumber;

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          currentStock: Math.max(0, newStock),
          ...(costPerUnit !== undefined && { costPerUnit: parseFloat(costPerUnit) }),
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          type: type || "RESTOCK",
          quantity: qtyNumber,
          reason: reason || (type === "RESTOCK" ? "Purchase Order Restock" : "Manual Stock Adjustment"),
          staffName: staffName || "Milindu",
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to process inventory update/create:", error);
    return NextResponse.json({ error: "Failed to process inventory request" }, { status: 500 });
  }
}

// DELETE /api/inventory - Remove an inventory item
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: true, message: "Inventory item already removed" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Clean up recipes and transactions first so FK constraints never block deletion
    await prisma.menuItemIngredient.deleteMany({
      where: { inventoryItemId: id },
    });
    await prisma.inventoryTransaction.deleteMany({
      where: { inventoryItemId: id },
    });

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { success: true, message: "Inventory item already removed" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("Failed to delete inventory item:", error);
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}
