"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const SCALE_URL = "http://localhost:5056/weight";
const PRINT_URL = "http://localhost:5055/print";

export default function TagPrintDashboard() {
  const { loading: authLoading } = useRequireAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scaleWeight, setScaleWeight] = useState("0.000");

  useEffect(() => {
    fetchOrders();

    const timer = setInterval(fetchScaleWeight, 700);
    return () => clearInterval(timer);
  }, []);

  async function fetchScaleWeight() {
    try {
      const res = await fetch(SCALE_URL);
      const data = await res.json();
      if (data?.ok) setScaleWeight(data.weight || "0.000");
    } catch {}
  }

  async function fetchOrders() {
    setLoading(true);

const { data, error } = await supabase
  .from("orders")
  .select("*")
  .eq("status", "COMPLETED")
  .order("updated_at", { ascending: false });

    if (error) alert(error.message);

    setOrders(data || []);
    setLoading(false);
  }

async function openOrder(order) {
  setSelectedOrder(order);
  setItems([]);

  const { data: batches, error: batchError } = await supabase
    .from("casting_batches")
    .select(`
      id,
      batch_no,
      kt,
      casting_batch_items(category)
    `)
    .eq("order_id", order.id);

  if (batchError) {
    alert(batchError.message);
    return;
  }

  const batchIds = (batches || []).map((b) => b.id);

  if (batchIds.length === 0) {
    alert("Is order ka linked casting batch nahi mila.");
    return;
  }

  const { data: rhodiumRows, error: rhodiumError } = await supabase
    .from("rhodium_results")
    .select("*")
    .in("casting_batch_id", batchIds)
    .order("created_at", { ascending: true });

  if (rhodiumError) {
    alert(rhodiumError.message);
    return;
  }

  const rows = [];

  (rhodiumRows || []).forEach((rhodium) => {
    const batch = (batches || []).find(
      (b) => b.id === rhodium.casting_batch_id
    );

    const categories = [
      ...new Set(
        (batch?.casting_batch_items || [])
          .map((i) => i.category)
          .filter(Boolean)
      ),
    ];

    const qty = Number(rhodium.received_pieces || 0);

    for (let i = 1; i <= qty; i++) {
      const tagId = makeTagId(order.order_no, rows.length + 1);

      rows.push({
        rowKey: `${rhodium.id}-${i}`,
        rhodiumResultId: rhodium.id,
        orderItemId: null,

        category: categories.join(", ") || "Jewellery",
        karat: batch?.kt || "",
        brand: "Annvi Gold",

        grossWeight: "",
        lessWeight: "0.000",
        stoneCharges: "0",
        netWeight: "",

        tagId,
        qrValue: tagId,
      });
    }
  });

  if (rows.length === 0) {
    alert("Is order me Rhodium received pieces nahi mile.");
  }

  setItems(rows);
}
  function updateItem(rowKey, field, value) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowKey !== rowKey) return item;

        const updated = { ...item, [field]: value };

        const gw = Number(updated.grossWeight || 0);
        const lw = Number(updated.lessWeight || 0);
        updated.netWeight = Math.max(gw - lw, 0).toFixed(3);

        return updated;
      })
    );
  }

  function useScale(rowKey) {
    updateItem(rowKey, "grossWeight", Number(scaleWeight || 0).toFixed(3));
  }
async function printTag(item) {
  if (!item.grossWeight) return alert("Gross weight required");
  if (!item.karat) return alert("Karat required");

  const payload = {
    qr: item.tagId,
    brand: item.brand || "Annvi Gold",
    karat: item.karat,
    gw: Number(item.grossWeight || 0).toFixed(3),
    lw: Number(item.lessWeight || 0).toFixed(3),
    sc: Number(item.stoneCharges || 0),
    nw: Number(item.netWeight || 0).toFixed(3),
  };

  try {
    const res = await fetch(PRINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error || "Print failed");
      return;
    }

    const { data: printedTag, error: printedError } = await supabase
      .from("printed_tags")
      .insert([
        {
          order_id: selectedOrder.id,
          order_item_id: item.orderItemId,

          order_no: selectedOrder.order_no,
          party_name: selectedOrder.customer_name,

          tag_id: item.tagId,
          qr_value: item.tagId,

          brand: payload.brand,
          karat: payload.karat,

          gross_weight: payload.gw,
          less_weight: payload.lw,
          stone_charges: payload.sc,
          net_weight: payload.nw,

          category: item.category,
          sample_unique_id: null,
die_no: null,

          is_inventory_created: true,
          remarks: `${item.category || ""}`,
        },
      ])
      .select()
      .single();

    if (printedError) {
      alert(printedError.message);
      return;
    }

    const { error: inventoryError } = await supabase
      .from("finished_inventory")
      .insert([
        {
          order_id: selectedOrder.id,
          order_item_id: item.orderItemId,

          tag_id: item.tagId,
          qr_value: item.tagId,

          order_no: selectedOrder.order_no,
          party_name: selectedOrder.customer_name,

          category: item.category,
          sample_unique_id: null,
die_no: null,

          brand: payload.brand,
          karat: payload.karat,

          gross_weight: payload.gw,
          less_weight: payload.lw,
          stone_charges: payload.sc,
          net_weight: payload.nw,

          status: "IN_STOCK",
          printed_tag_id: printedTag.id,
        },
      ]);

    if (inventoryError) {
      alert(inventoryError.message);
      return;
    }

    alert("Tag printed and inventory created");
  } catch {
    alert("Print bridge nahi chal raha. Pehle node print-bridge.js chalao.");
  }
}

  if (authLoading || loading) {
    return <main className="p-6">Loading tag print...</main>;
  }

  const totalPieces = items.length;
  const totalWeight = items.reduce(
    (sum, item) => sum + Number(item.grossWeight || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-24 text-gray-900 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">Tag Printing</h1>
          <p className="text-sm text-gray-600">
            Completed orders, live scale weight and Godex tag printing.
          </p>
        </header>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">Live Scale</p>
          <p className="text-3xl font-bold text-green-700">{scaleWeight} g</p>
        </div>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Completed Orders</h2>

            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => openOrder(order)}
                  className={`w-full rounded-2xl border p-3 text-left ${
                    selectedOrder?.id === order.id
                      ? "border-black bg-slate-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-bold">{order.order_no}</p>
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                  <p className="text-xs text-gray-500">{order.status}</p>
                </button>
              ))}

              {orders.length === 0 && (
                <p className="text-sm text-gray-500">
                  Ready / Completed order nahi mila.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            {!selectedOrder ? (
              <p className="text-sm text-gray-500">Order select karo.</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {selectedOrder.order_no}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedOrder.customer_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat label="Total Pieces" value={totalPieces} />
                    <MiniStat
                      label="Total Weight"
                      value={`${totalWeight.toFixed(3)}g`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.rowKey}
                      className="rounded-2xl border border-gray-200 bg-slate-50 p-3"
                    >
                      <div className="mb-3 flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-bold">
                            Piece {index + 1} · {item.category}
                          </p>
                         
                        </div>

                        <button
                          onClick={() => printTag(item)}
                          className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"
                        >
                          Print Tag
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <Field label="QR">
                          <input
                            className="input"
                            value={item.qrValue}
                            onChange={(e) =>
                              updateItem(item.rowKey, "qrValue", e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Brand">
                          <input
                            className="input"
                            value={item.brand}
                            onChange={(e) =>
                              updateItem(item.rowKey, "brand", e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Karat">
                          <input
                            className="input"
                            value={item.karat}
                            onChange={(e) =>
                              updateItem(item.rowKey, "karat", e.target.value)
                            }
                          />
                        </Field>

                        <Field label="Gross Weight">
                          <div className="flex gap-2">
                            <input
                              className="input"
                              type="number"
                              step="0.001"
                              value={item.grossWeight}
                              onChange={(e) =>
                                updateItem(
                                  item.rowKey,
                                  "grossWeight",
                                  e.target.value
                                )
                              }
                            />
                            <button
                              onClick={() => useScale(item.rowKey)}
                              className="rounded-xl bg-green-600 px-3 text-xs font-bold text-white"
                            >
                              Scale
                            </button>
                          </div>
                        </Field>

                        <Field label="Less Weight">
                          <input
                            className="input"
                            type="number"
                            step="0.001"
                            value={item.lessWeight}
                            onChange={(e) =>
                              updateItem(
                                item.rowKey,
                                "lessWeight",
                                e.target.value
                              )
                            }
                          />
                        </Field>

                        <Field label="Stone Charges">
                          <input
                            className="input"
                            type="number"
                            value={item.stoneCharges}
                            onChange={(e) =>
                              updateItem(
                                item.rowKey,
                                "stoneCharges",
                                e.target.value
                              )
                            }
                          />
                        </Field>

                        <Field label="Net Weight">
                          <input
                            className="input bg-gray-100"
                            value={item.netWeight}
                            readOnly
                          />
                        </Field>

                        <Field label="Tag ID">
                          <input className="input bg-gray-100" value={item.tagId} readOnly />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
          padding: 0.7rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }
      `}</style>
    </main>
  );
}

function makeTagId(orderNo, pieceNo) {
  const cleanOrder = String(orderNo || "ORD")
    .replace(/[^0-9]/g, "")
    .slice(-6);

  return `AG${cleanOrder}${String(pieceNo).padStart(2, "0")}`;
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
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}