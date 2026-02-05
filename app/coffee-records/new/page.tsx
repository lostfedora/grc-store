"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Coffee, Save, Loader2, Users } from "lucide-react";
import Link from "next/link";

type SupplierOption = {
  id: string; // uuid, FK -> suppliers.id
  name: string;
  code: string;
  origin: string;
};

type AlertMsg = { text: string; type: "success" | "error" } | null;

/**
 * Batch format (NO dashes): YYYYMMDD + 3-digit seq
 * Example: 20251024003
 *
 * NOTE: Because this is generated client-side, two users saving at the same time
 * can generate the same batch number unless you ALSO enforce uniqueness in DB:
 *   ALTER TABLE public.coffee_records ADD CONSTRAINT coffee_records_batch_number_unique UNIQUE (batch_number);
 */
export default function NewCoffeeRecordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [coffeeType, setCoffeeType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [kilograms, setKilograms] = useState("");
  const [bags, setBags] = useState("");

  // Supplier autocomplete state
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierQuery, setSupplierQuery] = useState<string>("");
  const [showSupplierList, setShowSupplierList] = useState(false);

  // Batch preview state
  const [batchPreview, setBatchPreview] = useState<string>("");
  const batchLoadingRef = useRef(false);

  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [batchLoading, setBatchLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<AlertMsg>(null);

  /* ------------------------------------------------------------------ */
  /* Auth check + Load suppliers + Compute batch preview                 */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/auth");
        return;
      }
      setUser(data.user);
      await loadSuppliers();
    };

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    // compute batch whenever date changes
    generateBatchPreview(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, code, origin")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
    } else {
      setSuppliers((data || []) as SupplierOption[]);
    }

    setLoadingSuppliers(false);
  };

  /* ------------------------------------------------------------------ */
  /* Supplier autocomplete                                               */
  /* ------------------------------------------------------------------ */

  const filteredSuppliers = useMemo(() => {
    if (!supplierQuery.trim()) return suppliers.slice(0, 10);
    const term = supplierQuery.toLowerCase();
    return suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          s.origin.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [supplierQuery, suppliers]);

  const handleSupplierSelect = (supplier: SupplierOption) => {
    setSelectedSupplierId(supplier.id);
    setSupplierName(`${supplier.name} (${supplier.code})`);
    setSupplierQuery(`${supplier.name} (${supplier.code}) – ${supplier.origin}`);
    setShowSupplierList(false);
  };

  /* ------------------------------------------------------------------ */
  /* Batch generation (client-side)                                      */
  /* ------------------------------------------------------------------ */

  const ymdFromDateInput = (yyyy_mm_dd: string) => yyyy_mm_dd.replaceAll("-", "");

  const pad3 = (n: number) => String(n).padStart(3, "0");

  const generateBatchPreview = async (dateValue: string) => {
    if (!dateValue) return;
    if (batchLoadingRef.current) return;

    batchLoadingRef.current = true;
    setBatchLoading(true);

    try {
      // Find the latest batch_number for that date, then increment
      // We rely on lexicographic ordering because format is YYYYMMDD###
      const ymd = ymdFromDateInput(dateValue);

      const { data, error } = await supabase
        .from("coffee_records")
        .select("batch_number")
        .gte("batch_number", `${ymd}000`)
        .lte("batch_number", `${ymd}999`)
        .order("batch_number", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Batch preview query error:", error);
        // fallback: start at 001
        setBatchPreview(`${ymd}001`);
        return;
      }

      const last = data?.[0]?.batch_number as string | undefined;
      if (!last || last.length < 11) {
        setBatchPreview(`${ymd}001`);
        return;
      }

      const lastSeq = Number(last.slice(8)) || 0; // last 3 digits
      const nextSeq = lastSeq + 1;
      setBatchPreview(`${ymd}${pad3(nextSeq)}`);
    } finally {
      setBatchLoading(false);
      batchLoadingRef.current = false;
    }
  };

  const generateFinalBatchNumber = async (dateValue: string) => {
    // Recompute right before save to reduce collisions
    const ymd = ymdFromDateInput(dateValue);

    const { data, error } = await supabase
      .from("coffee_records")
      .select("batch_number")
      .gte("batch_number", `${ymd}000`)
      .lte("batch_number", `${ymd}999`)
      .order("batch_number", { ascending: false })
      .limit(1);

    if (error) throw error;

    const last = (data?.[0]?.batch_number as string | undefined) ?? "";
    if (!last || last.length < 11) return `${ymd}001`;

    const lastSeq = Number(last.slice(8)) || 0;
    return `${ymd}${pad3(lastSeq + 1)}`;
  };

  /* ------------------------------------------------------------------ */
  /* Submit                                                              */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    // Ensure the supplier is actually selected from list (FK safety)
    if (!selectedSupplierId) {
      setMessage({ text: "Please select a supplier from the list.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (!coffeeType.trim()) {
      setMessage({ text: "Coffee type is required.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (!date) {
      setMessage({ text: "Date is required.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (!kilograms || Number(kilograms) <= 0) {
      setMessage({ text: "Kilograms must be greater than 0.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (!bags || Number(bags) <= 0) {
      setMessage({ text: "Bags must be greater than 0.", type: "error" });
      setSubmitting(false);
      return;
    }

    const kgNumber = Number(kilograms);
    const bagsNumber = Number(bags);

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const supplierNameValue =
      supplierName || (supplier ? `${supplier.name} (${supplier.code})` : "Unknown Supplier");

    // ID (keep your logic)
    const timestamp = Date.now();
    const id = `CR-${timestamp}`;

    try {
      // Generate batch_number in UI (final recompute)
      const batch_number = await generateFinalBatchNumber(date);

      const { data, error } = await supabase
        .from("coffee_records")
        .insert([
          {
            id,
            coffee_type: coffeeType.trim(),
            date,
            kilograms: kgNumber,
            bags: bagsNumber,
            supplier_id: selectedSupplierId,
            supplier_name: supplierNameValue,
            status: "pending",
            created_by: user?.email ?? null,
            batch_number, // ✅ UI generated (YYYYMMDD###)
          },
        ])
        .select("id, batch_number")
        .single();

      if (error) {
        // If you added UNIQUE(batch_number), this can happen during collisions
        const maybeDup =
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique") ||
          error.code === "23505";

        if (maybeDup) {
          setMessage({
            text:
              "Batch number collision detected. Please click Save again (or reload) to generate the next batch number.",
            type: "error",
          });
        } else {
          setMessage({ text: `Failed to save coffee record: ${error.message}`, type: "error" });
        }
        setSubmitting(false);
        return;
      }

      setMessage({
        text: `Coffee record saved. Batch: ${data?.batch_number}. Redirecting...`,
        type: "success",
      });

      setTimeout(() => {
        router.push("/coffee-records");
      }, 900);
    } catch (err: any) {
      setMessage({ text: `Unexpected error: ${err?.message ?? "Unknown error"}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading state while checking auth                                   */
  /* ------------------------------------------------------------------ */

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Checking session...</p>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 border border-green-200 dark:border-green-800 transition-colors">
                <Coffee className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Coffee Record</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Capture a new coffee delivery to the store
                </p>
              </div>
            </div>

            <Link
              href="/coffee-records"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Coffee Records</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Supplier (autocomplete) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="supplier">
                  Supplier *
                </label>

                {loadingSuppliers ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading suppliers...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">No suppliers found</p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Please create a supplier first before adding coffee records.
                        </p>
                        <Link
                          href="/suppliers/new"
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors mt-3 text-xs"
                        >
                          <Users className="w-4 h-4" />
                          Create Supplier
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      id="supplier"
                      type="text"
                      value={supplierQuery}
                      onChange={(e) => {
                        setSupplierQuery(e.target.value);
                        setSelectedSupplierId("");
                        setSupplierName("");
                        setShowSupplierList(true);
                      }}
                      onFocus={() => setShowSupplierList(true)}
                      placeholder="Start typing supplier name, code, or origin..."
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 transition-colors"
                    />

                    {showSupplierList && filteredSuppliers.length > 0 && (
                      <div className="absolute mt-1 w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto transition-colors">
                        {filteredSuppliers.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSupplierSelect(s)}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {s.name} ({s.code})
                              </span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">{s.origin}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!loadingSuppliers && suppliers.length > 0 && supplierQuery && filteredSuppliers.length === 0 && (
                      <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                        No matching supplier. Check spelling or select from the list.
                      </p>
                    )}

                    {selectedSupplierId && (
                      <p className="mt-1 text-[11px] text-green-600 dark:text-green-400">
                        Selected: <span className="font-semibold">{supplierName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date + Coffee Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="date">
                    Date *
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 transition-colors"
                    required
                  />

                  {/* Batch preview */}
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 px-3 py-2">
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      Batch (preview):{" "}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {batchLoading ? "..." : batchPreview || "—"}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => generateBatchPreview(date)}
                      className="text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60"
                      disabled={batchLoading}
                    >
                      Refresh
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Batch format: <span className="font-semibold">YYYYMMDD001</span> (no dashes).
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="coffeeType"
                  >
                    Coffee Type *
                  </label>
                  <select
                    id="coffeeType"
                    value={coffeeType}
                    onChange={(e) => setCoffeeType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 transition-colors"
                    required
                  >
                    <option value="">Select coffee type</option>
                    <option value="Arabica">Arabica</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Choose Arabica, Robusta, or Mixed.</p>
                </div>
              </div>

              {/* Kg + Bags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="kilograms"
                  >
                    Kilograms *
                  </label>
                  <input
                    id="kilograms"
                    type="number"
                    min={0}
                    step="0.01"
                    value={kilograms}
                    onChange={(e) => setKilograms(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 transition-colors"
                    placeholder="e.g. 1200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="bags">
                    Bags *
                  </label>
                  <input
                    id="bags"
                    type="number"
                    min={0}
                    step="1"
                    value={bags}
                    onChange={(e) => setBags(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 transition-colors"
                    placeholder="e.g. 20"
                    required
                  />
                </div>
              </div>

              {/* Message Alert */}
              {message && (
                <div
                  className={`p-4 rounded-lg border transition-colors ${
                    message.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                  }`}
                >
                  <p className="text-sm font-medium">{message.text}</p>
                  {message.type === "error" && (
                    <p className="mt-1 text-xs opacity-90">
                      Tip: if two users save at the same time, batch numbers can collide. Add a UNIQUE constraint on
                      <span className="font-semibold"> batch_number </span>
                      and retry.
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
                <button
                  type="submit"
                  disabled={submitting || loadingSuppliers || suppliers.length === 0 || batchLoading}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Coffee Record
                    </>
                  )}
                </button>
              </div>

              {/* Footer note */}
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Batch numbers are generated from existing records on the selected date:{" "}
                <span className="font-semibold">YYYYMMDD001</span>, <span className="font-semibold">002</span>,{" "}
                <span className="font-semibold">003</span>...
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
