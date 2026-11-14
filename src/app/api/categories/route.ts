import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/autoSeed";

export const dynamic = "force-dynamic";

// GET /api/categories - List all menu categories
export async function GET() {
  try {
    await ensureDefaultCategories();

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST /api/categories - Create a new menu category dynamically
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, icon, sortOrder } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if category or slug already exists
    let category = await prisma.category.findFirst({
      where: {
        OR: [{ name: cleanName }, { slug }],
      },
    });

    if (category) {
      return NextResponse.json(category, { status: 200 });
    }

    const maxSort = await prisma.category.aggregate({
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    category = await prisma.category.create({
      data: {
        name: cleanName,
        slug: slug || `cat-${Date.now()}`,
        icon: icon || "Coffee",
        sortOrder: typeof sortOrder === "number" ? sortOrder : nextSort,
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

// PUT /api/categories - Update a category (name, icon, sort order)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, icon, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const cleanName = name ? String(name).trim() : undefined;
    const slug = cleanName
      ? cleanName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : undefined;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: cleanName,
        slug: slug || undefined,
        icon: icon || undefined,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories - Delete a category and reassign items
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    // Find a fallback category to reassign any child items
    let fallbackCat = await prisma.category.findFirst({
      where: { id: { not: id }, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // If no other category exists, create a default "General" category
    if (!fallbackCat) {
      fallbackCat = await prisma.category.create({
        data: {
          name: "General Items",
          slug: "general-items",
          icon: "Coffee",
          sortOrder: 1,
          isActive: true,
        },
      });
    }

    // Reassign items from deleting category to fallback category
    await prisma.menuItem.updateMany({
      where: { categoryId: id },
      data: { categoryId: fallbackCat.id },
    });

    // Delete the category
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Category removed. Items reassigned to "${fallbackCat.name}".`,
    });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

