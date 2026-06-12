"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function MagnetProcessPage() {
  const { loading: authLoading } = useRequireAuth();
  const [singleBatches, setSingleBatches] = useState([]);
  const [clubBatches, setClubBatches] = useState([]);
  const [openKey, setOpenKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetBatchNo, setTargetBatchNo] = useState("");

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setTargetBatchNo(params.get("batch") || "");
}, []);

  async function fetchData() {
    setLoading(true);

    const { data: singles, error: singleError } = await supabase
      .from("casting_batches")
      .select(`
        *,
        casting_batch_items(
          *,
          orders(order_no, customer_name)
        )
      `)
      .eq("status", "Magnet")
      .order("created_at", { ascending: false });

    const { data: clubs, error: clubError } = await supabase
      .from("magnet_batches")
      .select(`
        *,
        magnet_batch_castings(
          *,
          casting_batches(
            *,
            casting_batch_items(
              *,
              orders(order_no, customer_name)
            )
          )
        )
      `)
      .eq("status", "In Magnet")
      .order("created_at", { ascending: false });

    if (singleError) alert(singleError.message);
    if (clubError) alert(clubError.message);

    setSingleBatches(singles || []);
    setClubBatches(clubs || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
  const batchId = targetBatchNo;

  if (batchId) {
    setOpenKey(`single-${batchId}`);
  }
}, [targetBatchNo]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-sm text-gray-700">Loading magnet process...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Magnet Process</h1>
            <p className="text-sm text-gray-600">
              Single casting aur clubbed batches ka magnet result save karo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/factory/magnet/dashboard"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
            >
              Magnet Dashboard
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold">Clubbed Magnet Batches</h2>

          {clubBatches.length === 0 ? (
            <Empty text="No clubbed magnet batch pending." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clubBatches.map((batch) => (
                <ClubProcessCard
                  key={batch.id}
                  batch={batch}
                  isOpen={openKey === `club-${batch.id}`}
                  onOpen={() =>
                    setOpenKey(
                      openKey === `club-${batch.id}` ? null : `club-${batch.id}`
                    )
                  }
                  onRefresh={fetchData}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Single Casting Batches</h2>

          {singleBatches.length === 0 ? (
            <Empty text="No single casting batch pending for magnet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {singleBatches.map((batch) => (
                <SingleProcessCard
                  key={batch.id}
                  batch={batch}
                  isOpen={openKey === `single-${batch.id}`}
                  onOpen={() =>
                    setOpenKey(
                      openKey === `single-${batch.id}`
                        ? null
                        : `single-${batch.id}`
                    )
                  }
                  onRefresh={fetchData}
                />
              ))}
            </div>
          )}
        </section>
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

async function stockInMagnetScrap({ kt, batchNo, weight, quantity = 0 }) {
  if (Number(weight || 0) <= 0) return true;

  const { data: scrapItem, error: itemError } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("item_type", "Scrap")
    .eq("item_name", "Casting Scrap")
    .maybeSingle();

  if (itemError) {
    alert(itemError.message);
    return false;
  }

  if (!scrapItem?.id) {
    alert("Scrap item not found: Scrap / Casting Scrap");
    return false;
  }

  const { error } = await supabase.from("inventory_transactions").insert([
    {
      inventory_item_id: scrapItem.id,
      kt,
      transaction_type: "Stock In",
      purpose: "Magnet Scrap",
      reference_no: batchNo,
      weight: Number(weight || 0),
      quantity: Number(quantity || 0),
      weight_source: "manual",
      remarks: "Scrap received after magnet cleaning",
    },
  ]);

  if (error) {
    alert(error.message);
    return false;
  }

  return true;
}

function SingleProcessCard({ batch, isOpen, onOpen, onRefresh }) {
  const router = useRouter();
  const [piecesReceived, setPiecesReceived] = useState("");
  const [receivedWeight, setReceivedWeight] = useState("");
  const [scrapWeight, setScrapWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const items = batch.casting_batch_items || [];
  const summary = getCastingSummary(batch);

  const issuedMetal = Number(batch.actual_metal_weight || 0);
  const received = Number(receivedWeight || 0);
  const scrap = Number(scrapWeight || 0);
  const finalCastingLoss = issuedMetal - received - scrap;

  async function saveSingleResult() {
    if (!receivedWeight && !scrapWeight) {
      alert("Pieces weight ya scrap weight enter karo");
      return;
    }

    setSaving(true);

    const { error: resultError } = await supabase.from("magnet_results").insert([
      {
        casting_batch_id: batch.id,
        result_type: "Single",
        pieces_received: Number(piecesReceived || 0),
        pieces_weight_after_magnet: received,
        scrap_weight_after_magnet: scrap,
        final_casting_loss: finalCastingLoss,
        remarks: "Single casting magnet result saved.",
      },
    ]);

    if (resultError) {
      setSaving(false);
      alert(resultError.message);
      return;
    }

    const scrapOk = await stockInMagnetScrap({
      kt: batch.kt,
      batchNo: batch.batch_no,
      weight: scrap,
    });

    if (!scrapOk) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("casting_batches")
      .update({
        received_weight: received,
        scrap_weight: scrap,
        casting_loss: finalCastingLoss,
        good_pieces: Number(piecesReceived || batch.good_pieces || 0),
        status: "Filing",
      })
      .eq("id", batch.id);

    if (updateError) {
      setSaving(false);
      alert(updateError.message);
      return;
    }

    await supabase.from("casting_results").insert([
      {
        casting_batch_id: batch.id,
        good_pieces: Number(piecesReceived || batch.good_pieces || 0),
        bad_pieces: Number(batch.bad_pieces || 0),
        received_weight: received,
        scrap_weight: scrap,
        casting_loss: finalCastingLoss,
        remarks: "Magnet result saved. Final casting loss updated.",
      },
    ]);

    if (Math.abs(Number(finalCastingLoss || 0)) > 0.0001) {
  const { error: lossRecordError } = await supabase
    .from("casting_loss_records")
    .insert([
      {
        casting_batch_id: batch.id,
        kt: batch.kt,
        loss_weight: Number(finalCastingLoss || 0),
        source: "Single Magnet Final Casting Loss",
        remarks: `Final casting loss from ${batch.batch_no}`,
      },
    ]);

  if (lossRecordError) {
    alert(lossRecordError.message);
  }
}

 setSaving(false);
router.push(`/factory/bench/dashboard?batch=${batch.id}`);
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <CardHeader
        title={batch.batch_no}
        kt={batch.kt}
        status="Single Magnet"
        party={summary.parties.join(", ") || "-"}
        orders={summary.orderNos.join(", ") || "-"}
        isOpen={isOpen}
        onOpen={onOpen}
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Pieces" value={summary.pieces} />
        <MiniStat label="Issued" value={`${issuedMetal.toFixed(3)}g`} />
        <MiniStat
          label="Old Scrap"
          value={`${Number(batch.scrap_weight || 0).toFixed(3)}g`}
        />
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <ItemsSummary items={items} />

          <ResultBox
            piecesReceived={piecesReceived}
            setPiecesReceived={setPiecesReceived}
            receivedWeight={receivedWeight}
            setReceivedWeight={setReceivedWeight}
            scrapWeight={scrapWeight}
            setScrapWeight={setScrapWeight}
            totalIssuedMetal={issuedMetal}
            finalCastingLoss={finalCastingLoss}
            saving={saving}
            onSave={saveSingleResult}
          />
        </div>
      )}
    </section>
  );
}

function ClubProcessCard({ batch, isOpen, onOpen, onRefresh }) {
  const router = useRouter();
  const [piecesReceived, setPiecesReceived] = useState(
    batch.pieces_received || ""
  );
  const [receivedWeight, setReceivedWeight] = useState(
    batch.magnet_received_weight || ""
  );
  const [scrapWeight, setScrapWeight] = useState(
    batch.magnet_scrap_weight || ""
  );
  const [saving, setSaving] = useState(false);

  const rows = (batch.magnet_batch_castings || []).filter((r) => !r.removed_at);
  const castings = rows.map((r) => r.casting_batches).filter(Boolean);

  const allItems = castings.flatMap((c) => c.casting_batch_items || []);

  const parties = [
    ...new Set(allItems.map((i) => i.orders?.customer_name).filter(Boolean)),
  ];

  const orders = [
    ...new Set(allItems.map((i) => i.orders?.order_no).filter(Boolean)),
  ];

  const totalIssuedMetal = castings.reduce(
    (sum, cb) => sum + Number(cb.actual_metal_weight || 0),
    0
  );

  const received = Number(receivedWeight || 0);
  const scrap = Number(scrapWeight || 0);
  const finalCastingLoss = totalIssuedMetal - received - scrap;

  async function saveClubResult() {
    if (!receivedWeight && !scrapWeight) {
      alert("Pieces weight ya scrap weight enter karo");
      return;
    }

    setSaving(true);

    const { error: resultError } = await supabase.from("magnet_results").insert([
      {
        magnet_batch_id: batch.id,
        result_type: "Club",
        pieces_received: Number(piecesReceived || 0),
        pieces_weight_after_magnet: received,
        scrap_weight_after_magnet: scrap,
        final_casting_loss: finalCastingLoss,
        remarks: "Club magnet result saved.",
      },
    ]);

    if (resultError) {
      setSaving(false);
      alert(resultError.message);
      return;
    }

    const scrapOk = await stockInMagnetScrap({
      kt: batch.kt,
      batchNo: batch.magnet_batch_no,
      weight: scrap,
    });

    if (!scrapOk) {
      setSaving(false);
      return;
    }

    const { error: updateMagnetError } = await supabase
      .from("magnet_batches")
      .update({
        pieces_received: Number(piecesReceived || 0),
        magnet_received_weight: received,
        magnet_scrap_weight: scrap,
        magnet_loss: 0,
        status: "Magnet Completed",
      })
      .eq("id", batch.id);

    if (updateMagnetError) {
      setSaving(false);
      alert(updateMagnetError.message);
      return;
    }

    const totalReferenceWeight = castings.reduce(
      (sum, cb) =>
        sum + Number(cb.received_weight || 0) + Number(cb.scrap_weight || 0),
      0
    );

    for (const cb of castings) {
      const refWeight =
        Number(cb.received_weight || 0) + Number(cb.scrap_weight || 0);

      const ratio =
        totalReferenceWeight > 0 ? refWeight / totalReferenceWeight : 0;

      const allocatedLoss = finalCastingLoss * ratio;

      await supabase
        .from("casting_batches")
        .update({
          casting_loss: allocatedLoss,
          status: "Filing",
        })
        .eq("id", cb.id);

      await supabase.from("casting_results").insert([
        {
          casting_batch_id: cb.id,
          good_pieces: Number(cb.good_pieces || 0),
          bad_pieces: Number(cb.bad_pieces || 0),
          received_weight: Number(cb.received_weight || 0),
          scrap_weight: Number(cb.scrap_weight || 0),
          casting_loss: allocatedLoss,
          remarks:
            "Magnet club result saved. Final casting loss allocated by received+scrap ratio.",
        },
      ]);
    }

    if (Math.abs(Number(allocatedLoss || 0)) > 0.0001) {
  const { error: lossRecordError } = await supabase
    .from("casting_loss_records")
    .insert([
      {
        casting_batch_id: cb.id,
        magnet_batch_id: batch.id,
        kt: cb.kt,
        loss_weight: Number(allocatedLoss || 0),
        source: "Club Magnet Final Casting Loss",
        remarks: `Allocated casting loss from ${batch.magnet_batch_no}`,
      },
    ]);

  if (lossRecordError) {
    alert(lossRecordError.message);
  }
}

   setSaving(false);

const firstCastingId = castings[0]?.id;

if (firstCastingId) {
  router.push(`/factory/bench/dashboard?batch=${firstCastingId}`);
} else {
  router.push("/factory/bench/dashboard");
}
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <CardHeader
        title={batch.magnet_batch_no}
        kt={batch.kt}
        status={batch.status}
        party={parties.join(", ") || "-"}
        orders={orders.join(", ") || "-"}
        isOpen={isOpen}
        onOpen={onOpen}
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Batches" value={castings.length} />
        <MiniStat
          label="Pieces"
          value={castings.reduce((sum, cb) => sum + Number(cb.good_pieces || 0), 0)}
        />
        <MiniStat label="Issued" value={`${totalIssuedMetal.toFixed(3)}g`} />
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <h4 className="mb-2 text-sm font-bold">Included Castings</h4>

            <div className="grid max-h-[260px] gap-2 overflow-y-auto md:grid-cols-2">
              {castings.map((cb) => (
                <div
                  key={cb.id}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <p className="font-bold">{cb.batch_no}</p>
                  <p className="text-xs text-gray-500">
                    Issued: {Number(cb.actual_metal_weight || 0).toFixed(3)}g ·
                    Pieces Wt: {Number(cb.received_weight || 0).toFixed(3)}g ·
                    Scrap: {Number(cb.scrap_weight || 0).toFixed(3)}g
                  </p>
                </div>
              ))}
            </div>
          </div>

          <ResultBox
            piecesReceived={piecesReceived}
            setPiecesReceived={setPiecesReceived}
            receivedWeight={receivedWeight}
            setReceivedWeight={setReceivedWeight}
            scrapWeight={scrapWeight}
            setScrapWeight={setScrapWeight}
            totalIssuedMetal={totalIssuedMetal}
            finalCastingLoss={finalCastingLoss}
            saving={saving}
            onSave={saveClubResult}
          />
        </div>
      )}
    </section>
  );
}

function ResultBox({
  piecesReceived,
  setPiecesReceived,
  receivedWeight,
  setReceivedWeight,
  scrapWeight,
  setScrapWeight,
  totalIssuedMetal,
  finalCastingLoss,
  saving,
  onSave,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <h4 className="mb-3 text-sm font-bold">Magnet Result</h4>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Pieces Received">
          <input
            type="number"
            value={piecesReceived}
            onChange={(e) => setPiecesReceived(e.target.value)}
            className="input"
            placeholder="0"
          />
        </Field>

        <Field label="Pieces Weight After Magnet">
          <input
            type="number"
            step="0.001"
            value={receivedWeight}
            onChange={(e) => setReceivedWeight(e.target.value)}
            className="input"
            placeholder="0.000"
          />
        </Field>

        <Field label="Scrap Weight After Magnet">
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

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniStat label="Total Issued" value={`${totalIssuedMetal.toFixed(3)}g`} />
        <MiniStat
          label="Received + Scrap"
          value={`${(
            Number(receivedWeight || 0) + Number(scrapWeight || 0)
          ).toFixed(3)}g`}
        />
        <MiniStat
          label="Final Casting Loss"
          value={`${finalCastingLoss.toFixed(3)}g`}
        />
        <MiniStat label="Pieces" value={piecesReceived || 0} />
      </div>

      <button
        disabled={saving}
        onClick={onSave}
        className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:bg-gray-400"
      >
        {saving ? "Saving..." : "Save Magnet Result"}
      </button>
    </div>
  );
}

function ItemsSummary({ items }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <h4 className="mb-2 text-sm font-bold">Items Summary</h4>
      <div className="grid max-h-[260px] gap-2 overflow-y-auto md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-xs font-semibold text-gray-500">
              {item.orders?.order_no || "-"} · {item.orders?.customer_name || "-"}
            </p>
            <p className="mt-1 text-sm font-bold">{item.category}</p>
            <p className="text-xs text-gray-500">
              {item.sample_unique_id} · Die {item.die_no}
            </p>
            <p className="mt-2 text-xs font-bold">Qty: {item.selected_quantity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardHeader({ title, kt, status, party, orders, isOpen, onOpen }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{title}</h3>
          <Badge>{kt}</Badge>
          <Badge blue>{status}</Badge>
        </div>

        <p className="mt-2 text-xs font-semibold text-gray-500">Party: {party}</p>
        <p className="text-xs text-gray-500">Order: {orders}</p>
      </div>

      <button
        onClick={onOpen}
        className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white"
      >
        {isOpen ? "Close" : "Open"}
      </button>
    </div>
  );
}

function getCastingSummary(batch) {
  const items = batch.casting_batch_items || [];

  const parties = [
    ...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean)),
  ];

  const orderNos = [
    ...new Set(items.map((i) => i.orders?.order_no).filter(Boolean)),
  ];

  const pieces = Number(batch.good_pieces || 0);

  return { parties, orderNos, pieces };
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

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm">
      {text}
    </div>
  );
}