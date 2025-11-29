"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

export default function NewCoffeeRecordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [coffeeType, setCoffeeType] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const [kilograms, setKilograms] = useState("");
  const [bags, setBags] = useState("");

  // Supplier autocomplete state
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierQuery, setSupplierQuery] = useState<string>("");
  const [showSupplierList, setShowSupplierList] = useState(false);

  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  /* ------------------------------------------------------------------ */
  /* Auth check + Load suppliers                                        */
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
  /* Supplier autocomplete                                              */
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
  /* Submit                                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    // Ensure the supplier is actually selected from list (FK safety)
    if (!selectedSupplierId) {
      setMessage({
        text: "Please select a supplier from the list.",
        type: "error",
      });
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
      supplierName ||
      (supplier ? `${supplier.name} (${supplier.code})` : "Unknown Supplier");

    // IDs & batch numbers are text, generated in background
    const timestamp = Date.now();
    const id = `CR-${timestamp}`;
    const autoBatchNumber = `BATCH-${date}-${timestamp}`;

    try {
      const { error } = await supabase.from("coffee_records").insert([
        {
          id,
          coffee_type: coffeeType.trim(),
          date,
          kilograms: kgNumber,
          bags: bagsNumber,
          supplier_id: selectedSupplierId, // FK -> suppliers.id (uuid)
          supplier_name: supplierNameValue, // denormalised label
          status: "pending", // always pending by default
          batch_number: autoBatchNumber,
          created_by: user?.email ?? null,
        },
      ]);

      if (error) {
        setMessage({
          text: `Failed to save coffee record: ${error.message}`,
          type: "error",
        });
      } else {
        setMessage({
          text: "Coffee record saved successfully. Redirecting...",
          type: "success",
        });
        setTimeout(() => {
          router.push("/coffee-records");
        }, 1000);
      }
    } catch (err: any) {
      setMessage({ text: `Unexpected error: ${err.message}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading state while checking auth                                  */
  /* ------------------------------------------------------------------ */

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking session...
          </p>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                 */
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  New Coffee Record
                </h1>
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
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                  htmlFor="supplier"
                >
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
                      <svg
                        className="w-5 h-5 text-red-500 dark:text-red-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                          No suppliers found
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Please create a supplier first before adding coffee
                          records.
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
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {s.origin}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!loadingSuppliers &&
                      suppliers.length > 0 &&
                      supplierQuery &&
                      filteredSuppliers.length === 0 && (
                        <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                          No matching supplier. Check spelling or select from
                          the list.
                        </p>
                      )}

                    {selectedSupplierId && (
                      <p className="mt-1 text-[11px] text-green-600 dark:text-green-400">
                        Selected:{" "}
                        <span className="font-semibold">{supplierName}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date + Coffee Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="date"
                  >
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
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Delivery date for this coffee.
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
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Choose Arabica, Robusta, or Mixed.
                  </p>
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
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="bags"
                  >
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

              {/* Info: Batch auto */}
              <div className="rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-dashed border-gray-200 dark:border-slate-600 px-3 py-2 transition-colors">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">Note:</span> Batch number is{" "}
                  <span className="font-semibold">
                    configured automatically in the background
                  </span>{" "}
                  when you save this record. Status starts as{" "}
                  <span className="font-semibold">pending</span>.
                </p>
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
                  <div className="flex items-center">
                    {message.type === "success" ? (
                      <svg
                        className="w-5 h-5 text-green-500 dark:text-green-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-red-500 dark:text-red-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
                <button
                  type="submit"
                  disabled={submitting || loadingSuppliers || suppliers.length === 0}
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
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 transition-colors">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Required fields</span> are
                  marked with an asterisk (*). Coffee type is restricted to{" "}
                  Arabica, Robusta, or Mixed, and new records always start with
                  status <span className="font-semibold">pending</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
