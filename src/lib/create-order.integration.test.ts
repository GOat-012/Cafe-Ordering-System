import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

const integration = describe.skipIf(!databaseUrl);
let client: PrismaClient | undefined;
let cafeA: { id: string; slug: string };
let cafeB: { id: string; slug: string };
let productA: { id: string };
let tableA: { id: string };
let createOrder: typeof import("./create-order").createOrderForCafe;
let OrderInputError: typeof import("./create-order").OrderInputError;

integration("PostgreSQL order persistence and tenant isolation", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    const suffix = crypto.randomUUID();
    [cafeA, cafeB] = await Promise.all([
      client.cafe.create({ data: { name: "Integration café A", slug: `integration-a-${suffix}` }, select: { id: true, slug: true } }),
      client.cafe.create({ data: { name: "Integration café B", slug: `integration-b-${suffix}` }, select: { id: true, slug: true } }),
    ]);
    const category = await client.category.create({ data: { cafeId: cafeA.id, name: "Test coffee" } });
    productA = await client.product.create({
      data: { cafeId: cafeA.id, categoryId: category.id, name: "Test latte", description: "Integration test product", priceCents: 475 },
      select: { id: true },
    });
    tableA = await client.cafeTable.create({ data: { cafeId: cafeA.id, label: "Test table" }, select: { id: true } });
    ({ createOrderForCafe: createOrder, OrderInputError } = await import("./create-order"));
  });

  afterAll(async () => {
    if (client && cafeA && cafeB) {
      await client.order.deleteMany({ where: { cafeId: { in: [cafeA.id, cafeB.id] } } });
      await client.product.deleteMany({ where: { cafeId: cafeA.id } });
      await client.cafeTable.deleteMany({ where: { cafeId: cafeA.id } });
      await client.category.deleteMany({ where: { cafeId: cafeA.id } });
      await client.cafe.deleteMany({ where: { id: { in: [cafeA.id, cafeB.id] } } });
      await client.$disconnect();
    }
  });

  it("persists server-priced orders with tenant-scoped products and tables", async () => {
    if (!client || !databaseUrl) throw new Error("TEST_DATABASE_URL is required for database integration tests.");
    const { prisma } = await import("./prisma");
    const order = await createOrder({
      cafeId: cafeA.id,
      customerName: "Integration guest",
      customerPhone: "12345678",
      tableId: tableA.id,
      items: [{ productId: productA.id, quantity: 2 }],
    });

    const persisted = await client.order.findFirst({
      where: { id: order.id, cafeId: cafeA.id },
      include: { items: true, table: true },
    });
    expect(persisted?.totalCents).toBe(950);
    expect(persisted?.items[0]?.nameSnapshot).toBe("Test latte");
    expect(persisted?.table?.id).toBe(tableA.id);
    expect(persisted?.trackingTokenHash).not.toBe(order.trackingToken);

    await expect(createOrder({
      cafeId: cafeB.id,
      customerName: "Cross-tenant guest",
      customerPhone: "12345678",
      items: [{ productId: productA.id, quantity: 1 }],
    })).rejects.toBeInstanceOf(OrderInputError);
    expect(await client.order.count({ where: { cafeId: cafeB.id } })).toBe(0);
    await prisma.$disconnect();
  });
});
