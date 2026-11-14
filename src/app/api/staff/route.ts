import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_STAFF = [
  {
    name: "Milindu",
    pin: "1111",
    role: "ADMIN",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Barista",
    pin: "3333",
    role: "BARISTA",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Cashier",
    pin: "4444",
    role: "CASHIER",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
];

let staffChecked = false;

async function ensureDefaultStaff() {
  if (staffChecked) return;
  try {
    const count = await prisma.staff.count();
    if (count === 0) {
      for (const member of DEFAULT_STAFF) {
        await prisma.staff.create({ data: member });
      }
    } else {
      // Migrate any legacy demo staff names to the requested naming
      await prisma.staff.updateMany({
        where: { name: "Julian Vance" },
        data: { name: "Milindu", role: "ADMIN", pin: "1111" },
      });
      await prisma.staff.updateMany({
        where: { name: "Mateo Silva" },
        data: { name: "Barista", role: "BARISTA", pin: "3333" },
      });
      await prisma.staff.updateMany({
        where: { name: "Chloe Bennett" },
        data: { name: "Cashier", role: "CASHIER", pin: "4444" },
      });

      // Deduplicate any extra duplicate staff records
      const allActive = await prisma.staff.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
      });
      const seenRoles = new Set<string>();
      for (const member of allActive) {
        if (seenRoles.has(member.role) || !["ADMIN", "BARISTA", "CASHIER"].includes(member.role)) {
          await prisma.staff.update({
            where: { id: member.id },
            data: { active: false },
          });
        } else {
          seenRoles.add(member.role);
        }
      }
    }
    staffChecked = true;
  } catch (e) {
    console.error("Failed checking staff seed:", e);
  }
}

export async function GET() {
  try {
    await ensureDefaultStaff();

    const rawStaff = await prisma.staff.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
      },
      orderBy: { role: "asc" },
    });

    // Deduplicate by role so only 1 Admin, 1 Barista, 1 Cashier are returned
    const uniqueMap = new Map<string, typeof rawStaff[0]>();
    for (const s of rawStaff) {
      if (!uniqueMap.has(s.role) && ["ADMIN", "BARISTA", "CASHIER"].includes(s.role)) {
        uniqueMap.set(s.role, s);
      }
    }

    const staff = ["ADMIN", "BARISTA", "CASHIER"]
      .map((role) => uniqueMap.get(role))
      .filter((s): s is typeof rawStaff[0] => Boolean(s));

    return NextResponse.json(staff.length > 0 ? staff : rawStaff);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    // Fallback in case DB is momentarily unavailable
    return NextResponse.json(
      DEFAULT_STAFF.map((s, idx) => ({
        id: `fallback-${idx}`,
        name: s.name,
        role: s.role,
        avatar: s.avatar,
      }))
    );
  }
}

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const pinStr = String(pin).trim();

    await ensureDefaultStaff();

    let staff = await prisma.staff.findFirst({
      where: { pin: pinStr, active: true },
    });

    // Fallback matching if DB offline or fresh
    if (!staff) {
      const match = DEFAULT_STAFF.find((s) => s.pin === pinStr);
      if (match) {
        staff = {
          id: `default-${match.role.toLowerCase()}`,
          name: match.name,
          role: match.role,
          avatar: match.avatar,
          pin: match.pin,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    if (!staff) {
      return NextResponse.json({ error: "Invalid PIN code" }, { status: 401 });
    }

    const sessionPayload = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      avatar: staff.avatar,
    };

    const response = NextResponse.json(sessionPayload);
    // Set a lightweight session cookie
    response.cookies.set("lilly_pos_session", JSON.stringify(sessionPayload), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("PIN check failed:", error);
    return NextResponse.json({ error: "PIN check failed" }, { status: 500 });
  }
}
