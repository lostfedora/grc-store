"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Coffee, Save, Loader2, Users, Scale, Package, Calendar, Hash, AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import Link from "next/link";

type SupplierOption = {
  id: string;
  name: string;
  code: string;
  origin: string;
};

type AlertMsg = { text: string; type: "success" | "error" } | null;

// Auto-correction function for swapped kgs and bags
// Rule: kgs should be >= bags (except 1:1 ratio)
const fixKgsAndBags = (totalKgs: number, bags: number) => {
  if (!totalKgs || !bags || totalKgs <= 0 || bags <= 0) {
    return {
      totalKgs,
      bags,
      corrected: false,
      message: "",
    };
  }

  // Rule: kgs should be >= bags (except 1:1 ratio)
  const isValidRatio = totalKgs >= bags;
  const isOneToOne = totalKgs === 1 && bags === 1;
  
  if (!isValidRatio && !isOneToOne) {
    // Swap them - user likely entered kgs in bags field and vice versa
    return {
      totalKgs: bags,
      bags: totalKgs,
      corrected: true,
      message: "KGs and bags were automatically corrected because kgs should be greater than or equal to bags.",
    };
  }

  return {
    totalKgs,
    bags,
    corrected: false,
    message: "",
  };
};

export default function NewCoffeeRecordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Form state
  const [coffeeType, setCoffeeType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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

  // Validation warnings
  const [showSwapWarning, setShowSwapWarning] = useState(false);
  const [suggestedKgs, setSuggestedKgs] = useState(0);
  const [suggestedBags, setSuggestedBags] = useState(0);
  const [kgPerBag, setKgPerBag] = useState<number | null>(null);
  const [isValidRatio, setIsValidRatio] = useState(true);

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
    generateBatchPreview(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Real-time validation for swapped values
  useEffect(() => {
    const kgs = Number(kilograms);
    const bagsNum = Number(bags);
    
    if (kgs > 0 && bagsNum > 0) {
      const kgPerBagValue = kgs / bagsNum;
      setKgPerBag(kgPerBagValue);
      
      // Rule: kgs should be >= bags (except when both are 1)
      const validRatio = kgs >= bagsNum;
      const isOneToOne = kgs === 1 && bagsNum === 1;
      const valid = validRatio || isOneToOne;
      
      setIsValidRatio(valid);
      
      if (!valid) {
        // This looks swapped (e.g., 10 kgs for 50 bags)
        const fixed = fixKgsAndBags(kgs, bagsNum);
        if (fixed.corrected) {
          setShowSwapWarning(true);
          setSuggestedKgs(fixed.totalKgs);
          setSuggestedBags(fixed.bags);
          return;
        }
      }
      
      setShowSwapWarning(false);
    } else {
      setShowSwapWarning(false);
      setKgPerBag(null);
      setIsValidRatio(true);
    }
  }, [kilograms, bags]);

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

  const applySwapCorrection = () => {
    setKilograms(String(suggestedKgs));
    setBags(String(suggestedBags));
    setShowSwapWarning(false);
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
        setBatchPreview(`${ymd}001`);
        return;
      }

      const last = data?.[0]?.batch_number as string | undefined;
      if (!last || last.length < 11) {
        setBatchPreview(`${ymd}001`);
        return;
      }

      const lastSeq = Number(last.slice(8)) || 0;
      const nextSeq = lastSeq + 1;
      setBatchPreview(`${ymd}${pad3(nextSeq)}`);
    } finally {
      setBatchLoading(false);
      batchLoadingRef.current = false;
    }
  };

  const generateFinalBatchNumber = async (dateValue: string) => {
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

    // Validate supplier
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

    let kgNumber = Number(kilograms);
    let bagsNumber = Number(bags);

    if (isNaN(kgNumber) || kgNumber <= 0) {
      setMessage({ text: "Kilograms must be a positive number.", type: "error" });
      setSubmitting(false);
      return;
    }

    if (isNaN(bagsNumber) || bagsNumber <= 0) {
      setMessage({ text: "Bags must be a positive number.", type: "error" });
      setSubmitting(false);
      return;
    }

    // Validate: kgs should be >= bags (except 1:1)
    const isValidRatio = kgNumber >= bagsNumber;
    const isOneToOne = kgNumber === 1 && bagsNumber === 1;

    if (!isValidRatio && !isOneToOne) {
      setMessage({ 
        text: `Invalid: ${kgNumber} kgs cannot fit into ${bagsNumber} bags. Each bag would need to hold ${(kgNumber / bagsNumber).toFixed(1)} kg, which is not realistic. Did you swap kgs and bags?`, 
        type: "error" 
      });
      setSubmitting(false);
      return;
    }

    // Apply auto-correction for swapped values
    const fixed = fixKgsAndBags(kgNumber, bagsNumber);
    
    if (fixed.corrected) {
      const confirmSave = confirm(
        `${fixed.message}\n\nOriginal values:\nKGs: ${kgNumber}\nBags: ${bagsNumber}\n\nCorrected values:\nKGs: ${fixed.totalKgs}\nBags: ${fixed.bags}\n\nContinue saving with corrected values?`
      );
      
      if (!confirmSave) {
        setSubmitting(false);
        return;
      }
      
      kgNumber = fixed.totalKgs;
      bagsNumber = fixed.bags;
      
      // Validate again after correction
      const isValidAfterFix = kgNumber >= bagsNumber || (kgNumber === 1 && bagsNumber === 1);
      if (!isValidAfterFix) {
        setMessage({ text: "Even after correction, values are invalid. Please check manually.", type: "error" });
        setSubmitting(false);
        return;
      }
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const supplierNameValue = supplier 
      ? `${supplier.name} (${supplier.code}) - ${supplier.origin}`
      : supplierName || "Unknown Supplier";

    const timestamp = Date.now();
    const id = `CR-${timestamp}`;

    try {
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
            batch_number,
          },
        ])
        .select("id, batch_number")
        .single();

      if (error) {
        const maybeDup = error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique") ||
          error.code === "23505";

        if (maybeDup) {
          setMessage({
            text: "Batch number collision detected. Please click Save again to generate the next batch number.",
            type: "error",
          });
        } else {
          setMessage({ text: `Failed to save coffee record: ${error.message}`, type: "error" });
        }
        setSubmitting(false);
        return;
      }

      const correctionMsg = fixed.corrected ? `\n\nNote: Values were auto-corrected from ${kilograms}kg/${bags} bags.` : "";
      
      setMessage({
        text: `✅ Coffee record saved! Batch: ${data?.batch_number}${correctionMsg}. Redirecting...`,
        type: "success",
      });

      setTimeout(() => {
        router.push("/coffee-records");
      }, 1500);
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
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 sticky top-0 z-10 transition-colors">
        <div className="max-w-4xl mx-auto">
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
              <span>Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Supplier (autocomplete) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="supplier">
                  Supplier <span className="text-red-500">*</span>
                </label>

                {loadingSuppliers ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading suppliers...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 transition-colors">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">No suppliers found</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
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
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    />

                    {showSupplierList && filteredSuppliers.length > 0 && (
                      <div className="absolute mt-1 w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto transition-colors">
                        {filteredSuppliers.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSupplierSelect(s)}
                            className="w-full text-left px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {s.name} ({s.code})
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{s.origin}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedSupplierId && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Selected: <span className="font-semibold">{supplierName}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date and Coffee Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="date">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Batch preview */}
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-gray-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Batch:{" "}
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {batchLoading ? "..." : batchPreview || "—"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => generateBatchPreview(date)}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60"
                      disabled={batchLoading}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="coffeeType">
                    Coffee Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="coffeeType"
                    value={coffeeType}
                    onChange={(e) => setCoffeeType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    required
                  >
                    <option value="">Select coffee type</option>
                    <option value="Arabica">Arabica</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Liberica">Liberica</option>
                    <option value="Excelsa">Excelsa</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
              </div>

              {/* Kilograms and Bags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="kilograms">
                    Kilograms (kg) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="kilograms"
                      type="number"
                      min={0}
                      step="0.01"
                      value={kilograms}
                      onChange={(e) => setKilograms(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        !isValidRatio && kilograms && bags && !(Number(kilograms) === 1 && Number(bags) === 1)
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="e.g., 1200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="bags">
                    Number of Bags <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Package className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="bags"
                      type="number"
                      min={0}
                      step="1"
                      value={bags}
                      onChange={(e) => setBags(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        !isValidRatio && kilograms && bags && !(Number(kilograms) === 1 && Number(bags) === 1)
                          ? "border-red-500 dark:border-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                      placeholder="e.g., 20"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Real-time validation warnings */}
              {kgPerBag !== null && (
                <div className={`text-xs p-3 rounded-lg transition-colors ${
                  isValidRatio
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"
                }`}>
                  <div className="flex items-center gap-2">
                    {isValidRatio ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {kgPerBag.toFixed(1)} kg per bag
                    </span>
                  </div>
                  
                  {isValidRatio ? (
                    <div className="mt-1">
                      {Number(kilograms) === 1 && Number(bags) === 1 ? (
                        <p>✓ Valid: Small sample delivery (1kg in 1 bag)</p>
                      ) : (
                        <p>✓ Valid: {Number(kilograms)} kgs in {Number(bags)} bags</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <p>❌ Invalid: {Number(kilograms)} kgs cannot fit into {Number(bags)} bags</p>
                      <p className="text-xs opacity-90">
                        Rule: Kilograms must be ≥ number of bags (except 1kg = 1 bag)
                      </p>
                      <p className="text-xs opacity-90">
                        Example: {Number(bags)} bags would need at least {Number(bags)} kgs
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Swap warning */}
              {showSwapWarning && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                        ⚠️ Invalid values detected
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                        {kilograms} kgs for {bags} bags is invalid because kgs should be ≥ bags.
                        Did you swap kilograms and bags?
                      </p>
                      <button
                        type="button"
                        onClick={applySwapCorrection}
                        className="text-sm bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Use suggested values: {suggestedKgs} kgs, {suggestedBags} bags
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Alert */}
              {message && (
                <div
                  className={`p-4 rounded-lg border transition-colors ${
                    message.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.type === "success" ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{message.text}</p>
                      {message.type === "error" && (
                        <p className="mt-1 text-xs opacity-90">
                          Tip: Kilograms must be ≥ number of bags (except 1kg = 1 bag)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Link
                  href="/coffee-records"
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || loadingSuppliers || suppliers.length === 0 || batchLoading || !isValidRatio}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
              <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-4 space-y-1">
                <p>📝 <span className="font-semibold">Batch number format:</span> YYYYMMDD001, 002, 003... (auto-generated)</p>
                <p>⚠️ <span className="font-semibold">Validation rule:</span> Kilograms must be ≥ number of bags (except 1kg = 1 bag)</p>
                <p>💡 <span className="font-semibold">Valid examples:</span> 100kg/2 bags ✅ | 50kg/1 bag ✅ | 1kg/1 bag ✅ | 500kg/5 bags ✅</p>
                <p>❌ <span className="font-semibold">Invalid examples:</span> 10kg/20 bags ❌ | 5kg/10 bags ❌ | 2kg/3 bags ❌</p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}