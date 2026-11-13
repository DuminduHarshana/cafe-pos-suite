import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      items,
      stats: {
        totalItems: items.length,
        lowStockCount,
        totalValuation,
      },
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST /api/inventory - Restock or manual inventory adjustment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, quantity, type, reason, costPerUnit, staffName } = body;

    const qtyNumber = parseFloat(quantity) || 0;

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUnique({ where: { id } });
      if (!current) throw new Error("Item not found");

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
          reason: reason || (type === "RESTOCK" ? "Purchase Order Restock" : "Manual Adjustment"),
          staffName: staffName || "Admin",
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update inventory:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
