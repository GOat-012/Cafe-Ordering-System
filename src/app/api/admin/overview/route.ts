import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(firstDay.getTime() + index * 24 * 60 * 60 * 1000);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  });
  const [cafe, products, categories, tables, inventory, sales, staff, recentOrders, dailySales] = await Promise.all([
    prisma.cafe.findUnique({ where: { id: user.cafeId }, select: { name: true, slug: true, currency: true } }),
    prisma.product.findMany({ where: { cafeId: user.cafeId }, include: { category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { cafeId: user.cafeId }, orderBy: { sortOrder: "asc" } }),
    prisma.cafeTable.findMany({ where: { cafeId: user.cafeId }, orderBy: { label: "asc" } }),
    prisma.inventoryItem.findMany({ where: { cafeId: user.cafeId }, orderBy: { name: "asc" } }),
    prisma.order.aggregate({
      where: { cafeId: user.cafeId, paymentStatus: "PAID" },
      _sum: { totalCents: true },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { cafeId: user.cafeId, role: { in: ["KITCHEN", "CASHIER", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.order.findMany({
      where: { cafeId: user.cafeId },
      select: { id: true, orderNumber: true, customerName: true, totalCents: true, status: true, paymentStatus: true, createdAt: true, items: { select: { id: true, nameSnapshot: true, quantity: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    Promise.all(days.map(async ({ start, end }) => {
      const aggregate = await prisma.order.aggregate({
        where: { cafeId: user.cafeId, paymentStatus: "PAID", createdAt: { gte: start, lt: end } },
        _sum: { totalCents: true },
      });
      return { date: start.toISOString(), totalCents: aggregate._sum.totalCents ?? 0 };
    })),
  ]);
  return NextResponse.json({ cafe, products, categories, tables, inventory, sales, staff, recentOrders, dailySales }, { headers: { "Cache-Control": "no-store" } });
}
