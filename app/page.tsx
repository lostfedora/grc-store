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
  Home,
  Truck,
  UserPlus,
  PlusCircle,
  Filter,
  TrendingUp,
  Shield,
  Box,
  CreditCard,
  FileText,
  Menu,
  ChevronDown,
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

type SupplierOption = {
  id: string;
  name: string;
  code: string;
  origin: string;
};

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

  /* Mobile menu state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Modal states */
  const [modalOpen, setModalOpen] = useState<null | "coffee" | "millingTx" | "millingCustomer">(null);

  /* ---------------------------- Theme & Auth ---------------------------- */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/auth");
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ---------------------------- Dashboard Stats ---------------------------- */
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count: suppliersCount } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true });

      const { data: recordsData, count: totalRecordsCount } = await supabase
        .from("coffee_records")
        .select("kilograms,bags,date", { count: "exact" });

      const records = recordsData || [];
      const parseDate = (d: string | null | undefined) => (d ? new Date(d) : null);
      const sumBags = (rows: any[]) => rows.reduce((sum, r) => sum + (r.bags || 0), 0);
      const sumKilograms = (rows: any[]) => rows.reduce((sum, r) => sum + (Number(r.kilograms || 0) || 0), 0);

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

  /* ---------------------------- Theme Classes ---------------------------- */
  const bgClass = isDark ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 to-gray-100";
  const cardBgClass = isDark ? "bg-gray-800/90 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm";
  const borderClass = isDark ? "border-gray-700/50" : "border-gray-200/70";
  const textClass = isDark ? "text-gray-100" : "text-gray-900";
  const textMutedClass = isDark ? "text-gray-400" : "text-gray-600";
  const hoverClass = isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50/80";
  const greenTextClass = isDark ? "text-emerald-400" : "text-emerald-700";
  const greenBgClass = isDark ? "bg-emerald-900/30" : "bg-emerald-50/80";
  const greenBorderClass = isDark ? "border-emerald-800/50" : "border-emerald-200/60";
  const greenGradient = isDark 
    ? "from-emerald-900/30 via-emerald-900/20 to-transparent" 
    : "from-emerald-50/80 via-emerald-50/60 to-transparent";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-full sm:max-w-2xl md:max-w-3xl ${cardBgClass} border ${borderClass} rounded-lg sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] overflow-y-auto`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${borderClass} sticky top-0 ${cardBgClass}`}>
          <h3 className={`text-base sm:text-lg font-semibold ${textClass} truncate pr-2`}>{title}</h3>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-lg ${hoverClass} border ${borderClass} transition-all hover:scale-105 flex-shrink-0`}
            aria-label="Close"
          >
            <X className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass}`} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );

  /* ====================================================================== */
  /* ============== 1) COFFEE RECORD FORM ================================= */
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
    const supplierNameValue = supplierName || (supplier ? `${supplier.name} (${supplier.code})` : "Unknown Supplier");
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
      fetchDashboardStats();
      setCoffeeType("");
      setKilograms("");
      setBags("");
      setSelectedSupplierId("");
      setSupplierName("");
      setSupplierQuery("");
      setShowSupplierList(false);
      setModalOpen(null);
    }

    setCoffeeSubmitting(false);
  };

  const CoffeeForm = (
    <form onSubmit={submitCoffeeRecord} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Supplier *</span>
            </label>
            {loadingSuppliers ? (
              <div className={`flex items-center gap-2 text-xs sm:text-sm ${textMutedClass} p-3 sm:p-4 rounded-lg border ${borderClass}`}>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                Loading suppliers...
              </div>
            ) : suppliers.length === 0 ? (
              <div className={`rounded-lg border p-3 sm:p-4 ${borderClass}`}>
                <p className={`text-xs sm:text-sm ${textClass}`}>No suppliers found.</p>
                <p className={`text-[10px] sm:text-xs ${textMutedClass} mt-1`}>Create a supplier first before adding coffee records.</p>
                <Link
                  href="/suppliers/new"
                  className="inline-flex items-center gap-1.5 sm:gap-2 mt-2 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white transition-all"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  Create Supplier
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} placeholder:${textMutedClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                />
                {showSupplierList && filteredSuppliers.length > 0 && (
                  <div className={`absolute mt-1 sm:mt-2 w-full rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} shadow-2xl z-20 max-h-48 sm:max-h-60 overflow-y-auto`}>
                    {filteredSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSupplierSelect(s)}
                        className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 border-b last:border-b-0 ${borderClass} ${hoverClass} transition-colors text-sm`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${textClass} truncate`}>{s.name} ({s.code})</span>
                          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${greenBgClass} ${greenTextClass} ml-2 flex-shrink-0`}>
                            {s.origin}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedSupplierId && (
                  <p className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs ${greenTextClass} flex items-center gap-1`}>
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Selected: <span className="font-semibold truncate">{supplierName}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Date *</span>
            </label>
            <input
              type="date"
              value={coffeeDate}
              onChange={(e) => setCoffeeDate(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
              required
            />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Coffee Type *</span>
            </label>
            <select
              value={coffeeType}
              onChange={(e) => setCoffeeType(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none text-sm`}
              required
            >
              <option value="">Select coffee type</option>
              <option value="Arabica">Arabica</option>
              <option value="Robusta">Robusta</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${textClass}`}>Kilograms *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={kilograms}
                onChange={(e) => setKilograms(e.target.value)}
                placeholder="e.g. 1200"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                required
              />
            </div>
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${textClass}`}>Bags *</label>
              <input
                type="number"
                min={0}
                step="1"
                value={bags}
                onChange={(e) => setBags(e.target.value)}
                placeholder="e.g. 20"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {coffeeMsg && (
        <div
          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
            coffeeMsg.type === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-200"
              : "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-200"
          } transition-all duration-300`}
        >
          <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
            {coffeeMsg.type === "success" ? (
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {coffeeMsg.text}
          </p>
        </div>
      )}

      <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t ${borderClass}`}>
        <Link
          href="/coffee-records"
          className={`text-xs sm:text-sm ${greenTextClass} hover:underline flex items-center gap-1.5 sm:gap-2 order-2 xs:order-1`}
        >
          View all records
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
        <button
          type="submit"
          disabled={coffeeSubmitting || loadingSuppliers || suppliers.length === 0}
          className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium disabled:opacity-50 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full xs:w-auto order-1 xs:order-2"
        >
          {coffeeSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="text-sm sm:text-base">{coffeeSubmitting ? "Saving..." : "Save Coffee Record"}</span>
        </button>
      </div>
    </form>
  );

  /* ====================================================================== */
  /* ============== 2) MILLING TRANSACTION FORM =========================== */
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
      loadCustomers();
      setKgsHulled("");
      setAmountPaid("0");
      setNotes("");
      setSelectedCustomerId("");
      setSelectedCustomerLabel("");
      setCustomerQuery("");
      setShowCustomerList(false);
      setModalOpen(null);
    }

    setMTxSubmitting(false);
  };

  const MillingTxForm = (
    <form onSubmit={submitMillingTx} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Customer *</span>
            </label>
            {loadingCustomers ? (
              <div className={`flex items-center gap-2 text-xs sm:text-sm ${textMutedClass} p-3 sm:p-4 rounded-lg sm:rounded-xl border ${borderClass}`}>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                Loading milling customers...
              </div>
            ) : customers.length === 0 ? (
              <div className={`rounded-lg sm:rounded-xl border p-3 sm:p-4 ${borderClass}`}>
                <p className={`text-xs sm:text-sm ${textClass}`}>No milling customers found.</p>
                <p className={`text-[10px] sm:text-xs ${textMutedClass} mt-1`}>Create a milling customer first.</p>
                <Link
                  href="/milling-customers/new"
                  className="inline-flex items-center gap-1.5 sm:gap-2 mt-2 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white transition-all"
                >
                  <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Create Milling Customer
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
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} placeholder:${textMutedClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                />
                {showCustomerList && filteredCustomers.length > 0 && (
                  <div className={`absolute mt-1 sm:mt-2 w-full rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} shadow-2xl z-20 max-h-48 sm:max-h-60 overflow-y-auto`}>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCustomerSelect(c)}
                        className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 border-b last:border-b-0 ${borderClass} ${hoverClass} transition-colors`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-xs sm:text-sm font-medium ${textClass} truncate`}>{c.full_name}</p>
                            <p className={`text-[10px] sm:text-xs ${textMutedClass} truncate`}>
                              {c.phone || "No phone"} • {c.address || "No address"}
                            </p>
                          </div>
                          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${balance > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"} flex-shrink-0`}>
                            Bal: {c.current_balance.toLocaleString()} UGX
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCustomerId && (
                  <p className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs ${isDark ? "text-emerald-300" : "text-emerald-700"} flex items-center gap-1`}>
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Selected: <span className="font-semibold truncate">{selectedCustomerLabel}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Date *</span>
            </label>
            <input
              type="date"
              value={mTxDate}
              onChange={(e) => setMTxDate(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
              required
            />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Kgs Hulled *</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={kgsHulled}
              onChange={(e) => setKgsHulled(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
              placeholder="e.g. 350"
              required
            />
            <p className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs ${textMutedClass} flex items-center gap-1`}>
              <Calculator className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Rate per kg fixed at {RATE_PER_KG.toLocaleString()} UGX.
            </p>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${textClass}`}>Amount Paid</label>
              <input
                type="number"
                min={0}
                step="1"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                placeholder="e.g. 20000"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} transition-all hover:scale-[1.02]`}>
          <p className={`text-[10px] sm:text-xs ${textMutedClass} mb-1`}>Total Amount</p>
          <div className="flex items-center gap-2">
            <Calculator className={`w-4 h-4 sm:w-5 sm:h-5 ${greenTextClass}`} />
            <span className={`text-base sm:text-xl font-bold ${textClass} truncate`}>{totalAmount.toLocaleString()} UGX</span>
          </div>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} transition-all hover:scale-[1.02]`}>
          <p className={`text-[10px] sm:text-xs ${textMutedClass} mb-1`}>Amount Paid</p>
          <div className="flex items-center gap-2">
            <CreditCard className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
            <span className={`text-base sm:text-xl font-bold ${textClass} truncate`}>{Number(amountPaid || "0").toLocaleString()} UGX</span>
          </div>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${balance > 0 ? "border-amber-300/50 dark:border-amber-500/50" : "border-emerald-300/50 dark:border-emerald-500/50"} ${cardBgClass} transition-all hover:scale-[1.02]`}>
          <p className={`text-[10px] sm:text-xs ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"} mb-1`}>
            Balance
          </p>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${balance > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"}`} />
            <span className={`text-base sm:text-xl font-bold ${balance > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"} truncate`}>
              {balance.toLocaleString()} UGX
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Notes (optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-sm`}
          placeholder="e.g. paid partially in cash."
        />
      </div>

      {mTxMsg && (
        <div
          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
            mTxMsg.type === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-200"
              : "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-200"
          } transition-all duration-300`}
        >
          <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
            {mTxMsg.type === "success" ? (
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {mTxMsg.text}
          </p>
        </div>
      )}

      <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t ${borderClass}`}>
        <Link
          href="/milling-transactions"
          className={`text-xs sm:text-sm ${greenTextClass} hover:underline flex items-center gap-1.5 sm:gap-2 order-2 xs:order-1`}
        >
          View all transactions
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
        <button
          type="submit"
          disabled={mTxSubmitting || loadingCustomers || customers.length === 0}
          className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium disabled:opacity-50 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full xs:w-auto order-1 xs:order-2"
        >
          {mTxSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="text-sm sm:text-base">{mTxSubmitting ? "Saving..." : "Save Milling Transaction"}</span>
        </button>
      </div>
    </form>
  );

  /* ====================================================================== */
  /* ============== 3) MILLING CUSTOMER FORM ============================== */
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
      loadCustomers();
      setFullName("");
      setPhone("");
      setAddress("");
      setModalOpen(null);
    }

    setMCustSubmitting(false);
  };

  const MillingCustomerForm = (
    <form onSubmit={submitMillingCustomer} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Full Name *</span>
            </label>
            <div className="relative">
              <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} absolute left-3 sm:left-4 top-1/2 -translate-y-1/2`} />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                placeholder="e.g. Masika John"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Phone</span>
            </label>
            <div className="relative">
              <Phone className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} absolute left-3 sm:left-4 top-1/2 -translate-y-1/2`} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                placeholder="e.g. 0781 121 639"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 sm:mb-2 ${textClass} flex items-center gap-2`}>
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Address / Location</span>
            </label>
            <div className="relative">
              <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} absolute left-3 sm:left-4 top-1/2 -translate-y-1/2`} />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${borderClass} ${cardBgClass} ${textClass} focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
                placeholder="e.g. Kasese, Kinyamaseke"
              />
            </div>
          </div>
        </div>
      </div>

      {mCustMsg && (
        <div
          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
            mCustMsg.type === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-200"
              : "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-200"
          } transition-all duration-300`}
        >
          <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
            {mCustMsg.type === "success" ? (
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {mCustMsg.text}
          </p>
        </div>
      )}

      <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t ${borderClass}`}>
        <Link
          href="/milling-customers"
          className={`text-xs sm:text-sm ${greenTextClass} hover:underline flex items-center gap-1.5 sm:gap-2 order-2 xs:order-1`}
        >
          View all customers
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
        <button
          type="submit"
          disabled={mCustSubmitting}
          className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium disabled:opacity-50 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full xs:w-auto order-1 xs:order-2"
        >
          {mCustSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="text-sm sm:text-base">{mCustSubmitting ? "Saving..." : "Save Milling Customer"}</span>
        </button>
      </div>
    </form>
  );

  /* ---------------------------- Loading Screen ---------------------------- */
  if (loading) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${bgClass} transition-colors duration-200 px-4`}>
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 animate-spin mx-auto"></div>
            <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className={`text-xs sm:text-sm ${textMutedClass}`}>Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  /* ---------------------------- Action Button ---------------------------- */
  const ActionButton = ({
    onClick,
    label,
    icon: Icon,
    description,
    color = "emerald",
  }: {
    onClick: () => void;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color?: "emerald" | "green" | "teal";
  }) => {
    const colorClasses = {
      emerald: "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
      green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      teal: "from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
    };

    return (
      <button
        onClick={onClick}
        className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-4 sm:p-6 hover:border-emerald-300/50 hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 group hover:scale-[1.02] text-left w-full`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors duration-300 text-sm sm:text-base truncate`}>
              {label}
            </h3>
            <p className={`text-xs sm:text-sm ${textMutedClass} mt-0.5 sm:mt-1 line-clamp-2`}>{description}</p>
          </div>
          <PlusCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} group-hover:${greenTextClass} group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-all duration-300 flex-shrink-0`} />
        </div>
      </button>
    );
  };

  return (
    <main className={`min-h-screen ${bgClass} transition-colors duration-200`}>
      {/* Header */}
      <header className={`${cardBgClass} border-b ${borderClass} px-3 sm:px-4 py-3 sm:py-4 sticky top-0 z-10 backdrop-blur-md transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`sm:hidden p-2 rounded-lg ${hoverClass} border ${borderClass} transition-all hover:scale-105`}
                aria-label="Toggle menu"
              >
                <Menu className={`w-5 h-5 ${textMutedClass}`} />
              </button>
              
              <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r ${greenGradient} border ${greenBorderClass} flex-shrink-0`}>
                <Coffee className={`w-5 h-5 sm:w-6 sm:h-6 ${greenTextClass}`} />
              </div>
              
              <div className="min-w-0">
                <h1 className={`text-lg sm:text-2xl font-bold ${greenTextClass} truncate`}>Great Pearl Coffee</h1>
                <p className={`text-xs sm:text-sm ${textMutedClass} flex items-center gap-1 truncate`}>
                  <Shield className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Welcome back, <span className="font-medium ml-0.5">{user?.email}</span></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className={`hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${textMutedClass} ${hoverClass} rounded-lg transition-all border ${borderClass} hover:scale-[1.02]`}
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${textMutedClass} ${hoverClass} rounded-lg transition-all border ${borderClass} hover:scale-[1.02]`}
              >
                {logoutLoading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden sm:inline">{logoutLoading ? "..." : "Logout"}</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`sm:hidden mt-3 p-3 rounded-lg border ${borderClass} ${cardBgClass} animate-in slide-in-from-top-5 duration-200`}>
              <div className="space-y-2">
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${textMutedClass} ${hoverClass} rounded-lg transition-all border ${borderClass}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <p className={`text-xs ${textMutedClass} px-2 py-1`}>Quick Actions:</p>
                <button
                  onClick={() => { setModalOpen("coffee"); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${textClass} ${hoverClass} rounded-lg transition-all border ${borderClass} w-full text-left`}
                >
                  <Coffee className="w-4 h-4" />
                  Add Coffee Record
                </button>
                <button
                  onClick={() => { setModalOpen("millingTx"); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${textClass} ${hoverClass} rounded-lg transition-all border ${borderClass} w-full text-left`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Add Milling Tx
                </button>
                <button
                  onClick={() => { setModalOpen("millingCustomer"); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${textClass} ${hoverClass} rounded-lg transition-all border ${borderClass} w-full text-left`}
                >
                  <UserPlus className="w-4 h-4" />
                  Add Milling Customer
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <section className="px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Action Cards */}
          <div className="mb-6 sm:mb-8">
            <h2 className={`text-lg sm:text-xl font-semibold ${textClass} mb-4 sm:mb-6 flex items-center gap-2`}>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              <ActionButton
                onClick={() => setModalOpen("coffee")}
                label="Add Coffee Record"
                icon={Coffee}
                description="Record new coffee deliveries from suppliers"
                color="emerald"
              />
              <ActionButton
                onClick={() => setModalOpen("millingTx")}
                label="Add Milling Transaction"
                icon={ClipboardList}
                description="Record milling services for customers"
                color="green"
              />
              <ActionButton
                onClick={() => setModalOpen("millingCustomer")}
                label="Add Milling Customer"
                icon={UserPlus}
                description="Add new milling customers to your system"
                color="teal"
              />
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="mb-6 sm:mb-8">
            <h2 className={`text-lg sm:text-xl font-semibold ${textClass} mb-4 sm:mb-6 flex items-center gap-2`}>
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
              Quick Navigation
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              <Link
                href="/suppliers"
                className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-4 sm:p-6 hover:border-emerald-300/50 hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 group hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${greenGradient} border ${greenBorderClass} group-hover:scale-110 transition-transform duration-300`}>
                    <Users className={`w-4 h-4 sm:w-6 sm:h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors duration-300 text-sm sm:text-base truncate`}>
                      Manage Suppliers
                    </h3>
                    <p className={`text-xs sm:text-sm ${textMutedClass} mt-0.5 sm:mt-1 line-clamp-2`}>View and manage suppliers</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} group-hover:${greenTextClass} group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-all duration-300 flex-shrink-0`} />
                </div>
              </Link>

              <Link
                href="/coffee-records"
                className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-4 sm:p-6 hover:border-emerald-300/50 hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 group hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${greenGradient} border ${greenBorderClass} group-hover:scale-110 transition-transform duration-300`}>
                    <Coffee className={`w-4 h-4 sm:w-6 sm:h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors duration-300 text-sm sm:text-base truncate`}>
                      Coffee Records
                    </h3>
                    <p className={`text-xs sm:text-sm ${textMutedClass} mt-0.5 sm:mt-1 line-clamp-2`}>Manage delivery records</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} group-hover:${greenTextClass} group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-all duration-300 flex-shrink-0`} />
                </div>
              </Link>

              <Link
                href="/milling"
                className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-4 sm:p-6 hover:border-emerald-300/50 hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 group hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${greenGradient} border ${greenBorderClass} group-hover:scale-110 transition-transform duration-300`}>
                    <Package className={`w-4 h-4 sm:w-6 sm:h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors duration-300 text-sm sm:text-base truncate`}>
                      Milling Records
                    </h3>
                    <p className={`text-xs sm:text-sm ${textMutedClass} mt-0.5 sm:mt-1 line-clamp-2`}>Create batches & track milling</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${textMutedClass} group-hover:${greenTextClass} group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-all duration-300 flex-shrink-0`} />
                </div>
              </Link>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className={`text-lg sm:text-xl font-semibold ${textClass} flex items-center gap-2`}>
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Dashboard Overview
              </h2>

              <div className="flex items-center gap-1 sm:gap-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 backdrop-blur-sm">
                <Filter className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2 ${textMutedClass}`} />
                {(["daily", "weekly", "monthly"] as TimeFilter[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTimeFilter(k)}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all duration-200 ${
                      timeFilter === k
                        ? `${cardBgClass} ${textClass} shadow-sm scale-[1.02]`
                        : `${textMutedClass} hover:${textClass} hover:scale-[1.02]`
                    }`}
                    type="button"
                  >
                    {k === "daily" ? "Day" : k === "weekly" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            {statsLoading ? (
              <div className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-6 sm:p-12 text-center`}>
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 animate-spin mx-auto mb-3 sm:mb-4" />
                <p className={`text-sm ${textMutedClass}`}>Loading statistics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 sm:gap-6">
                {[
                  { label: "Total Suppliers", value: stats?.totalSuppliers || 0, icon: Users },
                  { label: "Total Records", value: stats?.totalCoffeeRecords || 0, icon: Coffee },
                  { label: timeLabel, value: filteredStats.records, icon: Calendar, subtext: `${filteredStats.bags} bags` },
                  { label: `${timeLabel} Kgs`, value: filteredStats.kilograms.toLocaleString(), icon: BarChart3 },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`${cardBgClass} rounded-xl sm:rounded-2xl border ${borderClass} p-3 sm:p-6 transition-all duration-300 hover:shadow-lg sm:hover:shadow-xl hover:scale-[1.02] group`}
                  >
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${greenGradient} border ${greenBorderClass} group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${greenTextClass}`} />
                      </div>
                      <div className="text-right min-w-0">
                        <p className={`text-xl sm:text-3xl font-bold ${greenTextClass} truncate`}>{stat.value}</p>
                        {stat.subtext && (
                          <p className={`text-[10px] sm:text-xs ${textMutedClass} mt-0.5 sm:mt-1 truncate`}>{stat.subtext}</p>
                        )}
                      </div>
                    </div>
                    <h3 className={`text-xs sm:text-sm font-medium ${textClass} truncate`}>{stat.label}</h3>
                    <div className="mt-1.5 sm:mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${greenGradient} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, (Number(stat.value) / 1000) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      {modalOpen === "coffee" && (
        <ModalShell title="Add Coffee Record" onClose={() => setModalOpen(null)}>
          {CoffeeForm}
        </ModalShell>
      )}
      {modalOpen === "millingTx" && (
        <ModalShell title="Add Milling Transaction" onClose={() => setModalOpen(null)}>
          {MillingTxForm}
        </ModalShell>
      )}
      {modalOpen === "millingCustomer" && (
        <ModalShell title="Add Milling Customer" onClose={() => setModalOpen(null)}>
          {MillingCustomerForm}
        </ModalShell>
      )}
    </main>
  );
}