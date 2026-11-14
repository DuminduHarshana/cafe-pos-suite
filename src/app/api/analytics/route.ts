import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalTips = paidOrders.reduce((sum, o) => sum + o.tip, 0);
    const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Top selling items
    const itemMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = itemMap.get(item.menuItemId) || {
          name: item.menuItemName,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.total;
        itemMap.set(item.menuItemId, existing);
      }
    }

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Payment methods breakdown
    const paymentMethods = paidOrders.reduce((acc: Record<string, number>, curr) => {
      const method = curr.paymentMethod || "CASH";
      acc[method] = (acc[method] || 0) + curr.total;
      return acc;
    }, {});

    return NextResponse.json(
      {
        metrics: {
          totalRevenue,
          totalOrders,
          avgTicket,
          totalTips,
          activeOrdersCount: orders.filter((o) => ["PENDING", "PREPARING", "READY"].includes(o.status)).length,
        },
        topItems,
        paymentMethods,
        recentOrders: orders.slice(0, 8),
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
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
