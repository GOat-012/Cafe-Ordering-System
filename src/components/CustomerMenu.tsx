"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  categoryId: string;
};

type CafeMenu = {
  id: string;
  name: string;
  currency: string;
  categories: { id: string; name: string; products: Product[] }[];
  tables: { id: string; label: string }[];
};

type CartLine = { product: Product; quantity: number; note: string };
type TrackingOrder = {
  id: string;
  orderNumber: number;
  totalCents: number;
  trackingToken: string;
  status: string;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const ORDER_STEPS = ["PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED"] as const;
type OrderStep = (typeof ORDER_STEPS)[number];

const STEP_LABELS: Record<OrderStep, { label: string; detail: string }> = {
  PLACED: { label: "Order placed", detail: "We received your order" },
  CONFIRMED: { label: "Confirmed", detail: "Kitchen has accepted" },
  PREPARING: { label: "Preparing", detail: "Being freshly made" },
  READY: { label: "Ready", detail: "Come pick it up!" },
  SERVED: { label: "Served", detail: "Enjoy your meal!" },
};

// ── Skeleton cards ──────────────────────────────────────────────────────────
function MenuSkeleton() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="border-b border-coffee-200 pb-6">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton mt-3 h-8 w-56 rounded" />
      </div>
      {/* Category nav skeleton */}
      <div className="mt-6 flex gap-2">
        {[90, 80, 120, 100].map((w) => (
          <div key={w} className="skeleton h-10 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="mt-8 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-36 gap-3 rounded-2xl border border-coffee-100 bg-white p-3"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="skeleton h-full w-28 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton mt-auto h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ── Product image with fallback ─────────────────────────────────────────────
function ProductImage({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [errored, setErrored] = useState(false);

  if (!imageUrl || errored) {
    return (
      <div
        aria-hidden="true"
        className="grid h-full w-full place-items-center rounded-xl bg-coffee-100 text-coffee-400"
        style={{ fontSize: "2rem" }}
      >
        ☕
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      sizes="(max-width: 520px) 112px, 128px"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}

// ── Order tracking timeline ─────────────────────────────────────────────────
function OrderTimeline({ status }: { status: string }) {
  const currentIdx = ORDER_STEPS.indexOf(status as OrderStep);

  return (
    <ol className="relative mt-8 pl-7">
      {/* Vertical guide rail */}
      <div
        className="absolute left-[9px] top-2 w-0.5 bg-coffee-150"
        style={{ height: `calc(100% - 1rem)` }}
      />
      {ORDER_STEPS.map((step, i) => {
        const complete = currentIdx >= i;
        const active = currentIdx === i;
        const info = STEP_LABELS[step];

        return (
          <li
            key={step}
            className={`relative mb-5 last:mb-0 transition-opacity duration-300 ${i > currentIdx + 1 ? "opacity-40" : ""}`}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {/* Dot */}
            <span
              className={`absolute -left-7 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                active
                  ? "border-leaf-600 bg-leaf-600 shadow-[0_0_0_4px_rgba(69,111,61,.15)]"
                  : complete
                    ? "border-leaf-600 bg-leaf-600"
                    : "border-coffee-200 bg-white"
              }`}
            >
              {complete && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <div>
              <p
                className={`text-sm font-semibold leading-snug ${
                  complete ? "text-coffee-950" : "text-coffee-400"
                }`}
              >
                {info.label}
                {active && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf-700">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-leaf-600"
                      style={{ animation: "pulse-soft 1.5s ease-in-out infinite" }}
                    />
                    Now
                  </span>
                )}
              </p>
              <p className={`text-xs leading-relaxed ${complete ? "text-coffee-500" : "text-coffee-300"}`}>
                {info.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Cart contents ───────────────────────────────────────────────────────────
function CartContents({
  cart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  tableId,
  setTableId,
  menu,
  placing,
  error,
  onSubmit,
  onNoteChange,
}: {
  cart: CartLine[];
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  tableId: string;
  setTableId: (v: string) => void;
  menu: CafeMenu;
  placing: boolean;
  error: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onNoteChange: (productId: string, note: string) => void;
}) {
  const total = cart.reduce((s, l) => s + l.product.priceCents * l.quantity, 0);

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <h2 className="text-lg font-semibold text-coffee-950">Your order</h2>
      {cart.length === 0 ? (
        <div className="mt-6 text-center">
          <p className="text-3xl">🛒</p>
          <p className="mt-2 text-sm text-coffee-500">Add something delicious to begin.</p>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {cart.map((line) => (
              <li key={line.product.id} className="animate-slide-up text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-coffee-800">
                    {line.quantity} × {line.product.name}
                  </span>
                  <span className="shrink-0 font-semibold text-coffee-950">
                    {money(line.product.priceCents * line.quantity, menu.currency)}
                  </span>
                </div>
                <label className="mt-1.5 block text-xs text-coffee-500">
                  Special instructions
                  <input
                    maxLength={200}
                    value={line.note}
                    onChange={(e) => onNoteChange(line.product.id, e.target.value)}
                    placeholder="e.g. oat milk, extra shot"
                    className="field mt-1 min-h-10 text-xs"
                  />
                </label>
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-coffee-100" />
          <p className="flex justify-between font-semibold text-coffee-950">
            <span>Total</span>
            <span>{money(total, menu.currency)}</span>
          </p>

          <label className="mt-4 block text-sm font-medium text-coffee-700">
            Your name
            <input
              required
              maxLength={80}
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
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
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="field mt-1"
            />
          </label>
          {menu.tables.length > 0 && (
            <label className="mt-3 block text-sm font-medium text-coffee-700">
              Table (optional)
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="field mt-1"
              >
                <option value="">Takeaway / choose later</option>
                {menu.tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={placing}
            type="submit"
            className="btn btn-primary mt-5 w-full text-sm disabled:opacity-60"
          >
            {placing ? "Placing your order…" : "Place order →"}
          </button>
          <p className="mt-3 text-center text-xs text-coffee-400">
            Payment is settled at the café.
          </p>
        </>
      )}
    </form>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function CustomerMenu({
  cafeSlug,
  initialTableId,
}: {
  cafeSlug: string;
  initialTableId?: string;
}) {
  const [menu, setMenu] = useState<CafeMenu | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableId, setTableId] = useState(initialTableId ?? "");
  const [tracking, setTracking] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const cartDialogRef = useRef<HTMLDialogElement>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const trackingId = tracking?.id;
  const trackingToken = tracking?.trackingToken;

  // Open/close native dialog
  useEffect(() => {
    const dialog = cartDialogRef.current;
    if (!dialog) return;
    if (cartOpen && !dialog.open) dialog.showModal();
    if (!cartOpen && dialog.open) dialog.close();
  }, [cartOpen]);

  // Load menu
  useEffect(() => {
    let active = true;
    fetch(`/api/cafes/${encodeURIComponent(cafeSlug)}/menu`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("We couldn't load this café menu. Please try again.");
        return res.json() as Promise<CafeMenu>;
      })
      .then((data) => {
        if (!active) return;
        setMenu(data);
        setTableId(
          initialTableId && data.tables.some((t) => t.id === initialTableId) ? initialTableId : ""
        );
        const firstCategory = data.categories.find((c) => c.products.length);
        if (firstCategory) setActiveCategory(firstCategory.id);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Menu unavailable.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cafeSlug, initialTableId]);

  // SSE tracking
  useEffect(() => {
    if (!trackingId || !trackingToken) return;
    const source = new EventSource(
      `/api/orders/${encodeURIComponent(trackingId)}/events?token=${encodeURIComponent(trackingToken)}`
    );
    source.onopen = () => setConnection("live");
    source.onmessage = (ev) => {
      const update = JSON.parse(ev.data) as { status: string };
      setTracking((cur) => (cur ? { ...cur, status: update.status } : cur));
    };
    source.onerror = () => setConnection("reconnecting");
    return () => source.close();
  }, [trackingId, trackingToken]);

  // Intersection observer for active category highlight
  useEffect(() => {
    if (!menu) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveCategory(entry.target.id.replace("category-", ""));
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.values(categoryRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [menu]);

  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
  const totalCents = cart.reduce((s, l) => s + l.product.priceCents * l.quantity, 0);
  const categories = useMemo(
    () => menu?.categories.filter((c) => c.products.length) ?? [],
    [menu]
  );

  function adjust(product: Product, delta: number) {
    setCart((cur) => {
      const existing = cur.find((l) => l.product.id === product.id);
      if (!existing && delta > 0) return [...cur, { product, quantity: 1, note: "" }];
      return cur.flatMap((l) => {
        if (l.product.id !== product.id) return [l];
        const q = l.quantity + delta;
        return q > 0 ? [{ ...l, quantity: q }] : [];
      });
    });
  }

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!menu || cart.length === 0) return;
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeSlug,
          customerName,
          customerPhone,
          ...(tableId ? { tableId } : {}),
          items: cart.map(({ product, quantity, note }) => ({
            productId: product.id,
            quantity,
            ...(note ? { note } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Your order could not be placed.");
      setTracking(data as TrackingOrder);
      setCart([]);
      setCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection lost. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return <MenuSkeleton />;

  // ── Error ────────────────────────────────────────────────────────────────
  if (!menu)
    return (
      <main className="mx-auto max-w-5xl px-5 py-20">
        <div className="card p-8 text-center animate-fade-in">
          <p className="text-3xl">☕</p>
          <h1 className="mt-3 text-xl font-semibold text-coffee-950">Menu unavailable</h1>
          <p className="mt-2 text-sm text-coffee-600">{error || "This café menu is unavailable."}</p>
        </div>
      </main>
    );

  // ── Tracking view ────────────────────────────────────────────────────────
  if (tracking) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-4 pb-16 pt-8 sm:px-6">
        <div className="card p-6 sm:p-8 animate-slide-up">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Order #{tracking.orderNumber}</p>
              <h1 className="mt-2 text-2xl font-semibold text-coffee-950 display-heading">
                We&rsquo;re on it, {customerName || "friend"}.
              </h1>
              <p className="mt-1 text-sm text-coffee-500">
                {money(tracking.totalCents, menu.currency)} · Keep this page open for live updates
              </p>
            </div>
            <span
              className={`badge shrink-0 ${connection === "live" ? "badge-green" : "badge-amber"}`}
            >
              {connection === "live" ? "● Live" : "⟳ Reconnecting"}
            </span>
          </div>

          {/* Timeline */}
          <OrderTimeline status={tracking.status} />

          {tracking.status === "SERVED" && (
            <div className="mt-6 rounded-2xl bg-leaf-100 p-4 text-center animate-bounce-in">
              <p className="text-2xl">🎉</p>
              <p className="mt-1 font-semibold text-leaf-700">Enjoy your order!</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setTracking(null); setConnection("connecting"); }}
            className="btn btn-secondary mt-6 w-full text-sm"
          >
            ← Place another order
          </button>
        </div>
      </main>
    );
  }

  // ── Menu view ────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-0 sm:px-6 lg:px-8">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="relative -mx-4 mb-0 overflow-hidden sm:-mx-6 lg:-mx-8">
        <div
          className="h-48 w-full sm:h-56"
          style={{
            background:
              "linear-gradient(135deg, #3e2c14 0%, #6f4e2e 45%, #a57d5a 100%)",
          }}
        >
          {/* Abstract coffee-ring decoration */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 70% 60%, rgba(255,252,247,.5) 0%, transparent 60%), radial-gradient(circle at 30% 30%, rgba(255,252,247,.3) 0%, transparent 50%)",
            }}
          />
        </div>
        {/* Branding overlay */}
        <div className="absolute inset-0 flex flex-col justify-end px-5 pb-6 sm:px-8 animate-slide-up">
          <p className="eyebrow" style={{ color: "rgba(255,252,247,.7)" }}>
            Freshly made, just for you
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-cream sm:text-4xl display-heading">
            {menu.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="badge badge-green">Open now</span>
            {tableId && (
              <span className="badge badge-muted">
                {menu.tables.find((t) => t.id === tableId)?.label ?? "Table"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Sticky category nav ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-coffee-200 bg-coffee-50/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <nav aria-label="Menu categories" className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-9 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.id
                  ? "bg-coffee-800 text-cream shadow-sm"
                  : "border border-coffee-200 bg-white text-coffee-600 hover:border-coffee-400"
              }`}
            >
              {cat.name}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Menu grid ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {categories.map((cat) => (
            <section
              key={cat.id}
              id={`category-${cat.id}`}
              className="mb-10 scroll-mt-[72px]"
              ref={(el) => { categoryRefs.current[cat.id] = el; }}
            >
              <h2 className="mb-4 text-xl font-semibold text-coffee-950">{cat.name}</h2>
              <div className="stagger grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
                {cat.products.map((product) => {
                  const qty = cart.find((l) => l.product.id === product.id)?.quantity ?? 0;
                  return (
                    <article
                      key={product.id}
                      className="group animate-slide-up flex min-h-36 gap-3 rounded-2xl border border-coffee-150 bg-white p-3 shadow-[var(--shadow-xs)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]"
                    >
                      {/* Image */}
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-coffee-100">
                        <ProductImage imageUrl={product.imageUrl} name={product.name} />
                      </div>
                      {/* Content */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="font-semibold leading-tight text-coffee-950">{product.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-coffee-500">
                          {product.description}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <span className="text-sm font-semibold text-coffee-800">
                            {money(product.priceCents, menu.currency)}
                          </span>
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => adjust(product, 1)}
                              className="min-h-9 min-w-14 rounded-xl bg-coffee-800 px-3 text-xs font-semibold text-cream transition-all duration-150 hover:bg-coffee-950 active:scale-95"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="flex min-h-9 items-center gap-1.5 rounded-xl bg-coffee-50 p-1">
                              <button
                                type="button"
                                aria-label={`Remove one ${product.name}`}
                                onClick={() => adjust(product, -1)}
                                className="h-7 w-7 rounded-lg bg-white text-base font-bold text-coffee-800 shadow-[var(--shadow-xs)] transition-all active:scale-90"
                              >
                                −
                              </button>
                              <span aria-live="polite" className="min-w-5 text-center text-xs font-bold text-coffee-950">
                                {qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`Add one ${product.name}`}
                                onClick={() => adjust(product, 1)}
                                className="h-7 w-7 rounded-lg bg-coffee-800 text-base font-bold text-cream shadow-[var(--shadow-xs)] transition-all active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* ── Desktop cart sidebar ─────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[72px]">
            <CartContents
              {...{
                cart,
                customerName,
                setCustomerName,
                customerPhone,
                setCustomerPhone,
                tableId,
                setTableId,
                menu,
                placing,
                error,
                onSubmit: placeOrder,
                onNoteChange: (pid, note) =>
                  setCart((cur) =>
                    cur.map((l) => (l.product.id === pid ? { ...l, note } : l))
                  ),
              }}
            />
          </div>
        </aside>
      </div>

      {/* ── Sticky mobile cart bar ───────────────────────────────────────── */}
      {itemCount > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex min-h-[72px] items-center justify-between bg-coffee-900 px-5 pt-3 text-left shadow-[0_-6px_20px_rgba(30,18,8,.18)] lg:hidden animate-slide-in-bottom"
        >
          <span>
            <span className="block text-xs text-coffee-300">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="text-lg font-semibold text-cream">{money(totalCents, menu.currency)}</span>
          </span>
          <span className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-coffee-900">
            View cart →
          </span>
        </button>
      )}

      {/* ── Mobile cart dialog ───────────────────────────────────────────── */}
      <dialog
        ref={cartDialogRef}
        onCancel={(e) => { e.preventDefault(); cartDialogRef.current?.close(); }}
        onKeyDown={(e) => { if (e.key === "Escape") cartDialogRef.current?.close(); }}
        onClose={() => setCartOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}
        aria-labelledby="cart-title"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-coffee-50 p-5 shadow-2xl backdrop:bg-coffee-950/40 sm:inset-0 sm:bottom-auto sm:m-auto sm:max-w-lg sm:rounded-3xl lg:hidden"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="cart-title" className="text-xl font-semibold text-coffee-950">
            Your order
          </h2>
          <button
            type="button"
            onClick={() => cartDialogRef.current?.close()}
            aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-coffee-100 text-xl text-coffee-600 transition hover:bg-coffee-200"
          >
            ×
          </button>
        </div>
        <CartContents
          {...{
            cart,
            customerName,
            setCustomerName,
            customerPhone,
            setCustomerPhone,
            tableId,
            setTableId,
            menu,
            placing,
            error,
            onSubmit: placeOrder,
            onNoteChange: (pid, note) =>
              setCart((cur) =>
                cur.map((l) => (l.product.id === pid ? { ...l, note } : l))
              ),
          }}
        />
      </dialog>
    </main>
  );
}
