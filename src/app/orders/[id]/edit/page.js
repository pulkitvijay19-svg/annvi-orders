"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";

const CATEGORIES = [
  "Ladies Ring",
  "Gents Ring",
  "Earrings",
  "Baby Tops",
  "Pendant",
  "Pendant Set",
  "Har Set",
  "Bali",
  "Bangles",
  "Bracelet",
  "Kada",
  "Mangalsutra",
  "Nosepin",
  "Others",
];

const KT_OPTIONS = ["9KT", "14KT", "18KT", "20KT", "22KT", "24KT"];
const PRIORITY_OPTIONS = ["Normal", "Urgent", "Super Urgent"];

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [remarks, setRemarks] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  const [items, setItems] = useState([]);
  const { loading: authLoading } = useRequireAuth();


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
      alert(error.message || "Order fetch failed");
    } else {
      setCustomerName(data.customer_name || "");
      setCustomerMobile(data.customer_mobile || "");
      setDeliveryDate(data.delivery_date || "");
      setPriority(data.priority || "Normal");
      setRemarks(data.remarks || "");
      setItems(data.order_items || []);
      setExistingImages(data.order_images || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  }

  function addItem() {
    setItems([
      ...items,
      {
        category: "Ladies Ring",
        quantity: 1,
        gold_kt: "18KT",
        approx_weight: "",
        size: "",
        remarks: "",
      },
    ]);
    alert("New item row added at bottom");
  }

  function removeItem(index) {
  if (items.length === 1) {
    alert("At least one item is required");
    return;
  }

  const ok = confirm("Are you sure you want to delete this item row?");
  if (!ok) return;

  setItems(items.filter((_, i) => i !== index));
}

  async function handleUpdate(e) {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Customer name required");
      return;
    }

    setSaving(true);

    try {
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          customer_name: customerName.trim(),
          customer_mobile: customerMobile.trim(),
          delivery_date: deliveryDate || null,
          priority,
          remarks: remarks.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      const { error: deleteItemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (deleteItemsError) throw deleteItemsError;

     const itemRows = items.map((item) => ({
  order_id: orderId,
  category: item.category,

  sample_unique_id: item.sample_unique_id || "",
  die_no: item.die_no || "",

  quantity: Number(item.quantity) || 1,
  gold_kt: item.gold_kt,
  approx_weight: item.approx_weight ? Number(item.approx_weight) : null,
  size: item.size || "",
  remarks: item.remarks || "",
}));

      const { error: itemError } = await supabase
        .from("order_items")
        .insert(itemRows);

      if (itemError) throw itemError;

      if (newImages.length > 0) {
        const imageRows = [];

        for (const file of newImages) {
          const fileExt = file.name.split(".").pop();

          const fileName = `${orderId}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("order-images")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("order-images")
            .getPublicUrl(fileName);

          imageRows.push({
            order_id: orderId,
            image_url: publicData.publicUrl,
            image_type: "design",
          });
        }

        const { error: imageError } = await supabase
          .from("order_images")
          .insert(imageRows);

        if (imageError) throw imageError;
      }

      alert("Order updated successfully");
      router.push(`/orders/${orderId}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Order update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <p className="text-gray-700">Loading order...</p>
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-900">Edit Order</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update customer, items and design images.
        </p>

        <form onSubmit={handleUpdate} className="mt-6 space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Customer Details
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                placeholder="Customer Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <input
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                placeholder="Mobile Number"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />

              <input
                type="date"
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />

              <select
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <textarea
              rows="4"
              className="mt-4 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              placeholder="Order remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Order Items
              </h2>

              <button
                type="button"
                onClick={addItem}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="rounded-2xl border p-4">
                  <div className="mb-4 flex justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Item {index + 1}
                    </h3>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-sm font-medium text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      value={item.category}
                      onChange={(e) =>
                        updateItem(index, "category", e.target.value)
                      }
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                    />

                    <select
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      value={item.gold_kt}
                      onChange={(e) =>
                        updateItem(index, "gold_kt", e.target.value)
                      }
                    >
                      {KT_OPTIONS.map((kt) => (
                        <option key={kt}>{kt}</option>
                      ))}
                    </select>

<input
  className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
  placeholder="Sample ID"
  value={item.sample_unique_id || ""}
  onChange={(e) =>
    updateItem(index, "sample_unique_id", e.target.value)
  }
/>

<input
  className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
  placeholder="Die No"
  value={item.die_no || ""}
  onChange={(e) =>
    updateItem(index, "die_no", e.target.value)
  }
/>
                    <input
                      type="number"
                      step="0.001"
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      placeholder="Approx Weight"
                      value={item.approx_weight || ""}
                      onChange={(e) =>
                        updateItem(index, "approx_weight", e.target.value)
                      }
                    />

                    <input
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      placeholder="Size"
                      value={item.size || ""}
                      onChange={(e) =>
                        updateItem(index, "size", e.target.value)
                      }
                    />

                    <input
                      className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                      placeholder="Item Remarks"
                      value={item.remarks || ""}
                      onChange={(e) =>
                        updateItem(index, "remarks", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Existing Images
            </h2>

            {existingImages.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {existingImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="Design"
                    className="h-52 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No images uploaded.</p>
            )}

            <h2 className="mt-6 mb-4 text-lg font-semibold text-gray-900">
              Add More Images
            </h2>

            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              onChange={(e) => setNewImages(Array.from(e.target.files || []))}
            />
          </section>

          <button
            disabled={saving}
            className="w-full rounded-2xl bg-black p-4 text-lg font-semibold text-white disabled:bg-gray-400"
          >
            {saving ? "Saving Changes..." : "Update Order"}
          </button>
        </form>
      </div>
    </main>
  );
}