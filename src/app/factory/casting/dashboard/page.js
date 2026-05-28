"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function CastingDashboardPage() {
  useRequireAuth();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openBatchId, setOpenBatchId] = useState(null);

  async function fetchBatches() {
    setLoading(true);

    const { data, error } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(
          *,
          orders(order_no, customer_name)
        ),
        casting_batch_metal_inputs(*)
      `)
      .not("status", "in", '("Completed","Casting Failed")')
      .order("created_at", { ascending: false });

    if (error) alert(error.message);
    else setBatches(data || []);

    setLoading(false);
  }

  useEffect(() => {
    fetchBatches();
  }, []);

  async function updateBatch(id, values) {
    const { error } = await supabase
      .from("casting_batches")
      .update(values)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return false;
    }

    await fetchBatches();
    return true;
  }

  async function markCastingFail(batch) {
    const recoveredWeight = prompt("Recovered metal weight daalo");
    if (recoveredWeight === null) return;

    const issueWeight = Number(batch.actual_metal_weight || 0);
    const recovered = Number(recoveredWeight || 0);
    const loss = issueWeight - recovered;

    const ok = await updateBatch(batch.id, {
      casting_failed: true,
      received_weight: recovered,
      scrap_weight: 0,
      casting_loss: loss,
      status: "Casting Failed",
    });

    if (ok) alert("Casting failed marked");
  }

async function moveToMagnet(batch) {
  const ok = await updateBatch(batch.id, { status: "Magnet" });

  if (ok) {
    alert("Moved to Magnet");
  }
}

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-sm text-gray-700">Loading casting batches...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Casting Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Casting batches ko open karke result entry karo.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/factory/casting"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
            >
              New Casting
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {batches.length === 0 ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">No active casting batch.</p>
          </section>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {batches.map((batch) => (
              <CastingBatchCard
                key={batch.id}
                batch={batch}
                isOpen={openBatchId === batch.id}
                onToggle={() =>
                  setOpenBatchId(openBatchId === batch.id ? null : batch.id)
                }
                onUpdate={updateBatch}
                onFail={markCastingFail}
                onMove={moveToMagnet}
                onRefresh={fetchBatches}
              />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
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

function CastingBatchCard({
  batch,
  isOpen,
  onToggle,
  onUpdate,
  onFail,
  onMove,
  onRefresh,
}) {
  const [goodPieces, setGoodPieces] = useState(batch.good_pieces || "");
  const [badPieces, setBadPieces] = useState(batch.bad_pieces || "");
  const [receivedWeight, setReceivedWeight] = useState(
    batch.received_weight || ""
  );
  const [scrapWeight, setScrapWeight] = useState(batch.scrap_weight || "");
  const [saving, setSaving] = useState(false);

  const items = batch.casting_batch_items || [];
  const inputs = batch.casting_batch_metal_inputs || [];

  const orderNos = [
    ...new Set(items.map((x) => x.orders?.order_no).filter(Boolean)),
  ];
  const partyNames = [
    ...new Set(items.map((x) => x.orders?.customer_name).filter(Boolean)),
  ];

  const totalInputWeight = inputs.reduce(
    (sum, item) => sum + Number(item.weight || 0),
    0
  );

  const totalSelectedPieces = items.reduce(
    (sum, item) => sum + Number(item.selected_quantity || 0),
    0
  );

  const currentCastingLoss =
    Number(batch.actual_metal_weight || 0) -
    Number(receivedWeight || 0) -
    Number(scrapWeight || 0);

  const groupedItems = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      const key = `${item.orders?.order_no || "-"}_${item.category || "-"}_${
        item.sample_unique_id || "-"
      }_${item.die_no || "-"}`;

      if (!map[key]) {
        map[key] = {
          order_no: item.orders?.order_no || "-",
          customer_name: item.orders?.customer_name || "-",
          category: item.category || "-",
          sample_unique_id: item.sample_unique_id || "-",
          die_no: item.die_no || "-",
          quantity: 0,
          weight: 0,
        };
      }

      map[key].quantity += Number(item.selected_quantity || 0);
      map[key].weight +=
        Number(item.approx_weight || 0) * Number(item.selected_quantity || 1);
    });

    return Object.values(map);
  }, [items]);

  async function saveCastingResult() {
    setSaving(true);

    const issueWeight = Number(batch.actual_metal_weight || 0);
    const receivedPiecesWt = Number(receivedWeight || 0);
    const scrapWt = Number(scrapWeight || 0);

    // ✅ Casting loss = issued metal - received pieces weight - scrap weight
    const loss = issueWeight - receivedPiecesWt - scrapWt;

    const ok = await onUpdate(batch.id, {
      good_pieces: Number(goodPieces || 0),
      bad_pieces: Number(badPieces || 0),
      received_weight: receivedPiecesWt,
      scrap_weight: scrapWt,
      casting_loss: loss,
      status: "Casting Completed",
    });

    if (!ok) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("casting_results").insert([
      {
        casting_batch_id: batch.id,
        good_pieces: Number(goodPieces || 0),
        bad_pieces: Number(badPieces || 0),
        received_weight: receivedPiecesWt,
        scrap_weight: scrapWt,
        casting_loss: loss,
        remarks:
          "Casting result saved. Loss = issued metal - received pieces weight - scrap weight.",
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Casting result saved");
    await onRefresh();
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{batch.batch_no}</h2>
            <Badge>{batch.kt}</Badge>
            <Badge blue>{batch.status}</Badge>
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            Order: {orderNos.join(", ") || "-"}
          </p>
          <p className="text-xs text-gray-500">
            Party: {partyNames.join(", ") || "-"}
          </p>
        </div>

        <button
          onClick={onToggle}
          className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          label="Tree"
          value={`${Number(batch.tree_weight || 0).toFixed(3)}g`}
        />
        <MiniStat
          label="Issued"
          value={`${Number(batch.actual_metal_weight || 0).toFixed(3)}g`}
        />
        <MiniStat label="Pieces" value={totalSelectedPieces} />
        <MiniStat label="Input" value={`${totalInputWeight.toFixed(3)}g`} />
        <MiniStat label="Items" value={items.length} />
        <MiniStat
          label="Loss"
          value={`${Number(batch.casting_loss || 0).toFixed(3)}g`}
        />
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">Items Summary</h3>
              <span className="text-xs font-semibold text-gray-500">
                {groupedItems.length} groups
              </span>
            </div>

            <div className="grid max-h-[260px] gap-2 overflow-y-auto md:grid-cols-2">
              {groupedItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <p className="text-xs font-semibold text-gray-500">
                    {item.order_no} · {item.customer_name}
                  </p>
                  <p className="mt-1 text-sm font-bold">{item.category}</p>
                  <p className="text-xs text-gray-500">
                    {item.sample_unique_id} · Die {item.die_no}
                  </p>
                  <div className="mt-2 flex justify-between text-xs font-bold">
                    <span>Qty: {item.quantity}</span>
                    <span>{item.weight.toFixed(3)}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-3">
            <h3 className="mb-3 text-sm font-bold">Casting Result</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Good Pieces">
                <input
                  type="number"
                  value={goodPieces}
                  onChange={(e) => setGoodPieces(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <Field label="Bad Pieces">
                <input
                  type="number"
                  value={badPieces}
                  onChange={(e) => setBadPieces(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <Field label="Received Pieces Weight">
                <input
                  type="number"
                  step="0.001"
                  value={receivedWeight}
                  onChange={(e) => setReceivedWeight(e.target.value)}
                  className="input"
                  placeholder="0.000"
                />
              </Field>

              <Field label="Scrap Weight">
                <input
                  type="number"
                  step="0.001"
                  value={scrapWeight}
                  onChange={(e) => setScrapWeight(e.target.value)}
                  className="input"
                  placeholder="0.000"
                />
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat
                label="Casting Loss"
                value={`${currentCastingLoss.toFixed(3)}g`}
              />
              <MiniStat
                label="Good+Bad"
                value={Number(goodPieces || 0) + Number(badPieces || 0)}
              />
              <MiniStat label="Selected" value={totalSelectedPieces} />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Loss = Issued Metal - Received Pieces Weight - Scrap Weight
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={saving}
                onClick={saveCastingResult}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Result"}
              </button>

              <button
                onClick={() => onMove(batch)}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Move To Magnet
              </button>

              <button
                onClick={() => onFail(batch)}
                className="rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700"
              >
                Casting Fail
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
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

function Badge({ children, blue }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        blue ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-gray-700"
      }`}
    >
      {children}
    </span>
  );
}