"use client";

import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function FactoryPage() {
  const processes = [
    { name: "Casting", href: "/factory/casting", icon: "🔥" },
    { name: "Casting Dashboard", href: "/factory/casting/dashboard", icon: "📊" },
    { name: "Magnet", href: "/factory/magnet/dashboard", icon: "🧲" },
    { name: "Filing / Bench", href: "/factory/bench/dashboard", icon: "🛠️" },
    { name: "Pre Polish", href: "/factory/pre-polish/dashboard", icon: "✨" },
    { name: "Final Repair", href: "/factory/final-repair/dashboard", icon: "🔧" },
    { name: "Stone Setting", href: "/factory/stone-setting/dashboard", icon: "💎" },
    { name: "Buff", href: "/factory/buff/dashboard", icon: "🌀" },
    { name: "Final QC", href: "/factory/final-qc/dashboard", icon: "✅" },
    { name: "Rhodium", href: "/factory/rhodium/dashboard", icon: "⚗️" },
    { name: "Tag Print", href: "/factory/tag-print/dashboard", icon: "🏷️" },
    { name: "Sale", href: "/factory/sale/dashboard", icon: "🧾" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏭 Manufacturing</h1>
            <p className="text-sm text-gray-600">
              Factory process shortcuts.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-black px-5 py-3 text-center text-sm font-bold text-white"
          >
            Dashboard
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Process Flow</h2>
            <p className="text-sm text-gray-500">
              Select any process to open its page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {processes.map((p, index) => (
              <Link
                key={p.href}
                href={p.href}
                className="group rounded-2xl border border-gray-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:border-black hover:bg-black hover:text-white hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm group-hover:bg-white">
                    {p.icon}
                  </div>
<div>
  <p className="text-xs font-bold text-gray-500 group-hover:text-gray-300">
    Step {index + 1}
  </p>

  <p className="text-lg font-bold text-gray-900 group-hover:text-white">
    {p.name}
  </p>
</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <MobileBottomNav />
    </main>
  );
}