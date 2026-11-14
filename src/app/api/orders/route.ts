import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/orders - Get orders with filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const activeOnly = searchParams.get("active") === "true";

    const whereClause: {
      status?: { in: string[] } | string;
    } = {};

    if (activeOnly) {
      whereClause.status = { in: ["PENDING", "PREPARING", "READY", "SERVED"] };
    } else if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        table: true,
        staff: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders - Create a new order with inventory recipe deductions
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type,
      tableId,
      customerName,
      customerPhone,
      notes,
      staffId,
      subtotal,
      discount,
      tax,
      tip,
      total,
      paymentMethod,
      paymentStatus,
      items,
    } = body;

    // Generate unique order number (e.g., ORD-7821)
    const count = await prisma.order.count();
    const orderNumber = `ORD-${String(2000 + count + 1).padStart(4, "0")}`;

    // Execute order creation and stock deductions in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          type: type || "DINE_IN",
          tableId: tableId || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          notes: notes || null,
          staffId: staffId || null,
          subtotal: parseFloat(subtotal) || 0,
          discount: parseFloat(discount) || 0,
          tax: parseFloat(tax) || 0,
          tip: parseFloat(tip) || 0,
          total: parseFloat(total) || 0,
          paymentMethod: paymentMethod || null,
          paymentStatus: paymentStatus || "UNPAID",
          status: paymentStatus === "PAID" && type === "TAKEAWAY" ? "PREPARING" : "PENDING",
          items: {
            create: items.map((item: {
              menuItemId: string;
              menuItemName: string;
              unitPrice: number;
              quantity: number;
              total: number;
              notes?: string;
              selectedModifiers?: string[];
            }) => ({
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              total: item.total,
              notes: item.notes || null,
              selectedModifiers: item.selectedModifiers ? JSON.stringify(item.selectedModifiers) : null,
              status: "QUEUED",
            })),
          },
        },
        include: {
          table: true,
          items: true,
          staff: true,
        },
      });

      // 2. If table is assigned, mark table as OCCUPIED
      if (tableId) {
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { status: "OCCUPIED" },
        });
      }

      // 3. Deduct raw inventory materials for ordered items linked to recipes
      for (const item of items) {
        const recipes = await tx.menuItemIngredient.findMany({
          where: { menuItemId: item.menuItemId },
        });

        for (const recipe of recipes) {
          const totalDeduction = recipe.quantity * (item.quantity || 1);

          await tx.inventoryItem.update({
            where: { id: recipe.inventoryItemId },
            data: {
              currentStock: {
                decrement: totalDeduction,
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: recipe.inventoryItemId,
              type: "ORDER_DEDUCTION",
              quantity: -totalDeduction,
              reason: `Order ${orderNumber} - ${item.quantity}x ${item.menuItemName}`,
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

// PATCH /api/orders - Update order status, payment, or completion
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, paymentStatus, paymentMethod, tip, total } = body;

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const dataToUpdate: {
      status?: string;
      paymentStatus?: string;
      paymentMethod?: string;
      tip?: number;
      total?: number;
    } = {};

    if (status) dataToUpdate.status = status;
    if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;
    if (paymentMethod) dataToUpdate.paymentMethod = paymentMethod;
    if (tip !== undefined) dataToUpdate.tip = parseFloat(tip);
    if (total !== undefined) dataToUpdate.total = parseFloat(total);

    const updated = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
      include: {
        table: true,
        items: true,
        staff: true,
      },
    });

    // If order was completed and had a table, free up the table!
    if (status === "COMPLETED" && currentOrder.tableId) {
      await prisma.restaurantTable.update({
        where: { id: currentOrder.tableId },
        data: { status: "AVAILABLE" },
      });
    } else if (status === "SERVED" && currentOrder.tableId && currentOrder.paymentStatus !== "PAID") {
      await prisma.restaurantTable.update({
        where: { id: currentOrder.tableId },
        data: { status: "BILLED" },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
