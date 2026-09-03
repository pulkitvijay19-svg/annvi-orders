"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

const PROCESS_MAP = [
  { label: "Casting", status: "Casting", href: "/factory/casting", icon: "♨️" },
  { label: "Magnet", status: "Magnet", href: "/factory/magnet/dashboard", icon: "🧲" },
  { label: "Bench", status: "Bench", href: "/factory/bench/dashboard", icon: "🛠️" },
  { label: "Pre Polish", status: "Pre Polish", href: "/factory/pre-polish/dashboard", icon: "✨" },
  { label: "Final Repair", status: "Final Repair", href: "/factory/final-repair/dashboard", icon: "🔧" },
  { label: "Stone Setting", status: "Stone Setting", href: "/factory/stone-setting/dashboard", icon: "💎" },
  { label: "Buff", status: "Buff", href: "/factory/buff/dashboard", icon: "🌀" },
  { label: "Final QC", status: "Final Inspection QC", href: "/factory/final-qc/dashboard", icon: "✅" },
  { label: "Rhodium", status: "Rhodium / Plating", href: "/factory/rhodium/dashboard", icon: "⚗️" },
  { label: "Tag Print", status: "Tag Print", href: "/factory/tag-print/dashboard", icon: "🏷️" },
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

function n(v) {
  return Number(v || 0);
}

function fmt(v, digits = 3) {
  return n(v).toFixed(digits);
}

function normKt(kt) {
  return String(kt || "Unknown").toUpperCase().replace(/\s/g, "");
}

function fineFromKt(kt, weight) {
  return n(weight) * n(KT_RATE[normKt(kt)] || 0);
}

function daysOld(date) {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function groupByKt(rows, weightKey) {
  return (rows || []).reduce((acc, row) => {
    const kt = row.kt || "Unknown";
    acc[kt] = n(acc[kt]) + n(row[weightKey]);
    return acc;
  }, {});
}

function groupByKey(rows, key, weightKey) {
  return (rows || []).reduce((acc, row) => {
    const label = row[key] || "Unknown";
    acc[label] = n(acc[label]) + n(row[weightKey]);
    return acc;
  }, {});
}

function makeFineMap(weightMap) {
  return Object.entries(weightMap || {}).reduce((acc, [kt, wt]) => {
    acc[kt] = fineFromKt(kt, wt);
    return acc;
  }, {});
}

function inventoryByType(txns, itemType) {
  const out = {};

  (txns || []).forEach((t) => {
    const item = t.inventory_items;
    if (item?.item_type !== itemType) return;

    const kt = t.kt || "Unknown";
    const sign = t.transaction_type === "Stock Out" ? -1 : 1;
    out[kt] = n(out[kt]) + sign * n(t.weight);
  });

  return out;
}

function goldStock(txns, text) {
  return (txns || []).reduce((sum, t) => {
    const name = String(t.inventory_items?.item_name || "").toLowerCase();
    if (!name.includes(String(text).toLowerCase())) return sum;

    const sign = t.transaction_type === "Stock Out" ? -1 : 1;
    return sum + sign * n(t.weight);
  }, 0);
}

function sumObj(obj) {
  return Object.values(obj || {}).reduce((s, v) => s + n(v), 0);
}

export default function ManufacturingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [buffLoss, setBuffLoss] = useState([]);
  const [electroLoss, setElectroLoss] = useState([]);
 const [castingLoss, setCastingLoss] = useState([]);
const [ghis, setGhis] = useState([]);
const [stoneSettingResults, setStoneSettingResults] = useState([]);
const [rhodiumResults, setRhodiumResults] = useState([]);
  const [buffBag, setBuffBag] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTxns, setInventoryTxns] = useState([]);

  async function safe(label, query, single = false) {
    const res = await query;

    if (res.error) {
      console.warn(label, res.error.message);
      return single ? null : [];
    }

    return res.data || (single ? null : []);
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
  stoneSettingData,
  rhodiumData,
  buffBagData,
  itemsData,
  txnsData,
] = await Promise.all([
        safe(
          "batches",
          supabase
            .from("casting_batches")
            .select(`
              *,
              casting_batch_items(*, orders(order_no, customer_name, status, delivery_date, created_at))
            `)
            .order("updated_at", { ascending: false })
        ),

        safe(
          "orders",
          supabase
            .from("orders")
            .select("*, order_items(id, quantity, approx_weight, category)")
            .order("created_at", { ascending: false })
        ),

        safe(
          "buff_loss_records",
          supabase
            .from("buff_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safe(
          "electro_polish_loss_records",
          supabase
            .from("electro_polish_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safe(
          "casting_loss_records",
          supabase
            .from("casting_loss_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safe(
          "ghis_records",
          supabase
            .from("ghis_records")
            .select("*")
            .order("created_at", { ascending: false })
        ),

        safe(
  "stone_setting_results",
  supabase
    .from("stone_setting_results")
    .select(`
      id,
      casting_batch_id,
      stone_challan_weight,
      stone_setting_loss,
      created_at
    `)
    .order("created_at", { ascending: false })
),

safe(
  "rhodium_results",
  supabase
    .from("rhodium_results")
    .select(`
      id,
      casting_batch_id,
      received_weight,
      received_pieces,
      created_at
    `)
    .order("created_at", { ascending: false })
),

        safe(
          "buff_bags",
          supabase
            .from("buff_bags")
            .select("*")
            .eq("status", "Active")
            .order("installed_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          true
        ),

        safe(
          "inventory_items",
          supabase.from("inventory_items").select("*")
        ),

        safe(
          "inventory_transactions",
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
      setStoneSettingResults(stoneSettingData);
      setRhodiumResults(rhodiumData);
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
  return batches.filter((b) => {
    const batchCompleted = [
      "Completed",
      "COMPLETED",
      "Sale",
      "Delivered",
      "DELIVERED",
      "Cancelled",
      "CANCELLED",
    ].includes(b.status);

    if (batchCompleted) {
      return false;
    }

    const linkedOrders =
      b.casting_batch_items
        ?.map((item) => item.orders)
        .filter(Boolean) || [];

    const allOrdersCompleted =
      linkedOrders.length > 0 &&
      linkedOrders.every((order) =>
        [
          "COMPLETED",
          "Completed",
          "DELIVERED",
          "Delivered",
        ].includes(order.status)
      );

    return !allOrdersCompleted;
  });
}, [batches]);

  const processCounts = useMemo(() => {
    const obj = {};

    PROCESS_MAP.forEach((p) => {
      obj[p.label] = batches.filter((b) => b.status === p.status).length;
    });

    return obj;
  }, [batches]);

  const orderRows = useMemo(() => {
    return activeBatches.slice(0, 8).map((b) => {
      const firstItem = b.casting_batch_items?.[0];
      const order = firstItem?.orders;

      return {
        id: b.id,
        batchNo: b.batch_no || "-",
        orderNo: order?.order_no || "-",
        party: order?.customer_name || "-",
        kt: b.kt || "-",
        pieces: n(b.current_pieces || b.good_pieces),
        weight: n(b.current_weight || b.received_weight),
        process: b.status || "-",
        age: daysOld(b.updated_at || b.created_at),
      };
    });
  }, [activeBatches]);

  const allLossRows = [
    ...buffLoss.map((r) => ({
      ...r,
      source: String(r.remarks || "").includes("2C") ? "Pre Polish" : "Buff",
    })),
    ...electroLoss.map((r) => ({ ...r, source: "Electro Polish" })),
    ...castingLoss.map((r) => ({ ...r, source: "Casting" })),
  ];

  const lossByKt = groupByKt(allLossRows, "loss_weight");
  const lossFineByKt = makeFineMap(lossByKt);
  const lossByProcess = groupByKey(allLossRows, "source", "loss_weight");

  const ghisByKt = groupByKt(ghis, "ghis_weight");
  const ghisFineByKt = makeFineMap(ghisByKt);

  const stoneChallanTotal = stoneSettingResults.reduce(
  (sum, row) =>
    sum + n(row.stone_challan_weight),
  0
);

  const scrapByKt = inventoryByType(inventoryTxns, "Scrap");
  const findingsByKt = inventoryByType(inventoryTxns, "Finding");
  const goldStockByKt = inventoryByType(inventoryTxns, "Gold");

const gold995 = goldStock(
  inventoryTxns,
  "Gold Fine"
);

  const totalActivePieces = activeBatches.reduce(
    (s, b) => s + n(b.current_pieces || b.good_pieces),
    0
  );

  const totalActiveWeight = activeBatches.reduce(
    (s, b) => s + n(b.current_weight || b.received_weight),
    0
  );

 const now = new Date();

const startOfToday = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate()
);

const startOfTomorrow = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 1
);

const startOfMonth = new Date(
  now.getFullYear(),
  now.getMonth(),
  1
);

const startOfNextMonth = new Date(
  now.getFullYear(),
  now.getMonth() + 1,
  1
);

const isCompletedStatus = (status) =>
  [
    "COMPLETED",
    "Completed",
    "completed",
    "DELIVERED",
    "Delivered",
    "delivered",
  ].includes(String(status || ""));

const completedOrders = orders.filter((o) =>
  isCompletedStatus(o.status)
).length;

const completedToday = orders.filter((o) => {
  if (!isCompletedStatus(o.status)) return false;

  const completedDate = new Date(
    o.updated_at || o.created_at
  );

  return (
    completedDate >= startOfToday &&
    completedDate < startOfTomorrow
  );
});

const monthOrders = orders.filter((o) => {
  const created = new Date(o.created_at);

  return (
    created >= startOfMonth &&
    created < startOfNextMonth
  );
});

const todayCompletedCount =
  completedToday.length;

const monthOrderIds = new Set(
  monthOrders.map((order) => order.id)
);

const monthBatchIds = new Set(
  batches
    .filter((batch) =>
      (batch.casting_batch_items || []).some(
        (item) =>
          monthOrderIds.has(item.order_id)
      )
    )
    .map((batch) => batch.id)
);

const monthRhodiumRows = rhodiumResults.filter(
  (row) =>
    monthBatchIds.has(row.casting_batch_id)
);

const monthTotalOrderWeight =
  monthRhodiumRows.reduce(
    (sum, row) =>
      sum + n(row.received_weight),
    0
  );

const monthCompletedOrders =
  monthOrders.filter((order) =>
    isCompletedStatus(order.status)
  ).length;

const monthAverageOrderWeight =
  monthCompletedOrders > 0
    ? monthTotalOrderWeight /
      monthCompletedOrders
    : 0;

  const buffExpected = n(buffBag?.expected_fine_gold);
  const buffRecovered = n(buffBag?.recovered_fine_gold);

  const recoveryPercent =
    buffExpected > 0 ? (buffRecovered / buffExpected) * 100 : 0;

  const electroExpected = electroLoss.reduce(
  (sum, row) =>
    sum + fineFromKt(row.kt, row.loss_weight),
  0
);

const electroRecovered = electroLoss.reduce(
  (sum, row) =>
    sum +
    n(
      row.recovered_fine_gold ??
        row.recovered_weight ??
        0
    ),
  0
);

const electroRecoveryPercent =
  electroExpected > 0
    ? (electroRecovered / electroExpected) * 100
    : 0;  

  const totalRecoverable =
  sumObj(ghisByKt) +
  stoneChallanTotal;

  const totalLossWeight = sumObj(lossByKt);
  const totalLossFine = sumObj(lossFineByKt);

  const negativeStockCount = [
    ...Object.values(scrapByKt),
    ...Object.values(findingsByKt),
    ...Object.values(goldStockByKt),
  ].filter((v) => n(v) < 0).length;

  const alerts = [
    {
      text: "Orders stuck more than 3 days",
      count: orderRows.filter((o) => o.age > 3).length,
      danger: orderRows.some((o) => o.age > 3),
    },
    {
      text: "Negative stock items",
      count: negativeStockCount,
      danger: negativeStockCount > 0,
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
      text: "Pending buff recovery",
      count: buffLoss.filter((x) => x.recovery_status === "Pending").length,
      danger: buffLoss.some((x) => x.recovery_status === "Pending"),
    },
  ];

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111f] text-white">
        Loading Manufacturing Dashboard...
      </main>
    );
  }
    return (
    <main className="min-h-screen bg-[#06111f] text-slate-100">
      <div className="flex">
        <Sidebar />

        <div className="min-w-0 flex-1 p-3">
          <Topbar onRefresh={fetchDashboard} />

          {errorText && (
            <div className="mb-3 rounded-xl border border-red-500 bg-red-500/10 p-3 text-sm text-red-300">
              {errorText}
            </div>
          )}

          <div className="grid gap-2">
            <div className="grid gap-2 xl:grid-cols-[1fr_260px]">
              <Section number="1" title="Factory Live Status">
                <div className="grid gap-2 xl:grid-cols-[1fr_1.2fr]">
                  <div className="grid gap-2 md:grid-cols-3">
                    <MetricCard
                      label="Total Active Orders"
                      value={activeBatches.length}
                      sub="Live WIP batches"
                    />

                    <MetricCard
                      label="Total Active Pieces"
                      value={totalActivePieces}
                      sub="Across factory"
                    />

                    <MetricCard
                      label="Total Active Weight"
                      value={`${fmt(totalActiveWeight)} g`}
                      sub="Current WIP weight"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-black uppercase text-slate-300">
                      Process wise WIP
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {PROCESS_MAP.map((p) => (
                        <ProcessBox
                          key={p.label}
                          process={p}
                          count={processCounts[p.label] || 0}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <QuickActions />
            </div>

            <div className="grid gap-2 xl:grid-cols-[1.2fr_0.9fr]">
              <Section number="2" title="Order Tracking">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Pill>All Orders ({orders.length})</Pill>
                    <Pill>
                      Stuck Orders (
                      {orderRows.filter((o) => o.age > 3).length})
                    </Pill>
                    <Pill>Priority Orders (0)</Pill>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-[#091627] px-3 py-2 text-xs text-slate-400">
                    Search Order...
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400">
                        <th className="p-2">Batch No</th>
                        <th className="p-2">Order No</th>
                        <th className="p-2">Party Name</th>
                        <th className="p-2">Karat</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2">Current Process</th>
                        <th className="p-2">Since / Age</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orderRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-3 text-slate-400">
                            No active orders.
                          </td>
                        </tr>
                      ) : (
                        orderRows.map((o) => (
                          <tr
                            key={o.id}
                            className="border-b border-slate-800"
                          >
                            <td className="p-2 font-bold text-white">
                              {o.batchNo}
                            </td>
                            <td className="p-2">{o.orderNo}</td>
                            <td className="p-2">{o.party}</td>
                            <td className="p-2">
                              <KtBadge kt={o.kt} />
                            </td>
                            <td className="p-2">{o.pieces}</td>
                            <td className="p-2">{fmt(o.weight)}</td>
                            <td className="p-2">
                              <ProcessBadge>{o.process}</ProcessBadge>
                            </td>
                            <td
                              className={`p-2 ${
                                o.age > 3
                                  ? "font-black text-red-400"
                                  : ""
                              }`}
                            >
                              {o.age} Days
                            </td>
                            <td className="p-2">
                              <StatusBadge danger={o.age > 3}>
                                {o.age > 3 ? "Stuck" : "In Progress"}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section number="3" title="Gold Position">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <InfoPanel title="Scrap Gold (Loss)">
                    <KaratRows data={scrapByKt} />
                  </InfoPanel>

                  <InfoPanel title="Ghis (Karat Wise Total)">
                    <KaratRows data={ghisByKt} />
                  </InfoPanel>

                  <InfoPanel title="Findings Stock">
                    <KaratRows data={findingsByKt} />
                  </InfoPanel>

                  <InfoPanel title="Stone Setting Challan">
  <Line
    label="Recoverable Challan"
    value={`${fmt(stoneChallanTotal)} g`}
    highlight
  />
</InfoPanel>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr]">
                  <InfoPanel title="Pure Gold Stock">
  <Line
    label="995 Gold"
    value={`${fmt(gold995)} g`}
  />
</InfoPanel>
                  <div className="rounded-xl border border-yellow-500 bg-yellow-500/10 p-3">
                    <p className="text-xs font-black uppercase text-yellow-300">
                      Total Recoverable Gold
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-3xl font-black text-yellow-300">
                        {fmt(totalRecoverable)} g
                      </p>

                      <span className="text-4xl">🟨</span>
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            <div className="grid gap-2 xl:grid-cols-[1.15fr_0.85fr]">
              <Section number="4" title="Buff Recovery Dashboard">
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr]">
                  <InfoPanel title="Active Buff Bag">
                    <Line
                      label="Bag No."
                      value={buffBag?.bag_no || "-"}
                      highlight
                    />

                    <Line
                      label="Installed Date"
                      value={buffBag?.installed_date || "-"}
                    />

                    <Line
                      label="Expected Fine"
                      value={`${fmt(buffExpected)} g`}
                    />

                    <Line
                      label="Recovered Fine"
                      value={`${fmt(buffRecovered)} g`}
                    />

                    <Line
                      label="Recovery %"
                      value={`${recoveryPercent.toFixed(2)}%`}
                      green
                    />

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{
                          width: `${Math.min(100, recoveryPercent)}%`,
                        }}
                      />
                    </div>
                  </InfoPanel>

                  <InfoPanel title="Recovery Summary">
                    <div className="grid place-items-center">
                      <Donut percent={recoveryPercent} />
                    </div>
                  </InfoPanel>

                  <InfoPanel title="Party Wise (Loss → Expected Fine)">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-2 text-left">Party</th>
                          <th className="py-2 text-right">Loss</th>
                          <th className="py-2 text-right">Expected Fine</th>
                        </tr>
                      </thead>

                      <tbody>
                        {buffLoss.slice(0, 5).map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-800"
                          >
                            <td className="py-2">
                              {r.party_name || r.batch_no || "-"}
                            </td>
                            <td className="py-2 text-right">
                              {fmt(r.loss_weight)}
                            </td>
                            <td className="py-2 text-right">
                              {fmt(r.expected_fine_gold)}
                            </td>
                          </tr>
                        ))}

                        {buffLoss.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-2 text-slate-400"
                            >
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </InfoPanel>
                </div>
              </Section>

              <Section
  number="5"
  title="Electro Polishing Recovery Dashboard"
>
  <div className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr]">

    <InfoPanel title="Electro Recovery">
      <Line
        label="Total Electro Loss"
        value={`${fmt(
          electroLoss.reduce(
            (sum, row) =>
              sum + n(row.loss_weight),
            0
          )
        )} g`}
      />

      <Line
        label="Expected Fine"
        value={`${fmt(electroExpected)} g`}
      />

      <Line
        label="Recovered Fine"
        value={`${fmt(electroRecovered)} g`}
      />

      <Line
        label="Recovery %"
        value={`${electroRecoveryPercent.toFixed(
          2
        )}%`}
        green
      />

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-green-500"
          style={{
            width: `${Math.min(
              100,
              electroRecoveryPercent
            )}%`,
          }}
        />
      </div>
    </InfoPanel>

    <InfoPanel title="Recovery Summary">
      <div className="grid place-items-center">
        <Donut
          percent={electroRecoveryPercent}
        />
      </div>
    </InfoPanel>

    <InfoPanel title="Karat Wise Electro Loss">
      {Object.keys(
        groupByKt(
          electroLoss,
          "loss_weight"
        )
      ).length === 0 ? (
        <Line
          label="No Data"
          value="0.000 g"
        />
      ) : (
        <KaratRows
          data={groupByKt(
            electroLoss,
            "loss_weight"
          )}
        />
      )}

      <div className="mt-3 border-t border-slate-700 pt-2">
        <Line
          label="Pending Recovery"
          value={
            electroLoss.filter(
              (row) =>
                row.recovery_status === "Pending"
            ).length
          }
          highlight
        />
      </div>
    </InfoPanel>

  </div>
</Section>

              <Section number="6" title="Loss Dashboard">
                <div className="grid gap-2 md:grid-cols-3">
                  <InfoPanel title="Karat Wise Loss">
                    <KaratRows data={lossByKt} total />
                  </InfoPanel>

                  <InfoPanel title="Process Wise Loss">
                    <KaratRows data={lossByProcess} total />
                  </InfoPanel>

                  <InfoPanel title="Loss Type Wise">
                    <Line
                      label="Ghis"
                      value={`${fmt(sumObj(ghisByKt))} g`}
                    />

                    <Line
                      label="Buff / 2C"
                      value={`${fmt(
                        sumObj(
                          groupByKey(
                            buffLoss,
                            "recovery_status",
                            "loss_weight"
                          )
                        )
                      )} g`}
                    />

                    <Line
                      label="Electro"
                      value={`${fmt(
                        sumObj(
                          groupByKey(
                            electroLoss,
                            "recovery_status",
                            "loss_weight"
                          )
                        )
                      )} g`}
                    />

                    <Line
                      label="Casting"
                      value={`${fmt(
                        sumObj(
                          groupByKey(
                            castingLoss,
                            "recovery_status",
                            "loss_weight"
                          )
                        )
                      )} g`}
                    />

                    <Line
                      label="Total Fine"
                      value={`${fmt(totalLossFine)} g`}
                      highlight
                    />
                  </InfoPanel>
                </div>
              </Section>
            </div>

            <div className="grid gap-2 xl:grid-cols-[1fr_0.75fr_0.75fr]">
              <Section number="7" title="Inventory Dashboard">
                <div className="grid gap-2 md:grid-cols-3">
                  <InfoPanel title="Gold Stock (Karat Wise)">
                    <KaratRows data={goldStockByKt} />
                  </InfoPanel>

                  <InfoPanel title="Findings">
                    <Line
                      label="Available"
                      value={`${fmt(sumObj(findingsByKt))} g`}
                    />
                    <Line
                      label="KT Groups"
                      value={Object.keys(findingsByKt).length}
                    />
                    <Line
                      label="Items"
                      value={
                        inventoryItems.filter(
                          (i) => i.item_type === "Finding"
                        ).length
                      }
                    />
                  </InfoPanel>

                  <InfoPanel title="Scrap Inventory">
                    <KaratRows data={scrapByKt} />
                  </InfoPanel>
                </div>
              </Section>

              <Section number="8" title="Production Summary">
                <div className="grid gap-2">
                  <InfoPanel title="Today">
                    <Line
  label="Orders Completed"
  value={todayCompletedCount}
/>
                    <Line
                      label="Live Batches"
                      value={activeBatches.length}
                    />
                    <Line
                      label="Live Weight"
                      value={`${fmt(totalActiveWeight)} g`}
                    />
                  </InfoPanel>

                  <InfoPanel title="This Month">
  <Line
    label="Total Orders"
    value={monthOrders.length}
  />

  <Line
    label="Completed Orders"
    value={
      monthOrders.filter((order) =>
        isCompletedStatus(order.status)
      ).length
    }
  />

  <Line
    label="Total Order Weight"
    value={`${fmt(monthTotalOrderWeight)} g`}
  />

  <Line
    label="Average Order Weight"
    value={`${fmt(monthAverageOrderWeight)} g`}
  />
</InfoPanel>

                  <InfoPanel title="Average Production Time">
                    <Line label="Casting → Tag Print" value="-" />
                    <Line label="Tag Print → Sale" value="-" />
                  </InfoPanel>
                </div>
              </Section>

              <Section number="9" title="Alerts">
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <div
                      key={a.text}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                        a.danger
                          ? "border-red-500/30 bg-red-500/10 text-red-300"
                          : "border-green-500/30 bg-green-500/10 text-green-300"
                      }`}
                    >
                      <span>{a.text}</span>
                      <b className="rounded bg-black/30 px-2 py-1">
                        {a.count}
                      </b>
                    </div>
                  ))}
                </div>

                <Link
                  href="/factory"
                  className="mt-3 block rounded-lg border border-slate-700 py-2 text-center text-xs text-slate-300"
                >
                  View All Alerts →
                </Link>
              </Section>
            </div>

            <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
              <BottomStat label="Total Orders" value={orders.length} />
              <BottomStat
                label="Completed Orders"
                value={completedOrders}
              />
              <BottomStat
                label="Live Orders"
                value={activeBatches.length}
              />
              <BottomStat
                label="Gold in Factory"
                value={`${fmt(totalRecoverable)} g`}
                gold
              />
              <BottomStat
                label="Total Loss"
                value={`${fmt(totalLossWeight)} g`}
                red
              />
              <BottomStat
                label="Loss Fine"
                value={`${fmt(totalLossFine)} g`}
                red
              />
              <BottomStat
                label="Buff Recovery"
                value={`${recoveryPercent.toFixed(2)}%`}
                green
              />

              <Link
                href="/factory"
                className="grid place-items-center rounded-xl border border-purple-500/50 bg-purple-600/40 p-3 text-sm font-bold text-white"
              >
                View Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-60 shrink-0 border-r border-slate-800 bg-[#081424] p-3 lg:block">
      <div className="mb-5 flex items-center gap-2 text-lg font-black text-white">
        <span>♻️</span> Annvi ERP
      </div>

      <SideLink href="/dashboard" label="Dashboard" active />
      <SideLink href="/orders" label="Orders" arrow />

      <SideTitle>Manufacturing</SideTitle>
      {PROCESS_MAP.map((p) => (
        <SideLink key={p.label} href={p.href} label={p.label} />
      ))}

      <SideTitle>Inventory</SideTitle>
      <SideLink href="/factory/inventory" label="Gold Stock" />
      <SideLink href="/factory/inventory" label="Findings" />
      <SideLink href="/factory/inventory" label="Scrap Gold" />
      <SideLink href="/factory/buff-bag" label="Buff Bag" />

      <SideTitle>Reports</SideTitle>
      <SideLink
        href="/factory/manufacturing-dashboard"
        label="Loss Report"
      />
      <SideLink
        href="/factory/manufacturing-dashboard"
        label="Production Report"
      />
      <SideLink href="/factory/buff-bag" label="Recovery Report" />

      <SideTitle>Masters</SideTitle>
      <SideLink href="/catalog/upload" label="Karat Master" />
      <SideLink href="/catalog/upload" label="Loss Type Master" />
      <SideLink href="/parties" label="Party Master" />
      <SideLink href="/profiles" label="Users" />

      <div className="mt-6 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-400">
        « Collapse
      </div>
    </aside>
  );
}

function Topbar({ onRefresh }) {
  return (
    <header className="mb-2 flex flex-col gap-2 border-b border-yellow-500/40 pb-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-black text-white">
          ✨ Manufacturing Dashboard
        </h1>
        <p className="text-xs text-slate-400">
          Real-time factory overview & analytics
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">
          Date: Today
        </div>

        <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">
          Filter
        </button>

        <button
          onClick={onRefresh}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"
        >
          Refresh
        </button>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400 text-black">
            P
          </div>

          <div>
            <p className="text-xs font-bold text-white">Pulkit Vijay</p>
            <p className="text-[10px] text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function QuickActions() {
  const actions = [
    ["New Order", "/orders/add"],
    ["Manufacturing Entry", "/factory"],
    ["Loss Entry", "/factory/manufacturing-dashboard"],
    ["Buff Recovery Entry", "/factory/buff-bag"],
    ["Stock Adjustment", "/factory/inventory"],
  ];

  return (
    <Section number="" title="Quick Actions">
      <div className="space-y-2">
        {actions.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-slate-800"
          >
            <span className="grid h-6 w-6 place-items-center rounded bg-purple-600 text-white">
              +
            </span>
            {label}
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Section({ number, title, children }) {
  return (
    <section className="rounded-xl border border-yellow-500/45 bg-[#0b1628] p-3 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
      <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-white">
        {number ? (
          <span className="mr-2 rounded bg-yellow-400 px-2 py-1 text-black">
            {number}
          </span>
        ) : null}
        {title}
      </h2>

      {children}
    </section>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0d1a2c] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-3 text-xs text-green-400">↑ {sub}</p>
    </div>
  );
}

function ProcessBox({ process, count }) {
  const active = count > 0;

  return (
    <Link
      href={process.href}
      className={`rounded-lg border p-2 text-xs transition hover:-translate-y-0.5 ${
        active
          ? "border-yellow-500 bg-yellow-500/20 text-yellow-100"
          : "border-slate-700 bg-[#0e1c30] text-slate-300"
      }`}
    >
      <div className="flex items-center gap-1 font-bold">
        <span>{process.icon}</span> {process.label}
      </div>

      <p className="mt-1 text-lg font-black">{count}</p>
      <p>Orders</p>
    </Link>
  );
}

function InfoPanel({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0d1a2c] p-3">
      <h3 className="mb-3 text-xs font-black uppercase text-slate-300">
        {title}
      </h3>

      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Line({ label, value, highlight, green }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span
        className={
          highlight
            ? "text-yellow-300"
            : green
            ? "text-green-400"
            : "text-slate-300"
        }
      >
        {label}
      </span>

      <b
        className={
          highlight
            ? "text-yellow-300"
            : green
            ? "text-green-400"
            : "text-white"
        }
      >
        {value}
      </b>
    </div>
  );
}

function KaratRows({ data, total }) {
  const rows = Object.entries(data || {});

  if (rows.length === 0) {
    return <Line label="No Data" value="0.000 g" />;
  }

  return (
    <>
      {rows.map(([kt, wt]) => (
        <Line key={kt} label={kt} value={`${fmt(wt)} g`} />
      ))}

      {total && (
        <div className="border-t border-slate-700 pt-2">
          <Line label="Total" value={`${fmt(sumObj(data))} g`} highlight />
        </div>
      )}
    </>
  );
}

function Donut({ percent }) {
  const safe = Math.max(0, Math.min(100, n(percent)));

  return (
    <div className="grid place-items-center">
      <div
        className="grid h-28 w-28 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${safe}%, #1e293b 0)`,
        }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0d1a2c] text-center">
          <div>
            <p className="text-sm font-black text-white">
              {safe.toFixed(2)}%
            </p>
            <p className="text-[10px] text-slate-400">Recover</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="rounded-lg border border-slate-700 bg-[#0a1728] px-3 py-2 text-xs text-slate-300">
      {children}
    </span>
  );
}

function KtBadge({ kt }) {
  return (
    <span className="rounded bg-blue-600 px-2 py-1 text-[10px] font-black text-white">
      {kt}
    </span>
  );
}

function ProcessBadge({ children }) {
  return (
    <span className="rounded bg-purple-600 px-2 py-1 text-[10px] font-black text-white">
      {children}
    </span>
  );
}

function StatusBadge({ children, danger }) {
  return (
    <span
      className={`rounded px-2 py-1 text-[10px] font-black ${
        danger
          ? "bg-red-600/40 text-red-200"
          : "bg-green-600/40 text-green-200"
      }`}
    >
      {children}
    </span>
  );
}

function BottomStat({ label, value, gold, red, green }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-[#0d1a2c] p-3">
      <p className="text-xs text-slate-400">{label}</p>

      <p
        className={`mt-1 text-lg font-black ${
          gold
            ? "text-yellow-300"
            : red
            ? "text-red-400"
            : green
            ? "text-green-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SideTitle({ children }) {
  return (
    <p className="mt-5 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {children}
    </p>
  );
}

function SideLink({ href, label, active, arrow }) {
  return (
    <Link
      href={href}
      className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
        active
          ? "bg-purple-600 text-white"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      <span>{label}</span>
      {arrow ? <span>›</span> : null}
    </Link>
  );
}