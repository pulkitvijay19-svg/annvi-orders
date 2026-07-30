"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import MobileBottomNav from "../../../../components/MobileBottomNav";
import { useLanguage } from "../../../../context/LanguageContext";


export default function RhodiumDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const { t } = useLanguage();
  const [targetBatchNo, setTargetBatchNo] = useState("");
  const [batches, setBatches] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);

    const { data, error } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(*, orders(order_no, customer_name)),
        rhodium_results(*)
      `)
      .eq("status", "Rhodium / Plating")
      .order("created_at", { ascending: false });

    if (error) alert(error.message);

    setBatches(data || []);
    setLoading(false);
  }
useEffect(() => {
  fetchData();
}, []);

useEffect(() => {
  const batchId = targetBatchNo;

  if (batchId) {
    setOpenId(batchId);
  }
}, [targetBatchNo]);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setTargetBatchNo(params.get("batch") || "");
}, []);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-sm text-gray-700">
        {t("loading_rhodium")}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header t={t} />

        {batches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            {t("no_rhodium_batches")}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.map((batch) => (
              <RhodiumCard
                key={batch.id}
                batch={batch}
                 t={t}
                isOpen={openId === batch.id}
                onOpen={() => setOpenId(openId === batch.id ? null : batch.id)}
                onRefresh={fetchData}
              />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.8rem;
          border: 1px solid #d1d5db;
          background: white;
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function RhodiumCard({ batch, t, isOpen, onOpen, onRefresh }) {
  const router = useRouter();
  const items = batch.casting_batch_items || [];

  const [operatorName, setOperatorName] = useState("");

  const [issuedPieces, setIssuedPieces] = useState(
    Number(batch.current_pieces || batch.good_pieces || 0)
  );
  const [issuedWeight, setIssuedWeight] = useState(
    Number(batch.current_weight || batch.received_weight || 0)
  );

  const [receivedPieces, setReceivedPieces] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");

  const [rejectedPieces, setRejectedPieces] = useState("");
  const [rejectedWeight, setRejectedWeight] = useState("");

  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const parties = [
    ...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean)),
  ];

  const orders = [
    ...new Set(items.map((i) => i.orders?.order_no).filter(Boolean)),
  ];

const rhodiumDifference =
  Number(issuedWeight || 0) -
  Number(receivedWeight || 0) -
  Number(rejectedWeight || 0);

const absDifference = Math.abs(rhodiumDifference);
{
  rhodiumDifference >= 0
    ? `${absDifference.toFixed(3)} g Loss`
    : `${absDifference.toFixed(3)} g Gain`
}
    

  async function getScrapItemId() {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("item_type", "Scrap")
      .eq("item_name", "Casting Scrap")
      .maybeSingle();

    if (error) {
      alert(error.message);
      return null;
    }

    if (!data?.id) {
      alert(t("casting_scrap_not_found"));
      return null;
    }

    return data.id;
  }

  async function stockInRejectedScrap() {
    if (Number(rejectedWeight || 0) <= 0) return true;

    const scrapItemId = await getScrapItemId();
    if (!scrapItemId) return false;

    const { error } = await supabase.from("inventory_transactions").insert([
      {
        inventory_item_id: scrapItemId,
        kt: batch.kt,
        transaction_type: "Stock In",
        purpose: "Rhodium Rejection",
        reference_no: batch.batch_no,
        weight: Number(rejectedWeight || 0),
        quantity: Number(rejectedPieces || 0),
        weight_source: "manual",
        remarks: "Rejected pieces from Rhodium / Plating moved to same KT scrap",
      },
    ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveRhodiumResult() {
    if (!receivedWeight && !rejectedWeight) {
  alert(t("enter_rhodium_weight"));
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("rhodium_results").insert([
      {
        casting_batch_id: batch.id,
        operator_name: operatorName,

        issued_pieces: Number(issuedPieces || 0),
        issued_weight: Number(issuedWeight || 0),

        received_pieces: Number(receivedPieces || 0),
        received_weight: Number(receivedWeight || 0),

        repair_pieces: 0,
repair_weight: 0,

        rejected_pieces: Number(rejectedPieces || 0),
        rejected_weight: Number(rejectedWeight || 0),

        rhodium_difference: rhodiumDifference,
        remarks,
      },
    ]);

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    const scrapOk = await stockInRejectedScrap();
    if (!scrapOk) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("casting_batches")
.update({
  status: "Tag Print",
  current_process: "tag-print",
  current_pieces: Number(receivedPieces || 0),
  current_weight: Number(receivedWeight || 0),
})
      .eq("id", batch.id);

const orderIds = [
  ...new Set(
    (batch.casting_batch_items || [])
      .map((item) => item.order_id)
      .filter(Boolean)
  ),
];

if (orderIds.length > 0) {
  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({ status: "COMPLETED" })
    .in("id", orderIds);

  if (orderUpdateError) {
    setSaving(false);
    alert(orderUpdateError.message);
    return;
  }
}


    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

setSaving(false);

const firstOrderId =
  batch.casting_batch_items?.[0]?.order_id;

if (firstOrderId) {
  router.push(
    `/factory/tag-print/dashboard?order=${firstOrderId}`
  );
} else {
  router.push("/factory/tag-print/dashboard");
}
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>{t("rhodium_plating")}</Badge>
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
  {t("party")}: {parties.join(", ") || "-"}
</p>

<p className="text-xs text-gray-500">
  {t("order")}: {orders.join(", ") || "-"}
</p>
        </div>

        <button
          onClick={onOpen}
          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          {isOpen ? t("close") : t("open")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Issued Pcs" value={issuedPieces} />
        <MiniStat
  label={t("issued_weight")}
  value={`${Number(issuedWeight || 0).toFixed(3)}g`}
/>
        <MiniStat
  label={t("entries")}
  value={batch.rhodium_results?.length || 0}
/>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary t={t} items={items} />

          <Panel title={t("rhodium_plating_result")}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={t("operator_name")}>
                <input
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("issued_pieces")}>
                <input
                  type="number"
                  value={issuedPieces}
                  onChange={(e) => setIssuedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("issued_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={issuedWeight}
                  onChange={(e) => setIssuedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("received_pieces")}>
                <input
                  type="number"
                  value={receivedPieces}
                  onChange={(e) => setReceivedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("received_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={receivedWeight}
                  onChange={(e) => setReceivedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("rejected_pieces")}>
                <input
                  type="number"
                  value={rejectedPieces}
                  onChange={(e) => setRejectedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("rejected_weight")}>
                <input
                  type="number"
                  step="0.001"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label={t("rhodium_difference")}>
                <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
                  {rhodiumDifference.toFixed(3)} g
                </div>
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <GreenStat
  label={t("ready_pieces")}
  value={`${Number(receivedPieces || 0)} ${t("pcs")}`}
/>

  <GreenStat
  label={t("rhodium_difference")}
  value={`${rhodiumDifference.toFixed(3)}g`}
/>
        
                <GreenStat
  label={t("rejected_scrap")}
  value={`${Number(rejectedWeight || 0).toFixed(3)}g`}
/>
            </div>

            <div className="mt-3">
              <Field label={t("remarks")}>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-gray-500">
  {t("rhodium_formula")}
</p>

            <button
              disabled={saving}
              onClick={saveRhodiumResult}
              className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
            >
              {saving ? t("saving") : t("save_move_ready")}
            </button>
          </Panel>
        </div>
      )}
    </section>
  );
}

function Header({ t }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {t("rhodium_plating")}
        </h1>

        <p className="text-sm text-gray-600">
          {t("rhodium_subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/final-qc/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          {t("final_qc")}
        </Link>

        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          {t("dashboard")}
        </Link>
      </div>
    </div>
  );
}

function ItemsSummary({ t, items }) {
  return (
    <Panel title={t("items_summary")}>
      <div className="grid max-h-[230px] gap-2 overflow-y-auto md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-xs font-semibold text-gray-500">
              {item.orders?.order_no || "-"} ·{" "}
              {item.orders?.customer_name || "-"}
            </p>

            <p className="mt-1 text-sm font-bold">
              {item.category}
            </p>

            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · {t("die")} {item.die_no}
            </p>

            <p className="mt-2 text-xs font-bold">
              {t("qty")}: {item.selected_quantity}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-bold">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      {children}
    </label>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function GreenStat({ label, value }) {
  return (
    <div className="rounded-xl bg-green-50 p-3">
      <p className="text-xs font-semibold text-green-700">{label}</p>
      <p className="mt-1 text-sm font-bold text-green-800">{value}</p>
    </div>
  );
}

function Badge({ children, blue }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}