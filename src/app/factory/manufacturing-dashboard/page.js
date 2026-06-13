"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const PROCESS_MAP = [
  ["Casting", "Casting", "/factory/casting"],
  ["Magnet", "Magnet", "/factory/magnet/dashboard"],
  ["Bench", "Bench", "/factory/bench/dashboard"],
  ["Pre Polish", "Pre Polish", "/factory/pre-polish/dashboard"],
  ["Final Repair", "Final Repair", "/factory/final-repair/dashboard"],
  ["Stone Setting", "Stone Setting", "/factory/stone-setting/dashboard"],
  ["Buff", "Buff", "/factory/buff/dashboard"],
  ["Final QC", "Final Inspection QC", "/factory/final-qc/dashboard"],
  ["Rhodium", "Rhodium / Plating", "/factory/rhodium/dashboard"],
  ["Tag Print", "Tag Print", "/factory/tag-print/dashboard"],
];

const KT_RATE = {
  "9K": 0.38,
  "9KT": 0.38,
  "14K": 0.59,
  "14KT": 0.59,
  "18K": 0.752,
  "18KT": 0.752,
  "20K": 0.84,
  "20KT": 0.84,
  "22K": 0.92,
  "22KT": 0.92,
  "24K": 0.995,
  "995": 0.995,
  "999": 0.999,
};

function normKt(kt) {
  return String(kt || "Unknown").toUpperCase().replace(/\s/g, "");
}

function fineFromKt(kt, weight) {
  return Number(weight || 0) * Number(KT_RATE[normKt(kt)] || 0);
}

export default function ManufacturingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [buffLoss, setBuffLoss] = useState([]);
  const [electroLoss, setElectroLoss] = useState([]);
  const [castingLoss, setCastingLoss] = useState([]);
  const [ghis, setGhis] = useState([]);
  const [buffBag, setBuffBag] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTxns, setInventoryTxns] = useState([]);
  const [errorText, setErrorText] = useState("");

  async function safeQuery(label, query) {
    const res = await query;
    if (res.error) {
      console.warn(label, res.error.message);
      return label === "buffBag" ? null : [];
    }
    return res.data || (label === "buffBag" ? null : []);
  }

  async function fetchDashboard() {
    setLoading(true);
    setErrorText("");

    try {
      const [
        batchesData,
        ordersData,
        buffLossData,
        electroLossData,
        castingLossData,
        ghisData,
        buffBagData,
        itemsData,
        txnsData,
      ] = await Promise.all([
        safeQuery(
          "batches",
          supabase
            .from("casting_batches")
            .select(
              `
              *,
              casting_batch_items(*, orders(order_no, customer_name, status, delivery_date, created_at))
            `
            )
            .order("updated_at", { ascending: false })
        ),

        safeQuery(
          "orders",
          supabase
            .from("orders")
            .select(`*, order_items(id, quantity, approx_weight, category)`)
            .order("created_at", { ascending: false })
        ),

        safeQuery(
          "buffLoss",
          supabase
            .from("buff_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safeQuery(
          "electroLoss",
          supabase
            .from("electro_polish_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safeQuery(
          "castingLoss",
          supabase
            .from("casting_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safeQuery(
          "ghis",
          supabase
            .from("ghis_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safeQuery(
          "buffBag",
          supabase
            .from("buff_bags")
            .select("*")
            .eq("status", "Active")
            .order("installed_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        ),

        safeQuery("items", supabase.from("inventory_items").select("*")),

        safeQuery(
          "txns",
          supabase
            .from("inventory_transactions")
            .select("*, inventory_items(*)")
            .order("created_at", { ascending: false })
        ),
      ]);

      setBatches(batchesData);
      setOrders(ordersData);
      setBuffLoss(buffLossData);
      setElectroLoss(electroLossData);
      setCastingLoss(castingLossData);
      setGhis(ghisData);
      setBuffBag(buffBagData);
      setInventoryItems(itemsData);
      setInventoryTxns(txnsData);
    } catch (err) {
      setErrorText(err.message || "Dashboard load error");
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const activeBatches = useMemo(() => {
    return batches.filter(
      (b) =>
        !["Completed", "COMPLETED", "Sale", "Delivered", "Cancelled"].includes(
          b.status
        )
    );
  }, [batches]);

  const processCounts = useMemo(() => {
    const obj = {};
    PROCESS_MAP.forEach(([label, status]) => {
      obj[label] = batches.filter((b) => b.status === status).length;
    });
    return obj;
  }, [batches]);

  const orderRows = useMemo(() => {
    return activeBatches.slice(0, 12).map((b) => {
      const firstItem = b.casting_batch_items?.[0];
      const order = firstItem?.orders;

      return {
        id: b.id,
        batchNo: b.batch_no || "-",
        party: order?.customer_name || "-",
        orderNo: order?.order_no || "-",
        kt: b.kt || "-",
        pieces: Number(b.current_pieces || b.good_pieces || 0),
        weight: Number(b.current_weight || b.received_weight || 0),
        process: b.status || "-",
        age: daysOld(b.updated_at || b.created_at),
      };
    });
  }, [activeBatches]);

  const totalActivePieces = activeBatches.reduce(
    (s, b) => s + Number(b.current_pieces || b.good_pieces || 0),
    0
  );

  const totalActiveWeight = activeBatches.reduce(
    (s, b) => s + Number(b.current_weight || b.received_weight || 0),
    0
  );

  const allLossRows = [
    ...buffLoss.map((r) => ({ ...r, source: "Buff / 2C" })),
    ...electroLoss.map((r) => ({ ...r, source: "Electro Polish" })),
    ...castingLoss.map((r) => ({ ...r, source: "Casting" })),
  ];

  const lossByKt = groupByKt(allLossRows, "loss_weight");
  const lossFineByKt = makeFineMap(lossByKt);
  const lossByProcess = groupByKey(allLossRows, "source", "loss_weight");
  const ghisByKt = groupByKt(ghis, "ghis_weight");
  const ghisFineByKt = makeFineMap(ghisByKt);

  const scrapByKt = calcInventoryByType(inventoryTxns, "Scrap");
  const findingsByKt = calcInventoryByType(inventoryTxns, "Finding");
  const gold995 = calcGoldStock(inventoryTxns, "995");
  const gold999 = calcGoldStock(inventoryTxns, "999");

  const totalExpectedFine = buffLoss.reduce(
    (s, r) => s + Number(r.expected_fine_gold || 0),
    0
  );

  const buffRecovered = Number(buffBag?.recovered_fine_gold || 0);
  const buffExpected = Number(buffBag?.expected_fine_gold || 0);
  const recoveryPercent =
    buffExpected > 0 ? (buffRecovered / buffExpected) * 100 : 0;

  const totalRecoverable =
    Object.values(scrapByKt).reduce((s, v) => s + Number(v || 0), 0) +
    Object.values(ghisByKt).reduce((s, v) => s + Number(v || 0), 0) +
    Number(gold995 || 0) +
    Number(gold999 || 0);

  const completedOrders = orders.filter((o) =>
    ["COMPLETED", "Completed"].includes(o.status)
  ).length;

  const alerts = [
    {
      text: "Orders stuck more than 3 days",
      count: orderRows.filter((o) => Number(o.age) > 3).length,
      danger: orderRows.filter((o) => Number(o.age) > 3).length > 0,
    },
    {
      text: "No active buff bag",
      count: buffBag ? 0 : 1,
      danger: !buffBag,
    },
    {
      text: "Recovery below 80%",
      count: recoveryPercent > 0 && recoveryPercent < 80 ? 1 : 0,
      danger: recoveryPercent > 0 && recoveryPercent < 80,
    },
    {
      text: "Pending buff recovery records",
      count: buffLoss.filter((x) => x.recovery_status === "Pending").length,
      danger: buffLoss.filter((x) => x.recovery_status === "Pending").length > 0,
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-6 text-white">
        Loading Manufacturing Dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-800 bg-[#0b1628] p-4 lg:block">
          <h1 className="mb-6 text-xl font-black text-white">Annvi ERP</h1>

          <SideLink href="/dashboard" label="Dashboard" />
          <SideLink href="/orders" label="Orders" />

          <SideTitle title="Manufacturing" />
          {PROCESS_MAP.map(([label, status, href]) => (
            <SideLink key={label} href={href} label={label} />
          ))}

          <SideTitle title="Inventory" />
          <SideLink href="/factory/inventory" label="Inventory" />
          <SideLink href="/factory/buff-bag" label="Buff Bag" />

          <SideTitle title="Reports" />
          <SideLink
            href="/factory/manufacturing-dashboard"
            label="Manufacturing Dashboard"
            active
          />
        </aside>

        <div className="min-w-0 flex-1 p-3 md:p-5">
          <Header onRefresh={fetchDashboard} />

          {errorText && (
            <div className="mb-4 rounded-2xl border border-red-500 bg-red-500/10 p-3 text-sm text-red-300">
              {errorText}
            </div>
          )}

          <div className="grid gap-4">
            <Section title="1 Factory Live Status">
              <div className="grid gap-3 xl:grid-cols-[1fr_1.25fr]">
                <div className="grid gap-3 md:grid-cols-3">
                  <BigStat label="Total Active Orders" value={activeBatches.length} />
                  <BigStat label="Total Active Pieces" value={totalActivePieces} />
                  <BigStat
                    label="Total Active Weight"
                    value={`${totalActiveWeight.toFixed(3)} g`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {PROCESS_MAP.map(([label]) => (
                    <ProcessCard
                      key={label}
                      label={label}
                      count={processCounts[label] || 0}
                    />
                  ))}
                </div>
              </div>
            </Section>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <Section title="2 Order Tracking">
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <SmallStat label="Total Orders" value={orders.length} />
                  <SmallStat label="Completed" value={completedOrders} />
                  <SmallStat label="Live Batches" value={activeBatches.length} />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="p-3">Batch No</th>
                        <th className="p-3">Order</th>
                        <th className="p-3">Party</th>
                        <th className="p-3">KT</th>
                        <th className="p-3">Pcs</th>
                        <th className="p-3">Weight</th>
                        <th className="p-3">Current Process</th>
                        <th className="p-3">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-slate-400">
                            No active batches.
                          </td>
                        </tr>
                      ) : (
                        orderRows.map((o) => (
                          <tr key={o.id} className="border-b border-slate-800">
                            <td className="p-3 font-bold">{o.batchNo}</td>
                            <td className="p-3">{o.orderNo}</td>
                            <td className="p-3">{o.party}</td>
                            <td className="p-3">
                              <Badge>{o.kt}</Badge>
                            </td>
                            <td className="p-3">{o.pieces}</td>
                            <td className="p-3">{o.weight.toFixed(3)} g</td>
                            <td className="p-3">
                              <ProcessBadge>{o.process}</ProcessBadge>
                            </td>
                            <td
                              className={`p-3 ${
                                o.age > 3 ? "font-bold text-red-400" : ""
                              }`}
                            >
                              {o.age} Days
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="3 Gold Position">
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniPanel title="Scrap Gold">
                    <KaratRows data={scrapByKt} />
                  </MiniPanel>

                  <MiniPanel title="Ghis Karat Wise">
                    <KaratRows data={ghisByKt} />
                  </MiniPanel>

                  <MiniPanel title="Findings Stock">
                    <KaratRows data={findingsByKt} />
                  </MiniPanel>

                  <MiniPanel title="Pure Gold Stock">
                    <Row label="995 Gold" value={`${gold995.toFixed(3)} g`} />
                    <Row label="999 Gold" value={`${gold999.toFixed(3)} g`} />
                  </MiniPanel>

                  <div className="rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 md:col-span-2">
                    <p className="text-sm font-bold text-yellow-300">
                      Total Recoverable Gold
                    </p>
                    <p className="mt-2 text-3xl font-black text-yellow-300">
                      {totalRecoverable.toFixed(3)} g
                    </p>
                  </div>
                </div>
              </Section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <Section title="4 Buff Recovery Dashboard">
                <div className="grid gap-3 md:grid-cols-3">
                  <MiniPanel title="Active Buff Bag">
                    <Row label="Bag No" value={buffBag?.bag_no || "-"} />
                    <Row
                      label="Expected Fine"
                      value={`${buffExpected.toFixed(3)} g`}
                    />
                    <Row
                      label="Recovered Fine"
                      value={`${buffRecovered.toFixed(3)} g`}
                    />
                    <Row label="Recovery %" value={`${recoveryPercent.toFixed(2)} %`} />
                  </MiniPanel>

                  <MiniPanel title="Recovery Chart">
                    <DonutChart percent={recoveryPercent} />
                  </MiniPanel>

                  <MiniPanel title="Party Wise Fine">
                    {buffLoss.slice(0, 6).map((r) => (
                      <Row
                        key={r.id}
                        label={r.party_name || r.batch_no || "-"}
                        value={`${Number(r.expected_fine_gold || 0).toFixed(3)} g`}
                      />
                    ))}
                    {buffLoss.length === 0 && <Row label="No Data" value="0.000 g" />}
                  </MiniPanel>
                </div>
              </Section>

              <Section title="5 Loss Dashboard">
                <div className="grid gap-3 md:grid-cols-3">
                  <MiniPanel title="Karat Wise Loss">
                    <KaratRows data={lossByKt} />
                  </MiniPanel>

                  <MiniPanel title="Karat Wise Fine">
                    <KaratRows data={lossFineByKt} />
                  </MiniPanel>

                  <MiniPanel title="Loss By Process">
                    <KaratRows data={lossByProcess} />
                  </MiniPanel>
                </div>
              </Section>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Section title="6 Charts">
                <div className="grid gap-4 md:grid-cols-2">
                  <BarChart
                    title="Process Wise WIP"
                    data={PROCESS_MAP.map(([label]) => ({
                      label,
                      value: processCounts[label] || 0,
                    }))}
                  />

                  <BarChart
                    title="Loss Karat Wise"
                    data={Object.entries(lossByKt).map(([label, value]) => ({
                      label,
                      value,
                    }))}
                    suffix="g"
                  />

                  <BarChart
                    title="Ghis Karat Wise"
                    data={Object.entries(ghisByKt).map(([label, value]) => ({
                      label,
                      value,
                    }))}
                    suffix="g"
                  />

                  <BarChart
                    title="Scrap Gold Karat Wise"
                    data={Object.entries(scrapByKt).map(([label, value]) => ({
                      label,
                      value,
                    }))}
                    suffix="g"
                  />
                </div>
              </Section>

              <Section title="7 Production Summary & Alerts">
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniPanel title="Production Summary">
                    <Row label="Total Orders" value={orders.length} />
                    <Row label="Completed Orders" value={completedOrders} />
                    <Row label="Active Batches" value={activeBatches.length} />
                    <Row label="Loss Records" value={allLossRows.length} />
                  </MiniPanel>

                  <MiniPanel title="Alerts">
                    <div className="space-y-2">
                      {alerts.map((a) => (
                        <div
                          key={a.text}
                          className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                            a.danger
                              ? "border-red-500/40 bg-red-500/10 text-red-300"
                              : "border-green-500/40 bg-green-500/10 text-green-300"
                          }`}
                        >
                          <span>{a.text}</span>
                          <b>{a.count}</b>
                        </div>
                      ))}
                    </div>
                  </MiniPanel>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({ onRefresh }) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-black text-white md:text-3xl">
          ✨ Manufacturing Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Real-time factory overview, gold position, losses and recovery.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold"
        >
          Factory
        </Link>
        <button
          onClick={onRefresh}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-black"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  const first = title.split(" ")[0];

  return (
    <section className="rounded-2xl border border-yellow-500/40 bg-[#0b1628] p-3 shadow-lg">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-white">
        <span className="mr-2 rounded bg-yellow-400 px-2 py-1 text-black">
          {first}
        </span>
        {title.replace(first, "")}
      </h2>
      {children}
    </section>
  );
}

function BigStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-[#101d31] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#101d31] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ProcessCard({ label, count }) {
  const active = count > 0;

  return (
    <Link
      href={PROCESS_MAP.find(([x]) => x === label)?.[2] || "/factory"}
      className={`rounded-xl border p-3 transition hover:-translate-y-1 ${
        active
          ? "border-yellow-500 bg-yellow-500/15 text-yellow-200"
          : "border-slate-700 bg-[#101d31] text-slate-300"
      }`}
    >
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-2 text-xl font-black">{count}</p>
      <p className="text-xs">Orders</p>
    </Link>
  );
}

function MiniPanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-[#101d31] p-4">
      <h3 className="mb-3 text-xs font-black uppercase text-slate-300">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <b className="text-white">{value}</b>
    </div>
  );
}

function KaratRows({ data }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return <Row label="No Data" value="0.000 g" />;

  return entries.map(([kt, wt]) => (
    <Row key={kt} label={kt} value={`${Number(wt || 0).toFixed(3)} g`} />
  ));
}

function BarChart({ title, data, suffix = "" }) {
  const clean = (data || []).filter((d) => Number(d.value || 0) !== 0);
  const max = Math.max(...clean.map((d) => Math.abs(Number(d.value || 0))), 1);

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#101d31] p-4">
      <h3 className="mb-4 text-xs font-black uppercase text-slate-300">
        {title}
      </h3>

      <div className="space-y-3">
        {clean.length === 0 ? (
          <p className="text-sm text-slate-400">No chart data</p>
        ) : (
          clean.map((d) => {
            const width = Math.max(
              5,
              (Math.abs(Number(d.value || 0)) / max) * 100
            );

            return (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{d.label}</span>
                  <b className="text-yellow-300">
                    {Number(d.value || 0).toFixed(suffix ? 3 : 0)}
                    {suffix ? ` ${suffix}` : ""}
                  </b>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DonutChart({ percent }) {
  const safe = Math.max(0, Math.min(100, Number(percent || 0)));

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="grid h-32 w-32 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${safe}%, #1e293b 0)`,
        }}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[#101d31]">
          <div className="text-center">
            <p className="text-xl font-black text-white">{safe.toFixed(1)}%</p>
            <p className="text-xs text-slate-400">Recovery</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">
      {children}
    </span>
  );
}

function ProcessBadge({ children }) {
  return (
    <span className="rounded bg-purple-600 px-2 py-1 text-xs font-bold text-white">
      {children}
    </span>
  );
}

function SideTitle({ title }) {
  return (
    <p className="mt-5 px-3 text-xs font-bold uppercase text-slate-500">
      {title}
    </p>
  );
}

function SideLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`mt-1 block rounded-xl px-3 py-2 text-sm font-semibold ${
        active ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </Link>
  );
}

function groupByKt(rows, weightKey) {
  return (rows || []).reduce((acc, row) => {
    const kt = row.kt || "Unknown";
    acc[kt] = Number(acc[kt] || 0) + Number(row[weightKey] || 0);
    return acc;
  }, {});
}

function groupByKey(rows, key, weightKey) {
  return (rows || []).reduce((acc, row) => {
    const label = row[key] || "Unknown";
    acc[label] = Number(acc[label] || 0) + Number(row[weightKey] || 0);
    return acc;
  }, {});
}

function makeFineMap(weightMap) {
  return Object.entries(weightMap || {}).reduce((acc, [kt, wt]) => {
    acc[kt] = fineFromKt(kt, wt);
    return acc;
  }, {});
}

function calcInventoryByType(txns, itemType) {
  const out = {};

  (txns || []).forEach((t) => {
    const item = t.inventory_items;
    if (item?.item_type !== itemType) return;

    const kt = t.kt || "Unknown";
    const sign = t.transaction_type === "Stock Out" ? -1 : 1;
    out[kt] = Number(out[kt] || 0) + sign * Number(t.weight || 0);
  });

  return out;
}

function calcGoldStock(txns, goldType) {
  return (txns || []).reduce((sum, t) => {
    const item = t.inventory_items;
    const name = String(item?.item_name || "").toLowerCase();

    if (!name.includes(goldType)) return sum;

    const sign = t.transaction_type === "Stock Out" ? -1 : 1;
    return sum + sign * Number(t.weight || 0);
  }, 0);
}

function daysOld(date) {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}