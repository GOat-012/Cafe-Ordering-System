import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const productSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(3).max(240),
  categoryId: z.string().cuid(),
  priceCents: z.number().int().min(100).max(1000000),
  imageUrl: z.string().url().max(512).optional().nullable(),
});

export async function POST(request: Request) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, category, description, and valid price." }, { status: 400 });
  const category = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, cafeId: user.cafeId }, select: { id: true } });
  if (!category) return NextResponse.json({ error: "Category not found for this café." }, { status: 404 });
  const product = await prisma.product.create({ data: { ...parsed.data, cafeId: user.cafeId } });
  return NextResponse.json(product, { status: 201 });
}
