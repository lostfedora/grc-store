"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Users,
  Plus,
  RefreshCcw,
  Search,
  Loader2,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  X,
  Edit,
  FileText,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  origin: string;
  opening_balance: number;
  date_registered: string;
  created_at: string;
  updated_at: string;
};

const PAGE_SIZE = 15;

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

export default function SuppliersListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOrigin, setEditOrigin] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState("");
  const [editDateRegistered, setEditDateRegistered] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Initialize theme from localStorage / prefers-color-scheme (no toggle here)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;

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

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
      fetchSuppliers();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setSuppliers([]);
    } else {
      setSuppliers((data || []) as Supplier[]);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoadingList(true);
    setError(null);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setSuppliers([]);
    } else {
      setSuppliers((data || []) as Supplier[]);
    }

    setLoadingList(false);
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setEditName(supplier.name);
    setEditCode(supplier.code);
    setEditPhone(supplier.phone || "");
    setEditOrigin(supplier.origin);
    setEditOpeningBalance(String(supplier.opening_balance));
    setEditDateRegistered(supplier.date_registered);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditSupplier(null);
    setSavingEdit(false);
    setEditError(null);
  };

  const handleOpenEditFromDetails = () => {
    if (!selectedSupplier) return;
    openEditModal(selectedSupplier);
    closeModal();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupplier) return;

    const openingBalance = Number(editOpeningBalance || "0");

    if (!editName.trim()) {
      setEditError("Supplier name is required.");
      return;
    }
    if (!editCode.trim()) {
      setEditError("Supplier code is required.");
      return;
    }
    if (!editOrigin.trim()) {
      setEditError("Origin is required.");
      return;
    }
    if (isNaN(openingBalance) || openingBalance < 0) {
      setEditError("Opening balance must be a valid number (>= 0).");
      return;
    }
    if (!editDateRegistered) {
      setEditError("Date registered is required.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: editName.trim(),
          code: editCode.trim(),
          phone: editPhone.trim() || null,
          origin: editOrigin.trim(),
          opening_balance: openingBalance,
          date_registered: editDateRegistered,
        })
        .eq("id", editSupplier.id);

      if (error) {
        setEditError(error.message);
        setSavingEdit(false);
        return;
      }

      // Update local state
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editSupplier.id
            ? {
                ...s,
                name: editName.trim(),
                code: editCode.trim(),
                phone: editPhone.trim() || null,
                origin: editOrigin.trim(),
                opening_balance: openingBalance,
                date_registered: editDateRegistered,
                updated_at: new Date().toISOString(),
              }
            : s
        )
      );

      closeEditModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to update supplier.");
      setSavingEdit(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;

    const term = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.phone ?? "").toLowerCase().includes(term) ||
        s.origin.toLowerCase().includes(term)
    );
  }, [suppliers, search]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSuppliers.length / PAGE_SIZE)
  );

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, currentPage]);

  const totalOpeningBalanceAll = useMemo(
    () =>
      suppliers.reduce(
        (sum, s) => sum + Number(s.opening_balance || 0),
        0
      ),
    [suppliers]
  );

  const totalOpeningBalanceFiltered = useMemo(
    () =>
      filteredSuppliers.reduce(
        (sum, s) => sum + Number(s.opening_balance || 0),
        0
      ),
    [filteredSuppliers]
  );

  if (loading && !user) {
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
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 border border-green-200/60 dark:border-green-700/60">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-700 dark:text-green-300">
                  Suppliers
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage all coffee suppliers in the system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Back to Dashboard – icon only */}
              <Link
                href="/"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="sr-only">Back to Dashboard</span>
              </Link>

              {/* Refresh – icon only */}
              <button
                onClick={handleRefresh}
                disabled={loadingList}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                aria-label="Refresh suppliers"
              >
                {loadingList ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                <span className="sr-only">Refresh suppliers</span>
              </button>

              <Link
                href="/suppliers/new"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search + view mode + counts */}
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, code, phone, or origin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/80 focus:border-green-500 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md ${
                      viewMode === "grid"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
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
                    className={`p-2 rounded-md ${
                      viewMode === "list"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    <div className="w-4 h-4 flex flex-col gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-current rounded-sm h-1" />
                      ))}
                    </div>
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg px-3 py-2">
                  Showing {paginatedSuppliers.length} of{" "}
                  {filteredSuppliers.length} filtered (
                  {suppliers.length} total)
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
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
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    Error loading suppliers: {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Loading suppliers...
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards on top (using filtered + overall data) */}
              {!loading && suppliers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered Suppliers
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {filteredSuppliers.length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Out of {suppliers.length} total
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered Opening Balance
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {totalOpeningBalanceFiltered.toLocaleString()} UGX
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Only suppliers in current view
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Opening Balance
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {totalOpeningBalanceAll.toLocaleString()} UGX
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Across all suppliers
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {filteredSuppliers.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {search ? "No suppliers found" : "No suppliers yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {search
                      ? "Try adjusting your search terms to find what you're looking for."
                      : "Get started by adding your first supplier to the system."}
                  </p>
                  {!search && (
                    <Link
                      href="/suppliers/new"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                      Add Your First Supplier
                    </Link>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-green-200 dark:hover:border-green-500/60 transition-all duration-200 group"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 line-clamp-1">
                            {supplier.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                            {supplier.code}
                          </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                          <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 text-sm">
                        {/* Phone */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                            <Phone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Phone
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {supplier.phone || "Not provided"}
                            </p>
                          </div>
                        </div>

                        {/* Origin */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                            <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Origin
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {supplier.origin}
                            </p>
                          </div>
                        </div>

                        {/* Opening Balance */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                            <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Opening Balance
                            </p>
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                              {Number(
                                supplier.opening_balance
                              ).toLocaleString()}{" "}
                              UGX
                            </p>
                          </div>
                        </div>

                        {/* Date Registered */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5">
                            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Date Registered
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {supplier.date_registered}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(supplier)}
                          className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 py-2.5 px-4 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit supplier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Code
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Phone
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Origin
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Opening Balance
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Date Registered
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSuppliers.map((supplier) => (
                          <tr
                            key={supplier.id}
                            className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                          >
                            <td className="py-3 px-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {supplier.name}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                              {supplier.code}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                              {supplier.phone || (
                                <span className="text-gray-400">
                                  Not provided
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                              {supplier.origin}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300">
                              {Number(
                                supplier.opening_balance
                              ).toLocaleString()}{" "}
                              UGX
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
                              {supplier.date_registered}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(supplier)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(supplier)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                  title="Edit supplier"
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

              {/* Pagination */}
              {filteredSuppliers.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Page{" "}
                    <span className="font-semibold">{currentPage}</span> of{" "}
                    <span className="font-semibold">{totalPages}</span> • Showing{" "}
                    {paginatedSuppliers.length} suppliers
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      {currentPage}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(totalPages, p + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Supplier Details Modal */}
      {isModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-950 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Supplier Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete information for this supplier
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Supplier Name
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {selectedSupplier.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Supplier Code
                      </p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                        {selectedSupplier.code}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Phone Number
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {selectedSupplier.phone || (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Origin / Location
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {selectedSupplier.origin}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Financial Information
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200/80 dark:border-green-700/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Opening Balance
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {Number(
                            selectedSupplier.opening_balance
                          ).toLocaleString()}{" "}
                          UGX
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Registration Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Date Registered
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(selectedSupplier.date_registered)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Registration Status
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    System Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-gray-600 dark:text-gray-400">
                        Created At
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(selectedSupplier.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Last Updated
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDateTime(selectedSupplier.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
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
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Supplier Summary
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      This supplier was registered on{" "}
                      {formatDate(selectedSupplier.date_registered)} and has an
                      opening balance of{" "}
                      {Number(
                        selectedSupplier.opening_balance
                      ).toLocaleString()}{" "}
                      UGX.
                      {selectedSupplier.phone && " Contact information is available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleOpenEditFromDetails}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {isEditModalOpen && editSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-950 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Edit Supplier
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Code:{" "}
                  <span className="font-semibold">{editSupplier.code}</span>
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Supplier Code
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Supplier code"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Origin / Location
                </label>
                <input
                  type="text"
                  value={editOrigin}
                  onChange={(e) => setEditOrigin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g. Kasese, Mbarara..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Opening Balance (UGX)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={editOpeningBalance}
                    onChange={(e) =>
                      setEditOpeningBalance(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g. 0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Date Registered
                  </label>
                  <input
                    type="date"
                    value={editDateRegistered}
                    onChange={(e) =>
                      setEditDateRegistered(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {editError && (
                <div className="text-xs p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Save Changes
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
