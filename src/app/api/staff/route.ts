import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
      },
      orderBy: { role: "asc" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    const staff = await prisma.staff.findFirst({
      where: { pin: String(pin), active: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Invalid PIN code" }, { status: 401 });
    }

    return NextResponse.json({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      avatar: staff.avatar,
    });
  } catch (error) {
    console.error("PIN check failed:", error);
    return NextResponse.json({ error: "PIN check failed" }, { status: 500 });
  }
}
