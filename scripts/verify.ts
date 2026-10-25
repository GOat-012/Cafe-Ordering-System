import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function run() {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: "copper-kettle" },
    include: {
      categories: {
        include: { products: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  console.log("Café:", cafe?.name);
  console.log("Total Categories:", cafe?.categories.length);
  let total = 0;
  const names = new Set<string>();
  const duplicates: string[] = [];

  for (const cat of cafe!.categories) {
    console.log(`  - ${cat.name}: ${cat.products.length} products`);
    for (const p of cat.products) {
      total++;
      if (names.has(p.name)) duplicates.push(p.name);
      names.add(p.name);
    }
  }

  console.log(`Total Products: ${total}`);
  console.log(`Unique Products: ${names.size}`);
  console.log(`Duplicates: ${duplicates.length === 0 ? "None (Clean)" : duplicates.join(", ")}`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
