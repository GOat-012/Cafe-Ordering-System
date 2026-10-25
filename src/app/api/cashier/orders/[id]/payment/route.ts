import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole(["CASHIER", "ADMIN"]);
  if (response || !user) return response;
  const { id } = await params;
  const paid = await prisma.order.updateMany({
    where: { id, cafeId: user.cafeId, paymentStatus: "UNPAID" },
    data: { paymentStatus: "PAID" },
  });
  if (!paid.count) return NextResponse.json({ error: "Unpaid order not found for this café." }, { status: 404 });
  return NextResponse.json({ paymentStatus: "PAID", message: "Demo payment recorded. No real payment was processed." });
}
