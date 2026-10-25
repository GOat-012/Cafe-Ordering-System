"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string | null;
};
type Category = { id: string; name: string; products: Product[] };
type Menu = {
  name: string;
  currency: string;
  categories: Category[];
  tables: { id: string; label: string }[];
};
type Ticket = {
  id: string;
  orderNumber: number;
  totalCents: number;
  paymentStatus: string;
  customerName: string;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function ProductThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) {
    return (
      <div className="grid h-full w-full place-items-center rounded-lg bg-coffee-100 text-lg text-coffee-400">
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

export function CashierDesk({ staffName }: { staffName: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tableId, setTableId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cashier/menu", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the menu.");
      setMenu(data as Menu);
      if ((data as Menu).categories.length) setActiveCategory("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  // Filtered products
  const allProducts = useMemo(
    () => menu?.categories.flatMap((c) => c.products) ?? [],
    [menu]
  );

  const filteredProducts = useMemo(() => {
    let products =
      activeCategory === "all"
        ? allProducts
        : (menu?.categories.find((c) => c.id === activeCategory)?.products ?? []);
    if (search.trim()) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return products;
  }, [allProducts, activeCategory, search, menu]);

  const totalCount = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalCents = allProducts.reduce(
    (s, p) => s + p.priceCents * (quantities[p.id] ?? 0),
    0
  );

  function adjust(id: string, delta: number) {
    setQuantities((cur) => {
      const q = (cur[id] ?? 0) + delta;
      if (q <= 0) {
        const next = { ...cur };
        delete next[id];
        return next;
      }
      return { ...cur, [id]: q };
    });
  }

  async function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!menu || totalCount === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cashier/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          ...(tableId ? { tableId } : {}),
          items: Object.entries(quantities).map(([productId, quantity]) => ({
            productId,
            quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the order.");
      setTickets((cur) => [
        { ...data, paymentStatus: "UNPAID", customerName: name } as Ticket,
        ...cur,
      ]);
      setQuantities({});
      setName("");
      setPhone("");
      setTableId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(ticket: Ticket) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/cashier/orders/${encodeURIComponent(ticket.id)}/payment`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record payment.");
      setTickets((cur) =>
        cur.map((t) =>
          t.id === ticket.id ? { ...t, paymentStatus: "PAID" } : t
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 border-b border-coffee-200 pb-5">
        <div className="animate-slide-up">
          <Link href="/" className="eyebrow hover:text-leaf-700">
            Copper Kettle · Cashier
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-coffee-950 display-heading">
            Hi, {staffName.split(" ")[0]}.
          </h1>
        </div>
        <button
          onClick={signOut}
          className="btn btn-secondary min-h-10 px-3 text-sm"
        >
          Sign out
        </button>
      </header>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 animate-slide-up">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      ) : !menu ? (
        <p className="mt-8 text-coffee-700">Menu unavailable.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-coffee-500">
            Create a counter order and record demo payments. No real payment is processed.
          </p>
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
            {/* ── Product panel ──────────────────────────────────────────── */}
            <div>
              {/* Search + category filter */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="field min-h-10 flex-1"
                />
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeCategory === "all"
                        ? "bg-coffee-800 text-cream"
                        : "border border-coffee-200 bg-white text-coffee-600"
                    }`}
                  >
                    All
                  </button>
                  {menu.categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCategory(c.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        activeCategory === c.id
                          ? "bg-coffee-800 text-cream"
                          : "border border-coffee-200 bg-white text-coffee-600"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-coffee-200 p-8 text-center animate-fade-in">
                  <p className="text-sm text-coffee-500">No products match your search.</p>
                </div>
              ) : (
                <div className="stagger grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const qty = quantities[product.id] ?? 0;
                    return (
                      <article
                        key={product.id}
                        className="animate-slide-up flex items-center gap-3 rounded-2xl border border-coffee-150 bg-white p-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)]"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-coffee-100">
                          <ProductThumb imageUrl={product.imageUrl} name={product.name} />
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-semibold text-coffee-950">
                            {product.name}
                          </h2>
                          <p className="mt-0.5 text-xs font-semibold text-coffee-600">
                            {money(product.priceCents, menu.currency)}
                          </p>
                        </div>
                        {/* Qty controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Remove one ${product.name}`}
                            onClick={() => adjust(product.id, -1)}
                            disabled={qty === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-coffee-200 text-sm font-bold text-coffee-700 disabled:opacity-30 hover:bg-coffee-50 active:scale-95 transition-all"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-coffee-950">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one ${product.name}`}
                            onClick={() => adjust(product.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-coffee-800 text-sm font-bold text-cream hover:bg-coffee-950 active:scale-95 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Order panel ────────────────────────────────────────────── */}
            <section className="lg:sticky lg:top-5">
              <form onSubmit={createOrder} className="card p-5">
                <h2 className="text-lg font-semibold text-coffee-950">Current order</h2>

                {/* Cart items inline */}
                {totalCount > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {Object.entries(quantities).map(([productId, qty]) => {
                      const product = allProducts.find((p) => p.id === productId);
                      if (!product) return null;
                      return (
                        <li key={productId} className="flex items-center justify-between text-sm animate-slide-up">
                          <span className="text-coffee-700">
                            {qty} × {product.name}
                          </span>
                          <span className="font-semibold text-coffee-950">
                            {money(product.priceCents * qty, menu.currency)}
                          </span>
                        </li>
                      );
                    })}
                    <li className="border-t border-coffee-100 pt-2">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-coffee-700">Total ({totalCount} items)</span>
                        <span className="text-xl text-coffee-950">
                          {money(totalCents, menu.currency)}
                        </span>
                      </div>
                    </li>
                  </ul>
                )}
                {totalCount === 0 && (
                  <p className="mt-3 text-sm text-coffee-400">Select products from the left.</p>
                )}

                <label className="mt-4 block text-sm font-medium text-coffee-700">
                  Customer name
                  <input
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field mt-1"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-coffee-700">
                  Mobile number
                  <input
                    required
                    type="tel"
                    maxLength={24}
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="field mt-1"
                  />
                </label>
                {menu.tables.length > 0 && (
                  <label className="mt-3 block text-sm font-medium text-coffee-700">
                    Table
                    <select
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="field mt-1"
                    >
                      <option value="">Takeaway</option>
                      {menu.tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  disabled={busy || totalCount === 0}
                  className="btn btn-primary mt-5 w-full text-sm disabled:opacity-50"
                >
                  {busy ? "Saving…" : `Create order (${totalCount} items)`}
                </button>
              </form>

              {/* ── Recent tickets ─────────────────────────────────────── */}
              {tickets.length > 0 && (
                <section aria-label="New orders" className="mt-4 space-y-3">
                  <h2 className="font-semibold text-coffee-800">New orders</h2>
                  {tickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      className={`card animate-slide-up p-4 ${
                        ticket.paymentStatus === "PAID"
                          ? "border-leaf-200 bg-leaf-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-coffee-900">
                            #{ticket.orderNumber} · {ticket.customerName}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-coffee-800">
                            {money(ticket.totalCents, menu.currency)}
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            ticket.paymentStatus === "PAID" ? "badge-green" : "badge-amber"
                          }`}
                        >
                          {ticket.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                      {ticket.paymentStatus === "PAID" ? (
                        <p className="mt-2 text-xs text-leaf-600">
                          ✓ Demo payment recorded
                        </p>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => void recordPayment(ticket)}
                          className="btn btn-success mt-3 w-full text-xs disabled:opacity-50"
                        >
                          Record demo payment ✓
                        </button>
                      )}
                    </article>
                  ))}
                </section>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
