import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be set before running the database seed.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

// ---------------------------------------------------------------------------
// Catalog — 28 products × 7 categories, verified Unsplash images
// priceCents = price in paise (INR × 100)
// ---------------------------------------------------------------------------
const catalog: {
  category: string;
  sortOrder: number;
  items: { name: string; description: string; priceCents: number; imageUrl: string }[];
}[] = [
  {
    category: "Coffee",
    sortOrder: 0,
    items: [
      {
        name: "Honey oat latte",
        description: "Double espresso, silky oat milk, and a drizzle of wildflower honey.",
        priceCents: 24000,
        imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&q=75",
      },
      {
        name: "Flat white",
        description: "A rich double shot softened with velvety micro-foamed whole milk.",
        priceCents: 21000,
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&q=75",
      },
      {
        name: "Cold brew",
        description: "Slow-steeped 16 hours then served over a tower of ice. Smooth & bold.",
        priceCents: 22000,
        imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=640&q=75",
      },
      {
        name: "Espresso",
        description: "Single origin, 18 g, 28-second pull — served with sparkling water.",
        priceCents: 16000,
        imageUrl: "https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=640&q=75",
      },
      {
        name: "Cappuccino",
        description: "Equal parts espresso, steamed milk and velvety foam, dusted with cocoa.",
        priceCents: 20000,
        imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=640&q=75",
      },
    ],
  },
  {
    category: "Tea & more",
    sortOrder: 1,
    items: [
      {
        name: "Masala chai",
        description: "Black tea simmered with warming spices, fresh ginger and whole milk.",
        priceCents: 16000,
        imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=640&q=75",
      },
      {
        name: "Ceremonial matcha",
        description: "Grade A ceremonial-grade green tea whisked until vibrantly smooth.",
        priceCents: 23000,
        imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=640&q=75",
      },
      {
        name: "Lemon iced tea",
        description: "Hand-brewed Darjeeling, chilled and brightened with fresh lemon.",
        priceCents: 18000,
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&q=75",
      },
      {
        name: "Hibiscus cooler",
        description: "Floral hibiscus concentrate, cane syrup, mint and sparkling water.",
        priceCents: 19000,
        imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=640&q=75",
      },
    ],
  },
  {
    category: "From the oven",
    sortOrder: 2,
    items: [
      {
        name: "Butter croissant",
        description: "Laminated in-house with French AOP butter and baked golden every morning.",
        priceCents: 14000,
        imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&q=75",
      },
      {
        name: "Almond morning bun",
        description: "A soft, flaky bun filled with toasted almond frangipane and icing sugar.",
        priceCents: 18000,
        imageUrl: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=640&q=75",
      },
      {
        name: "Blueberry muffin",
        description: "Loaded with plump blueberries and a lemon-zest crumble crown.",
        priceCents: 16000,
        imageUrl: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=640&q=75",
      },
      {
        name: "Pain au chocolat",
        description: "Flaky buttery pastry folded around two batons of bittersweet dark chocolate.",
        priceCents: 16000,
        imageUrl: "https://images.unsplash.com/photo-1549903072-7e6e0bedb7fb?w=640&q=75",
      },
    ],
  },
  {
    category: "Breakfast",
    sortOrder: 3,
    items: [
      {
        name: "Avocado toast",
        description: "Sourdough, smashed avocado, chilli flakes, lime and a poached egg.",
        priceCents: 34000,
        imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=640&q=75",
      },
      {
        name: "Eggs benedict",
        description: "Two poached eggs on English muffins with Canadian ham and hollandaise.",
        priceCents: 42000,
        imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=640&q=75",
      },
      {
        name: "Açaí bowl",
        description: "Blended açaí, banana, topped with granola, coconut flakes and honey.",
        priceCents: 38000,
        imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=640&q=75",
      },
      {
        name: "Sourdough shakshuka",
        description: "Two farm eggs poached in spiced tomato-pepper ragout with toasted sourdough.",
        priceCents: 39000,
        imageUrl: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=640&q=75",
      },
    ],
  },
  {
    category: "Sandwiches & wraps",
    sortOrder: 4,
    items: [
      {
        name: "Grilled chicken club",
        description: "Toasted brioche, herb-marinated chicken breast, bacon, lettuce and tomato.",
        priceCents: 52000,
        imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=640&q=75",
      },
      {
        name: "Paneer tikka wrap",
        description: "Spiced paneer tikka, mint chutney, pickled onion in a warm wheat wrap.",
        priceCents: 46000,
        imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=640&q=75",
      },
      {
        name: "Smoked salmon bagel",
        description: "New York-style bagel, cream cheese, capers, cucumber and dill.",
        priceCents: 55000,
        imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=640&q=75",
      },
      {
        name: "Roasted vegetable panini",
        description: "Charred zucchini, bell peppers, pesto and melted buffalo mozzarella on ciabatta.",
        priceCents: 44000,
        imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=640&q=75",
      },
    ],
  },
  {
    category: "Mains",
    sortOrder: 5,
    items: [
      {
        name: "Truffle mushroom pasta",
        description: "Hand-rolled tagliatelle, wild mushrooms, truffle oil and parmesan cream.",
        priceCents: 68000,
        imageUrl: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=640&q=75",
      },
      {
        name: "Café Caesar salad",
        description: "Romaine hearts, parmesan crisps, anchovies and house Caesar dressing.",
        priceCents: 48000,
        imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=640&q=75",
      },
      {
        name: "Crispy falafel bowl",
        description: "Herbed falafel, roasted vegetables, hummus, tabbouleh and tahini.",
        priceCents: 54000,
        imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=640&q=75",
      },
      {
        name: "Vegetable momos",
        description: "Six steamed dumplings filled with spiced mixed vegetables, served with chutney.",
        priceCents: 36000,
        imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=640&q=75",
      },
    ],
  },
  {
    category: "Desserts",
    sortOrder: 6,
    items: [
      {
        name: "Dark chocolate brownie",
        description: "Dense, fudgy brownie with 70 % cacao and a fleur de sel crust.",
        priceCents: 22000,
        imageUrl: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=640&q=75",
      },
      {
        name: "Seasonal cheesecake",
        description: "New York-style baked cheesecake with a buttery graham cracker base.",
        priceCents: 28000,
        imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=640&q=75",
      },
      {
        name: "Pistachio cookie",
        description: "Buttery shortbread packed with roasted pistachios and white chocolate.",
        priceCents: 12000,
        imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=640&q=75",
      },
    ],
  },
];

async function main() {
  // Café
  const cafe = await prisma.cafe.upsert({
    where: { slug: "copper-kettle" },
    update: { name: "Copper Kettle Café", currency: "INR" },
    create: { name: "Copper Kettle Café", slug: "copper-kettle", currency: "INR" },
  });

  // Categories + products
  for (const { category, sortOrder, items } of catalog) {
    const cat = await prisma.category.upsert({
      where: { cafeId_name: { cafeId: cafe.id, name: category } },
      update: { sortOrder },
      create: { cafeId: cafe.id, name: category, sortOrder },
    });

    for (const item of items) {
      const id = `${category}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64);
      await prisma.product.upsert({
        where: { cafeId_id: { cafeId: cafe.id, id } },
        update: {
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl,
          categoryId: cat.id,
          isAvailable: true,
        },
        create: {
          id,
          cafeId: cafe.id,
          categoryId: cat.id,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl,
        },
      });
    }
  }

  // Tables
  for (const label of ["Table 1", "Table 2", "Table 3", "Table 4", "Patio 1", "Patio 2", "Bar 1"]) {
    await prisma.cafeTable.upsert({
      where: { cafeId_label: { cafeId: cafe.id, label } },
      update: { isActive: true },
      create: { cafeId: cafe.id, label },
    });
  }

  // Staff
  const password = process.env.DEMO_PASSWORD || "cafe-demo-2026";
  const passwordHash = await bcrypt.hash(password, 12);
  const staff = [
    ["owner@copperkettle.demo", "Morgan Lee", Role.ADMIN],
    ["kitchen@copperkettle.demo", "Sam Rivera", Role.KITCHEN],
    ["cashier@copperkettle.demo", "Alex Chen", Role.CASHIER],
  ] as const;
  for (const [email, name, role] of staff) {
    await prisma.user.upsert({
      where: { cafeId_email: { cafeId: cafe.id, email } },
      update: { name, role, passwordHash, isActive: true },
      create: { cafeId: cafe.id, email, name, role, passwordHash },
    });
  }

  // Inventory
  for (const item of [
    { name: "Oat milk", quantity: 18, unit: "litres" },
    { name: "Espresso beans", quantity: 8, unit: "kg" },
    { name: "Whole milk", quantity: 24, unit: "litres" },
    { name: "Croissant dough", quantity: 36, unit: "pieces" },
    { name: "Avocado", quantity: 20, unit: "pieces" },
    { name: "Chicken breast", quantity: 5, unit: "kg" },
    { name: "Sourdough bread", quantity: 8, unit: "loaves" },
    { name: "Dark chocolate", quantity: 3, unit: "kg" },
  ]) {
    await prisma.inventoryItem.upsert({
      where: { cafeId_name: { cafeId: cafe.id, name: item.name } },
      update: { quantity: item.quantity, unit: item.unit },
      create: { cafeId: cafe.id, ...item },
    });
  }

  const totalProducts = catalog.reduce((sum, cat) => sum + cat.items.length, 0);
  console.info(
    `✓ Seeded "${cafe.name}": ${catalog.length} categories, ${totalProducts} products, ${staff.length} staff accounts.`
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
