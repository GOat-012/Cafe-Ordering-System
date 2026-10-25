import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      currency: true,
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { products: { where: { isAvailable: true }, orderBy: { name: "asc" } } },
      },
      tables: { where: { isActive: true }, select: { id: true, label: true } },
    },
  });
  if (!cafe) return NextResponse.json({ error: "Café not found." }, { status: 404 });
  return NextResponse.json(cafe, { headers: { "Cache-Control": "no-store" } });
}
