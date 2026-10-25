import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma";

export const orderItemsSchema = z.array(z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(20),
  note: z.string().trim().max(200).optional(),
})).min(1).max(30);

export class OrderInputError extends Error {}

export async function createOrderForCafe(input: {
  cafeId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string;
  items: z.infer<typeof orderItemsSchema>;
}) {
  if (input.tableId) {
    const table = await prisma.cafeTable.findFirst({
      where: { id: input.tableId, cafeId: input.cafeId, isActive: true },
      select: { id: true },
    });
    if (!table) throw new OrderInputError("That table is not available.");
  }

  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  if ([...quantities.values()].some((quantity) => quantity > 20)) {
    throw new OrderInputError("A maximum of 20 of each item can be ordered.");
  }

  const products = await prisma.product.findMany({
    where: { cafeId: input.cafeId, id: { in: [...quantities.keys()] }, isAvailable: true },
    select: { id: true, name: true, priceCents: true },
  });
  if (products.length !== quantities.size) throw new OrderInputError("One or more items are no longer available.");

  const lines = products.map((product) => ({
    productId: product.id,
    nameSnapshot: product.name,
    unitPriceCents: product.priceCents,
    quantity: quantities.get(product.id)!,
    note: input.items.find((item) => item.productId === product.id)?.note,
  }));
  const totalCents = lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
  const trackingToken = randomBytes(32).toString("base64url");

  const order = await prisma.$transaction(async (tx) => {
    const cafe = await tx.cafe.update({
      where: { id: input.cafeId },
      data: { orderSequence: { increment: 1 } },
      select: { orderSequence: true },
    });
    return tx.order.create({
      data: {
        cafeId: input.cafeId,
        tableId: input.tableId,
        orderNumber: cafe.orderSequence,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        totalCents,
        trackingTokenHash: createHash("sha256").update(trackingToken).digest("hex"),
        items: { create: lines },
      },
      select: { id: true, orderNumber: true, status: true, totalCents: true, createdAt: true },
    });
  });
  return { ...order, trackingToken };
}
