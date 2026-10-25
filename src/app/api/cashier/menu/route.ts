import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireRole(["CASHIER", "ADMIN"]);
  if (response || !user) return response;
  const cafe = await prisma.cafe.findUnique({
    where: { id: user.cafeId },
    select: {
      name: true,
      currency: true,
      categories: { orderBy: { sortOrder: "asc" }, include: { products: { where: { isAvailable: true }, select: { id: true, name: true, description: true, priceCents: true, imageUrl: true }, orderBy: { name: "asc" } } } },
      tables: { where: { isActive: true }, select: { id: true, label: true } },
    },
  });
  if (!cafe) return NextResponse.json({ error: "Café not found." }, { status: 404 });
  return NextResponse.json(cafe, { headers: { "Cache-Control": "no-store" } });
}
