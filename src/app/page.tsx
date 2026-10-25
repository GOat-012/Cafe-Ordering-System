import Link from "next/link";

const destinations = [
  {
    href: "/copper-kettle",
    label: "Customer menu",
    detail: "Browse, order and track from your phone",
    icon: "☕",
    accent: "leaf",
  },
  {
    href: "/kitchen",
    label: "Kitchen display",
    detail: "Receive orders and move them through service",
    icon: "🍳",
    accent: "amber",
  },
  {
    href: "/cashier",
    label: "Cashier POS",
    detail: "Create in-person orders and record payments",
    icon: "🧾",
    accent: "terra",
  },
  {
    href: "/admin",
    label: "Café admin",
    detail: "Manage menu, tables, stock and sales",
    icon: "⚙️",
    accent: "coffee",
  },
] as const;

const accentStyles: Record<string, { dot: string; border: string; label: string }> = {
  leaf:   { dot: "bg-leaf-600",   border: "hover:border-leaf-500",   label: "text-leaf-700"   },
  amber:  { dot: "bg-amber-500",  border: "hover:border-amber-400",  label: "text-amber-700"  },
  terra:  { dot: "bg-terra-400",  border: "hover:border-terra-400",  label: "text-terra-600"  },
  coffee: { dot: "bg-coffee-600", border: "hover:border-coffee-500", label: "text-coffee-700" },
};

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ── Background decoration ──────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(62,44,20,.12) 0%, transparent 70%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-14 sm:px-8 lg:py-20">
        {/* ── Hero copy ──────────────────────────────────────────────────── */}
        <div className="max-w-2xl animate-slide-up">
          <p className="eyebrow">A calmer way to order</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-coffee-950 sm:text-6xl display-heading">
            Good coffee.<br />A better flow.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-coffee-600 sm:text-lg">
            A mobile-first ordering and café operations platform for Copper Kettle
            Café. Pick a workspace to get started.
          </p>
        </div>

        {/* ── Workspace cards ───────────────────────────────────────────── */}
        <nav
          aria-label="Café workspaces"
          className="stagger mt-10 grid gap-3 sm:grid-cols-2"
        >
          {destinations.map((dest) => {
            const styles = accentStyles[dest.accent];
            return (
              <Link
                key={dest.href}
                href={dest.href}
                className={`group animate-slide-up flex min-h-[5.5rem] items-center gap-4 rounded-2xl border border-coffee-150 bg-white/80 px-5 py-4 shadow-[var(--shadow-xs)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${styles.border} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500`}
              >
                {/* Icon pill */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coffee-50 text-2xl transition-transform duration-200 group-hover:scale-105">
                  {dest.icon}
                </span>
                {/* Text */}
                <span className="flex-1">
                  <span className="block font-semibold text-coffee-950">{dest.label}</span>
                  <span className="mt-0.5 block text-sm text-coffee-500">{dest.detail}</span>
                </span>
                {/* Arrow */}
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-lg font-bold transition-transform duration-200 group-hover:translate-x-1 ${styles.label}`}
                >
                  →
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Staff sign-in link ─────────────────────────────────────────── */}
        <p className="mt-7 text-sm text-coffee-500 animate-fade-in" style={{ animationDelay: ".4s" }}>
          Staff?{" "}
          <Link
            href="/login"
            className="font-semibold text-coffee-800 underline underline-offset-4 hover:text-coffee-950"
          >
            Sign in to your café →
          </Link>
        </p>
      </div>

      {/* ── Bottom branding strip ──────────────────────────────────────────── */}
      <footer className="border-t border-coffee-150 px-5 py-4 text-center">
        <p className="text-xs text-coffee-400">
          Copper Kettle Café · Smart Ordering System · Demo
        </p>
      </footer>
    </main>
  );
}
