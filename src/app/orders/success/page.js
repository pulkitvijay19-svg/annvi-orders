"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Suspense } from "react";
const CHACHA_WHATSAPP = "917000062670";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { loading: authLoading } = useRequireAuth();


  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      console.error(error);
    } else {
      setOrder(data);
    }

    setLoading(false);
  }

  function cleanMobile(mobile) {
    const digits = String(mobile || "").replace(/\D/g, "");

    if (digits.length === 10) {
      return `91${digits}`;
    }

    if (digits.startsWith("91")) {
      return digits;
    }

    return digits;
  }

  function openWhatsApp(phone, message) {
    const encoded = encodeURIComponent(message);

    window.open(
      `https://wa.me/${phone}?text=${encoded}`,
      "_blank"
    );
  }

  function sendPartyWhatsApp() {
    if (!order) return;

    const phone = cleanMobile(order.customer_mobile);

    if (!phone || phone.length < 12) {
      alert("Invalid customer mobile number");
      return;
    }

    const msg = `Namaste ${order.customer_name} ji,

Aapka order ${order.order_no} successfully receive ho gaya hai.

Kisi bhi update ke liye aap humse contact kar sakte hain.

- Annvi Gold`;

    openWhatsApp(phone, msg);
  }

  function sendChachaWhatsApp() {
    if (!order) return;

    const itemLines =
      order.order_items
        ?.map(
          (item, index) =>
            `${index + 1}. ${item.category} | ${
              item.sample_unique_id || "-"
            } | Die: ${item.die_no || "-"} | Wt: ${
              item.approx_weight
                ? Number(item.approx_weight).toFixed(3)
                : "-"
            }`
        )
        .join("\n") || "-";

    const msg = `New Order Received

Order No: ${order.order_no}
Party: ${order.customer_name}
Mobile: ${order.customer_mobile || "-"}

Items:
${itemLines}

Status: ${order.status}



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

  if (authLoading) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <p className="text-gray-700">Checking login...</p>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-green-700">
              Order Created Successfully
            </h1>

            <p className="mt-4 text-xl font-bold text-gray-900">
              {order.order_no}
            </p>

            <p className="mt-1 text-gray-600">
              {order.customer_name}
            </p>

            <p className="text-gray-500">
              {order.customer_mobile || "-"}
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <button
              onClick={sendPartyWhatsApp}
              className="rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700"
            >
              Send WhatsApp to Party
            </button>

            <button
              onClick={sendChachaWhatsApp}
              className="rounded-xl bg-emerald-700 px-5 py-4 font-semibold text-white hover:bg-emerald-800"
            >
              Send WhatsApp to Chacha
            </button>

            <Link
              href={`/orders/${order.id}`}
              className="rounded-xl bg-black px-5 py-4 text-center font-semibold text-white"
            >
              View Order
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-white px-5 py-4 text-center font-semibold text-gray-900 shadow-sm"
            >
              Add New Order
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-6">
          <p className="text-gray-700">Loading order...</p>
        </main>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}