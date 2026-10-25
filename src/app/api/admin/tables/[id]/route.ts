import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(["ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose whether the table is active." }, { status: 400 });
  const { id } = await params;
  const result = await prisma.cafeTable.updateMany({
    where: { id, cafeId: user.cafeId },
    data: { isActive: parsed.data.isActive },
  });
  if (!result.count) return NextResponse.json({ error: "Table not found for this café." }, { status: 404 });
  return NextResponse.json({ isActive: parsed.data.isActive });
}
