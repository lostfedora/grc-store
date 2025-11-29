"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Save,
  Loader2,
  Users,
  Calculator,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

type MillingCustomer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
};

const RATE_PER_KG = 150; // fixed in background

export default function NewMillingTransactionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const [kgsHulled, setKgsHulled] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("0");
  const [balance, setBalance] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // Customer autocomplete
  const [customers, setCustomers] = useState<MillingCustomer[]>([]);
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string>("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  /* ------------------------------------------------------------------ */
  /* Auth + Load customers                                              */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      await loadCustomers();
    };

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);

    const { data, error } = await supabase
      .from("milling_customers")
      .select("id, full_name, phone, address, current_balance")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error loading milling customers:", error);
      setCustomers([]);
    } else {
      setCustomers((data || []) as MillingCustomer[]);
    }

    setLoadingCustomers(false);
  };

  /* ------------------------------------------------------------------ */
  /* Derived amounts (total & balance)                                  */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const kgs = Number(kgsHulled) || 0;
    const total = kgs * RATE_PER_KG;
    setTotalAmount(total);

    const paid = Number(amountPaid) || 0;
    const bal = total - paid;
    setBalance(bal);
  }, [kgsHulled, amountPaid]);

  /* ------------------------------------------------------------------ */
  /* Customer autocomplete                                              */
  /* ------------------------------------------------------------------ */

  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return customers.slice(0, 10);

    const term = customerQuery.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(term) ||
          (c.phone ?? "").toLowerCase().includes(term) ||
          (c.address ?? "").toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [customerQuery, customers]);

  const handleCustomerSelect = (customer: MillingCustomer) => {
    setSelectedCustomerId(customer.id);
    const label = `${customer.full_name}${
      customer.phone ? ` (${customer.phone})` : ""
    }`;
    setSelectedCustomerLabel(label);
    setCustomerQuery(label);
    setShowCustomerList(false);
  };

  /* ------------------------------------------------------------------ */
  /* Submit                                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!selectedCustomerId) {
      setMessage({
        text: "Please select a customer from the list.",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    if (!date) {
      setMessage({ text: "Date is required.", type: "error" });
      setSubmitting(false);
      return;
    }

    const kgs = Number(kgsHulled);
    if (!kgs || kgs <= 0) {
      setMessage({ text: "Kgs hulled must be greater than 0.", type: "error" });
      setSubmitting(false);
      return;
    }

    const paid = Number(amountPaid || "0");
    if (paid < 0) {
      setMessage({ text: "Amount paid cannot be negative.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (paid > totalAmount) {
      setMessage({
        text: "Amount paid cannot be greater than total amount.",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const customerName =
      customer?.full_name || selectedCustomerLabel || "Unknown Customer";

    try {
      const { error } = await supabase.from("milling_transactions").insert([
        {
          customer_id: selectedCustomerId,
          customer_name: customerName,
          date,
          kgs_hulled: kgs,
          rate_per_kg: RATE_PER_KG, // set fixed rate explicitly
          total_amount: totalAmount,
          amount_paid: paid,
          balance,
          transaction_type: "hulling", // default
          notes: notes.trim() || null,
          created_by: user?.email ?? "system",
        },
      ]);

      if (error) {
        setMessage({
          text: `Failed to save milling transaction: ${error.message}`,
          type: "error",
        });
      } else {
        setMessage({
          text: "Milling transaction saved successfully. Redirecting...",
          type: "success",
        });
        setTimeout(() => {
          router.push("/milling-transactions");
        }, 1000);
      }
    } catch (err: any) {
      setMessage({
        text: `Unexpected error: ${err.message}`,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading while checking auth                                        */
  /* ------------------------------------------------------------------ */

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
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
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800 transition-colors">
                <ClipboardList className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  New Milling Transaction
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Record a new hulling transaction for a milling customer
                </p>
              </div>
            </div>

            <Link
              href="/milling-transactions"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Milling Transactions</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Customer (autocomplete) */}
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                  htmlFor="customer"
                >
                  Customer *
                </label>
                {loadingCustomers ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading milling customers...
                  </div>
                ) : customers.length === 0 ? (
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
                          No milling customers found
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Please create a milling customer first before adding
                          transactions.
                        </p>
                        <Link
                          href="/milling-customers/new"
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium transition-colors mt-3 text-xs"
                        >
                          <Users className="w-4 h-4" />
                          Create Milling Customer
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      id="customer"
                      type="text"
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value);
                        setSelectedCustomerId("");
                        setSelectedCustomerLabel("");
                        setShowCustomerList(true);
                      }}
                      onFocus={() => setShowCustomerList(true)}
                      placeholder="Start typing customer name, phone, or address..."
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-colors"
                    />

                    {showCustomerList && filteredCustomers.length > 0 && (
                      <div className="absolute mt-1 w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto transition-colors">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {c.full_name}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {c.phone || "No phone"} •{" "}
                                  {c.address || "No address"}
                                </p>
                              </div>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-300 whitespace-nowrap">
                                Bal: {c.current_balance.toLocaleString()} UGX
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!loadingCustomers &&
                      customers.length > 0 &&
                      customerQuery &&
                      filteredCustomers.length === 0 && (
                        <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
                          No matching customer. Check spelling or select from
                          the list.
                        </p>
                      )}

                    {selectedCustomerId && (
                      <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Selected:{" "}
                        <span className="font-semibold">
                          {selectedCustomerLabel}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date + Kgs (2 columns now) */}
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="kgsHulled"
                  >
                    Kgs Hulled *
                  </label>
                  <input
                    id="kgsHulled"
                    type="number"
                    min={0}
                    step="0.01"
                    value={kgsHulled}
                    onChange={(e) => setKgsHulled(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-colors"
                    placeholder="e.g. 350"
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Rate per kg is fixed at {RATE_PER_KG.toLocaleString()} UGX
                    in the background.
                  </p>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Total Amount (UGX)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/60 text-sm text-gray-900 dark:text-white">
                    <Calculator className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                    <span className="font-semibold">
                      {totalAmount.toLocaleString()} UGX
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Auto: kgs × {RATE_PER_KG.toLocaleString()} UGX.
                  </p>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    htmlFor="amountPaid"
                  >
                    Amount Paid (UGX)
                  </label>
                  <input
                    id="amountPaid"
                    type="number"
                    min={0}
                    step="1"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-colors"
                    placeholder="e.g. 20000"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Amount paid now (optional).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Balance (UGX)
                  </label>
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg bg-gray-50 dark:bg-slate-700/60 text-sm ${
                      balance > 0
                        ? "border-amber-300 text-amber-800 dark:border-amber-500 dark:text-amber-200"
                        : "border-emerald-300 text-emerald-800 dark:border-emerald-500 dark:text-emerald-200"
                    }`}
                  >
                    <Calculator className="w-4 h-4" />
                    <span className="font-semibold">
                      {balance.toLocaleString()} UGX
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Auto: total − paid. Positive = customer still owes.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                  htmlFor="notes"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-colors"
                  placeholder="e.g. Milling for Bugoye farmers group, paid partially in cash."
                />
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-4 rounded-lg border transition-colors ${
                    message.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center">
                    {message.type === "success" ? (
                      <svg
                        className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
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

              {/* Submit */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
                <button
                  type="submit"
                  disabled={
                    submitting || loadingCustomers || customers.length === 0
                  }
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Milling Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Helper card */}
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
                  <span className="font-medium">Note:</span> Rate per kg is
                  fixed at {RATE_PER_KG.toLocaleString()} UGX in the system.
                  Total amount and balance are calculated automatically based on
                  kgs hulled and amount paid.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
