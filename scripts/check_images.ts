import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function run() {
  const products = await prisma.product.findMany({
    select: { name: true, imageUrl: true },
    orderBy: { name: "asc" },
  });

  console.log(`Checking ${products.length} product images...`);
  let failed = 0;

  for (const p of products) {
    if (!p.imageUrl) {
      console.log(`[MISSING] ${p.name}: No image URL`);
      failed++;
      continue;
    }

    try {
      const res = await fetch(p.imageUrl, { method: "HEAD" });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.startsWith("image/")) {
        console.log(`[OK ${res.status}] ${p.name} -> ${contentType}`);
      } else {
        console.log(`[FAIL ${res.status}] ${p.name} -> ${p.imageUrl} (${contentType})`);
        failed++;
      }
    } catch (err: any) {
      console.log(`[ERROR] ${p.name} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`Image check finished: ${products.length - failed} passed, ${failed} failed.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
