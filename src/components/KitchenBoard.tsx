"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type KitchenOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  status: string;
  createdAt: string;
  table: { label: string } | null;
  items: { id: string; nameSnapshot: string; quantity: number; note: string | null }[];
};

const sections = [
  { status: "PLACED",    title: "New",        action: "Accept →",         next: "CONFIRMED", urgent: true  },
  { status: "CONFIRMED", title: "Accepted",   action: "Start preparing →", next: "PREPARING", urgent: false },
  { status: "PREPARING", title: "Preparing",  action: "Mark ready ✓",     next: "READY",     urgent: false },
  { status: "READY",     title: "Ready",      action: "Mark served",       next: "SERVED",    urgent: false },
] as const;

function elapsed(date: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return { label: "Just now", urgent: false };
  if (minutes < 10) return { label: `${minutes} min`, urgent: false };
  if (minutes < 20) return { label: `${minutes} min`, urgent: true };
  return { label: `${minutes} min`, urgent: true };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PLACED":    return "badge badge-amber";
    case "CONFIRMED": return "badge badge-blue";
    case "PREPARING": return "badge badge-amber";
    case "READY":     return "badge badge-green";
    default:          return "badge badge-muted";
  }
}

export function KitchenBoard({ staffName }: { staffName: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [selected, setSelected] = useState<string>("PLACED");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [now, setNow] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [newOrderNotice, setNewOrderNotice] = useState("");
  const seenOrderIds = useRef<Set<string> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Soft chime for new orders
  function playChime() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* Ignore - audio blocked by browser before gesture */ }
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (res.status === 401 || res.status === 403)
        throw new Error("Your session has expired. Please sign in again.");
      if (!res.ok) throw new Error("Could not refresh kitchen orders.");
      const updated = (await res.json()) as KitchenOrder[];

      if (seenOrderIds.current) {
        const newOrders = updated.filter((o) => !seenOrderIds.current?.has(o.id));
        if (newOrders.length) {
          const notice = `${newOrders.length} new ${newOrders.length === 1 ? "order" : "orders"} received${newOrders.length === 1 ? ` — #${newOrders[0]!.orderNumber}` : ""}`;
          setNewOrderNotice(notice);
          setNewOrderIds(new Set(newOrders.map((o) => o.id)));
          playChime();
          setTimeout(() => setNewOrderIds(new Set()), 5400);
        }
      }
      seenOrderIds.current = new Set(updated.map((o) => o.id));
      setOrders(updated);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to the kitchen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => void refresh(), 0);
    const t1 = setTimeout(() => setNow(Date.now()), 0);
    const r = setInterval(() => void refresh(), 5000);
    const c = setInterval(() => setNow(Date.now()), 30_000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearInterval(r); clearInterval(c); };
  }, [refresh]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        sections.map((s) => [s.status, orders.filter((o) => o.status === s.status).length])
      ),
    [orders]
  );

  async function advance(order: KitchenOrder, next: string) {
    setBusyId(order.id);
    setError("");
    try {
      const res = await fetch(`/api/kitchen/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the order.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order.");
    } finally {
      setBusyId("");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const section = sections.find((s) => s.status === selected)!;
  const visibleOrders = orders.filter((o) => o.status === selected);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 border-b border-coffee-200 pb-5">
        <div className="animate-slide-up">
          <Link href="/" className="eyebrow hover:text-leaf-700">
            Copper Kettle · Kitchen
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-coffee-950 display-heading">
            {greeting}, {staffName.split(" ")[0]}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-coffee-500 sm:block">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Connecting…"}
          </span>
          <button
            onClick={signOut}
            className="btn btn-secondary min-h-10 px-3 text-sm"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Status tabs ─────────────────────────────────────────────────────── */}
      <nav aria-label="Order status" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {sections.map((s) => {
          const count = counts[s.status] ?? 0;
          const isActive = selected === s.status;
          return (
            <button
              key={s.status}
              onClick={() => setSelected(s.status)}
              aria-pressed={isActive}
              className={`relative min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-coffee-800 text-cream shadow-sm"
                  : "border border-coffee-200 bg-white text-coffee-700 hover:border-coffee-400"
              }`}
            >
              {s.title}
              {count > 0 && (
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-cream" : s.urgent && s.status === "PLACED" ? "bg-red-100 text-red-700" : "bg-coffee-100 text-coffee-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 animate-slide-up">
          {error}
        </p>
      )}
      {newOrderNotice && (
        <div
          role="status"
          aria-live="assertive"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-leaf-100 px-4 py-3 text-sm font-semibold text-leaf-700 animate-bounce-in"
        >
          <span>🔔 {newOrderNotice}</span>
          <button
            type="button"
            onClick={() => setNewOrderNotice("")}
            aria-label="Dismiss"
            className="h-9 w-9 shrink-0 rounded-lg bg-white text-lg text-coffee-700"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Order grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-coffee-200 bg-white/60 p-10 text-center animate-fade-in">
          <p className="text-3xl">✅</p>
          <p className="mt-2 font-semibold text-coffee-800">No {section.title.toLowerCase()} orders</p>
          <p className="mt-1 text-sm text-coffee-500">New orders will appear here automatically.</p>
        </div>
      ) : (
        <section
          aria-label={`${section.title} orders`}
          className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visibleOrders.map((order) => {
            const time = elapsed(order.createdAt, now);
            const isNew = newOrderIds.has(order.id);
            return (
              <article
                key={order.id}
                className={`card p-5 transition-all duration-300 animate-slide-up ${isNew ? "new-order-pulse" : ""}`}
              >
                {/* Card header */}
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow">Order #{order.orderNumber}</p>
                    <h2 className="mt-1 text-lg font-semibold text-coffee-950">
                      {order.customerName}
                    </h2>
                    <p className="mt-0.5 text-sm text-coffee-500">
                      {order.table?.label ?? "Takeaway"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`badge ${time.urgent ? "badge-amber" : "badge-muted"}`}>
                      {time.label}
                    </span>
                    <span className={statusBadgeClass(order.status)}>{order.status.toLowerCase()}</span>
                  </div>
                </header>

                {/* Items */}
                <ul className="mt-4 space-y-2 border-y border-coffee-100 py-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex gap-2 text-sm">
                      <span className="w-6 shrink-0 font-bold text-coffee-800">{item.quantity}×</span>
                      <span className="text-coffee-800">
                        {item.nameSnapshot}
                        {item.note && (
                          <span className="mt-0.5 block text-[11px] italic text-coffee-500">
                            {item.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action */}
                <button
                  disabled={busyId === order.id}
                  onClick={() => void advance(order, section.next)}
                  className={`btn mt-4 w-full text-sm ${section.urgent ? "btn-success" : "btn-primary"} disabled:opacity-60`}
                >
                  {busyId === order.id ? "Updating…" : section.action}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {/* ── Auto-update notice ───────────────────────────────────────────────── */}
      <p className="mt-6 text-center text-xs text-coffee-400">
        Orders refresh automatically every 5 seconds.
      </p>
    </main>
  );
}
