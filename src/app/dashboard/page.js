"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useRequireAuth } from "../../lib/useRequireAuth";
import MobileBottomNav from "../../components/MobileBottomNav";
import { enablePushNotifications } from "../../lib/pushNotifications";
import { useLanguage } from "../../context/LanguageContext";

export default function DashboardPage() {
  const router = useRouter();

  const { t } = useLanguage();
  const { user, loading: authLoading } = useRequireAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const firstLoadDone = useRef(false);

  const [hardwareStatus, setHardwareStatus] = useState({
  print: false,
  scale: false,
});

async function fetchHardwareStatus() {
  try {
    const res = await fetch("http://localhost:5058/status");
    const data = await res.json();

    setHardwareStatus({
      print: !!data.print,
      scale: !!data.scale,
    });
  } catch {
    setHardwareStatus({
      print: false,
      scale: false,
    });
  }
}

async function startBridge(type) {
  try {
    await fetch(`http://localhost:5058/start/${type}`, {
      method: "POST",
    });

    fetchHardwareStatus();
  } catch {
    alert(t("hardware_not_running"));
  }
}

async function stopBridge(type) {
  try {
    await fetch(`http://localhost:5058/stop/${type}`, {
      method: "POST",
    });

    fetchHardwareStatus();
  } catch {
    alert(t("hardware_not_running"));
  }
}

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(id, quantity, approx_weight)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
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
    } catch {
      console.log("Sound blocked");
    }
  }

  useEffect(() => {
    fetchOrders().then(() => {
      firstLoadDone.current = true;
    });

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

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
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
  fetchHardwareStatus();

  const timer = setInterval(fetchHardwareStatus, 3000);
  return () => clearInterval(timer);
}, []);

  function getOrderTotals(order) {
    const pieces =
      order.order_items?.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ) || 0;

    const weight =
      order.order_items?.reduce(
        (sum, item) => sum + Number(item.approx_weight || 0),
        0
      ) || 0;

    return {
      pieces,
      weight: weight.toFixed(3),
    };
  }

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

  const isFactoryAdmin =
  user?.email === "pulkit.vijay19@gmail.com" ||
  user?.email?.includes("pulkit");

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-gray-700">{t("checking_login")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overscroll-y-contain bg-slate-100 p-3 pb-24 md:p-6">
      {newOrderAlert && (
        <div className="fixed right-4 top-4 z-50 rounded-2xl bg-green-600 p-4 text-white shadow-lg">
          <p className="font-bold">{t("new_order_received")}</p>
          <p className="text-sm">{newOrderAlert.order_no}</p>
          <p className="text-sm">{newOrderAlert.customer_name}</p>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("dashboard")}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t("dashboard_subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
                          <button
  onClick={() => enablePushNotifications(user)}
  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white"
>
  {t("enable_notifications")}
</button>


            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              {t("logout")}
            </button>

            <Link
              href="/orders"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm"
            >
              {t("view_orders")}
            </Link>

            <Link
              href="/orders/add"
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              {t("add_order")}
            </Link>

            <Link
              href="/catalog/upload"
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white"
            >
              {t("sample_catalog")}


            </Link>

            <Link
  href="/tag-print"
  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
>
  🏷️ {t("direct_tag_print")}
</Link>
  
{isFactoryAdmin && (
  <Link
    href="/factory"
    className="rounded-xl bg-yellow-600 px-5 py-3 text-sm font-semibold text-white"
  >
    🏭 {t("manufacturing")}
  </Link>
)}

<Link
  href="/factory/inventory"
  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
>
  📦 {t("inventory")}
</Link>

<Link
  href="/factory/manufacturing-dashboard"
  className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
>
  ✨ {t("manufacturing_dashboard")}
</Link>

          </div>
        </div>

        {loading ? (
          <p className="text-gray-700">Loading dashboard...</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard title={t("total_orders")}value={stats.total} href="/orders" />
              <StatCard title={t("pending")} value={stats.pending} href="/orders" />
              <StatCard
                title={t("today_delivery")}
                value={stats.todayDelivery}
                href="/orders?date=Today"
              />
              <StatCard
                title={t("delayed")}
                value={stats.delayed}
                href="/orders?date=Delayed"
                danger
              />
              <StatCard
                title={t("ready")}
                value={stats.ready}
                href="/orders?status=Ready"
                success
              />
              <StatCard
                title={t("urgent")}
                value={stats.urgent}
                href="/orders?priority=Urgent"
                warning
              />
            </section>

            <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold text-gray-900">{t("hardware_manager")}</h2>
      <p className="text-sm text-gray-500">{t("hardware_status")}</p>
    </div>

    <button
      onClick={fetchHardwareStatus}
      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
    >
      {t("refresh")}
    </button>
  </div>

  <div className="grid gap-4 md:grid-cols-2">
    <HardwareBox
      title="Print Bridge"
      icon="🖨️"
      connected={hardwareStatus.print}
      onStart={() => startBridge("print")}
      onStop={() => stopBridge("print")}
    />

    <HardwareBox
      title="Scale Bridge"
      icon="⚖️"
      connected={hardwareStatus.scale}
      onStart={() => startBridge("scale")}
      onStop={() => stopBridge("scale")}
    />
  </div>
</section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("recent_orders")}
                </h2>

                <Link
                  href="/orders"
                  className="text-sm font-semibold text-gray-700 hover:text-black"
                >
                  {t("view_all")} →
                </Link>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="p-3">{t("order_no")}</th>
                      <th className="p-3">{t("customer")}</th>
                      <th className="p-3">{t("delivery")}</th>
                      <th className="p-3">{t("pieces")}</th>
                      <th className="p-3">{t("weight")}</th>
                      <th className="p-3">{t("priority")}</th>
                      <th className="p-3">{t("status")}</th>
                      <th className="p-3">{t("action")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => {
                      const totals = getOrderTotals(order);

                      return (
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
                            {totals.pieces}
                          </td>

                          <td className="p-3 text-gray-700">
                            {totals.weight} g
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {recentOrders.map((order) => {
                  const totals = getOrderTotals(order);

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">
                            {order.order_no}
                          </p>
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
                        <InfoBox label="Delivery" value={order.delivery_date || "-"} />
                        <InfoBox label="Pieces" value={totals.pieces} />
                        <InfoBox label="Weight" value={`${totals.weight} g`} />

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-gray-500">
                            Priority
                          </p>
                          <div className="mt-1">
                            <Badge text={order.priority} type="priority" />
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-gray-500">
                            Status
                          </p>
                          <div className="mt-1">
                            <Badge text={order.status} type="status" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>

      <MobileBottomNav />
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
      <p className={`mt-2 text-2xl font-bold md:text-3xl ${text}`}>
        {value}
      </p>
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
      {text || "-"}
    </span>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function HardwareBox({ title, icon, connected, onStart, onStop }) {

  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">{title}</p>
          <p className={`text-sm font-semibold ${connected ? "text-green-600" : "text-red-600"}`}>
            {connected ? t("connected") : t("disconnected")}
          </p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onStart} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white">
          {t("start")}
        </button>
        <button onClick={onStop} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          {t("stop")}
        </button>
      </div>
    </div>
  );
}