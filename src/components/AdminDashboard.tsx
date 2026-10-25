"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";

type Overview = {
  cafe: { name: string; slug: string; currency: string };
  products: {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    imageUrl: string | null;
    isAvailable: boolean;
    category: { name: string };
  }[];
  categories: { id: string; name: string }[];
  tables: { id: string; label: string; isActive: boolean; qrCodeId: string }[];
  inventory: { id: string; name: string; quantity: number; unit: string }[];
  sales: { _sum: { totalCents: number | null }; _count: { id: number } };
  staff: { id: string; name: string; email: string; role: string; isActive: boolean }[];
  recentOrders: {
    id: string;
    orderNumber: number;
    customerName: string;
    totalCents: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    items: { id: string; nameSnapshot: string; quantity: number }[];
  }[];
  dailySales: { date: string; totalCents: number }[];
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PLACED: "badge-amber", CONFIRMED: "badge-blue", PREPARING: "badge-amber",
    READY: "badge-green", SERVED: "badge-muted", CANCELLED: "badge-red",
  };
  return `badge ${map[status] ?? "badge-muted"}`;
}

function payBadge(status: string) {
  return status === "PAID" ? "badge badge-green" : "badge badge-amber";
}

// ── Product thumb with fallback ────────────────────────────────────────────
function ProductThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) {
    return (
      <div className="grid h-full w-full place-items-center rounded-lg bg-coffee-100 text-xl text-coffee-400">
        ☕
      </div>
    );
  }
  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      sizes="48px"
      className="object-cover"
      onError={() => setErr(true)}
    />
  );
}

// ── Image preview ─────────────────────────────────────────────────────────
function ImagePreview({ url }: { url: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="mt-2 flex h-16 w-16 items-center justify-center rounded-lg bg-coffee-100 text-xl text-coffee-400">
        ☕
      </div>
    );
  }
  return (
    <div className="relative mt-2 h-16 w-16 overflow-hidden rounded-lg">
      <Image src={url} alt="Preview" fill sizes="64px" className="object-cover" onError={() => setErr(true)} />
    </div>
  );
}

const NAV_SECTIONS = [
  ["#sales", "Sales"],
  ["#products", "Menu"],
  ["#categories", "Categories"],
  ["#tables", "Tables"],
  ["#inventory", "Inventory"],
  ["#staff", "Staff"],
  ["#orders", "Orders"],
] as const;

export function AdminDashboard({ staffName }: { staffName: string }) {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState({
    name: "", description: "", categoryId: "", price: "", imageUrl: "",
  });
  const [categoryName, setCategoryName] = useState("");
  const [tableName, setTableName] = useState("");
  const [stock, setStock] = useState({ name: "", quantity: "", unit: "pieces" });
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "KITCHEN" });
  const [qrTableId, setQrTableId] = useState("");
  const [qrOrigin, setQrOrigin] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not load café operations.");
      setData(result as Overview);
      setProduct((cur) => ({
        ...cur,
        categoryId: cur.categoryId || (result as Overview).categories[0]?.id || "",
      }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  async function send(path: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not save changes.");
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const currency = data?.cafe.currency ?? "INR";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-coffee-200 pb-5">
        <div className="animate-slide-up">
          <Link href="/" className="eyebrow hover:text-leaf-700">
            Copper Kettle · Admin
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-coffee-950 display-heading">
            Operations at a glance
          </h1>
          <p className="mt-0.5 text-sm text-coffee-500">Welcome, {staffName.split(" ")[0]}.</p>
        </div>
        <button onClick={signOut} className="btn btn-secondary min-h-10 px-3 text-sm">
          Sign out
        </button>
      </header>

      {/* ── Section nav ─────────────────────────────────────────────────────── */}
      <nav
        aria-label="Admin sections"
        className="sticky top-0 z-10 -mx-4 mt-3 flex gap-2 overflow-x-auto border-b border-coffee-200 bg-coffee-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        {NAV_SECTIONS.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="min-h-9 shrink-0 rounded-full border border-coffee-200 bg-white px-4 py-2 text-xs font-semibold text-coffee-700 transition hover:border-coffee-400 hover:bg-coffee-50"
          >
            {label}
          </a>
        ))}
      </nav>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 animate-slide-up">
          {error}
        </p>
      )}

      {!data ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : (
        <>
          {/* ══ SALES ══════════════════════════════════════════════════════ */}
          <section id="sales" className="scroll-mt-20 pt-6 animate-slide-up">
            <h2 className="text-xl font-semibold text-coffee-950">{data.cafe.name}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <article className="card p-5">
                <p className="eyebrow">Paid orders</p>
                <p className="mt-2 text-3xl font-semibold text-coffee-950">{data.sales._count.id}</p>
              </article>
              <article className="card p-5">
                <p className="eyebrow">Recorded sales</p>
                <p className="mt-2 text-2xl font-semibold text-coffee-950">
                  {money(data.sales._sum.totalCents ?? 0, currency)}
                </p>
              </article>
              <article className="card col-span-2 border-leaf-200 bg-leaf-50 p-5 sm:col-span-1">
                <p className="eyebrow text-leaf-600">Menu available</p>
                <p className="mt-2 text-3xl font-semibold text-leaf-700">
                  {data.products.filter((p) => p.isAvailable).length}
                  <span className="text-lg text-leaf-500"> / {data.products.length}</span>
                </p>
              </article>
            </div>

            {/* Daily sales bar chart */}
            <section
              aria-label="Sales over the last 7 days"
              className="card mt-5 p-5"
            >
              <h3 className="font-semibold text-coffee-950">Paid sales · last 7 days</h3>
              <div
                role="img"
                aria-label={`Paid sales: ${data.dailySales.map((d) => `${new Date(d.date).toLocaleDateString("en", { weekday: "long" })}, ${money(d.totalCents, currency)}`).join("; ")}`}
                className="mt-4 flex h-40 items-end gap-2 sm:gap-3"
              >
                {data.dailySales.map((day) => {
                  const max = Math.max(...data.dailySales.map((d) => d.totalCents), 1);
                  const pct = Math.max(day.totalCents > 0 ? 8 : 0, Math.round((day.totalCents / max) * 100));
                  return (
                    <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                      {day.totalCents > 0 && (
                        <span className="mb-1 truncate text-center text-[9px] text-coffee-500">
                          {money(day.totalCents, currency)}
                        </span>
                      )}
                      <div
                        aria-label={`${new Date(day.date).toLocaleDateString()}: ${money(day.totalCents, currency)}`}
                        className="mx-auto w-full max-w-10 rounded-t-lg transition-all"
                        style={{
                          height: `${pct}%`,
                          background: day.totalCents > 0
                            ? "linear-gradient(to top, var(--leaf-700), var(--leaf-500))"
                            : "var(--coffee-100)",
                        }}
                      />
                      <span className="mt-1.5 text-center text-[9px] text-coffee-400">
                        {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </section>

          {/* ══ MENU ═══════════════════════════════════════════════════════ */}
          <section id="products" className="scroll-mt-20 pt-8 animate-slide-up">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Product list */}
              <div>
                <h2 className="text-xl font-semibold text-coffee-950">Menu & availability</h2>
                <div className="mt-3 space-y-2">
                  {data.products.map((item) => (
                    <article key={item.id} className="card flex items-center gap-3 p-3">
                      {/* Thumb */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-coffee-100">
                        <ProductThumb imageUrl={item.imageUrl} name={item.name} />
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-coffee-950">{item.name}</h3>
                        <p className="text-xs text-coffee-500">
                          {item.category.name} · {money(item.priceCents, currency)}
                        </p>
                      </div>
                      {/* Toggle availability */}
                      <button
                        disabled={busy}
                        onClick={() =>
                          void send(
                            `/api/admin/products/${encodeURIComponent(item.id)}`,
                            { isAvailable: !item.isAvailable },
                            "PATCH"
                          )
                        }
                        aria-pressed={item.isAvailable}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          item.isAvailable
                            ? "bg-leaf-100 text-leaf-700 hover:bg-leaf-200"
                            : "bg-coffee-100 text-coffee-600 hover:bg-coffee-200"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Sold out"}
                      </button>
                    </article>
                  ))}
                </div>
              </div>

              {/* Add product form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send("/api/admin/products", {
                    ...product,
                    priceCents: Math.round(Number(product.price) * 100),
                    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
                  }).then((ok) => {
                    if (ok)
                      setProduct((cur) => ({
                        ...cur,
                        name: "", description: "", price: "", imageUrl: "",
                      }));
                  });
                }}
                className="card h-fit p-5"
              >
                <h3 className="text-lg font-semibold text-coffee-950">Add menu item</h3>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Description
                  <input
                    required
                    minLength={3}
                    maxLength={240}
                    value={product.description}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Category
                  <select
                    required
                    value={product.categoryId}
                    onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}
                    className="field mt-1"
                  >
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Price ({currency})
                  <input
                    required
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Image URL (optional)
                  <input
                    type="url"
                    maxLength={512}
                    value={product.imageUrl}
                    onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/…"
                    className="field mt-1 text-sm"
                  />
                </label>
                {product.imageUrl && <ImagePreview url={product.imageUrl} />}
                <button
                  disabled={busy || !data.categories.length}
                  className="btn btn-primary mt-4 w-full text-sm disabled:opacity-50"
                >
                  Add product
                </button>
              </form>
            </div>
          </section>

          {/* ══ CATEGORIES + TABLES ════════════════════════════════════════ */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2 animate-slide-up">
            {/* Categories */}
            <section id="categories" className="card scroll-mt-20 p-5">
              <h2 className="text-xl font-semibold text-coffee-950">Categories</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.categories.map((c) => (
                  <li key={c.id} className="rounded-full bg-coffee-100 px-4 py-1.5 text-sm font-medium text-coffee-800">
                    {c.name}
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send("/api/admin/categories", { name: categoryName }).then((ok) => {
                    if (ok) setCategoryName("");
                  });
                }}
                className="mt-4 flex gap-2"
              >
                <label className="sr-only" htmlFor="new-category">New category name</label>
                <input
                  id="new-category"
                  required
                  maxLength={60}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="New category"
                  className="field min-w-0 flex-1"
                />
                <button disabled={busy} className="btn btn-primary px-4 text-sm">
                  Add
                </button>
              </form>
            </section>

            {/* Tables */}
            <section id="tables" className="card scroll-mt-20 p-5">
              <h2 className="text-xl font-semibold text-coffee-950">Tables & QR menus</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {data.tables.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-coffee-50 p-3 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-coffee-900">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-coffee-400">
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                        disabled={busy}
                        onClick={() =>
                          void send(
                            `/api/admin/tables/${encodeURIComponent(item.id)}`,
                            { isActive: !item.isActive },
                            "PATCH"
                          )
                        }
                        className="btn btn-secondary h-9 px-2 text-xs"
                      >
                        {item.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        disabled={!item.isActive}
                        onClick={() => {
                          setQrOrigin(window.location.origin);
                          setQrTableId((cur) => (cur === item.id ? "" : item.id));
                        }}
                        className="btn btn-secondary h-9 px-2 text-xs disabled:opacity-40"
                      >
                        QR
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {qrTableId && (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-coffee-200 bg-coffee-50 p-4 animate-scale-in">
                  <QRCodeSVG
                    value={`${qrOrigin}/${encodeURIComponent(data.cafe.slug)}?table=${encodeURIComponent(qrTableId)}`}
                    size={144}
                    level="M"
                    includeMargin
                    aria-label="QR code for this café table"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-coffee-900">Scan to open the menu</p>
                    <p className="mt-1 break-all text-xs text-coffee-500">
                      {qrOrigin}/{data.cafe.slug}?table={qrTableId}
                    </p>
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send("/api/admin/tables", { label: tableName }).then((ok) => {
                    if (ok) setTableName("");
                  });
                }}
                className="mt-4 flex gap-2"
              >
                <label className="sr-only" htmlFor="new-table">New table label</label>
                <input
                  id="new-table"
                  required
                  maxLength={40}
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. Patio 3"
                  className="field min-w-0 flex-1"
                />
                <button disabled={busy} className="btn btn-primary px-4 text-sm">
                  Add
                </button>
              </form>
            </section>
          </div>

          {/* ══ INVENTORY ══════════════════════════════════════════════════ */}
          <section id="inventory" className="card scroll-mt-20 mt-8 p-5 animate-slide-up">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-coffee-950">Inventory</h2>
                <p className="mt-0.5 text-sm text-coffee-500">
                  Update a stock count to record the latest on-hand quantity.
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send("/api/admin/inventory", {
                    ...stock,
                    quantity: Number(stock.quantity),
                  }).then((ok) => {
                    if (ok) setStock({ name: "", quantity: "", unit: "pieces" });
                  });
                }}
                className="grid w-full gap-2 sm:grid-cols-[1fr_100px_110px_auto] lg:w-auto"
              >
                <label className="sr-only" htmlFor="stock-name">Item name</label>
                <input
                  id="stock-name"
                  required
                  maxLength={80}
                  value={stock.name}
                  onChange={(e) => setStock({ ...stock, name: e.target.value })}
                  placeholder="Item name"
                  className="field"
                />
                <label className="sr-only" htmlFor="stock-qty">Quantity</label>
                <input
                  id="stock-qty"
                  required
                  type="number"
                  min="0"
                  step="0.1"
                  value={stock.quantity}
                  onChange={(e) => setStock({ ...stock, quantity: e.target.value })}
                  placeholder="Qty"
                  className="field"
                />
                <label className="sr-only" htmlFor="stock-unit">Unit</label>
                <input
                  id="stock-unit"
                  required
                  maxLength={24}
                  value={stock.unit}
                  onChange={(e) => setStock({ ...stock, unit: e.target.value })}
                  placeholder="Unit"
                  className="field"
                />
                <button disabled={busy} className="btn btn-primary text-sm">
                  Update
                </button>
              </form>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {data.inventory.map((item) => {
                const low = item.quantity < 5;
                return (
                  <li
                    key={item.id}
                    className={`rounded-xl p-3 ${low ? "border border-terra-100 bg-terra-50" : "bg-coffee-50"}`}
                  >
                    <span className={`block text-sm font-semibold ${low ? "text-terra-600" : "text-coffee-900"}`}>
                      {item.name}
                    </span>
                    <span className={`text-sm ${low ? "text-terra-400" : "text-coffee-500"}`}>
                      {item.quantity} {item.unit}
                      {low && <span className="ml-1 text-[10px] font-bold uppercase text-terra-600">Low</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ══ STAFF + ORDERS ═════════════════════════════════════════════ */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2 animate-slide-up">
            {/* Staff */}
            <section id="staff" className="card scroll-mt-20 p-5">
              <h2 className="text-xl font-semibold text-coffee-950">Staff access</h2>
              <ul className="mt-3 space-y-2">
                {data.staff.map((member) => (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-coffee-50 p-3"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-coffee-900">{member.name}</span>
                      <span className="block break-all text-xs text-coffee-500">
                        {member.email} · {member.role.toLowerCase()}
                      </span>
                    </span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void send(
                          `/api/admin/staff/${encodeURIComponent(member.id)}`,
                          { isActive: !member.isActive },
                          "PATCH"
                        )
                      }
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        member.isActive
                          ? "bg-leaf-100 text-leaf-700"
                          : "bg-coffee-200 text-coffee-600"
                      }`}
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send("/api/admin/staff", newStaff).then((ok) => {
                    if (ok)
                      setNewStaff({ name: "", email: "", password: "", role: "KITCHEN" });
                  });
                }}
                className="mt-5 grid gap-3 sm:grid-cols-2"
              >
                <label className="text-sm font-medium text-coffee-700">
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-coffee-700">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-coffee-700">
                  Temporary password
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-coffee-700">
                  Role
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="field mt-1"
                  >
                    <option value="KITCHEN">Kitchen</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <button
                  disabled={busy}
                  className="btn btn-primary text-sm sm:col-span-2 disabled:opacity-50"
                >
                  Add staff account
                </button>
              </form>
            </section>

            {/* Recent orders */}
            <section id="orders" className="card scroll-mt-20 p-5">
              <h2 className="text-xl font-semibold text-coffee-950">Recent order history</h2>
              <ul className="mt-3 space-y-2">
                {data.recentOrders.map((order) => (
                  <li key={order.id} className="rounded-xl bg-coffee-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-coffee-900">
                        #{order.orderNumber} · {order.customerName}
                      </span>
                      <span className="text-sm font-semibold text-coffee-800">
                        {money(order.totalCents, currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-coffee-500 line-clamp-1">
                      {order.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={statusBadge(order.status)}>{order.status.toLowerCase()}</span>
                      <span className={payBadge(order.paymentStatus)}>
                        {order.paymentStatus.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-coffee-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
