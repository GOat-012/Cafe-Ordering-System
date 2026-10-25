import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { isNextOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ status: z.enum(["CONFIRMED", "PREPARING", "READY", "SERVED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(["KITCHEN", "ADMIN"]);
  if (response || !user) return response;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  const { id } = await params;
  const current = await prisma.order.findFirst({
    where: { id, cafeId: user.cafeId },
    select: { id: true, status: true },
  });
  if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!isNextOrderStatus(current.status, parsed.data.status)) {
    return NextResponse.json({ error: "That status transition is not allowed." }, { status: 409 });
  }
  const updated = await prisma.order.updateMany({
    where: { id, cafeId: user.cafeId, status: current.status },
    data: { status: parsed.data.status },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "The order changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ status: parsed.data.status });
}
