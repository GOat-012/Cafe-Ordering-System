import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  quantity: z.number().min(0).max(100000),
  unit: z.string().trim().min(1).max(24),
});

export async function POST(request: Request) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid stock item, quantity, and unit." }, { status: 400 });
  const existing = await prisma.inventoryItem.findUnique({
    where: { cafeId_name: { cafeId: user.cafeId, name: parsed.data.name } },
    select: { quantity: true },
  });
  const [item] = await prisma.$transaction([
    prisma.inventoryItem.upsert({
      where: { cafeId_name: { cafeId: user.cafeId, name: parsed.data.name } },
      update: { quantity: parsed.data.quantity, unit: parsed.data.unit },
      create: { cafeId: user.cafeId, ...parsed.data },
    }),
    prisma.inventoryMovement.create({
      data: {
        cafeId: user.cafeId,
        itemName: parsed.data.name,
        delta: parsed.data.quantity - (existing?.quantity ?? 0),
        note: "Stock count updated by admin",
      },
    }),
  ]);
  return NextResponse.json(item);
}
