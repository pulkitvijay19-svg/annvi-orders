"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

const STATUS_OPTIONS = [
  "New",
  "Approved",
  "In Production",
  "Stone Setting",
  "Polish/QC",
  "Ready",
  "Dispatched",
  "Delivered",
  "Hold",
  "Cancelled",
];

const CHACHA_WHATSAPP = "917000062670";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showStatusWhatsApp, setShowStatusWhatsApp] = useState(false);
  const { loading: authLoading } = useRequireAuth();



  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(*),
        order_images(*)
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error(error);
      alert(error.message || "Order fetch failed");
    } else {
      setOrder(data);
      setStatus(data.status || "New");
    }

    setLoading(false);
  }

  async function updateStatus() {
    if (!order) return;

    setSavingStatus(true);

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      alert(error.message || "Status update failed");
    } else {
      alert("Status updated successfully");
      setShowStatusWhatsApp(true);
      await fetchOrder();
    }

    setSavingStatus(false);
  }

  async function deleteOrder() {
    if (!order) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete this order? This cannot be undone."
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      alert(error.message || "Order delete failed");
    } else {
      alert("Order deleted successfully");
      router.push("/orders");
    }
  }

  function cleanMobile(mobile) {
  const raw = String(mobile || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (raw.startsWith("+")) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

  function openWhatsApp(phone, message) {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  }

  function sendStatusToParty() {
    if (!order) return;

    const phone = cleanMobile(order.customer_mobile);

    if (!phone || phone.length < 7) {
      alert("Party mobile number missing or invalid");
      return;
    }

    const msg = `Namaste ${order.customer_name} ji,

Aapka order ${order.order_no} abhi "${status}" stage me hai.

Kisi bhi update ke liye aap humse contact kar sakte hain.

- Annvi Gold`;

    openWhatsApp(phone, msg);
  }

  function sendStatusToChacha() {
    if (!order) return;

    const itemLines =
      order.order_items
        ?.map(
          (item, index) =>
            `${index + 1}. ${item.category} | ${
              item.sample_unique_id || "-"
            } | Die: ${item.die_no || "-"} | Wt: ${
              item.approx_weight ? Number(item.approx_weight).toFixed(3) : "-"
            }`
        )
        .join("\n") || "-";

    const msg = `Order Status Updated

Order No: ${order.order_no}
Party: ${order.customer_name}
Mobile: ${order.customer_mobile || "-"}
New Status: ${status}

Items:
${itemLines}

Please check Annvi Orders.`;

    openWhatsApp(CHACHA_WHATSAPP, msg);
  }

  if (loading || !order) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-gray-700">Loading order...</p>
        </div>
      </main>
    );
  }

const totalPieces =
  order?.order_items?.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  ) || 0;

const totalWeight =
  order?.order_items?.reduce(
    (sum, item) => sum + Number(item.approx_weight || 0),
    0
  ) || 0;

  if (authLoading) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <p className="text-gray-700">Checking login...</p>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            font-size: 11px !important;
          }

          .no-print {
            display: none !important;
          }

          main {
            background: white !important;
            padding: 0 !important;
          }

          .mx-auto {
            max-width: 100% !important;
          }

          section {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            margin-bottom: 10px !important;
            page-break-inside: avoid;
            padding: 10px !important;
          }

          h1 {
            font-size: 22px !important;
            margin-bottom: 4px !important;
          }

          h2 {
            font-size: 16px !important;
            margin-bottom: 8px !important;
          }

          p,
          td,
          th,
          span,
          div {
            font-size: 11px !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          th,
          td {
            border: 1px solid #d1d5db !important;
            padding: 4px !important;
          }

          img {
            max-height: 120px !important;
            width: auto !important;
            object-fit: contain !important;
            border-radius: 6px !important;
          }

          .grid {
            gap: 8px !important;
          }

          .print-overflow-visible {
            overflow: visible !important;
          }

          .print-overflow-visible table {
            min-width: 100% !important;
          }
            .no-print {
  display: none !important;
}

section {
  padding: 8px !important;
  margin-bottom: 8px !important;
}

.grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 6px !important;
}

.rounded-xl {
  padding: 6px !important;
}

table {
  font-size: 9px !important;
}

th,
td {
  padding: 3px !important;
  font-size: 9px !important;
}

h1 {
  font-size: 18px !important;
}

h2 {
  font-size: 13px !important;
}

p {
  font-size: 9px !important;
}
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {order.order_no}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Full order details and status update.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 no-print">
            <Link
              href="/orders"
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm"
            >
              ← Back
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
            >
              + Add Order
            </Link>

            <Link
              href={`/orders/${order.id}/edit`}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Print Order
            </button>

            <button
              type="button"
              onClick={deleteOrder}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Customer Details
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Info label="Customer Name" value={order.customer_name} />
            <Info label="Mobile" value={order.customer_mobile || "-"} />
            <Info label="Delivery Date" value={order.delivery_date || "-"} />
            <Info label="Priority" value={order.priority || "-"} />
            <Info label="Current Status" value={order.status || "-"} />
            <Info
              label="Created"
              value={
                order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : "-"
              }
            />
          </div>

          {order.remarks && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Remarks
              </p>
              <p className="mt-1 text-gray-900">{order.remarks}</p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm no-print">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Update Status
          </h2>

          <select
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setShowStatusWhatsApp(false);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={updateStatus}
            disabled={savingStatus}
            className="mt-4 w-full rounded-xl bg-black p-3 font-semibold text-white disabled:bg-gray-400"
          >
            {savingStatus ? "Updating..." : "Update Status"}
          </button>

          {showStatusWhatsApp && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={sendStatusToParty}
                className="rounded-xl bg-green-600 p-3 font-semibold text-white hover:bg-green-700"
              >
                Send Status WhatsApp to Party
              </button>

              <button
                type="button"
                onClick={sendStatusToChacha}
                className="rounded-xl bg-emerald-700 p-3 font-semibold text-white hover:bg-emerald-800"
              >
                Send Status WhatsApp to Chacha
              </button>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Order Items
          </h2>

          <div className="overflow-x-auto print-overflow-visible">
            <table className="w-full min-w-[850px] border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="p-3">Category</th>
                  <th className="p-3">Sample ID</th>
                  <th className="p-3">Die No</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Gold KT</th>
                  <th className="p-3">Approx Weight</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {order.order_items?.map((item) => (
                  <tr key={item.id} className="border-b text-sm">
                    <td className="p-3 font-medium text-gray-900">
                      {item.category}
                    </td>
                    <td className="p-3 text-gray-700">
                      {item.sample_unique_id || "-"}
                    </td>
                    <td className="p-3 text-gray-700">{item.die_no || "-"}</td>
                    <td className="p-3 text-gray-700">{item.quantity}</td>
                    <td className="p-3 text-gray-700">{item.gold_kt || "-"}</td>
                    <td className="p-3 text-gray-700">
                      {item.approx_weight
                        ? Number(item.approx_weight).toFixed(3)
                        : "-"}
                    </td>
                    <td className="p-3 text-gray-700">{item.size || "-"}</td>
                    <td className="p-3 text-gray-700">
                      {item.remarks || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden no-print">
  {order.order_items?.map((item) => (
    <div
      key={item.id}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">
            {item.category}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {item.sample_unique_id || "-"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-gray-900">
          Qty: {item.quantity || 0}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">
            Die No
          </p>

          <p className="mt-1 text-gray-900">
            {item.die_no || "-"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">
            Gold KT
          </p>

          <p className="mt-1 text-gray-900">
            {item.gold_kt || "-"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">
            Weight
          </p>

          <p className="mt-1 text-gray-900">
            {item.approx_weight ? Number(item.approx_weight).toFixed(3) : "0.000"} g
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">
            Size
          </p>

          <p className="mt-1 text-gray-900">
            {item.size || "-"}
          </p>
        </div>
      </div>

      {item.remarks ? (
        <div className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-gray-700">
          {item.remarks}
        </div>
      ) : null}
    </div>
  ))}
</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
  <div className="rounded-xl bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Total Pieces
    </p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {totalPieces}
    </p>
  </div>

  <div className="rounded-xl bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Total Approx Weight
    </p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {totalWeight.toFixed(3)} g
    </p>
  </div>
</div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Design Images
          </h2>

          {order.order_images?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {order.order_images.map((img) => (
                <a
                  key={img.id}
                  href={img.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={img.image_url}
                    alt="Design"
                    className="h-64 w-full rounded-2xl border object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No images uploaded.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900">{value}</p>
    </div>
  );
}