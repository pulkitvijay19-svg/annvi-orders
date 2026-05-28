"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function MagnetDashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [castingBatches, setCastingBatches] = useState([]);
  const [magnetBatches, setMagnetBatches] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clubbing, setClubbing] = useState(false);

  async function fetchData() {
    setLoading(true);

    const { data: castingData, error: castingError } = await supabase
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

    const { data: magnetData, error: magnetError } = await supabase
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

    if (castingError) alert(castingError.message);
    if (magnetError) alert(magnetError.message);

    setCastingBatches(castingData || []);
    setMagnetBatches(magnetData || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function getBatchSummary(batch) {
    const items = batch.casting_batch_items || [];

    const parties = [
      ...new Set(items.map((i) => i.orders?.customer_name).filter(Boolean)),
    ];

    const orderNos = [
      ...new Set(items.map((i) => i.orders?.order_no).filter(Boolean)),
    ];

    const pieces = items.reduce(
      (sum, i) => sum + Number(i.selected_quantity || 0),
      0
    );

    return {
      parties,
      orderNos,
      pieces,
      piecesWeight: Number(batch.received_weight || 0),
      scrapWeight: Number(batch.scrap_weight || 0),
      inward:
        Number(batch.received_weight || 0) + Number(batch.scrap_weight || 0),
    };
  }

  async function clubSelectedBatches() {
    if (clubbing) return;

    if (selectedIds.length === 0) {
      alert("Select casting batches");
      return;
    }

    const selected = castingBatches.filter((b) => selectedIds.includes(b.id));
    const ktSet = [...new Set(selected.map((b) => b.kt))];

    if (ktSet.length > 1) {
      alert("Only same KT batches can be clubbed");
      return;
    }

    setClubbing(true);

    const totalPieces = selected.reduce(
      (sum, b) => sum + getBatchSummary(b).pieces,
      0
    );

    const piecesWeight = selected.reduce(
      (sum, b) => sum + Number(b.received_weight || 0),
      0
    );

    const scrapWeight = selected.reduce(
      (sum, b) => sum + Number(b.scrap_weight || 0),
      0
    );

    const magnetBatchNo = "MB-" + Date.now().toString().slice(-6);

    const { data: mb, error } = await supabase
      .from("magnet_batches")
      .insert([
        {
          magnet_batch_no: magnetBatchNo,
          kt: ktSet[0],
          total_casting_batches: selected.length,
          total_pieces: totalPieces,
          pieces_weight: piecesWeight,
          casting_scrap_weight: scrapWeight,
          total_inward_weight: piecesWeight + scrapWeight,
          created_by: user?.id || null,
          status: "In Magnet",
        },
      ])
      .select()
      .single();

    if (error) {
      setClubbing(false);
      alert(error.message);
      return;
    }

    const rows = selected.map((b) => ({
      magnet_batch_id: mb.id,
      casting_batch_id: b.id,
    }));

    const { error: linkError } = await supabase
      .from("magnet_batch_castings")
      .insert(rows);

    if (linkError) {
      setClubbing(false);
      alert(linkError.message);
      return;
    }

    await supabase
      .from("casting_batches")
      .update({ status: "Clubbed In Magnet" })
      .in("id", selectedIds);

    alert(`Magnet batch created: ${magnetBatchNo}`);

    setSelectedIds([]);
    setSelectionMode(false);
    setClubbing(false);
    fetchData();
  }

  async function removeCastingFromClub(row) {
    const ok = confirm("Is casting ko club se remove karna hai?");
    if (!ok) return;

    await supabase
      .from("casting_batches")
      .update({ status: "Magnet" })
      .eq("id", row.casting_batch_id);

    await supabase.from("magnet_batch_castings").delete().eq("id", row.id);

    const { data: remaining } = await supabase
      .from("magnet_batch_castings")
      .select("id")
      .eq("magnet_batch_id", row.magnet_batch_id);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("magnet_batches")
        .delete()
        .eq("id", row.magnet_batch_id);
    }

    alert("Casting removed from club");
    fetchData();
  }

  async function deleteMagnetBatch(batch) {
    const ok = confirm(
      `${batch.magnet_batch_no} delete karna hai? Saare casting batches wapas Magnet me aa jayenge.`
    );
    if (!ok) return;

    const rows = batch.magnet_batch_castings || [];
    const castingIds = rows.map((r) => r.casting_batch_id).filter(Boolean);

    if (castingIds.length > 0) {
      await supabase
        .from("casting_batches")
        .update({ status: "Magnet" })
        .in("id", castingIds);
    }

    const { error } = await supabase
      .from("magnet_batches")
      .delete()
      .eq("id", batch.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Magnet batch deleted");
    fetchData();
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-sm text-gray-700">Loading magnet dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Header
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
        />

        {selectionMode && (
          <div className="sticky top-3 z-30 rounded-2xl bg-black p-3 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Selected: {selectedIds.length}
              </p>

              <button
                disabled={clubbing}
                onClick={clubSelectedBatches}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black disabled:bg-gray-300"
              >
                {clubbing ? "Creating..." : "Club These Batches"}
              </button>
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-bold">Active Magnet Clubs</h2>

          {magnetBatches.length === 0 ? (
            <Empty text="No clubbed magnet batch yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {magnetBatches.map((batch) => (
                <MagnetClubCard
                  key={batch.id}
                  batch={batch}
                  isOpen={openId === batch.id}
                  onOpen={() =>
                    setOpenId(openId === batch.id ? null : batch.id)
                  }
                  onDelete={deleteMagnetBatch}
                  onRemove={removeCastingFromClub}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">
            Single Casting Batches Ready For Magnet
          </h2>

          {castingBatches.length === 0 ? (
            <Empty text="No single casting batch waiting for magnet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {castingBatches.map((batch) => {
                const s = getBatchSummary(batch);

                return (
                  <div
                    key={batch.id}
                    className={`rounded-2xl bg-white p-4 shadow-sm ${
                      selectedIds.includes(batch.id) ? "ring-2 ring-black" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {selectionMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(batch.id)}
                              onChange={() => toggleSelect(batch.id)}
                            />
                          )}

                          <h3 className="font-bold">{batch.batch_no}</h3>

                          <Badge>{batch.kt}</Badge>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          Order: {s.orderNos.join(", ") || "-"}
                        </p>

                        <p className="text-xs text-gray-500">
                          Party: {s.parties.join(", ") || "-"}
                        </p>
                      </div>

                      <Link
                        href="/factory/magnet/process"
                        className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
                      >
                        Process
                      </Link>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <MiniStat label="Pieces" value={s.pieces} />
                      <MiniStat
                        label="Pieces Wt"
                        value={`${s.piecesWeight.toFixed(3)}g`}
                      />
                      <MiniStat
                        label="Scrap"
                        value={`${s.scrapWeight.toFixed(3)}g`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <MobileBottomNav />
    </main>
  );
}

function Header({ selectionMode, setSelectionMode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Magnet Dashboard</h1>
        <p className="text-sm text-gray-600">
          Casting batches ko club/manage karo. Result entry process page pe hogi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/factory/magnet/process"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Magnet Process
        </Link>

        <Link
          href="/factory/casting/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Casting
        </Link>

        <button
          onClick={() => setSelectionMode(!selectionMode)}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          {selectionMode ? "Cancel Club" : "Club Batches"}
        </button>
      </div>
    </div>
  );
}

function MagnetClubCard({ batch, isOpen, onOpen, onDelete, onRemove }) {
  const rows = batch.magnet_batch_castings || [];

  const activeRows = rows.filter((r) => !r.removed_at);

  const allItems = activeRows.flatMap(
    (r) => r.casting_batches?.casting_batch_items || []
  );

  const parties = [
    ...new Set(allItems.map((i) => i.orders?.customer_name).filter(Boolean)),
  ];

  const orders = [
    ...new Set(allItems.map((i) => i.orders?.order_no).filter(Boolean)),
  ];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{batch.magnet_batch_no}</h3>
            <Badge>{batch.kt}</Badge>
            <Badge blue>{batch.status}</Badge>
          </div>

          <p className="mt-2 text-xs font-semibold text-gray-500">
            Party: {parties.join(", ") || "-"}
          </p>
          <p className="text-xs text-gray-500">
            Order: {orders.join(", ") || "-"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            {isOpen ? "Close" : "Open"}
          </button>

          <button
            onClick={() => onDelete(batch)}
            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Batches" value={activeRows.length} />
        <MiniStat label="Pieces" value={batch.total_pieces} />
        <MiniStat
          label="Inward"
          value={`${Number(batch.total_inward_weight || 0).toFixed(3)}g`}
        />
      </div>

      {isOpen && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <h4 className="mb-2 text-sm font-bold">Included Castings</h4>

          <div className="space-y-2">
            {activeRows.map((row) => {
              const cb = row.casting_batches;
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{cb?.batch_no}</p>
                      <p className="text-xs text-gray-500">
                        Pieces Wt: {Number(cb?.received_weight || 0).toFixed(3)}g
                        · Scrap: {Number(cb?.scrap_weight || 0).toFixed(3)}g
                      </p>
                    </div>

                    <button
                      onClick={() => onRemove(row)}
                      className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm">
      {text}
    </div>
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