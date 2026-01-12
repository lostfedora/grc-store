"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Users,
  Coffee,
  LogOut,
  Package,
  ChevronRight,
  Loader2,
  Calendar,
  BarChart3,
  Save,
  ClipboardList,
  Calculator,
  Phone,
  MapPin,
  X,
} from "lucide-react";

type TimeFilter = "daily" | "weekly" | "monthly";

type DashboardStats = {
  totalSuppliers: number;
  totalCoffeeRecords: number;

  totalBags: number;
  totalKilograms: number;

  dailyRecords: number;
  dailyBags: number;
  dailyKilograms: number;

  weeklyRecords: number;
  weeklyBags: number;
  weeklyKilograms: number;

  monthlyRecords: number;
  monthlyBags: number;
  monthlyKilograms: number;
};

type TabKey = "overview" | "coffee" | "millingTx" | "millingCustomer";

/* ---------------------------- Coffee Record types ---------------------------- */
type SupplierOption = {
  id: string; // uuid
  name: string;
  code: string;
  origin: string;
};

/* ---------------------------- Milling types --------------------------------- */
type MillingCustomer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
};

const RATE_PER_KG = 150;

type AlertMsg = { text: string; type: "success" | "error" } | null;

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [isDark, setIsDark] = useState(false);

  const [tab, setTab] = useState<TabKey>("overview");

  /* Optional: quick-entry modal (same content as tab body) */
  const [quickOpen, setQuickOpen] = useState<null | Exclude<TabKey, "overview">>(null);

  /* ---------------------------- Theme watcher ---------------------------- */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /* ---------------------------- Auth check ---------------------------- */
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/auth");
        return;
      }
      setUser(data.user);
      setLoading(false);
      fetchDashboardStats();
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/auth");
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ---------------------------- Dashboard stats ---------------------------- */
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count: suppliersCount, error: suppliersError } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true });

      if (suppliersError) console.error("Error fetching suppliers count:", suppliersError);

      const { data: recordsData, error: recordsError, count: totalRecordsCount } = await supabase
        .from("coffee_records")
        .select("kilograms,bags,date", { count: "exact" });

      if (recordsError) {
        console.error("Error fetching coffee records:", recordsError);
        return;
      }

      const records = recordsData || [];

      const parseDate = (d: string | null | undefined) => (d ? new Date(d) : null);
      const sumBags = (rows: any[]) => rows.reduce((sum, r) => sum + (r.bags || 0), 0);
      const sumKilograms = (rows: any[]) =>
        rows.reduce((sum, r) => sum + (Number(r.kilograms || 0) || 0), 0);

      const dailyRecordsArr = records.filter((r) => {
        const d = parseDate(r.date);
        return d && d >= startOfToday;
      });

      const weeklyRecordsArr = records.filter((r) => {
        const d = parseDate(r.date);
        return d && d >= startOfWeek;
      });

      const monthlyRecordsArr = records.filter((r) => {
        const d = parseDate(r.date);
        return d && d >= startOfMonth;
      });

      const totalBags = sumBags(records);
      const totalKilograms = sumKilograms(records);

      setStats({
        totalSuppliers: suppliersCount || 0,
        totalCoffeeRecords: totalRecordsCount || records.length,
        totalBags,
        totalKilograms,

        dailyRecords: dailyRecordsArr.length,
        dailyBags: sumBags(dailyRecordsArr),
        dailyKilograms: sumKilograms(dailyRecordsArr),

        weeklyRecords: weeklyRecordsArr.length,
        weeklyBags: sumBags(weeklyRecordsArr),
        weeklyKilograms: sumKilograms(weeklyRecordsArr),

        monthlyRecords: monthlyRecordsArr.length,
        monthlyBags: sumBags(monthlyRecordsArr),
        monthlyKilograms: sumKilograms(monthlyRecordsArr),
      });
    } catch (error) {
      console.error("Error in fetchDashboardStats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
  };

  const getFilteredStats = () => {
    if (!stats) return { records: 0, bags: 0, kilograms: 0 };
    switch (timeFilter) {
      case "daily":
        return { records: stats.dailyRecords, bags: stats.dailyBags, kilograms: stats.dailyKilograms };
      case "weekly":
        return { records: stats.weeklyRecords, bags: stats.weeklyBags, kilograms: stats.weeklyKilograms };
      case "monthly":
      default:
        return { records: stats.monthlyRecords, bags: stats.monthlyBags, kilograms: stats.monthlyKilograms };
    }
  };

  const filteredStats = getFilteredStats();
  const timeLabel = timeFilter === "daily" ? "Today" : timeFilter === "weekly" ? "This Week" : "This Month";

  /* ---------------------------- Theme classes ---------------------------- */
  const bgClass = isDark ? "bg-gray-900" : "bg-gray-50";
  const cardBgClass = isDark ? "bg-gray-800" : "bg-white";
  const borderClass = isDark ? "border-gray-700" : "border-gray-200";
  const textClass = isDark ? "text-gray-100" : "text-gray-900";
  const textMutedClass = isDark ? "text-gray-400" : "text-gray-600";
  const hoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const greenTextClass = isDark ? "text-green-400" : "text-green-700";
  const greenBgClass = isDark ? "bg-green-900" : "bg-green-50";
  const greenBorderClass = isDark ? "border-green-800" : "border-green-200";

  /* ---------------------------- Shared Modal ---------------------------- */
  const ModalShell = ({
    title,
    children,
    onClose,
  }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full max-w-3xl ${cardBgClass} border ${borderClass} rounded-2xl shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${borderClass}`}>
          <h3 className={`text-base font-semibold ${textClass}`}>{title}</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${hoverClass} border ${borderClass} transition-colors`}
            aria-label="Close"
          >
            <X className={`w-4 h-4 ${textMutedClass}`} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );

  /* ====================================================================== */
  /* ============== 1) COFFEE RECORD FORM (embedded) ====================== */
  /* ====================================================================== */
  const [coffeeType, setCoffeeType] = useState("");
  const [coffeeDate, setCoffeeDate] = useState(new Date().toISOString().slice(0, 10));
  const [kilograms, setKilograms] = useState("");
  const [bags, setBags] = useState("");

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierQuery, setSupplierQuery] = useState<string>("");
  const [showSupplierList, setShowSupplierList] = useState(false);

  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [coffeeSubmitting, setCoffeeSubmitting] = useState(false);
  const [coffeeMsg, setCoffeeMsg] = useState<AlertMsg>(null);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    const { data, error } = await supabase.from("suppliers").select("id, name, code, origin").order("name", { ascending: true });
    if (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
    } else {
      setSuppliers((data || []) as SupplierOption[]);
    }
    setLoadingSuppliers(false);
  };

  useEffect(() => {
    if (!user) return;
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const submitCoffeeRecord = async (e?: FormEvent) => {
    e?.preventDefault();
    setCoffeeSubmitting(true);
    setCoffeeMsg(null);

    if (!selectedSupplierId) {
      setCoffeeMsg({ text: "Please select a supplier from the list.", type: "error" });
      setCoffeeSubmitting(false);
      return;
    }
    if (!coffeeType.trim()) {
      setCoffeeMsg({ text: "Coffee type is required.", type: "error" });
      setCoffeeSubmitting(false);
      return;
    }
    if (!coffeeDate) {
      setCoffeeMsg({ text: "Date is required.", type: "error" });
      setCoffeeSubmitting(false);
      return;
    }
    if (!kilograms || Number(kilograms) <= 0) {
      setCoffeeMsg({ text: "Kilograms must be greater than 0.", type: "error" });
      setCoffeeSubmitting(false);
      return;
    }
    if (!bags || Number(bags) <= 0) {
      setCoffeeMsg({ text: "Bags must be greater than 0.", type: "error" });
      setCoffeeSubmitting(false);
      return;
    }

    const kgNumber = Number(kilograms);
    const bagsNumber = Number(bags);

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const supplierNameValue =
      supplierName || (supplier ? `${supplier.name} (${supplier.code})` : "Unknown Supplier");

    const timestamp = Date.now();
    const id = `CR-${timestamp}`;
    const autoBatchNumber = `BATCH-${coffeeDate}-${timestamp}`;

    const { error } = await supabase.from("coffee_records").insert([
      {
        id,
        coffee_type: coffeeType.trim(),
        date: coffeeDate,
        kilograms: kgNumber,
        bags: bagsNumber,
        supplier_id: selectedSupplierId,
        supplier_name: supplierNameValue,
        status: "pending",
        batch_number: autoBatchNumber,
        created_by: user?.email ?? null,
      },
    ]);

    if (error) {
      setCoffeeMsg({ text: `Failed to save coffee record: ${error.message}`, type: "error" });
    } else {
      setCoffeeMsg({ text: "Coffee record saved successfully.", type: "success" });

      // refresh stats & reset form
      fetchDashboardStats();
      setCoffeeType("");
      setKilograms("");
      setBags("");
      setSelectedSupplierId("");
      setSupplierName("");
      setSupplierQuery("");
      setShowSupplierList(false);

      // close modal if used
      if (quickOpen === "coffee") setQuickOpen(null);
    }

    setCoffeeSubmitting(false);
  };

  const CoffeeForm = (
    <form onSubmit={submitCoffeeRecord} className="space-y-5">
      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>Supplier *</label>
        {loadingSuppliers ? (
          <div className={`flex items-center gap-2 text-sm ${textMutedClass}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className={`rounded-lg border p-4 ${borderClass}`}>
            <p className={`text-sm ${textClass}`}>No suppliers found.</p>
            <p className={`text-xs ${textMutedClass} mt-1`}>Create a supplier first before adding coffee records.</p>
            <Link
              href="/suppliers/new"
              className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
            >
              <Users className="w-4 h-4" /> Create Supplier
            </Link>
          </div>
        ) : (
          <div className="relative">
            <input
              value={supplierQuery}
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                setSelectedSupplierId("");
                setSupplierName("");
                setShowSupplierList(true);
              }}
              onFocus={() => setShowSupplierList(true)}
              placeholder="Type supplier name, code, or origin..."
              className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} placeholder:${textMutedClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            />
            {showSupplierList && filteredSuppliers.length > 0 && (
              <div className={`absolute mt-1 w-full rounded-lg border ${borderClass} ${cardBgClass} shadow-lg z-20 max-h-60 overflow-y-auto`}>
                {filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSupplierSelect(s)}
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 ${borderClass} ${hoverClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${textClass}`}>{s.name} ({s.code})</span>
                      <span className={`text-[11px] ${textMutedClass}`}>{s.origin}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedSupplierId && (
              <p className={`mt-1 text-[11px] ${greenTextClass}`}>
                Selected: <span className="font-semibold">{supplierName}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Date *</label>
          <input
            type="date"
            value={coffeeDate}
            onChange={(e) => setCoffeeDate(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Coffee Type *</label>
          <select
            value={coffeeType}
            onChange={(e) => setCoffeeType(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            required
          >
            <option value="">Select coffee type</option>
            <option value="Arabica">Arabica</option>
            <option value="Robusta">Robusta</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Kilograms *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={kilograms}
            onChange={(e) => setKilograms(e.target.value)}
            placeholder="e.g. 1200"
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Bags *</label>
          <input
            type="number"
            min={0}
            step="1"
            value={bags}
            onChange={(e) => setBags(e.target.value)}
            placeholder="e.g. 20"
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            required
          />
        </div>
      </div>

      {coffeeMsg && (
        <div
          className={`p-3 rounded-lg border ${
            coffeeMsg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <p className="text-sm font-medium">{coffeeMsg.text}</p>
        </div>
      )}

      <div className={`flex items-center justify-end pt-3 border-t ${borderClass}`}>
        <button
          type="submit"
          disabled={coffeeSubmitting || loadingSuppliers || suppliers.length === 0}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {coffeeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {coffeeSubmitting ? "Saving..." : "Save Coffee Record"}
        </button>
      </div>
    </form>
  );

  /* ====================================================================== */
  /* ============== 2) MILLING TRANSACTION FORM (embedded) ================= */
  /* ====================================================================== */
  const [mTxDate, setMTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [kgsHulled, setKgsHulled] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("0");
  const [balance, setBalance] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const [customers, setCustomers] = useState<MillingCustomer[]>([]);
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string>("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [mTxSubmitting, setMTxSubmitting] = useState(false);
  const [mTxMsg, setMTxMsg] = useState<AlertMsg>(null);

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

  useEffect(() => {
    if (!user) return;
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const kgs = Number(kgsHulled) || 0;
    const total = kgs * RATE_PER_KG;
    setTotalAmount(total);

    const paid = Number(amountPaid) || 0;
    setBalance(total - paid);
  }, [kgsHulled, amountPaid]);

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
    const label = `${customer.full_name}${customer.phone ? ` (${customer.phone})` : ""}`;
    setSelectedCustomerLabel(label);
    setCustomerQuery(label);
    setShowCustomerList(false);
  };

  const submitMillingTx = async (e?: FormEvent) => {
    e?.preventDefault();
    setMTxSubmitting(true);
    setMTxMsg(null);

    if (!selectedCustomerId) {
      setMTxMsg({ text: "Please select a customer from the list.", type: "error" });
      setMTxSubmitting(false);
      return;
    }

    const kgs = Number(kgsHulled);
    if (!kgs || kgs <= 0) {
      setMTxMsg({ text: "Kgs hulled must be greater than 0.", type: "error" });
      setMTxSubmitting(false);
      return;
    }

    const paid = Number(amountPaid || "0");
    if (paid < 0) {
      setMTxMsg({ text: "Amount paid cannot be negative.", type: "error" });
      setMTxSubmitting(false);
      return;
    }
    if (paid > totalAmount) {
      setMTxMsg({ text: "Amount paid cannot be greater than total amount.", type: "error" });
      setMTxSubmitting(false);
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const customerName = customer?.full_name || selectedCustomerLabel || "Unknown Customer";

    const { error } = await supabase.from("milling_transactions").insert([
      {
        customer_id: selectedCustomerId,
        customer_name: customerName,
        date: mTxDate,
        kgs_hulled: kgs,
        rate_per_kg: RATE_PER_KG,
        total_amount: totalAmount,
        amount_paid: paid,
        balance,
        transaction_type: "hulling",
        notes: notes.trim() || null,
        created_by: user?.email ?? "system",
      },
    ]);

    if (error) {
      setMTxMsg({ text: `Failed to save milling transaction: ${error.message}`, type: "error" });
    } else {
      setMTxMsg({ text: "Milling transaction saved successfully.", type: "success" });

      // refresh customers list (balances might change later via triggers) and reset
      loadCustomers();
      setKgsHulled("");
      setAmountPaid("0");
      setNotes("");
      setSelectedCustomerId("");
      setSelectedCustomerLabel("");
      setCustomerQuery("");
      setShowCustomerList(false);

      // close modal if used
      if (quickOpen === "millingTx") setQuickOpen(null);
    }

    setMTxSubmitting(false);
  };

  const MillingTxForm = (
    <form onSubmit={submitMillingTx} className="space-y-5">
      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>Customer *</label>
        {loadingCustomers ? (
          <div className={`flex items-center gap-2 text-sm ${textMutedClass}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading milling customers...
          </div>
        ) : customers.length === 0 ? (
          <div className={`rounded-lg border p-4 ${borderClass}`}>
            <p className={`text-sm ${textClass}`}>No milling customers found.</p>
            <p className={`text-xs ${textMutedClass} mt-1`}>Create a milling customer first.</p>
            <Link
              href="/milling-customers/new"
              className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Users className="w-4 h-4" /> Create Milling Customer
            </Link>
          </div>
        ) : (
          <div className="relative">
            <input
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setSelectedCustomerId("");
                setSelectedCustomerLabel("");
                setShowCustomerList(true);
              }}
              onFocus={() => setShowCustomerList(true)}
              placeholder="Type customer name, phone, or address..."
              className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} placeholder:${textMutedClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />

            {showCustomerList && filteredCustomers.length > 0 && (
              <div className={`absolute mt-1 w-full rounded-lg border ${borderClass} ${cardBgClass} shadow-lg z-20 max-h-60 overflow-y-auto`}>
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCustomerSelect(c)}
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 ${borderClass} ${hoverClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${textClass} truncate`}>{c.full_name}</p>
                        <p className={`text-[11px] ${textMutedClass} truncate`}>
                          {c.phone || "No phone"} • {c.address || "No address"}
                        </p>
                      </div>
                      <span className={`text-[11px] whitespace-nowrap ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                        Bal: {c.current_balance.toLocaleString()} UGX
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedCustomerId && (
              <p className={`mt-1 text-[11px] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                Selected: <span className="font-semibold">{selectedCustomerLabel}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Date *</label>
          <input
            type="date"
            value={mTxDate}
            onChange={(e) => setMTxDate(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Kgs Hulled *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={kgsHulled}
            onChange={(e) => setKgsHulled(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            placeholder="e.g. 350"
            required
          />
          <p className={`mt-1 text-[11px] ${textMutedClass}`}>Rate per kg fixed at {RATE_PER_KG.toLocaleString()} UGX.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Total Amount</label>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${borderClass} ${isDark ? "bg-gray-900/30" : "bg-gray-50"}`}>
            <Calculator className={`w-4 h-4 ${textMutedClass}`} />
            <span className={`font-semibold ${textClass}`}>{totalAmount.toLocaleString()} UGX</span>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Amount Paid</label>
          <input
            type="number"
            min={0}
            step="1"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            placeholder="e.g. 20000"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Balance</label>
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
              balance > 0
                ? "border-amber-300 text-amber-800 dark:border-amber-500 dark:text-amber-200"
                : "border-emerald-300 text-emerald-800 dark:border-emerald-500 dark:text-emerald-200"
            } ${isDark ? "bg-gray-900/30" : "bg-gray-50"}`}
          >
            <Calculator className="w-4 h-4" />
            <span className="font-semibold">{balance.toLocaleString()} UGX</span>
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
          placeholder="e.g. paid partially in cash."
        />
      </div>

      {mTxMsg && (
        <div
          className={`p-3 rounded-lg border ${
            mTxMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <p className="text-sm font-medium">{mTxMsg.text}</p>
        </div>
      )}

      <div className={`flex items-center justify-end pt-3 border-t ${borderClass}`}>
        <button
          type="submit"
          disabled={mTxSubmitting || loadingCustomers || customers.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {mTxSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mTxSubmitting ? "Saving..." : "Save Milling Transaction"}
        </button>
      </div>
    </form>
  );

  /* ====================================================================== */
  /* ============== 3) MILLING CUSTOMER FORM (embedded) ==================== */
  /* ====================================================================== */
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mCustSubmitting, setMCustSubmitting] = useState(false);
  const [mCustMsg, setMCustMsg] = useState<AlertMsg>(null);

  const submitMillingCustomer = async (e?: FormEvent) => {
    e?.preventDefault();
    setMCustSubmitting(true);
    setMCustMsg(null);

    if (!fullName.trim()) {
      setMCustMsg({ text: "Customer full name is required.", type: "error" });
      setMCustSubmitting(false);
      return;
    }

    const opening = 0;
    const status = "Active";

    const { error } = await supabase.from("milling_customers").insert([
      {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        opening_balance: opening,
        current_balance: opening,
        status,
      },
    ]);

    if (error) {
      setMCustMsg({ text: `Failed to save customer: ${error.message}`, type: "error" });
    } else {
      setMCustMsg({ text: "Milling customer created successfully.", type: "success" });

      // refresh customer list for tx form
      loadCustomers();

      // reset fields
      setFullName("");
      setPhone("");
      setAddress("");

      if (quickOpen === "millingCustomer") setQuickOpen(null);
    }

    setMCustSubmitting(false);
  };

  const MillingCustomerForm = (
    <form onSubmit={submitMillingCustomer} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Full Name *</label>
          <div className="relative">
            <Users className={`w-4 h-4 ${textMutedClass} absolute left-3 top-1/2 -translate-y-1/2`} />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
              placeholder="e.g. Masika John"
              required
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${textClass}`}>Phone</label>
          <div className="relative">
            <Phone className={`w-4 h-4 ${textMutedClass} absolute left-3 top-1/2 -translate-y-1/2`} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
              placeholder="e.g. 0781 121 639"
            />
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${textClass}`}>Address / Location</label>
        <div className="relative">
          <MapPin className={`w-4 h-4 ${textMutedClass} absolute left-3 top-1/2 -translate-y-1/2`} />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 rounded-lg border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-green-500`}
            placeholder="e.g. Kasese, Kinyamaseke"
          />
        </div>
      </div>

      {mCustMsg && (
        <div
          className={`p-3 rounded-lg border ${
            mCustMsg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <p className="text-sm font-medium">{mCustMsg.text}</p>
        </div>
      )}

      <div className={`flex items-center justify-end pt-3 border-t ${borderClass}`}>
        <button
          type="submit"
          disabled={mCustSubmitting}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {mCustSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mCustSubmitting ? "Saving..." : "Save Milling Customer"}
        </button>
      </div>
    </form>
  );

  /* ---------------------------- Loading screen ---------------------------- */
  if (loading) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${bgClass}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className={`text-sm ${textMutedClass}`}>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  /* ---------------------------- Tabs UI ---------------------------- */
  const TabButton = ({
    k,
    label,
    icon,
  }: {
    k: TabKey;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setTab(k)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
        tab === k
          ? `${isDark ? "bg-gray-700" : "bg-white"} ${borderClass} ${textClass} shadow-sm`
          : `${isDark ? "bg-gray-800" : "bg-gray-100"} ${borderClass} ${textMutedClass} ${hoverClass}`
      }`}
      type="button"
    >
      {icon}
      {label}
    </button>
  );

  const QuickButton = ({
    k,
    label,
  }: {
    k: Exclude<TabKey, "overview">;
    label: string;
  }) => (
    <button
      onClick={() => setQuickOpen(k)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white"
      type="button"
    >
      <Save className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <main className={`min-h-screen ${bgClass} transition-colors duration-200`}>
      {/* Header */}
      <header className={`${cardBgClass} border-b ${borderClass} px-4 py-4 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className={`text-2xl font-bold ${greenTextClass}`}>Great Pearl Coffee</h1>
              <p className={`text-sm ${textMutedClass} mt-1`}>
                Welcome back, <span className={greenTextClass}>{user?.email}</span>
              </p>
            </div>

            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${textMutedClass} ${hoverClass} rounded-lg transition-colors border ${borderClass}`}
            >
              {logoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {logoutLoading ? "..." : "Logout"}
            </button>
          </div>

          {/* Tabs + Quick actions */}
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <TabButton k="overview" label="Overview" icon={<BarChart3 className="w-4 h-4" />} />
              <TabButton k="coffee" label="Add Coffee Record" icon={<Coffee className="w-4 h-4" />} />
              <TabButton k="millingTx" label="Add Milling Tx" icon={<ClipboardList className="w-4 h-4" />} />
              <TabButton k="millingCustomer" label="Add Milling Customer" icon={<Users className="w-4 h-4" />} />
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickButton k="coffee" label="Quick Coffee Record" />
              <QuickButton k="millingTx" label="Quick Milling Tx" />
              <QuickButton k="millingCustomer" label="Quick Customer" />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {tab === "overview" && (
            <>
              {/* Quick Actions cards */}
              <div className="mb-8">
                <h2 className={`text-lg font-semibold ${textClass} mb-4`}>Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/suppliers"
                    className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${greenBgClass} rounded-lg p-3 transition-colors border ${greenBorderClass}`}>
                        <Users className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}>
                          Manage Suppliers
                        </h3>
                        <p className={`text-sm ${textMutedClass} mt-1`}>View and manage suppliers</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`} />
                    </div>
                  </Link>

                  <Link
                    href="/coffee-records"
                    className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${greenBgClass} rounded-lg p-3 transition-colors border ${greenBorderClass}`}>
                        <Coffee className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}>
                          Coffee Records
                        </h3>
                        <p className={`text-sm ${textMutedClass} mt-1`}>Manage delivery records</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`} />
                    </div>
                  </Link>

                  <Link
                    href="/milling"
                    className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${greenBgClass} rounded-lg p-3 transition-colors border ${greenBorderClass}`}>
                        <Package className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}>
                          Milling Records
                        </h3>
                        <p className={`text-sm ${textMutedClass} mt-1`}>Create batches & track milling</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`} />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Overview + filter */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h2 className={`text-lg font-semibold ${textClass}`}>Overview</h2>

                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {(["daily", "weekly", "monthly"] as TimeFilter[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setTimeFilter(k)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          timeFilter === k
                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        }`}
                        type="button"
                      >
                        {k === "daily" ? "Daily" : k === "weekly" ? "Weekly" : "Monthly"}
                      </button>
                    ))}
                  </div>
                </div>

                {statsLoading ? (
                  <div className={`${cardBgClass} rounded-lg border ${borderClass} p-8 text-center`}>
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
                    <p className={textMutedClass}>Loading statistics...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}>
                      <div className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}>
                        <Users className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <p className={`text-2xl font-bold ${greenTextClass}`}>{stats?.totalSuppliers || 0}</p>
                      <p className={`text-sm ${textMutedClass}`}>Total Suppliers</p>
                    </div>

                    <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}>
                      <div className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}>
                        <Coffee className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <p className={`text-2xl font-bold ${greenTextClass}`}>{stats?.totalCoffeeRecords || 0}</p>
                      <p className={`text-sm ${textMutedClass}`}>Total Records</p>
                    </div>

                    <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}>
                      <div className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}>
                        <Calendar className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <p className={`text-2xl font-bold ${greenTextClass}`}>{filteredStats.records}</p>
                      <p className={`text-xs ${textMutedClass}`}>{timeLabel} · {filteredStats.bags} bags</p>
                    </div>

                    <div className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}>
                      <div className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}>
                        <BarChart3 className={`w-6 h-6 ${greenTextClass}`} />
                      </div>
                      <p className={`text-2xl font-bold ${greenTextClass}`}>{filteredStats.kilograms.toLocaleString()}</p>
                      <p className={`text-xs ${textMutedClass}`}>{timeLabel} · kilograms</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "coffee" && (
            <div className={`${cardBgClass} rounded-2xl border ${borderClass} p-6`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Coffee className={`w-5 h-5 ${greenTextClass}`} />
                  <h2 className={`text-lg font-semibold ${textClass}`}>Add Coffee Record</h2>
                </div>
                <Link href="/coffee-records" className={`text-sm ${greenTextClass} hover:underline`}>
                  View records
                </Link>
              </div>
              {CoffeeForm}
            </div>
          )}

          {tab === "millingTx" && (
            <div className={`${cardBgClass} rounded-2xl border ${borderClass} p-6`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className={`w-5 h-5 ${isDark ? "text-emerald-300" : "text-emerald-700"}`} />
                  <h2 className={`text-lg font-semibold ${textClass}`}>Add Milling Transaction</h2>
                </div>
                <Link href="/milling-transactions" className={`text-sm ${greenTextClass} hover:underline`}>
                  View transactions
                </Link>
              </div>
              {MillingTxForm}
            </div>
          )}

          {tab === "millingCustomer" && (
            <div className={`${cardBgClass} rounded-2xl border ${borderClass} p-6`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className={`w-5 h-5 ${greenTextClass}`} />
                  <h2 className={`text-lg font-semibold ${textClass}`}>Add Milling Customer</h2>
                </div>
                <Link href="/milling-customers" className={`text-sm ${greenTextClass} hover:underline`}>
                  View customers
                </Link>
              </div>
              {MillingCustomerForm}
            </div>
          )}
        </div>
      </section>

      {/* Quick-entry modal */}
      {quickOpen === "coffee" && (
        <ModalShell title="Quick Add: Coffee Record" onClose={() => setQuickOpen(null)}>
          {CoffeeForm}
        </ModalShell>
      )}
      {quickOpen === "millingTx" && (
        <ModalShell title="Quick Add: Milling Transaction" onClose={() => setQuickOpen(null)}>
          {MillingTxForm}
        </ModalShell>
      )}
      {quickOpen === "millingCustomer" && (
        <ModalShell title="Quick Add: Milling Customer" onClose={() => setQuickOpen(null)}>
          {MillingCustomerForm}
        </ModalShell>
      )}
    </main>
  );
}
