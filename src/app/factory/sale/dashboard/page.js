"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function SaleDashboardPage() {
  const { loading: authLoading } = useRequireAuth();

  const [partySearch, setPartySearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [qrInput, setQrInput] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [partyMobile, setPartyMobile] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const q = partySearch.toLowerCase().trim();
    if (!q) return [];
    return orders.filter((o) =>
      String(o.customer_name || "").toLowerCase().includes(q)
    );
  }, [partySearch, orders]);

  const totals = useMemo(() => {
    return saleItems.reduce(
      (acc, item) => {
        acc.pieces += 1;
        acc.gw += Number(item.gross_weight || 0);
        acc.lw += Number(item.less_weight || 0);
        acc.nw += Number(item.net_weight || 0);
        acc.sc += Number(item.stone_charges || 0);
        return acc;
      },
      { pieces: 0, gw: 0, lw: 0, nw: 0, sc: 0 }
    );
  }, [saleItems]);

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  async function fetchCompletedOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "COMPLETED")
      .order("created_at", { ascending: false });

    if (error) return alert(error.message);
    setOrders(data || []);
  }

  function selectOrder(order) {
    setSelectedOrder(order);
    setPartySearch(order.customer_name || "");
    setPartyMobile(order.customer_mobile || "");
    setSaleItems([]);
    setQrInput("");
  }

  async function addByQR() {
    const qr = qrInput.trim();
    if (!qr) return alert("QR scan / enter karo");
    if (!selectedOrder) return alert("Pehle order select karo");

    if (saleItems.some((i) => i.qr_value === qr || i.tag_id === qr)) {
      setQrInput("");
      return alert("Ye item already add hai");
    }

    const { data, error } = await supabase
      .from("finished_inventory")
      .select("*")
      .eq("qr_value", qr)
      .eq("order_id", selectedOrder.id)
      .eq("status", "IN_STOCK")
      .maybeSingle();

    if (error) return alert(error.message);

    if (!data) {
      return alert("Item nahi mila ya already sold hai ya selected order ka nahi hai");
    }

    setSaleItems((prev) => [...prev, data]);
    setQrInput("");
  }

  function removeItem(id) {
    setSaleItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveSale() {
    if (!selectedOrder) return alert("Order select karo");
    if (saleItems.length === 0) return alert("Sale items add karo");

    setSaving(true);

    const saleNo = `SALE-${Date.now()}`;

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          sale_no: saleNo,
          order_id: selectedOrder.id,
          order_no: selectedOrder.order_no,
          party_name: selectedOrder.customer_name,
          party_mobile: partyMobile,

          total_pieces: totals.pieces,
          total_gross_weight: totals.gw.toFixed(3),
          total_less_weight: totals.lw.toFixed(3),
          total_net_weight: totals.nw.toFixed(3),
          total_stone_charges: totals.sc,

          sale_status: "COMPLETED",
          remarks,
        },
      ])
      .select()
      .single();

    if (saleError) {
      setSaving(false);
      return alert(saleError.message);
    }

    const saleRows = saleItems.map((item) => ({
      sale_id: sale.id,
      order_id: selectedOrder.id,
      finished_inventory_id: item.id,

      tag_id: item.tag_id,
      qr_value: item.qr_value,

      order_no: item.order_no,
      category: item.category,
      brand: item.brand,
      karat: item.karat,

      gross_weight: item.gross_weight,
      less_weight: item.less_weight,
      stone_charges: item.stone_charges,
      net_weight: item.net_weight,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleRows);

    if (itemsError) {
      setSaving(false);
      return alert(itemsError.message);
    }

    const ids = saleItems.map((i) => i.id);

    const { error: invError } = await supabase
      .from("finished_inventory")
      .update({
        status: "SOLD",
        sale_id: sale.id,
        sold_to_party: selectedOrder.customer_name,
        sold_order_id: selectedOrder.id,
        sold_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (invError) {
      setSaving(false);
      return alert(invError.message);
    }

    await supabase
      .from("orders")
      .update({ status: "DELIVERED" })
      .eq("id", selectedOrder.id);

    setSaving(false);
    alert("Sale saved. Items SOLD ho gaye.");
    setSaleItems([]);
    setSelectedOrder(null);
    setPartySearch("");
    setPartyMobile("");
    setRemarks("");
    fetchCompletedOrders();
  }

  if (authLoading) {
    return <main className="p-6">Loading sale page...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">Sale / Delivery</h1>
          <p className="text-sm text-gray-600">
            Party select karo, completed order choose karo, QR scan karke sale save karo.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Party Search</h2>

              <input
                className="input"
                placeholder="Party name type karo..."
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedOrder(null);
                }}
              />

              <div className="mt-3 space-y-2">
                {suggestions.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="w-full rounded-2xl border border-gray-200 bg-slate-50 p-3 text-left"
                  >
                    <p className="font-bold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.order_no}</p>
                    <p className="text-xs text-gray-500">{order.customer_mobile}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedOrder && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold">Selected Order</h2>
                <p className="mt-2 font-semibold">{selectedOrder.order_no}</p>
                <p className="text-sm text-gray-600">{selectedOrder.customer_name}</p>
                <p className="text-sm text-gray-600">{partyMobile || "-"}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Scan Item QR</h2>

              <div className="flex gap-2">
                <input
                  autoFocus
                  className="input"
                  placeholder="QR scan / tag id enter"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addByQR();
                  }}
                />
                <button
                  onClick={addByQR}
                  className="rounded-xl bg-black px-5 text-sm font-bold text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <MiniStat label="Pieces" value={totals.pieces} />
              <MiniStat label="GW" value={`${totals.gw.toFixed(3)}g`} />
              <MiniStat label="LW" value={`${totals.lw.toFixed(3)}g`} />
              <MiniStat label="NW" value={`${totals.nw.toFixed(3)}g`} />
              <MiniStat label="SC" value={totals.sc} />
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Sale Items</h2>

              {saleItems.length === 0 ? (
                <p className="text-sm text-gray-500">Abhi koi item add nahi hai.</p>
              ) : (
                <div className="space-y-2">
                  {saleItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="font-bold">{item.tag_id}</p>
                        <p className="text-sm text-gray-600">
                          {item.category} · {item.karat}
                        </p>
                        <p className="text-xs text-gray-500">
                          GW {Number(item.gross_weight || 0).toFixed(3)}g · LW{" "}
                          {Number(item.less_weight || 0).toFixed(3)}g · NW{" "}
                          {Number(item.net_weight || 0).toFixed(3)}g · SC{" "}
                          {item.stone_charges || 0}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="block">
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    Remarks
                  </p>
                  <textarea
                    rows={3}
                    className="input"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </label>
              </div>

              <button
                disabled={saving || saleItems.length === 0}
                onClick={saveSale}
                className="mt-4 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save Sale / Delivery"}
              </button>
            </div>
          </div>
        </section>
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

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}