import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/menu - Get all categories and menu items
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: {
            modifierGroups: {
              include: {
                modifierGroup: {
                  include: {
                    options: true,
                  },
                },
              },
            },
            recipeItems: {
              include: {
                inventoryItem: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    const modifierGroups = await prisma.modifierGroup.findMany({
      include: {
        options: true,
      },
    });

    return NextResponse.json({ categories, modifierGroups });
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

// POST /api/menu - Create a new menu item
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, price, costPrice, categoryId, image, prepTimeMinutes, modifierGroupIds } = body;

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price) || 0,
        costPrice: parseFloat(costPrice) || 0,
        categoryId,
        image: image || "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=600&q=80",
        prepTimeMinutes: parseInt(prepTimeMinutes) || 5,
        modifierGroups: modifierGroupIds?.length
          ? {
              create: modifierGroupIds.map((groupId: string) => ({
                modifierGroupId: groupId,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create menu item:", error);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}

// PUT /api/menu - Update a menu item (pricing, name, etc.)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, price, costPrice, categoryId, prepTimeMinutes, isAvailable } = body;

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice),
        categoryId,
        prepTimeMinutes: parseInt(prepTimeMinutes),
        isAvailable,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update menu item:", error);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

// PATCH /api/menu - Instant 86 out-of-stock toggle
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isAvailable } = body;

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to toggle availability:", error);
    return NextResponse.json({ error: "Failed to toggle availability" }, { status: 500 });
  }
}
