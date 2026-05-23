"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const firstLoadDone = useRef(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function fetchOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
  *,
  order_items(id, quantity, approx_weight)
`)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
    }

    setLoading(false);
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = 700;
      gainNode.gain.value = 0.08;

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.log("Sound blocked by browser");
    }
  }
function getOrderTotals(order) {
  const pieces = order.order_items?.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

const weight = order.order_items?.reduce(
  (sum, item) => sum + Number(item.approx_weight || 0),
  0
);

  return {
    pieces: pieces || 0,
    weight: weight ? weight.toFixed(3) : "0.000",
  };
}
  useEffect(() => {
    fetchOrders().then(() => {
      firstLoadDone.current = true;
    });

    const channel = supabase
      .channel("orders-live-notification")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (!firstLoadDone.current) return;

          const newOrder = payload.new;

          setNewOrderAlert({
            order_no: newOrder.order_no,
            customer_name: newOrder.customer_name,
          });

          playBeep();
          fetchOrders();

          setTimeout(() => {
            setNewOrderAlert(null);
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return {
      total: orders.length,
      pending: orders.filter(
        (o) => !["Delivered", "Cancelled"].includes(o.status)
      ).length,
      todayDelivery: orders.filter((o) => o.delivery_date === today).length,
      delayed: orders.filter(
        (o) =>
          o.delivery_date &&
          o.delivery_date < today &&
          !["Delivered", "Cancelled"].includes(o.status)
      ).length,
      ready: orders.filter((o) => o.status === "Ready").length,
      urgent: orders.filter(
        (o) => o.priority === "Urgent" || o.priority === "Super Urgent"
      ).length,
    };
  }, [orders]);

  const recentOrders = orders.slice(0, 8);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-gray-700">Checking login...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      {newOrderAlert && (
        <div className="fixed right-5 top-5 z-50 rounded-2xl bg-green-600 p-4 text-white shadow-lg">
          <p className="font-bold">New Order Received</p>
          <p className="text-sm">{newOrderAlert.order_no}</p>
          <p className="text-sm">{newOrderAlert.customer_name}</p>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Annvi Orders Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Daily order control and delivery planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Logout
            </button>

            <Link
              href="/orders"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm"
            >
              View Orders
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              + Add Order
            </Link>

            <Link
              href="/catalog/upload"
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Sample Catalog
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-700">Loading dashboard...</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard title="Total Orders" value={stats.total} href="/orders" />
              <StatCard title="Pending" value={stats.pending} href="/orders" />
              <StatCard title="Today Delivery" value={stats.todayDelivery} href="/orders?date=Today" />
              <StatCard title="Delayed" value={stats.delayed} href="/orders?date=Delayed" danger />
              <StatCard title="Ready" value={stats.ready} href="/orders?status=Ready" success />
              <StatCard title="Urgent" value={stats.urgent} href="/orders?priority=Urgent" warning />
            </section>

            <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Orders
                </h2>

                <Link
                  href="/orders"
                  className="text-sm font-semibold text-gray-700 hover:text-black"
                >
                  View All →
                </Link>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
  <tr className="border-b text-left text-sm text-gray-500">
    <th className="p-3">Order No</th>
    <th className="p-3">Customer</th>
    <th className="p-3">Delivery</th>

    <th className="p-3">Pieces</th>
    <th className="p-3">Weight</th>

    <th className="p-3">Priority</th>
    <th className="p-3">Status</th>
    <th className="p-3">Action</th>
  </tr>
</thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b text-sm">
                        <td className="p-3 font-semibold text-gray-900">
                          {order.order_no}
                        </td>

                        <td className="p-3">
                          <p className="font-medium text-gray-900">
                            {order.customer_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customer_mobile || "-"}
                          </p>
                        </td>

                        <td className="p-3 text-gray-700">
                          {order.delivery_date || "-"}
                        </td>
<td className="p-3 text-gray-700">
  {getOrderTotals(order).pieces}
</td>

<td className="p-3 text-gray-700">
  {getOrderTotals(order).weight} g
</td>
                        <td className="p-3">
                          <Badge text={order.priority} type="priority" />
                        </td>

                        <td className="p-3">
                          <Badge text={order.status} type="status" />
                        </td>

                        <td className="p-3">
                          <Link
                            href={`/orders/${order.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
      <div className="space-y-3 md:hidden">
  {recentOrders.map((order) => (
    <div
      key={order.id}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">{order.order_no}</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">
            {order.customer_name}
          </p>
          <p className="text-xs text-gray-500">
            {order.customer_mobile || "-"}
          </p>
        </div>

        <Link
          href={`/orders/${order.id}`}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          View
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">Delivery</p>
          <p className="mt-1 text-gray-900">{order.delivery_date || "-"}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">Priority</p>
          <Badge text={order.priority} type="priority" />
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-gray-500">Status</p>
          <Badge text={order.status} type="status" />
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
  <p className="text-xs font-semibold text-gray-500">Pieces</p>
  <p className="mt-1 font-semibold text-gray-900">
    {getOrderTotals(order).pieces}
  </p>
</div>

<div className="rounded-xl bg-slate-50 p-3">
  <p className="text-xs font-semibold text-gray-500">Weight</p>
  <p className="mt-1 font-semibold text-gray-900">
    {getOrderTotals(order).weight} g
  </p>
</div>
      </div>
    </div>
  ))}
</div>
    </main>
  );
}

function StatCard({ title, value, danger, success, warning, href }) {
  let bg = "bg-white";
  let text = "text-gray-900";

  if (danger) {
    bg = "bg-red-50";
    text = "text-red-700";
  }

  if (success) {
    bg = "bg-green-50";
    text = "text-green-700";
  }

  if (warning) {
    bg = "bg-orange-50";
    text = "text-orange-700";
  }

  return (
    <Link
      href={href || "/orders"}
      className={`block rounded-2xl p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:p-5 ${bg}`}
    >
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold md:text-3xl ${text}`}>{value}</p>
    </Link>
  );
}

function Badge({ text, type }) {
  let cls = "bg-gray-100 text-gray-700";

  if (type === "priority") {
    if (text === "Super Urgent") cls = "bg-red-100 text-red-700";
    else if (text === "Urgent") cls = "bg-orange-100 text-orange-700";
  }

 if (type === "status") {
  if (text === "New") cls = "bg-yellow-300 text-black";
  else if (text === "Ready") cls = "bg-green-100 text-green-700";
    else if (text === "Delivered") cls = "bg-blue-100 text-blue-700";
    else if (text === "Cancelled") cls = "bg-red-100 text-red-700";
    else if (text === "Hold") cls = "bg-yellow-100 text-yellow-700";
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {text}
    </span>
  );
}