import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderForCafe, orderItemsSchema, OrderInputError } from "@/lib/create-order";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  cafeSlug: z.string().min(1).max(80),
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().min(7).max(24),
  tableId: z.string().cuid().optional(),
  items: orderItemsSchema,
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the order details and try again." }, { status: 400 });
  const data = parsed.data;
  const cafe = await prisma.cafe.findUnique({ where: { slug: data.cafeSlug }, select: { id: true } });
  if (!cafe) return NextResponse.json({ error: "Café not found." }, { status: 404 });

  try {
    const order = await createOrderForCafe({
      cafeId: cafe.id,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      tableId: data.tableId,
      items: data.items,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
