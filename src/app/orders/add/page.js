"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/lib/useRequireAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

const CATEGORIES = [
  "Ladies Ring",
  "Gents Ring",
  "Earrings",
  "Baby Tops",
  "Pendant",
  "Pendant Set",
  "Tanmaniya",
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

function blankItem() {
  return {
    category: "Ladies Ring",
    sample_search: "",
    selected_samples: [],
    quantity: 1,
    gold_kt: "18KT",
    approx_weight: "",
    size: "",
    remarks: "",
  };
}

export default function AddOrderPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [parties, setParties] = useState([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [remarks, setRemarks] = useState("");
  const [images, setImages] = useState([]);
  const [sampleItems, setSampleItems] = useState([]);

  const [items, setItems] = useState([blankItem()]);
  const { user, loading: authLoading } = useRequireAuth();
  const [saving, setSaving] = useState(false);
  


  useEffect(() => {
    fetchParties();
    fetchSampleItems();
  }, []);

  async function fetchParties() {
    const { data, error } = await supabase
      .from("parties")
      .select("*")
      .eq("is_active", true)
      .order("party_name", { ascending: true });

    if (!error) setParties(data || []);
  }

  async function fetchSampleItems() {
    const { data, error } = await supabase
      .from("sample_items")
      .select("*")
      .eq("is_active", true)
      .order("unique_id", { ascending: true });

    if (!error) setSampleItems(data || []);
  }

  const partySuggestions = parties
    .filter((p) =>
      `${p.party_name} ${p.mobile || ""}`
        .toLowerCase()
        .includes(customerName.toLowerCase())
    )
    .slice(0, 8);

  function selectParty(party) {
    setSelectedPartyId(party.id);
    setCustomerName(party.party_name || "");
    setCustomerMobile(party.mobile || "");
    setShowPartySuggestions(false);
  }

  async function savePartyIfNeeded() {
    const name = customerName.trim();
    const mobile = customerMobile.trim();

    if (!name) return null;

    const existing = parties.find(
      (p) =>
        (p.party_name || "").toLowerCase() === name.toLowerCase() &&
        String(p.mobile || "") === mobile
    );

    if (existing) return existing.id;

    if (selectedPartyId) {
      await supabase
        .from("parties")
        .update({
          party_name: name,
          mobile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPartyId);

      return selectedPartyId;
    }

    const { data, error } = await supabase
      .from("parties")
      .insert([
        {
          party_name: name,
          mobile,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Party save error:", error);
      return null;
    }

    return data.id;
  }

  function updateItem(index, field, value) {
    const updated = [...items];

    if (field === "category") {
      updated[index] = {
        ...updated[index],
        category: value,
        sample_search: "",
        selected_samples: [],
        approx_weight: "",
      };
    } else {
      updated[index][field] = value;
    }

    setItems(updated);
  }

  function addItem() {
    setItems([...items, blankItem()]);
  }

  function removeItem(index) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function selectSample(index, sample) {
    const updated = [...items];
    const alreadySelected = updated[index].selected_samples.some(
      (s) => s.unique_id === sample.unique_id
    );

    if (alreadySelected) return;

    const newSelected = [...updated[index].selected_samples, sample];
    const totalWeight = newSelected.reduce(
      (sum, s) => sum + Number(s.weight_18kt || 0),
      0
    );

    updated[index] = {
      ...updated[index],
      sample_search: "",
      selected_samples: newSelected,
      quantity: newSelected.length,
      approx_weight: totalWeight ? totalWeight.toFixed(3) : "",
    };

    setItems(updated);
  }

  function removeSample(index, uniqueId) {
    const updated = [...items];

    const newSelected = updated[index].selected_samples.filter(
      (s) => s.unique_id !== uniqueId
    );

    const totalWeight = newSelected.reduce(
      (sum, s) => sum + Number(s.weight_18kt || 0),
      0
    );

    updated[index] = {
      ...updated[index],
      selected_samples: newSelected,
      quantity: newSelected.length || 1,
      approx_weight: totalWeight ? totalWeight.toFixed(3) : "",
    };

    setItems(updated);
  }

  function getSampleSuggestions(item) {
    const q = (item.sample_search || "").trim().toLowerCase();
    if (!q) return [];

    return sampleItems
      .filter((s) => {
        const sameCategory = s.category === item.category;
        const unique = (s.unique_id || "").toLowerCase();
        const code = (s.search_code || "").toLowerCase();

        return (
          sameCategory &&
          (unique.includes(q) || code.includes(q) || unique.endsWith(q))
        );
      })
      .slice(0, 10);
  }

  function generateOrderNo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const t = String(now.getTime()).slice(-5);
    return `ORD-${y}${m}${d}-${t}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Customer name required");
      return;
    }

    setSaving(true);

    try {
      await savePartyIfNeeded();

      const orderNo = generateOrderNo();

      const { data: orderData, error: orderError } = await supabase
  .from("orders")
  .insert([
    {
      order_no: orderNo,
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      delivery_date: deliveryDate || null,
      priority,
      status: "New",
      remarks: remarks.trim(),

      created_by: user.id,
      created_by_email: user.email,
      created_by_name: user.email?.split("@")[0] || "",
    },
  ])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemRows = [];

      items.forEach((item) => {
        if (item.selected_samples.length > 0) {
          item.selected_samples.forEach((sample) => {
            itemRows.push({
              order_id: orderData.id,
              category: item.category,
              sample_unique_id: sample.unique_id,
              die_no: sample.die_no || null,
              quantity: 1,
              gold_kt: item.gold_kt,
              approx_weight: sample.weight_18kt ? Number(sample.weight_18kt) : null,
              size: item.size || "",
              remarks: item.remarks || "",
            });
          });
        } else {
          itemRows.push({
            order_id: orderData.id,
            category: item.category,
            sample_unique_id: item.sample_search || null,
            die_no: null,
            quantity: Number(item.quantity) || 1,
            gold_kt: item.gold_kt,
            approx_weight: item.approx_weight ? Number(item.approx_weight) : null,
            size: item.size || "",
            remarks: item.remarks || "",
          });
        }
      });

      const { error: itemError } = await supabase
        .from("order_items")
        .insert(itemRows);

      if (itemError) throw itemError;

      if (images.length > 0) {
        const imageRows = [];

        for (const file of images) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${orderData.id}/${Date.now()}-${Math.random()
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
            order_id: orderData.id,
            image_url: publicData.publicUrl,
            image_type: "design",
          });
        }

        const { error: imageError } = await supabase
          .from("order_images")
          .insert(imageRows);

        if (imageError) throw imageError;
      }

      alert(`Order Created: ${orderNo}`);
      router.push(`/orders/success?id=${orderData.id}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "Order save failed");
    } finally {
      setSaving(false);
    }
  }
if (authLoading) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <p className="text-gray-700">Checking login...</p>
      
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-100 p-3 pb-28 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add New Order</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and track customer orders.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Customer Details
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                  placeholder="Customer Name *"
                  value={customerName}
                  onFocus={() => setShowPartySuggestions(true)}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setSelectedPartyId(null);
                    setShowPartySuggestions(true);
                  }}
                />

                {showPartySuggestions &&
                  customerName.trim() &&
                  partySuggestions.length > 0 && (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                      {partySuggestions.map((party) => (
                        <button
                          key={party.id}
                          type="button"
                          onClick={() => selectParty(party)}
                          className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          <span className="font-semibold text-gray-900">
                            {party.party_name}
                          </span>
                          <span className="ml-2 text-gray-500">
                            {party.mobile || "-"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <input
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                placeholder="Mobile Number"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />

              <div className="relative">
                {!deliveryDate && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    Delivery Date
                  </span>
                )}

                <input
                  type="date"
                  className={`w-full rounded-xl border border-gray-300 bg-white p-3 focus:border-black focus:outline-none ${
                    deliveryDate ? "text-gray-900" : "text-transparent"
                  }`}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <select
                className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>Normal</option>
                <option>Urgent</option>
                <option>Super Urgent</option>
              </select>
            </div>

            <textarea
              rows="4"
              className="mt-4 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
              placeholder="Order remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Order Items
              </h2>

              <button
                type="button"
                onClick={addItem}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                + Add Category
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const suggestions = getSampleSuggestions(item);

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200 p-3 md:p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Category Group {index + 1}
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
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
                        value={item.category}
                        onChange={(e) =>
                          updateItem(index, "category", e.target.value)
                        }
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>

                      <div className="relative md:col-span-2">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                          placeholder="Type Sample ID / Last 3 digits and select multiple"
                          value={item.sample_search}
                          onChange={(e) =>
                            updateItem(index, "sample_search", e.target.value)
                          }
                        />

                        {suggestions.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                            {suggestions.map((sample) => (
                              <button
                                key={sample.id}
                                type="button"
                                onClick={() => selectSample(index, sample)}
                                className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-100"
                              >
                                <span className="font-semibold text-gray-900">
                                  {sample.unique_id}
                                </span>
                                <span className="ml-2 text-gray-500">
                                  18KT: {sample.weight_18kt ?? "-"} | Die:{" "}
                                  {sample.die_no || "-"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                        disabled={item.selected_samples.length > 0}
                      />

                      <select
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 focus:border-black focus:outline-none"
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
                        type="number"
                        step="0.001"
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                        placeholder="Approx Weight"
                        value={item.approx_weight}
                        onChange={(e) =>
                          updateItem(index, "approx_weight", e.target.value)
                        }
                      />

                      <input
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
                        placeholder="Size"
                        value={item.size}
                        onChange={(e) =>
                          updateItem(index, "size", e.target.value)
                        }
                      />

                      <input
                        className="rounded-xl border border-gray-300 bg-white p-3 text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none md:col-span-2"
                        placeholder="Item Remarks"
                        value={item.remarks}
                        onChange={(e) =>
                          updateItem(index, "remarks", e.target.value)
                        }
                      />
                    </div>

                    {item.selected_samples.length > 0 && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-sm font-semibold text-gray-700">
                          Selected Samples
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {item.selected_samples.map((sample) => (
                            <div
                              key={sample.unique_id}
                              className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm"
                            >
                              <span className="font-semibold text-gray-900">
                                {sample.unique_id}
                              </span>
                              <span className="text-gray-500">
                                Die: {sample.die_no || "-"} | Wt:{" "}
                                {sample.weight_18kt ?? "-"}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  removeSample(index, sample.unique_id)
                                }
                                className="font-bold text-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Design Images
            </h2>

            <input
              type="file"
              accept="image/*"
              multiple
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
              onChange={(e) => setImages(Array.from(e.target.files || []))}
            />

            {images.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {images.length} image selected
              </p>
            )}
          </section>

          <button
  disabled={saving}
  className="fixed bottom-20 left-3 right-3 z-40 rounded-2xl bg-black p-4 text-lg font-semibold text-white shadow-xl disabled:bg-gray-400 md:static md:w-full"
>
            {saving ? "Saving Order..." : "Save Order"}
          </button>
        </form>
      </div>
      <MobileBottomNav />
    </main>
  );
}