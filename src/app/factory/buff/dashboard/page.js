"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function BuffDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
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
        buff_results(*)
      `)
      .eq("status", "Buff")
      .order("created_at", { ascending: false });

    if (error) alert(error.message);

    setBatches(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-sm text-gray-700">
        Loading buff process...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header />

        {batches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No batches in Buff.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.map((batch) => (
              <BuffCard
                key={batch.id}
                batch={batch}
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

function BuffCard({ batch, isOpen, onOpen, onRefresh }) {
  const items = batch.casting_batch_items || [];

  const [polisherName, setPolisherName] = useState("");

  const [issuedPieces, setIssuedPieces] = useState(
    Number(batch.current_pieces || batch.good_pieces || 0)
  );

  const [issuedWeight, setIssuedWeight] = useState(
    Number(batch.current_weight || batch.received_weight || 0)
  );

  const [receivedPieces, setReceivedPieces] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");

  const [repairPieces, setRepairPieces] = useState("");
  const [repairWeight, setRepairWeight] = useState("");

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

  const buffLoss =
    Number(issuedWeight || 0) -
    Number(receivedWeight || 0) -
    Number(repairWeight || 0) -
    Number(rejectedWeight || 0);

    const buffLossPercent =
  Number(issuedWeight || 0) > 0
    ? (buffLoss / Number(issuedWeight)) * 100
    : 0;

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
      alert("Scrap item not found: Scrap / Casting Scrap");
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
        purpose: "Buff Rejection",
        reference_no: batch.batch_no,
        weight: Number(rejectedWeight || 0),
        quantity: Number(rejectedPieces || 0),
        weight_source: "manual",
        remarks: "Rejected pieces from buff moved to same KT scrap",
      },
    ]);

    if (error) {
      alert(error.message);
      return false;
    }

    return true;
  }

  async function saveBuffResult() {
    if (!receivedWeight && !repairWeight && !rejectedWeight) {
      alert("Received / repair / rejected weight me se kuch enter karo");
      return;
    }

    setSaving(true);

    const { data: result, error } = await supabase
      .from("buff_results")
      .insert([
        {
          casting_batch_id: batch.id,
          polisher_name: polisherName,

          issued_pieces: Number(issuedPieces || 0),
          issued_weight: Number(issuedWeight || 0),

          received_pieces: Number(receivedPieces || 0),
          received_weight: Number(receivedWeight || 0),

          repair_pieces: Number(repairPieces || 0),
          repair_weight: Number(repairWeight || 0),

          rejected_pieces: Number(rejectedPieces || 0),
          rejected_weight: Number(rejectedWeight || 0),

          buff_loss_weight: buffLoss,
buff_loss_percentage:
  Number(issuedWeight || 0) > 0
    ? (buffLoss / Number(issuedWeight)) * 100
    : 0,

          remarks,
        },
      ])
      .select()
      .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    if (Math.abs(Number(buffLoss || 0)) > 0.0001) {
      const { error: lossError } = await supabase
        .from("buff_loss_records")
        .insert([
          {
            casting_batch_id: batch.id,
            kt: batch.kt,
            loss_weight: Number(buffLoss || 0),
            batch_no: batch.batch_no,
            party_name: parties.join(", "),
            recovery_status: "Pending",
            remarks: `Buff loss from ${batch.batch_no}`,
          },
        ]);

      if (lossError) {
        setSaving(false);
        alert(lossError.message);
        return;
      }
    }

    if (Number(repairPieces || 0) > 0 || Number(repairWeight || 0) > 0) {
      const { error: repairError } = await supabase.from("repair_queue").insert([
        {
          casting_batch_id: batch.id,
          source_process: "Buff",
          kt: batch.kt,
          pending_pieces: Number(repairPieces || 0),
          pending_weight: Number(repairWeight || 0),
          status: "Pending",
          remarks: `Repair from Buff - ${batch.batch_no}`,
        },
      ]);

      if (repairError) {
        setSaving(false);
        alert(repairError.message);
        return;
      }
    }

    const scrapOk = await stockInRejectedScrap();
    if (!scrapOk) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("casting_batches")
      .update({
        status: "Final Inspection QC",
        current_pieces: Number(receivedPieces || 0),
        current_weight: Number(receivedWeight || 0),
      })
      .eq("id", batch.id);

    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

    setSaving(false);
    alert("Buff result saved. Batch moved to Final Inspection QC.");
    onRefresh();
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{batch.batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>Buff</Badge>
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            Party: {parties.join(", ") || "-"}
          </p>

          <p className="text-xs text-gray-500">
            Order: {orders.join(", ") || "-"}
          </p>
        </div>

        <button
          onClick={onOpen}
          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Current Pcs" value={issuedPieces} />
        <MiniStat
          label="Current Wt"
          value={`${Number(issuedWeight || 0).toFixed(3)}g`}
        />
        <MiniStat
          label="Entries"
          value={batch.buff_results?.length || 0}
        />
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <ItemsSummary items={items} />

          <Panel title="Buff / Final Polish Result">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Polisher Name">
                <input
                  value={polisherName}
                  onChange={(e) => setPolisherName(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Issued Pieces">
                <input
                  type="number"
                  value={issuedPieces}
                  onChange={(e) => setIssuedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Issued Weight">
                <input
                  type="number"
                  step="0.001"
                  value={issuedWeight}
                  onChange={(e) => setIssuedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Received Pieces">
                <input
                  type="number"
                  value={receivedPieces}
                  onChange={(e) => setReceivedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Received Weight">
                <input
                  type="number"
                  step="0.001"
                  value={receivedWeight}
                  onChange={(e) => setReceivedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Repair Pieces">
                <input
                  type="number"
                  value={repairPieces}
                  onChange={(e) => setRepairPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Repair Weight">
                <input
                  type="number"
                  step="0.001"
                  value={repairWeight}
                  onChange={(e) => setRepairWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Rejected Pieces">
                <input
                  type="number"
                  value={rejectedPieces}
                  onChange={(e) => setRejectedPieces(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Rejected Weight">
                <input
                  type="number"
                  step="0.001"
                  value={rejectedWeight}
                  onChange={(e) => setRejectedWeight(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Buff Loss">
                <div className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-700">
                  {buffLoss.toFixed(3)} g
                </div>
              </Field>

              <Field label="Buff Loss %">
  <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
    {buffLossPercent.toFixed(2)} %
  </div>
</Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <GreenStat
                label="Good To QC"
                value={`${Number(receivedPieces || 0)} pcs`}
              />
              <GreenStat
                label="Repair Queue"
                value={`${Number(repairPieces || 0)} pcs`}
              />
              <GreenStat
                label="Rejected Scrap"
                value={`${Number(rejectedWeight || 0).toFixed(3)}g`}
              />
            </div>

            <div className="mt-3">
              <Field label="Remarks">
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Buff Loss = Issued Weight - Received Weight - Repair Weight -
              Rejected Weight
            </p>

            <button
              disabled={saving}
              onClick={saveBuffResult}
              className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save & Move To QC"}
            </button>
          </Panel>
        </div>
      )}
    </section>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Buff / Final Polish</h1>
        <p className="text-sm text-gray-600">
          Buff result, rejected scrap, repair queue and buff loss tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/stone-setting/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Stone Setting
        </Link>

        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function ItemsSummary({ items }) {
  return (
    <Panel title="Items Summary">
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

            <p className="mt-1 text-sm font-bold">{item.category}</p>

            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · Die {item.die_no}
            </p>

            <p className="mt-2 text-xs font-bold">
              Qty: {item.selected_quantity}
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