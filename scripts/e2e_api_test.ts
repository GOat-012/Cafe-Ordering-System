import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=== Starting End-to-End API and Database Verification ===");

  // 1. Customer Menu Loading
  console.log("\n[Check 1] Customer Menu Loading (GET /api/cafes/copper-kettle/menu)");
  const menuRes = await fetch(`${BASE_URL}/api/cafes/copper-kettle/menu`);
  if (!menuRes.ok) throw new Error(`Menu fetch failed: ${menuRes.status}`);
  const menuData = await menuRes.json();
  console.log(`✓ Fetched café: ${menuData.name}`);
  console.log(`✓ Total categories: ${menuData.categories.length}`);
  const totalProducts = menuData.categories.reduce((acc: number, c: any) => acc + c.products.length, 0);
  console.log(`✓ Total products in menu: ${totalProducts}`);
  if (totalProducts !== 28) throw new Error(`Expected 28 products, got ${totalProducts}`);

  // Select two products for ordering
  const cat0 = menuData.categories[0];
  const cat1 = menuData.categories[1];
  const prod1 = cat0.products[0];
  const prod2 = cat1.products[0];
  const table = menuData.tables[0];
  console.log(`✓ Selected products: "${prod1.name}" (₹${prod1.priceCents / 100}) and "${prod2.name}" (₹${prod2.priceCents / 100}) for Table "${table?.label || 'Takeaway'}"`);

  // 2. Customer Order Creation
  console.log("\n[Check 2] Customer Order Creation (POST /api/orders)");
  const orderPayload = {
    cafeSlug: "copper-kettle",
    tableId: table?.id || null,
    customerName: "Priya Sharma",
    customerPhone: "9876543210",
    notes: "Please make it extra hot",
    items: [
      { productId: prod1.id, quantity: 2, note: "Oat milk please" },
      { productId: prod2.id, quantity: 1 },
    ],
  };

  const createRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload),
  });
  if (!createRes.ok) throw new Error(`Order creation failed: ${createRes.status} ${await createRes.text()}`);
  const orderData = await createRes.json();
  console.log(`✓ Order created! Order ID: ${orderData.id}, Number: #${orderData.orderNumber}`);
  console.log(`✓ Total calculated: ₹${orderData.totalCents / 100}`);
  console.log(`✓ Tracking Token received: ${orderData.trackingToken ? "Yes (Protected)" : "No"}`);

  // Verify in PostgreSQL directly
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderData.id },
    include: { items: true },
  });
  if (!dbOrder) throw new Error("Order not found in PostgreSQL!");
  console.log(`✓ Verified in PostgreSQL: status="${dbOrder.status}", items=${dbOrder.items.length}, totalCents=${dbOrder.totalCents}`);
  const expectedTotal = prod1.priceCents * 2 + prod2.priceCents * 1;
  if (dbOrder.totalCents !== expectedTotal) {
    throw new Error(`Total mismatch: expected ${expectedTotal}, got ${dbOrder.totalCents}`);
  }

  // 3. Staff Login (Kitchen)
  console.log("\n[Check 3] Kitchen Staff Authentication (POST /api/auth/login)");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "kitchen@copperkettle.demo", password: "cafe-demo-2026", cafeSlug: "copper-kettle" }),
  });
  if (!loginRes.ok) throw new Error(`Kitchen login failed: ${loginRes.status}`);
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) throw new Error("Missing set-cookie header on login");
  const sessionCookie = setCookie.split(";")[0];
  console.log(`✓ Kitchen authenticated successfully. Session cookie obtained.`);

  // 4. Kitchen Order Reception
  console.log("\n[Check 4] Kitchen Order Reception (GET /api/kitchen/orders)");
  const kitchenOrdersRes = await fetch(`${BASE_URL}/api/kitchen/orders`, {
    headers: { Cookie: sessionCookie },
  });
  if (!kitchenOrdersRes.ok) throw new Error(`Kitchen orders fetch failed: ${kitchenOrdersRes.status}`);
  const kitchenOrders = await kitchenOrdersRes.json();
  const foundOrder = kitchenOrders.find((o: any) => o.id === orderData.id);
  if (!foundOrder) throw new Error("Created order not visible on Kitchen Board!");
  console.log(`✓ Order #${foundOrder.orderNumber} visible on Kitchen Board with status: "${foundOrder.status}"`);

  // 5. Kitchen Status Transitions
  console.log("\n[Check 5] Kitchen Status Workflow (PATCH /api/kitchen/orders/[id])");
  const transitions = ["CONFIRMED", "PREPARING", "READY", "SERVED"];
  for (const nextStatus of transitions) {
    const patchRes = await fetch(`${BASE_URL}/api/kitchen/orders/${orderData.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!patchRes.ok) throw new Error(`Failed to advance order to ${nextStatus}: ${patchRes.status}`);
    const updated = await patchRes.json();
    console.log(`✓ Order advanced to: "${updated.status}"`);
  }

  // Verify status in PostgreSQL directly
  const finalOrder = await prisma.order.findUnique({ where: { id: orderData.id } });
  if (finalOrder?.status !== "SERVED") throw new Error(`Expected final status SERVED, got ${finalOrder?.status}`);
  console.log(`✓ Final status confirmed in PostgreSQL: "${finalOrder.status}"`);

  // 6. Cashier Desk Counter Order & Payment Recording
  console.log("\n[Check 6] Cashier Login and Payment Recording");
  const cashierLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cashier@copperkettle.demo", password: "cafe-demo-2026", cafeSlug: "copper-kettle" }),
  });
  if (!cashierLoginRes.ok) throw new Error(`Cashier login failed: ${cashierLoginRes.status}`);
  const cashierCookie = cashierLoginRes.headers.get("set-cookie")!.split(";")[0];
  console.log(`✓ Cashier authenticated successfully.`);

  // Create an unpaid order
  const counterOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cafeSlug: "copper-kettle",
      customerName: "Rahul Verma",
      customerPhone: "9876543210",
      items: [{ productId: prod1.id, quantity: 1 }],
    }),
  });
  if (!counterOrderRes.ok) throw new Error(`Counter order failed: ${counterOrderRes.status} ${await counterOrderRes.text()}`);
  const counterOrder = await counterOrderRes.json();
  console.log(`✓ Counter order created: #${counterOrder.orderNumber} (${counterOrder.id})`);

  // Record payment
  const paymentRes = await fetch(`${BASE_URL}/api/cashier/orders/${counterOrder.id}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cashierCookie },
    body: JSON.stringify({ method: "CASH" }),
  });
  if (!paymentRes.ok) throw new Error(`Payment recording failed: ${paymentRes.status}`);
  const paidOrder = await paymentRes.json();
  console.log(`✓ Payment recorded. Payment status: "${paidOrder.paymentStatus}" via "${paidOrder.paymentMethod}"`);

  // Verify payment status in PostgreSQL
  const dbPaidOrder = await prisma.order.findUnique({ where: { id: counterOrder.id } });
  if (dbPaidOrder?.paymentStatus !== "PAID") {
    throw new Error(`DB payment verification failed: ${JSON.stringify(dbPaidOrder)}`);
  }
  console.log(`✓ Payment status verified in PostgreSQL: paymentStatus="${dbPaidOrder.paymentStatus}", updatedAt="${dbPaidOrder.updatedAt?.toISOString()}"`);

  // 7. Admin Dashboard Operations
  console.log("\n[Check 7] Admin Login and Product Management");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@copperkettle.demo", password: "cafe-demo-2026", cafeSlug: "copper-kettle" }),
  });
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${adminLoginRes.status}`);
  const adminCookie = adminLoginRes.headers.get("set-cookie")!.split(";")[0];
  console.log(`✓ Admin authenticated successfully.`);

  // Create new product via admin API
  const newProductPayload = {
    name: "Spiced Cinnamon Roll",
    description: "Warm brioche swirl with Ceylon cinnamon and cream cheese frosting.",
    categoryId: cat0.id,
    priceCents: 21000,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=75",
  };
  const addProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify(newProductPayload),
  });
  if (!addProdRes.ok) throw new Error(`Admin add product failed: ${addProdRes.status} ${await addProdRes.text()}`);
  const createdAdminProd = await addProdRes.json();
  console.log(`✓ Admin created product: "${createdAdminProd.name}" (${createdAdminProd.id}) with imageUrl`);

  // Verify in PostgreSQL
  const dbAdminProd = await prisma.product.findUnique({ where: { id: createdAdminProd.id } });
  if (!dbAdminProd || dbAdminProd.imageUrl !== newProductPayload.imageUrl) {
    throw new Error("Created product not found or imageUrl mismatch in PostgreSQL!");
  }
  console.log(`✓ Product verified in PostgreSQL with correct imageUrl.`);

  // Toggle availability
  const toggleRes = await fetch(`${BASE_URL}/api/admin/products/${createdAdminProd.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ isAvailable: false }),
  });
  if (!toggleRes.ok) throw new Error(`Toggle availability failed: ${toggleRes.status}`);
  const toggled = await toggleRes.json();
  console.log(`✓ Availability toggled: isAvailable=${toggled.isAvailable}`);

  // Clean up created admin product
  await prisma.product.delete({ where: { id: createdAdminProd.id } });
  console.log(`✓ Test admin product cleaned up.`);

  // 8. Tenant Isolation Verification
  console.log("\n[Check 8] Multi-Café Tenant Isolation Verification");
  const suffix = crypto.randomUUID().slice(0, 8);
  const foreignCafe = await prisma.cafe.create({
    data: { name: `Foreign Café ${suffix}`, slug: `foreign-${suffix}` },
  });
  const foreignCat = await prisma.category.create({
    data: { cafeId: foreignCafe.id, name: "Foreign Items" },
  });
  const foreignProd = await prisma.product.create({
    data: {
      cafeId: foreignCafe.id,
      categoryId: foreignCat.id,
      name: "Foreign Coffee",
      description: "Should not be orderable by Copper Kettle",
      priceCents: 99900,
    },
  });

  // Attempt to order foreign product from Copper Kettle
  const crossTenantOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cafeSlug: "copper-kettle",
      customerName: "Intruder",
      customerPhone: "9876543210",
      items: [{ productId: foreignProd.id, quantity: 1 }],
    }),
  });

  if (crossTenantOrderRes.status === 409) {
    console.log(`✓ Tenant isolation ENFORCED: Ordering foreign product was rejected with 409 Conflict: "${(await crossTenantOrderRes.json()).error}"`);
  } else {
    throw new Error(`Tenant isolation breached! Got status: ${crossTenantOrderRes.status}`);
  }

  // Clean up foreign café
  await prisma.product.delete({ where: { id: foreignProd.id } });
  await prisma.category.delete({ where: { id: foreignCat.id } });
  await prisma.cafe.delete({ where: { id: foreignCafe.id } });
  console.log(`✓ Foreign tenant cleaned up.`);

  console.log("\n========================================================");
  console.log("✓ ALL END-TO-END DATABASE & WORKFLOW CHECKS PASSED!");
  console.log("========================================================");
}

run()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
