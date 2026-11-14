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

