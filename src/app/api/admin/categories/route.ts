import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(60) });

export async function POST(request: Request) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid category name." }, { status: 400 });
  const existing = await prisma.category.findUnique({
    where: { cafeId_name: { cafeId: user.cafeId, name: parsed.data.name } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "That category already exists." }, { status: 409 });
  const count = await prisma.category.count({ where: { cafeId: user.cafeId } });
  const category = await prisma.category.create({ data: { cafeId: user.cafeId, name: parsed.data.name, sortOrder: count } });
  return NextResponse.json(category, { status: 201 });
}
