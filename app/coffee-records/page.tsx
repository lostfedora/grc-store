"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Coffee,
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
} from "lucide-react";

type CoffeeRecord = {
  id: string;
  coffee_type: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier_id: string | null;
  supplier_name: string;
  status: string;
  batch_number: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

const STATUS_OPTIONS = [
  "all",
  "pending",
  "quality_review",
  "pricing",
  "batched",
  "drying",
  "sales",
  "inventory",
  "submitted_to_finance",
  "assessed",
  "rejected",
];

const getStatusColor = (status: string) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    quality_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    pricing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    batched: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    drying: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    sales: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    inventory: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    submitted_to_finance: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    assessed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function CoffeeRecordsListPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [records, setRecords] = useState<CoffeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<CoffeeRecord | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auth check + initial load
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      fetchCoffeeRecords();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchCoffeeRecords = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("coffee_records")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords((data || []) as CoffeeRecord[]);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoadingList(true);
    setError(null);

    const { data, error } = await supabase
      .from("coffee_records")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords((data || []) as CoffeeRecord[]);
    }

    setLoadingList(false);
  };

  const handleViewDetails = (record: CoffeeRecord) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const filteredRecords = useMemo(() => {
    let list = records;

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter(
      (r) =>
        r.supplier_name.toLowerCase().includes(term) ||
        r.batch_number.toLowerCase().includes(term) ||
        r.coffee_type.toLowerCase().includes(term)
    );
  }, [records, search, statusFilter]);

  if (loading && !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 border border-green-200 dark:border-green-800 transition-colors">
                <Coffee className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-700 dark:text-green-400">
                  Coffee Records
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All coffee deliveries captured by the store
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>

              <button
                onClick={handleRefresh}
                disabled={loadingList}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingList ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Refresh
              </button>

              <Link
                href="/coffee-records/new"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Record
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by supplier, batch, or coffee type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st === "all" ? "All Statuses" : formatStatus(st)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredRecords.length} of {records.length} records
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-500 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    Error loading coffee records: {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center transition-colors">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading coffee records...</p>
            </div>
          ) : (
            <>
              {/* Records Grid */}
              {filteredRecords.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center transition-colors">
                  <Coffee className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {search || statusFilter !== "all"
                      ? "No records found"
                      : "No coffee records yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {search || statusFilter !== "all"
                      ? "Try adjusting your search terms or filters to find what you're looking for."
                      : "Get started by capturing your first coffee delivery record."}
                  </p>
                  {!search && statusFilter === "all" && (
                    <Link
                      href="/coffee-records/new"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Create First Record
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg dark:hover:shadow-slate-700/20 transition-all duration-200 hover:border-green-200 dark:hover:border-green-800 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                            {record.batch_number}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {formatStatus(record.status)}
                          </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                          <Coffee className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        {/* Date */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {record.date}
                            </p>
                          </div>
                        </div>

                        {/* Supplier */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                            <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {record.supplier_name}
                            </p>
                          </div>
                        </div>

                        {/* Coffee Type */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Coffee Type</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {record.coffee_type}
                            </p>
                          </div>
                        </div>

                        {/* Weight and Bags */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                              <Scale className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                {Number(record.kilograms).toLocaleString()} kg
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                              <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Bags</p>
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                {record.bags}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="w-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 px-4 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Stats */}
              {!loading && records.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Records
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {records.length}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                        <Coffee className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Weight
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {records
                            .reduce((sum, r) => sum + r.kilograms, 0)
                            .toLocaleString()}{" "}
                          kg
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                        <Scale className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Bags
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {records
                            .reduce((sum, r) => sum + r.bags, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                        <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {filteredRecords.length}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                        <Filter className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Details Modal */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Record Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete information for this coffee record
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Batch and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Batch Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Batch Number</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {selectedRecord.batch_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coffee Type</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {selectedRecord.coffee_type}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Status & Dates
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          selectedRecord.status
                        )}`}
                      >
                        {formatStatus(selectedRecord.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Delivery Date</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatDate(selectedRecord.date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Supplier Information
                </h3>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedRecord.supplier_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Supplier ID: {selectedRecord.supplier_id || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Delivery Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Weight</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-400">
                            {Number(
                              selectedRecord.kilograms
                            ).toLocaleString()}{" "}
                            kg
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Bags</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                            {selectedRecord.bags} bags
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    System Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700 transition-colors">
                      <span className="text-gray-600 dark:text-gray-400">Created By</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedRecord.created_by || "System"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700 transition-colors">
                      <span className="text-gray-600 dark:text-gray-400">Created At</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedRecord.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedRecord.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 rounded-b-2xl transition-colors">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Close
              </button>
              <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                <Edit className="w-4 h-4" />
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}