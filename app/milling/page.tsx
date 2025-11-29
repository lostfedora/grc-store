"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Plus,
  RefreshCcw,
  Search,
  Filter,
  Loader2,
  ArrowLeft,
  Calendar,
  Package,
  User as UserIcon,
  Scale,
  BarChart3,
  X,
  Edit,
  FileText,
  Download,
  Eye,
} from "lucide-react";

type MillingTransaction = {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  kgs_hulled: number;
  rate_per_kg: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  transaction_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const StatusBadge = ({ type }: { type: string }) => {
  const getStatusColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        type
      )}`}
    >
      {formatLabel(type)}
    </span>
  );
};

export default function MillingTransactionsListPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [records, setRecords] = useState<MillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // View details modal
  const [selectedRecord, setSelectedRecord] = useState<MillingTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 👉 New: Edit / Record Balance modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MillingTransaction | null>(null);
  const [paymentInput, setPaymentInput] = useState<string>("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Auth check + initial load
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      fetchMillingTransactions();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchMillingTransactions = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("milling_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords((data || []) as MillingTransaction[]);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoadingList(true);
    setError(null);

    const { data, error } = await supabase
      .from("milling_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords((data || []) as MillingTransaction[]);
    }

    setLoadingList(false);
  };

  const handleViewDetails = (record: MillingTransaction) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  // 👉 New: open edit / record balance modal
  const openEditModal = (record: MillingTransaction) => {
    setEditRecord(record);
    setPaymentInput("");
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditRecord(null);
    setPaymentInput("");
    setSavingPayment(false);
    setEditError(null);
  };

  // 👉 From details modal, open edit then close details
  const handleOpenEditFromDetails = () => {
    if (!selectedRecord) return;
    openEditModal(selectedRecord);
    closeDetailsModal();
  };

  // 👉 Save additional payment & update balance
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;

    const payment = Number(paymentInput || "0");

    if (!payment || payment <= 0) {
      setEditError("Payment amount must be greater than 0.");
      return;
    }

    const remaining = Number(editRecord.total_amount) - Number(editRecord.amount_paid);

    if (payment > remaining) {
      setEditError(
        `Payment cannot be more than remaining balance (UGX ${remaining.toLocaleString()}).`
      );
      return;
    }

    setSavingPayment(true);
    setEditError(null);

    const newAmountPaid = Number(editRecord.amount_paid) + payment;
    const newBalance = Number(editRecord.total_amount) - newAmountPaid;

    try {
      const { error } = await supabase
        .from("milling_transactions")
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
        })
        .eq("id", editRecord.id);

      if (error) {
        setEditError(error.message);
        setSavingPayment(false);
        return;
      }

      // Update local state so UI stays in sync
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editRecord.id
            ? { ...r, amount_paid: newAmountPaid, balance: newBalance }
            : r
        )
      );

      closeEditModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to record payment.");
      setSavingPayment(false);
    }
  };

  const transactionTypes = useMemo(
    () => Array.from(new Set(records.map((r) => r.transaction_type))),
    [records]
  );

  const filteredRecords = useMemo(() => {
    let list = records;

    if (transactionTypeFilter !== "all") {
      list = list.filter((r) => r.transaction_type === transactionTypeFilter);
    }

    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter(
      (r) =>
        r.customer_name.toLowerCase().includes(term) ||
        (r.notes || "").toLowerCase().includes(term) ||
        r.transaction_type.toLowerCase().includes(term)
    );
  }, [records, search, transactionTypeFilter]);

  const totalKgs = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.kgs_hulled || 0), 0),
    [records]
  );

  const totalAmount = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.total_amount || 0), 0),
    [records]
  );

  const totalBalance = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.balance || 0), 0),
    [records]
  );

  if (loading && !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 blur-lg opacity-20 animate-pulse"></div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Checking session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700/80 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-3 shadow-lg shadow-green-500/20">
                  <Scale className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-30"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Milling Transactions
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Manage and track all milling operations
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>

              <button
                onClick={handleRefresh}
                disabled={loadingList}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                {loadingList ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Refresh
              </button>

              <Link
                href="/milling/new"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search & filters */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-3xl">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customers, notes, or types..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 shadow-sm hover:shadow-md"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={transactionTypeFilter}
                      onChange={(e) => setTransactionTypeFilter(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 text-sm font-medium"
                    >
                      <option value="all">All Types</option>
                      {transactionTypes.map((tt) => (
                        <option key={tt} value={tt}>
                          {formatLabel(tt)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg ${
                        viewMode === "grid"
                          ? "bg-green-500 text-white shadow-md shadow-green-500/25"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="bg-current rounded-sm" />
                        ))}
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg ${
                        viewMode === "list"
                          ? "bg-green-500 text-white shadow-md shadow-green-500/25"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <div className="w-4 h-4 flex flex-col gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="bg-current rounded-sm h-1" />
                        ))}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                {filteredRecords.length} of {records.length} transactions
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-800 dark:text-red-200 font-medium">
                      Failed to load transactions
                    </p>
                    <p className="text-red-600 dark:text-red-300 text-sm">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-lg">
              <div className="relative inline-block">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 blur-xl opacity-20 animate-pulse"></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Loading milling transactions...
              </p>
            </div>
          ) : (
            <>
              {filteredRecords.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center shadow-lg">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Scale className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {search || transactionTypeFilter !== "all"
                      ? "No transactions found"
                      : "No milling transactions yet"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto font-medium">
                    {search || transactionTypeFilter !== "all"
                      ? "Try adjusting your search terms or filters."
                      : "Get started by recording your first milling transaction."}
                  </p>
                  {!search && transactionTypeFilter === "all" && (
                    <Link
                      href="/milling/new"
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      <Plus className="w-5 h-5" />
                      Create First Transaction
                    </Link>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="group bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-2xl hover:-translate-y-1 hover:border-green-200 dark:hover:border-green-800 transition-all"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate mb-2">
                            {record.customer_name}
                          </h3>
                          <StatusBadge type={record.transaction_type} />
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-2.5">
                          <Scale className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Date
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatDate(record.date)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                            <Scale className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Kgs Hulled
                            </p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">
                              {Number(record.kgs_hulled).toLocaleString()} kg
                            </p>
                          </div>

                          <div className="text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Total Amount
                            </p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                              UGX {Number(record.total_amount).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                              Amount Paid
                            </p>
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">
                              UGX {Number(record.amount_paid).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                              Balance
                            </p>
                            <p className="font-bold text-rose-700 dark:text-rose-400">
                              UGX {Number(record.balance).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                          title="Record milling balance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Customer
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Type
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Date
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Kgs Hulled
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Total Amount
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Balance
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {record.customer_name}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {record.customer_id}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <StatusBadge type={record.transaction_type} />
                            </td>
                            <td className="py-4 px-6 text-sm font-medium text-slate-900 dark:text-white">
                              {formatDate(record.date)}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-green-700 dark:text-green-400">
                              {Number(record.kgs_hulled).toLocaleString()} kg
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white">
                              UGX {Number(record.total_amount).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-rose-700 dark:text-rose-400">
                              UGX {Number(record.balance).toLocaleString()}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(record)}
                                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(record)}
                                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                  title="Record milling balance"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quick stats */}
              {!loading && records.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      label: "Total Transactions",
                      value: records.length.toLocaleString(),
                      icon: FileText,
                    },
                    {
                      label: "Total Kgs Hulled",
                      value: `${totalKgs.toLocaleString()} kg`,
                      icon: Scale,
                    },
                    {
                      label: "Total Amount",
                      value: `UGX ${totalAmount.toLocaleString()}`,
                      icon: BarChart3,
                    },
                    {
                      label: "Outstanding Balance",
                      value: `UGX ${totalBalance.toLocaleString()}`,
                      icon: Package,
                    },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {stat.label}
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stat.value}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                          <stat.icon className="w-6 h-6 text-slate-600 dark:text-slate-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Details Modal (unchanged except footer button) */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-3 shadow-lg shadow-green-500/20">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Transaction Details
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Complete information for this milling record
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-green-600" />
                    Customer Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Customer Name
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {selectedRecord.customer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Customer ID
                      </p>
                      <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                        {selectedRecord.customer_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Transaction Info
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Transaction Type
                      </p>
                      <StatusBadge type={selectedRecord.transaction_type} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Date
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {formatDate(selectedRecord.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800/30">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-green-600" />
                    Milling Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          Kgs Hulled
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {Number(selectedRecord.kgs_hulled).toLocaleString()} kg
                        </p>
                      </div>
                      <Scale className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          Rate per Kg
                        </p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                          UGX {Number(selectedRecord.rate_per_kg).toLocaleString()}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Financial Summary
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Total Amount",
                        value: selectedRecord.total_amount,
                      },
                      {
                        label: "Amount Paid",
                        value: selectedRecord.amount_paid,
                      },
                      {
                        label: "Balance",
                        value: selectedRecord.balance,
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg"
                      >
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {item.label}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          UGX {Number(item.value).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Notes
                  </h3>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 min-h-[120px]">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedRecord.notes || "No notes recorded for this transaction."}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    System Information
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Created By", value: selectedRecord.created_by },
                      {
                        label: "Created At",
                        value: formatDateTime(selectedRecord.created_at),
                      },
                      {
                        label: "Last Updated",
                        value: formatDateTime(selectedRecord.updated_at),
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600 last:border-0"
                      >
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white text-right">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-8 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-b-3xl">
              <button
                onClick={closeDetailsModal}
                className="px-6 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleOpenEditFromDetails}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30"
                >
                  <Edit className="w-4 h-4" />
                  Record Milling Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👉 New: Edit / Record Balance Modal */}
      {isEditModalOpen && editRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Record Milling Balance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Customer:{" "}
                  <span className="font-semibold">{editRecord.customer_name}</span>
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-lg p-3">
                  <p className="text-slate-500 dark:text-slate-400">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(editRecord.date)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-lg p-3">
                  <p className="text-slate-500 dark:text-slate-400">Kgs Hulled</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {Number(editRecord.kgs_hulled).toLocaleString()} kg
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-lg p-3">
                  <p className="text-slate-500 dark:text-slate-400">Total Amount</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    UGX {Number(editRecord.total_amount).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-lg p-3">
                  <p className="text-slate-500 dark:text-slate-400">Already Paid</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    UGX {Number(editRecord.amount_paid).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/60 rounded-lg p-3 col-span-2">
                  <p className="text-slate-500 dark:text-slate-400">Current Balance</p>
                  <p className="font-semibold text-rose-700 dark:text-rose-300">
                    UGX {Number(editRecord.balance).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Payment Amount (UGX)
                </label>
                <input
                  id="payment"
                  type="number"
                  min={0}
                  step="1"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. 15000"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  This is an <span className="font-semibold">additional payment</span>{" "}
                  for this transaction. System will add it to the existing paid amount
                  and reduce the balance.
                </p>
              </div>

              {editError && (
                <div className="text-xs p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Save Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
