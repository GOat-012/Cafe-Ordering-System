# Smart Café Ordering System

A mobile-first, multi-café ordering and operations app built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Requirements

- Node.js 20.19 or newer
- PostgreSQL 15 or newer
- npm

## Local setup

1. Create a PostgreSQL database named `smart_cafe`, then copy the environment template:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Update `DATABASE_URL` in `.env` with the PostgreSQL username, password, host, port, and database name. Set `AUTH_SECRET` to a unique random value of at least 32 characters. Change `DEMO_PASSWORD` before sharing a demo.

   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_cafe?schema=public"
   AUTH_SECRET="a-unique-random-value-of-at-least-32-characters"
   DEMO_PASSWORD="choose-a-demo-password"
   ```

   The app deliberately requires PostgreSQL; it does not fall back to SQLite. Keep `.env` private and use a separate strong secret and database account in production.

3. Install dependencies, generate Prisma Client, apply the initial schema, and seed demo data:

   ```powershell
   npm install
   npm run db:generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

4. Start the app:

   ```powershell
   npm run dev
   ```

Open `http://localhost:3000`. For QR codes that work on phones, open the admin QR-code panel from a host address reachable by the phone (not `localhost`).

### Demo staff accounts

All demo accounts use the `DEMO_PASSWORD` value set before seeding. If it is unset, the development seed uses `cafe-demo-2026`.

| Role | Email |
| --- | --- |
| Admin | `owner@copperkettle.demo` |
| Kitchen | `kitchen@copperkettle.demo` |
| Cashier | `cashier@copperkettle.demo` |

## Working order flow

1. Scan a table QR code or visit `/copper-kettle` to browse the café menu.
2. Add products, customize line items, and place an order.
3. Sign in as kitchen staff at `/login`; new orders appear automatically and can be advanced through Confirmed, Preparing, Ready, and Served.
4. The customer’s order page receives status changes over a token-protected server-sent event stream without a refresh.
5. Cashiers can create counter orders and record a **demo-only** payment. No payment processor is connected.
6. Admins can manage products and availability, categories, tables/QR codes, stock counts, staff accounts, and recorded sales.

## Multi-café and security notes

- Every café-owned record is related to a `cafeId`; staff APIs derive the tenant from the authenticated, active database user rather than request input.
- Menu and order writes are tenant-scoped, prices are calculated from current server-side product records, and table IDs are checked against the same café.
- Staff sessions use signed, HTTP-only cookies. Set a strong `AUTH_SECRET` and serve the app over HTTPS in production.
- Order tracking uses a random per-order capability token; only its SHA-256 hash is stored.
- The seed is repeatable for the `copper-kettle` café and creates isolated demo data. New cafés should be provisioned through an authenticated onboarding/admin workflow before production use.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Run `npm run db:deploy` to apply the checked-in SQL migration in a deployment. Set `TEST_DATABASE_URL` to a separate, disposable PostgreSQL database (with the migrations applied) and run `npm run test:db` to execute the PostgreSQL order persistence and tenant-isolation integration test. Those tests are skipped by the regular test run when no test database is configured.

Responsive layouts use a mobile-first Tailwind approach, safe-area padding, touch-sized controls, and grids that adapt from narrow phones through desktop widths. The customer menu has been checked at 320, 375, 390, 768, 1024, and 1440 pixels. The kitchen board refreshes every five seconds; customer tracking reconnects automatically through `EventSource`.
