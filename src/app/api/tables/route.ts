import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultTables } from "@/lib/autoSeed";

export const dynamic = "force-dynamic";

// GET /api/tables - List tables with active orders
export async function GET() {
  try {
    await ensureDefaultTables();

    const tables = await prisma.restaurantTable.findMany({
      include: {
        orders: {
          where: {
            status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] },
          },
          include: {
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(tables);
  } catch (error) {
    console.error("Failed to fetch tables:", error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

// POST /api/tables - Add new table
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { number, name, section, capacity } = body;

    const table = await prisma.restaurantTable.create({
      data: {
        number,
        name: name || `Table ${number}`,
        section: section || "Indoor",
        capacity: parseInt(capacity) || 2,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    console.error("Failed to create table:", error);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}

// PATCH /api/tables - Update table status or details
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, capacity, section, name } = body;

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(section && { section }),
        ...(name && { name }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update table:", error);
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}
