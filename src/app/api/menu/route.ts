import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/autoSeed";

export const dynamic = "force-dynamic";

// GET /api/menu - Get all categories and menu items
export async function GET() {
  try {
    await ensureDefaultCategories();

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

    return NextResponse.json(
      { categories, modifierGroups },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

// POST /api/menu - Create a new menu item
export async function POST(req: Request) {
  try {
    await ensureDefaultCategories();

    const body = await req.json();
    const { name, description, price, costPrice, categoryId, image, prepTimeMinutes, modifierGroupIds } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    // Resolve or fallback categoryId so Prisma never fails with undefined category
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId || String(resolvedCategoryId).trim() === "") {
      const defaultCategory = await prisma.category.findFirst({
        orderBy: { sortOrder: "asc" },
      });
      if (defaultCategory) {
        resolvedCategoryId = defaultCategory.id;
      } else {
        const newCat = await prisma.category.create({
          data: {
            name: "Espresso & Coffee",
            slug: "coffee-espresso",
            icon: "Coffee",
            sortOrder: 1,
          },
        });
        resolvedCategoryId = newCat.id;
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        price: parseFloat(price) || 0,
        costPrice: parseFloat(costPrice) || 0,
        categoryId: resolvedCategoryId,
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

// PUT /api/menu - Full update of a menu item
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      description,
      price,
      costPrice,
      categoryId,
      image,
      prepTimeMinutes,
      isAvailable,
      modifierGroupIds,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    // If modifierGroupIds provided, update relations
    if (Array.isArray(modifierGroupIds)) {
      await prisma.itemModifierGroup.deleteMany({
        where: { menuItemId: id },
      });
      if (modifierGroupIds.length > 0) {
        await prisma.itemModifierGroup.createMany({
          data: modifierGroupIds.map((groupId: string) => ({
            menuItemId: id,
            modifierGroupId: groupId,
          })),
        });
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        categoryId: categoryId || undefined,
        image: image !== undefined ? (image ? String(image).trim() : null) : undefined,
        prepTimeMinutes: prepTimeMinutes !== undefined ? parseInt(prepTimeMinutes) : undefined,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update menu item:", error);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

// DELETE /api/menu - Delete a menu item permanently
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Menu item ID is required" }, { status: 400 });
    }

    // Check if item exists first - if already gone, return success idempotently
    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: true, message: "Menu item already removed" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Remove join relations first
    await prisma.itemModifierGroup.deleteMany({
      where: { menuItemId: id },
    });
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId: id },
    });

    // Remove any historical order item references so delete never fails with FK constraint
    await prisma.orderItem.deleteMany({
      where: { menuItemId: id },
    });

    // Delete menu item
    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "Menu item deleted successfully" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { success: true, message: "Menu item already removed" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("Failed to delete menu item:", error);
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
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
