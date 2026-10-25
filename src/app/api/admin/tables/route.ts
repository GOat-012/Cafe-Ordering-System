import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ label: z.string().trim().min(1).max(40) });

export async function POST(request: Request) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid table name." }, { status: 400 });
  const existing = await prisma.cafeTable.findUnique({
    where: { cafeId_label: { cafeId: user.cafeId, label: parsed.data.label } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "That table already exists." }, { status: 409 });
  const table = await prisma.cafeTable.create({ data: { cafeId: user.cafeId, label: parsed.data.label } });
  return NextResponse.json(table, { status: 201 });
}
