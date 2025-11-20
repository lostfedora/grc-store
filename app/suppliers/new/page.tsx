"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Save, Users, Loader2, Phone, MapPin, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

type ExistingSupplier = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  origin: string | null;
};

export default function NewSupplierPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");

  // still used internally, but no UI
  const [openingBalance] = useState("0");
  const [dateRegistered] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

  const [existingSuppliers, setExistingSuppliers] = useState<ExistingSupplier[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // duplicate confirmation modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<ExistingSupplier[]>([]);
  const [savingAfterConfirm, setSavingAfterConfirm] = useState(false);

  // Theme init (no toggle)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : prefersDark
        ? "dark"
        : "light";

    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const fetchExistingSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, code, phone, origin");

    if (!error && data) {
      setExistingSuppliers(data as ExistingSupplier[]);
    }
  };

  // Auth check + load existing suppliers for autocomplete
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      await fetchExistingSuppliers();
    };

    checkAuth();
  }, [router]);

  const nameTrimmed = name.trim().toLowerCase();

  const exactNameMatches = useMemo(
    () =>
      nameTrimmed
        ? existingSuppliers.filter(
            (s) => s.name.trim().toLowerCase() === nameTrimmed
          )
        : [],
    [nameTrimmed, existingSuppliers]
  );

  const nameSuggestions = useMemo(
    () =>
      nameTrimmed
        ? existingSuppliers
            .filter((s) =>
              s.name.trim().toLowerCase().includes(nameTrimmed)
            )
            .slice(0, 5)
        : [],
    [nameTrimmed, existingSuppliers]
  );

  const generateSupplierCode = (suppliers: ExistingSupplier[]): string => {
    const prefix = "SUP-";
    const numbers = suppliers
      .map((s) => {
        const match = s.code?.match(/^SUP-(\d+)$/i);
        if (!match) return null;
        const num = parseInt(match[1], 10);
        return Number.isNaN(num) ? null : num;
      })
      .filter((n): n is number => n !== null);

    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  };

  const validateForm = (): string | null => {
    if (!name.trim() || !origin.trim()) {
      return "Supplier name and origin are required.";
    }
    return null;
  };

  const performInsert = async () => {
    const validationError = validateForm();
    if (validationError) {
      setMessage({ text: validationError, type: "error" });
      setSubmitting(false);
      setSavingAfterConfirm(false);
      return;
    }

    const openingBalanceNumber = Number(openingBalance || "0");
    if (Number.isNaN(openingBalanceNumber) || openingBalanceNumber < 0) {
      setMessage({
        text: "Opening balance must be a valid number (0 or more).",
        type: "error",
      });
      setSubmitting(false);
      setSavingAfterConfirm(false);
      return;
    }

    const autoCode = generateSupplierCode(existingSuppliers);

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([
          {
            name: name.trim(),
            code: autoCode, // auto-generated in background
            phone: phone.trim() || null,
            origin: origin.trim(),
            opening_balance: openingBalanceNumber, // 0 for new
            date_registered: dateRegistered || null,
          },
        ])
        .select("*")
        .single();

      if (error) {
        setMessage({
          text: `Failed to save supplier: ${error.message}`,
          type: "error",
        });
      } else {
        setMessage({
          text: `Supplier created successfully with code ${autoCode}. Redirecting...`,
          type: "success",
        });
        setTimeout(() => {
          router.push("/suppliers");
        }, 1000);
      }
    } catch (err: any) {
      setMessage({ text: `Unexpected error: ${err.message}`, type: "error" });
    } finally {
      setSubmitting(false);
      setSavingAfterConfirm(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const validationError = validateForm();
    if (validationError) {
      setMessage({ text: validationError, type: "error" });
      setSubmitting(false);
      return;
    }

    // If this name already exists, ask user to confirm first
    if (exactNameMatches.length > 0) {
      setDuplicateMatches(exactNameMatches);
      setShowDuplicateModal(true);
      setSubmitting(false);
      return;
    }

    await performInsert();
  };

  const handleConfirmDuplicate = async () => {
    setShowDuplicateModal(false);
    setSavingAfterConfirm(true);
    setSubmitting(true);
    await performInsert();
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false);
    setSavingAfterConfirm(false);
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Checking session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 border border-green-200 dark:border-green-700/70">
                <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Add New Supplier
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Register a new coffee supplier in the system
                </p>
              </div>
            </div>

            <Link
              href="/suppliers"
              className="flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Suppliers
            </Link>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <section className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information Section */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Supplier Name with improved autocomplete */}
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="name"
                        >
                          Supplier Name *
                        </label>
                        <div className="relative">
                          <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. KALIBA FARMERS GROUP"
                            autoComplete="off"
                            required
                          />
                        </div>

                        {nameSuggestions.length > 0 && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            <p className="mb-1">
                              Similar existing suppliers:
                            </p>
                            <ul className="space-y-1">
                              {nameSuggestions.map((s) => (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1"
                                >
                                  <span className="truncate">
                                    {s.name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                                    {s.code}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {exactNameMatches.length > 0 && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            An existing supplier has this exact name. You will be
                            asked to confirm before saving.
                          </p>
                        )}
                      </div>

                      {/* Origin / Location */}
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="origin"
                        >
                          Origin / Location *
                        </label>
                        <div className="relative">
                          <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="origin"
                            type="text"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            list="supplier-origins"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. Bugoye, Rwenzori"
                            required
                          />
                          <datalist id="supplier-origins">
                            {existingSuppliers
                              .filter((s) => s.origin)
                              .map((s) => (
                                <option
                                  key={`${s.id}-${s.origin}`}
                                  value={s.origin!}
                                />
                              ))}
                          </datalist>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Location Section */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
                      Contact Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="phone"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            list="supplier-phones"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. 0781 121 639"
                          />
                          <datalist id="supplier-phones">
                            {existingSuppliers
                              .filter((s) => s.phone)
                              .map((s) => (
                                <option
                                  key={`${s.id}-${s.phone}`}
                                  value={s.phone!}
                                />
                              ))}
                          </datalist>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Alert */}
                  {message && (
                    <div
                      className={`p-4 rounded-xl border ${
                        message.type === "success"
                          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200"
                          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200"
                      }`}
                    >
                      <div className="flex items-center">
                        {message.type === "success" ? (
                          <svg
                            className="w-5 h-5 text-green-500 dark:text-green-300 mr-3"
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
                            className="w-5 h-5 text-red-500 dark:text-red-300 mr-3"
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
                        <p className="font-medium">{message.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-3 bg-green-600 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving Supplier...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Supplier
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar - Help & Information */}
            <div className="space-y-6">
              {/* Help Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Quick Tips
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-1.5 mt-0.5">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Avoid Duplicates
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        As you type the supplier name, you will see similar existing
                        suppliers. If you still save with the same name, the system will
                        ask you to confirm.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-1.5 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Location Details
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Include parish / sub-county / area to easily identify where coffee
                        is coming from.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Fields Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-500 dark:text-blue-300 mt-0.5 flex-shrink-0"
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
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Required Fields
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Fields marked with <span className="font-semibold">*</span> are
                      required. Supplier code is generated automatically in the background.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* End Sidebar */}
          </div>
        </div>
      </section>

      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Possible Duplicate Supplier
                </h3>
              </div>
              <button
                onClick={handleCancelDuplicate}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 text-sm">
              <p className="text-gray-700 dark:text-gray-200">
                A supplier with the same name already exists in the system:
              </p>

              <div className="space-y-2">
                {duplicateMatches.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {s.name}
                    </p>
                    <p className="text-amber-800 dark:text-amber-200">
                      Code: <span className="font-mono">{s.code}</span>
                    </p>
                    {s.origin && (
                      <p className="text-amber-800 dark:text-amber-200">
                        Origin: {s.origin}
                      </p>
                    )}
                    {s.phone && (
                      <p className="text-amber-800 dark:text-amber-200">
                        Phone: {s.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-gray-700 dark:text-gray-200">
                Are you sure you still want to save this new record with the same
                supplier name?
              </p>
            </div>

            <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 rounded-b-2xl">
              <button
                onClick={handleCancelDuplicate}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDuplicate}
                disabled={savingAfterConfirm}
                className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {savingAfterConfirm && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
