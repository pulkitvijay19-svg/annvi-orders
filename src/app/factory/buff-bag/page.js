"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function BuffBagPage() {
  const [activeBag, setActiveBag] = useState(null);
  const [bagRecords, setBagRecords] = useState([]);
  const [oldBags, setOldBags] = useState([]);
  const [bagNo, setBagNo] = useState("");
  const [recoveredGold, setRecoveredGold] = useState("");
  const [recoveryDate, setRecoveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchBag() {
    setLoading(true);

    const { data } = await supabase
      .from("buff_bags")
      .select("*")
      .eq("status", "Active")
      .order("installed_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveBag(data || null);
    if (data?.id) {
  const { data: recordsData, error: recordsError } = await supabase
    .from("buff_loss_records")
    .select("*")
    .eq("buff_bag_id", data.id)
    .order("created_at", { ascending: false });

  if (!recordsError) {
    setBagRecords(recordsData || []);
  }
} else {
  setBagRecords([]);
}

const { data: oldBagData } = await supabase
  .from("buff_bags")
  .select("*")
  .eq("status", "Removed")
  .order("installed_date", { ascending: false });

setOldBags(oldBagData || []);

    setLoading(false);
  }

  useEffect(() => {
    fetchBag();
  }, []);

  async function installNewBag() {
    if (!bagNo) {
      alert("Enter bag number");
      return;
    }

    if (activeBag) {
      await supabase
        .from("buff_bags")
        .update({ status: "Removed" })
        .eq("id", activeBag.id);
    }

    const { error } = await supabase
      .from("buff_bags")
      .insert([
        {
          bag_no: bagNo,
          status: "Active",
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setBagNo("");
    fetchBag();
  }

  async function removeBag() {
    if (!activeBag) return;

    const { error } = await supabase
      .from("buff_bags")
      .update({
        status: "Removed",
      })
      .eq("id", activeBag.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchBag();
  }

  async function saveRecovery() {
    if (!activeBag) {
      alert("No active bag");
      return;
    }

    const expected = Number(activeBag.expected_fine_gold || 0);
    const recovered = Number(recoveredGold || 0);

    const recoveryPercentage =
      expected > 0
        ? (recovered / expected) * 100
        : 0;

    const { error } = await supabase
      .from("buff_bags")
      .update({
        recovered_fine_gold: recovered,
        recovery_percentage: recoveryPercentage,
        recovery_date: recoveryDate || null,
        remarks,
      })
      .eq("id", activeBag.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Recovery saved");
    fetchBag();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-gray-900 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🧹 Buff Bag Recovery
            </h1>
            <p className="text-sm text-gray-600">
              Buff loss recovery tracking
            </p>
          </div>

          <Link
            href="/factory"
            className="rounded-xl bg-black px-5 py-3 text-white font-bold"
          >
            Manufacturing
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Active Buff Bag
          </h2>

          {activeBag ? (
            <div className="grid gap-3 md:grid-cols-3">

              <InfoCard
                label="Bag No"
                value={activeBag.bag_no}
              />

              <InfoCard
                label="Installed Date"
                value={activeBag.installed_date}
              />

              <InfoCard
                label="Status"
                value={activeBag.status}
              />

              <InfoCard
                label="Expected Fine Gold"
                value={`${Number(
                  activeBag.expected_fine_gold || 0
                ).toFixed(3)} g`}
              />

              <InfoCard
                label="Recovered Fine Gold"
                value={`${Number(
                  activeBag.recovered_fine_gold || 0
                ).toFixed(3)} g`}
              />

              <InfoCard
                label="Recovery %"
                value={`${Number(
                  activeBag.recovery_percentage || 0
                ).toFixed(2)} %`}
              />
            </div>
          ) : (
            <div className="rounded-xl bg-yellow-50 p-4">
              No active buff bag installed.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">

            <input
              value={bagNo}
              onChange={(e) => setBagNo(e.target.value)}
              placeholder="Bag Number"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none"
            />

            <button
              onClick={installNewBag}
              className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
            >
              + Install New Bag
            </button>

            <button
              onClick={removeBag}
              className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
            >
              Remove Current Bag
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">
            Recovery Entry
          </h2>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold text-gray-900">
        Party Tracking
      </h2>
      <p className="text-sm text-gray-500">
        Active bag wise buff loss records
      </p>
    </div>

    <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700">
      Total Expected:{" "}
      {bagRecords
        .reduce((sum, row) => sum + Number(row.expected_fine_gold || 0), 0)
        .toFixed(3)}{" "}
      g
    </div>
  </div>

  {bagRecords.length === 0 ? (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-gray-500">
      No buff loss records linked to this bag.
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="p-3">Party</th>
            <th className="p-3">Batch No</th>
            <th className="p-3">KT</th>
            <th className="p-3">Loss Weight</th>
            <th className="p-3">Expected Fine</th>
            <th className="p-3">Status</th>
            <th className="p-3">Remarks</th>
          </tr>
        </thead>

        <tbody>
          {bagRecords.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="p-3 font-semibold">
                {row.party_name || "-"}
              </td>
              <td className="p-3">
                {row.batch_no || "-"}
              </td>
              <td className="p-3">
                {row.kt || "-"}
              </td>
              <td className="p-3">
                {Number(row.loss_weight || 0).toFixed(3)} g
              </td>
              <td className="p-3 font-bold text-yellow-700">
                {Number(row.expected_fine_gold || 0).toFixed(3)} g
              </td>
              <td className="p-3">
                {row.recovery_status || "-"}
              </td>
              <td className="p-3">
                {row.remarks || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

<section className="rounded-3xl bg-white p-5 shadow-sm">
  <div className="mb-4">
    <h2 className="text-lg font-bold text-gray-900">
      Removed Bags History
    </h2>
    <p className="text-sm text-gray-500">
      Old buff bags recovery summary
    </p>
  </div>

  {oldBags.length === 0 ? (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-gray-500">
      No removed bags history.
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="p-3">Bag No</th>
            <th className="p-3">Installed Date</th>
            <th className="p-3">Expected Fine</th>
            <th className="p-3">Recovered Fine</th>
            <th className="p-3">Recovery %</th>
            <th className="p-3">Recovery Date</th>
            <th className="p-3">Remarks</th>
          </tr>
        </thead>

        <tbody>
          {oldBags.map((bag) => (
            <tr key={bag.id} className="border-b">
              <td className="p-3 font-bold">{bag.bag_no}</td>
              <td className="p-3">{bag.installed_date || "-"}</td>
              <td className="p-3">
                {Number(bag.expected_fine_gold || 0).toFixed(3)} g
              </td>
              <td className="p-3">
                {Number(bag.recovered_fine_gold || 0).toFixed(3)} g
              </td>
              <td className="p-3 font-bold text-green-700">
                {Number(bag.recovery_percentage || 0).toFixed(2)} %
              </td>
              <td className="p-3">{bag.recovery_date || "-"}</td>
              <td className="p-3">{bag.remarks || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

          <div className="grid gap-3 md:grid-cols-3">

            <input
              type="number"
              step="0.001"
              value={recoveredGold}
              onChange={(e) => setRecoveredGold(e.target.value)}
              placeholder="Recovered Fine Gold"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none"
            />

            <input
              type="date"
              value={recoveryDate}
              onChange={(e) => setRecoveryDate(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none"
            />

            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks"
              className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none"
            />
          </div>

          <button
            onClick={saveRecovery}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Save Recovery
          </button>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}