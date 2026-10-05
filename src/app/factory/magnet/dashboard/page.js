"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "../../../../lib/supabaseClient";

import { useRequireAuth } from "../../../../lib/useRequireAuth";

import MobileBottomNav from "../../../../components/MobileBottomNav";

import { useLanguage } from "../../../../context/LanguageContext";

export default function MagnetDashboardPage() {

  const { user, loading: authLoading } = useRequireAuth();

  const { t } = useLanguage();

  const [targetBatchNo, setTargetBatchNo] = useState("");

  const [castingBatches, setCastingBatches] = useState([]);

  const [magnetBatches, setMagnetBatches] = useState([]);

  const [selectionMode, setSelectionMode] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const [openId, setOpenId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [clubbing, setClubbing] = useState(false);

  const [openReworks, setOpenReworks] = useState({});

  async function fetchData() {

    setLoading(true);

    const { data: castingData, error: castingError } = await supabase

      .from("casting_batches")

      .select(`

        \*,

        casting_batch_items(

          \*,

          orders(order_no, customer_name)

        )

      `)

      .eq("status", "Magnet")

      .order("created_at", { ascending: false });

    const { data: magnetData, error: magnetError } = await supabase

      .from("magnet_batches")

      .select(`

        \*,

        magnet_batch_castings(

          \*,

          casting_batches(

            \*,

            casting_batch_items(

              \*,

              orders(order_no, customer_name)

            )

          )

        )

      `)

      .eq("status", "In Magnet")

      .order("created_at", { ascending: false });

    if (castingError) alert(castingError.message);

    if (magnetError) alert(magnetError.message);

    const castingIds = (castingData || []).map((b) => b.id);
    const clubCastingIds = (magnetData || []).flatMap((mb) =>
      (mb.magnet_batch_castings || []).map((row) => row.casting_batch_id).filter(Boolean)
    );
    const allCastingIds = [...new Set([...castingIds, ...clubCastingIds])];

    const reworkMap = {};
    if (allCastingIds.length > 0) {
      const { data: reworkData, error: reworkError } = await supabase
        .from("process_reworks")
        .select("id, casting_batch_id, from_process, to_process, status")
        .in("casting_batch_id", allCastingIds)
        .in("status", ["OPEN", "IN_PROGRESS"]);

      if (reworkError) {
        console.error("Magnet rework load error:", reworkError);
      } else {
        (reworkData || []).forEach((row) => {
          if (String(row.to_process || "").trim().toLowerCase() === "magnet") {
            reworkMap[row.casting_batch_id] = row;
          }
        });
      }
    }

    setOpenReworks(reworkMap);
    setCastingBatches(castingData || []);

    setMagnetBatches(magnetData || []);

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

      alert(t("select_casting_batches"));

      return;

    }

    const selected = castingBatches.filter((b) => selectedIds.includes(b.id));

    const ktSet = [...new Set(selected.map((b) => b.kt))];

    if (ktSet.length > 1) {

      alert(t("same_kt_batches_only"));

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

    alert(`${t("magnet_batch_created")}: ${magnetBatchNo}`);

    setSelectedIds([]);

    setSelectionMode(false);

    setClubbing(false);

    fetchData();

  }

  async function removeCastingFromClub(row) {

    const ok = confirm(t("confirm_remove_casting_club"));

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

    alert(t("casting_removed_from_club"));

    fetchData();

  }

  async function deleteMagnetBatch(batch) {

   const ok = confirm(

  `${batch.magnet_batch_no} - ${t("confirm_delete_magnet_batch")}`

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

    alert(t("magnet_batch_deleted"));

    fetchData();

  }

  if (authLoading || loading) {

    return (

      <main className="min-h-screen bg-slate-100 p-6">

        <p className="text-sm text-gray-700">

  {t("loading_magnet_dashboard")}

</p>

      </main>

    );

  }

  return (

    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">

      <div className="mx-auto max-w-7xl space-y-5">

        <Header

  t={t}

  selectionMode={selectionMode}

  setSelectionMode={setSelectionMode}

/>

        {selectionMode && (

          <div className="sticky top-3 z-30 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-white shadow-xl">

            <div className="flex items-center justify-between gap-3">

              <p className="text-sm font-semibold">

                {t("selected")}: {selectedIds.length}

              </p>

              <button

                disabled={clubbing}

                onClick={clubSelectedBatches}

                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black disabled:bg-gray-300"

              >

                {clubbing ? t("creating") : t("club_these_batches")}

              </button>

            </div>

          </div>

        )}

        <section>

          <h2 className="mb-3 text-lg font-bold">

  {t("active_magnet_clubs")}

</h2>

          {magnetBatches.length === 0 ? (

            <Empty text={t("no_clubbed_magnet_batch")} />

          ) : (

            <div className="grid gap-4 lg:grid-cols-2">

              {magnetBatches.map((batch) => (

                <MagnetClubCard

  key={batch.id}

  batch={batch}

  t={t}

  isOpen={openId === batch.id}

  onOpen={() =>

    setOpenId(openId === batch.id ? null : batch.id)

  }

  onDelete={deleteMagnetBatch}

  onRemove={removeCastingFromClub}
  openReworks={openReworks}
/>

              ))}

            </div>

          )}

        </section>

        <section>

          <h2 className="mb-3 text-lg font-bold">

  {t("single_casting_ready_for_magnet")}

</h2>

          {castingBatches.length === 0 ? (

            <Empty text="No single casting batch waiting for magnet." />

          ) : (

            <div className="grid gap-4 lg:grid-cols-2">

              {castingBatches.map((batch) => {

                const s = getBatchSummary(batch);

                return (

                  <div
                    key={batch.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                      openReworks[batch.id]
                        ? "border-amber-300"
                        : selectedIds.includes(batch.id)
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-slate-200"
                    }`}
                  >
                    {openReworks[batch.id] && (
                      <ReworkStrip fromProcess={openReworks[batch.id].from_process} />
                    )}
                    <div className="p-5">

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

  {t("order")}: {s.orderNos.join(", ") || "-"}

</p>

<p className="text-xs text-gray-500">

  {t("party")}: {s.parties.join(", ") || "-"}

</p>

                      </div>

<Link

  href={`/factory/magnet/process?batch=${batch.id}`}

  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"

>

  {t("process")}

</Link>

                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">

                      <MiniStat label="Pieces" value={s.pieces} />

<MiniStat

  label={t("pieces_weight")}

  value={`${s.piecesWeight.toFixed(3)}g`}

/>

<MiniStat

  label={t("scrap")}

  value={`${s.scrapWeight.toFixed(3)}g`}

/>

                    </div>
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

function Header({ t, selectionMode, setSelectionMode }) {

  return (

    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

      <div>

        <h1 className="text-2xl font-bold md:text-3xl">

  {t("magnet_dashboard")}

</h1>

<p className="text-sm text-gray-600">

  {t("magnet_dashboard_subtitle")}

</p>

      </div>

      <div className="flex flex-wrap gap-2">

        <Link

          href="/factory/magnet/process"

          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"

        >

          {t("magnet_process")}

        </Link>

        <Link

          href="/factory/casting/dashboard"

          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm"

        >

          {t("casting")}

        </Link>

        <button

          onClick={() => setSelectionMode(!selectionMode)}

          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"

        >

          {selectionMode ? t("cancel_club") : t("club_batches")}

        </button>

      </div>

    </div>

  );

}

function MagnetClubCard({ batch, t, isOpen, onOpen, onDelete, onRemove, openReworks }) {

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

  const reworkRows = activeRows.filter((row) => openReworks?.[row.casting_batch_id]);
  const hasRework = reworkRows.length > 0;

  return (

    <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${hasRework ? "border-amber-300" : "border-slate-200"}`}>
      {hasRework && (
        <ReworkStrip
          fromProcess={openReworks[reworkRows[0].casting_batch_id]?.from_process}
          label="REWORK · MAGNET CLUB"
        />
      )}
      <div className="p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h3 className="font-bold">{batch.magnet_batch_no}</h3>

            <Badge>{batch.kt}</Badge>

            <Badge blue>{batch.status}</Badge>

          </div>

<p className="mt-2 text-xs font-semibold text-gray-500">

  {t("party")}: {parties.join(", ") || "-"}

</p>

<p className="text-xs text-gray-500">

  {t("order")}: {orders.join(", ") || "-"}

</p>

        </div>

        <div className="flex gap-2">

          <button

            onClick={onOpen}

            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"

          >

            {isOpen ? t("close") : t("open")}

          </button>

          <button

            onClick={() => onDelete(batch)}

            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"

          >

            {t("delete")}

          </button>

        </div>

      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">

        <MiniStat label={t("batches")} value={activeRows.length} />

        <MiniStat label={t("pieces")} value={batch.total_pieces} />

<MiniStat

  label={t("inward")}

  value={`${Number(batch.total_inward_weight || 0).toFixed(3)}g`}

/>

      </div>

      {isOpen && (

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">

          <h4 className="mb-2 text-sm font-bold">

  {t("included_castings")}

</h4>

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

  {t("pieces_weight")}: {Number(cb?.received_weight || 0).toFixed(3)}g

  {" · "}

  {t("scrap")}: {Number(cb?.scrap_weight || 0).toFixed(3)}g

</p>

                    </div>

                    <button

                      onClick={() => onRemove(row)}

                      className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"

                    >

                      {t("remove")}

                    </button>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      )}

          </div>
    </section>

  );

}

function ReworkStrip({ fromProcess, label = "REWORK · MAGNET" }) {
  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg font-black">↩</div>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em]">{label}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-amber-800">
          {fromProcess || "Previous Process"} → Magnet
        </p>
      </div>
    </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-extrabold text-slate-950">{value}</p>
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