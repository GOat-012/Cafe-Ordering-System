import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createOrderForCafe, orderItemsSchema, OrderInputError } from "@/lib/create-order";

const schema = z.object({
  customerName: z.string().trim().min(1).max(80),
  customerPhone: z.string().trim().min(7).max(24),
  tableId: z.string().cuid().optional(),
  items: orderItemsSchema,
});

export async function POST(request: Request) {
  const { user, response } = await requireRole(["CASHIER", "ADMIN"]);
  if (response || !user) return response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the customer and order details." }, { status: 400 });
  try {
    return NextResponse.json(await createOrderForCafe({ cafeId: user.cafeId, ...parsed.data }), { status: 201 });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
