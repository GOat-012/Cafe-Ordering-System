import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireRole(["KITCHEN", "ADMIN"]);
  if (response || !user) return response;
  const orders = await prisma.order.findMany({
    where: { cafeId: user.cafeId, status: { notIn: ["SERVED", "CANCELLED"] } },
    include: { items: true, table: { select: { label: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } });
}
