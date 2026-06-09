"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function FactoryPage() {
  const [counts, setCounts] = useState({});

  const processes = [
    { name: "Casting", href: "/factory/casting", status: "Casting", icon: "🔥" },
    { name: "Casting Dashboard", href: "/factory/casting/dashboard", status: "Casting Completed", icon: "📊" },
    { name: "Magnet", href: "/factory/magnet/dashboard", status: "Magnet", icon: "🧲" },
    { name: "Filing / Bench", href: "/factory/bench/dashboard", status: "Filing", icon: "🛠️" },
    { name: "Pre Polish", href: "/factory/pre-polish/dashboard", status: "Pre Polish", icon: "✨" },
    { name: "Final Repair", href: "/factory/final-repair/dashboard", status: "Final Repair", icon: "🔧" },
    { name: "Stone Setting", href: "/factory/stone-setting/dashboard", status: "Stone Setting", icon: "💎" },
    { name: "Buff", href: "/factory/buff/dashboard", status: "Buff", icon: "🌀" },
    { name: "Final QC", href: "/factory/final-qc/dashboard", status: "Final Inspection QC", icon: "✅" },
    { name: "Rhodium", href: "/factory/rhodium/dashboard", status: "Rhodium / Plating", icon: "⚗️" },
    { name: "Tag Print", href: "/factory/tag-print/dashboard", status: "Tag Print", icon: "🏷️" },
    { name: "Sale", href: "/factory/sale/dashboard", status: "Sale", icon: "🧾" },
    { name: "Buff Bag", href: "/factory/buff-bag", status: "Buff Bag", icon: "🧹" },
  ];

  async function fetchCounts() {
    const { data, error } = await supabase
      .from("casting_batches")
      .select("status");

    if (error) return;

    const next = {};
    (data || []).forEach((row) => {
      next[row.status] = (next[row.status] || 0) + 1;
    });

    setCounts(next);
  }

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏭 Manufacturing</h1>
            <p className="text-sm text-gray-600">
              Factory process dashboard with active batch status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/factory/inventory"
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white"
            >
              📦 Inventory
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Process Flow</h2>
            <p className="text-sm text-gray-500">
              Active process cards are highlighted automatically.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {processes.map((p, index) => {
              const activeCount = counts[p.status] || 0;
              const isActive = activeCount > 0;

              return (
                <Link
                  key={p.href}
                  href={p.href}
                  className={`group relative min-h-[135px] rounded-2xl border p-4 transition hover:-translate-y-1 hover:shadow-lg ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-md"
                      : "border-gray-200 bg-slate-50 text-gray-900 hover:border-black"
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                      {activeCount} Active
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                      {p.icon}
                    </div>

                    <div>
                      <p className={`text-xs font-bold ${isActive ? "text-blue-100" : "text-gray-500"}`}>
                        Step {index + 1}
                      </p>
                      <p className="text-lg font-bold">{p.name}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <MobileBottomNav />
    </main>
  );
}