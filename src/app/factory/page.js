"use client";

import { useState } from "react";
import Link from "next/link";

export default function FactoryPage() {
  const [active, setActive] = useState({
    name: "Casting",
    href: "/factory/casting",
  });

  const processes = [
    { name: "Casting", href: "/factory/casting" },
    { name: "Casting Dashboard", href: "/factory/casting/dashboard" },
    { name: "Magnet", href: "/factory/magnet/dashboard" },
    { name: "Filing / Bench", href: "/factory/bench/dashboard" },
    { name: "Pre Polish", href: "/factory/pre-polish/dashboard" },
    { name: "Final Repair", href: "/factory/final-repair/dashboard" },
    { name: "Stone Setting", href: "/factory/stone-setting/dashboard" },
    { name: "Buff", href: "/factory/buff/dashboard" },
    { name: "Final QC", href: "/factory/final-qc/dashboard" },
    { name: "Rhodium", href: "/factory/rhodium/dashboard" },
    { name: "Tag Print", href: "/factory/tag-print/dashboard" },
    { name: "Sale", href: "/factory/sale/dashboard" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏭 Manufacturing</h1>
          <p className="text-sm text-gray-600">Factory process control panel</p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
        >
          Dashboard
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          {processes.map((p) => {
            const isActive = active.href === p.href;

            return (
              <button
                key={p.href}
                type="button"
                onClick={() => setActive(p)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left text-sm font-bold transition ${
                  isActive
                    ? "scale-[1.02] border-blue-600 bg-blue-600 text-white shadow-lg"
                    : "border-gray-200 bg-slate-50 text-gray-800 hover:bg-blue-50"
                }`}
              >
                <span className="rounded-lg bg-white/80 px-2 py-1 text-lg">
                  🖼️
                </span>
                {p.name}
              </button>
            );
          })}
        </aside>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
            <h2 className="font-bold text-gray-900">{active.name}</h2>

            <Link
              href={active.href}
              className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white"
            >
              Open Full Page
            </Link>
          </div>

          <iframe
            key={active.href}
            src={active.href}
            className="h-[calc(100vh-150px)] w-full border-0"
          />
        </section>
      </div>
    </main>
  );
}