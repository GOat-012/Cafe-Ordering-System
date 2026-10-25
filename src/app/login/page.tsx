"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cafeSlug, setCafeSlug] = useState("copper-kettle");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, cafeSlug }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Unable to sign in.");
      const next = search.get("next");
      const allowed = ["/kitchen", "/cashier", "/admin"];
      const destination =
        next && allowed.includes(next)
          ? next
          : ({ KITCHEN: "/kitchen", CASHIER: "/cashier", ADMIN: "/admin" }[
              result.role as string
            ] ?? "/");
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium text-coffee-700">
        Work email
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-coffee-700">
        Café ID
        <input
          required
          maxLength={80}
          autoComplete="organization"
          value={cafeSlug}
          onChange={(e) => setCafeSlug(e.target.value)}
          className="field mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-coffee-700">
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mt-1"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in →"}
      </button>
      <div className="rounded-xl bg-coffee-50 p-3 text-xs text-coffee-500">
        <p className="font-semibold text-coffee-700">Demo credentials</p>
        <p className="mt-1">Admin: owner@copperkettle.demo</p>
        <p>Kitchen: kitchen@copperkettle.demo</p>
        <p>Cashier: cashier@copperkettle.demo</p>
        <p className="mt-1">Password: cafe-demo-2026</p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(62,44,20,.1) 0%, transparent 70%)",
        }}
      />
      <section className="w-full max-w-md animate-slide-up">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-coffee-500 hover:text-coffee-800"
        >
          ← Copper Kettle Café
        </Link>
        <div className="card mt-4 p-6 sm:p-9">
          <p className="eyebrow">Staff workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-coffee-950 display-heading">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-coffee-500">
            Sign in to manage service at Copper Kettle Café.
          </p>
          <Suspense
            fallback={
              <p role="status" className="mt-6 text-sm text-coffee-500">
                Loading sign in…
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
