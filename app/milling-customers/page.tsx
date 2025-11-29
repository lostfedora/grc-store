"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Users,
  Plus,
  RefreshCcw,
  Search,
  Filter,
  Loader2,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  X,
  FileText,
  User as UserIcon,
  Edit,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

type MillingCustomer = {
  id: string;
  full_name: string;
  opening_balance: number;
  current_balance: number;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  status: string;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PAGE_SIZE = 15;

export default function MillingCustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [customers, setCustomers] = useState<MillingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] =
    useState<MillingCustomer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<MillingCustomer | null>(
    null
  );
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState("");
  const [editCurrentBalance, setEditCurrentBalance] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
      fetchCustomers();
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("milling_customers")
      .select("*")
      .order("full_name", { ascending: true })
      .limit(500);

    if (error) {
      setError(error.message);
      setCustomers([]);
    } else {
      setCustomers((data || []) as MillingCustomer[]);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoadingList(true);
    setError(null);

    const { data, error } = await supabase
      .from("milling_customers")
      .select("*")
      .order("full_name", { ascending: true })
      .limit(500);

    if (error) {
      setError(error.message);
      setCustomers([]);
    } else {
      setCustomers((data || []) as MillingCustomer[]);
    }

    setLoadingList(false);
  };

  const handleViewDetails = (customer: MillingCustomer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  const statusOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.status))),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        (c.address || "").toLowerCase().includes(term)
    );
  }, [customers, search, statusFilter]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE)
  );

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  const totalOpeningAll = useMemo(
    () =>
      customers.reduce(
        (sum, c) => sum + Number(c.opening_balance || 0),
        0
      ),
    [customers]
  );

  const totalBalanceAll = useMemo(
    () =>
      customers.reduce(
        (sum, c) => sum + Number(c.current_balance || 0),
        0
      ),
    [customers]
  );

  const totalOpeningFiltered = useMemo(
    () =>
      filteredCustomers.reduce(
        (sum, c) => sum + Number(c.opening_balance || 0),
        0
      ),
    [filteredCustomers]
  );

  const totalBalanceFiltered = useMemo(
    () =>
      filteredCustomers.reduce(
        (sum, c) => sum + Number(c.current_balance || 0),
        0
      ),
    [filteredCustomers]
  );

  const openEditModal = (customer: MillingCustomer) => {
    setEditCustomer(customer);
    setEditFullName(customer.full_name);
    setEditPhone(customer.phone || "");
    setEditAddress(customer.address || "");
    setEditOpeningBalance(String(customer.opening_balance));
    setEditCurrentBalance(String(customer.current_balance));
    setEditStatus(customer.status);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditCustomer(null);
    setSavingEdit(false);
    setEditError(null);
  };

  const handleOpenEditFromDetails = () => {
    if (!selectedCustomer) return;
    openEditModal(selectedCustomer);
    closeModal();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;

    const openingBalance = Number(editOpeningBalance || "0");
    const currentBalance = Number(editCurrentBalance || "0");

    if (!editFullName.trim()) {
      setEditError("Customer name is required.");
      return;
    }
    if (!editStatus.trim()) {
      setEditError("Status is required.");
      return;
    }
    if (isNaN(openingBalance) || isNaN(currentBalance)) {
      setEditError("Opening and current balances must be valid numbers.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const { error } = await supabase
        .from("milling_customers")
        .update({
          full_name: editFullName.trim(),
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          opening_balance: openingBalance,
          current_balance: currentBalance,
          status: editStatus.trim(),
        })
        .eq("id", editCustomer.id);

      if (error) {
        setEditError(error.message);
        setSavingEdit(false);
        return;
      }

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editCustomer.id
            ? {
                ...c,
                full_name: editFullName.trim(),
                phone: editPhone.trim() || null,
                address: editAddress.trim() || null,
                opening_balance: openingBalance,
                current_balance: currentBalance,
                status: editStatus.trim(),
                updated_at: new Date().toISOString(),
              }
            : c
        )
      );

      // If details modal is open for this customer, keep it in sync
      if (selectedCustomer && selectedCustomer.id === editCustomer.id) {
        setSelectedCustomer((prev) =>
          prev
            ? {
                ...prev,
                full_name: editFullName.trim(),
                phone: editPhone.trim() || null,
                address: editAddress.trim() || null,
                opening_balance: openingBalance,
                current_balance: currentBalance,
                status: editStatus.trim(),
                updated_at: new Date().toISOString(),
              }
            : prev
        );
      }

      closeEditModal();
    } catch (err: any) {
      setEditError(err.message || "Failed to update customer.");
      setSavingEdit(false);
    }
  };

  if (loading && !user) {
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 border border-green-200 dark:border-green-800 transition-colors">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-700 dark:text-green-400">
                  Milling Customers
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customers with milling / hulling accounts at Great Pearl Coffee
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
                href="/milling-customers/new"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Customer
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Search, filters, view toggle */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors text-sm"
                  >
                    <option value="all">All Status</option>
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-1">
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

                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                    Showing {paginatedCustomers.length} of{" "}
                    {filteredCustomers.length} filtered ({customers.length} total)
                  </div>
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
                    Error loading milling customers: {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center transition-colors">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading milling customers...
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards on top */}
              {!loading && customers.length > 0 && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered Customers
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {filteredCustomers.length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Out of {customers.length} total
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered Opening Balances
                        </p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                          UGX {totalOpeningFiltered.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Only in current view
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 transition-colors">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Filtered Current Balances
                        </p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                          UGX {totalBalanceFiltered.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Only in current view
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2 transition-colors">
                        <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Current Balances
                        </p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                          UGX {totalBalanceAll.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Across all customers
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2 transition-colors">
                        <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Records */}
              {filteredCustomers.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center transition-colors">
                  <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {search || statusFilter !== "all"
                      ? "No customers found"
                      : "No milling customers yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {search || statusFilter !== "all"
                      ? "Try adjusting your search terms or filters."
                      : "Get started by registering your first milling customer."}
                  </p>
                  {!search && statusFilter === "all" && (
                    <Link
                      href="/milling-customers/new"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Create First Customer
                    </Link>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg dark:hover:shadow-slate-700/20 transition-all duration-200 hover:border-green-200 dark:hover:border-green-800 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                            {customer.full_name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {customer.status}
                          </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 transition-colors">
                          <UserIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        {/* Phone */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                            <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Phone
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {customer.phone || "Not provided"}
                            </p>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-1.5 transition-colors">
                            <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Address
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {customer.address || "Not provided"}
                            </p>
                          </div>
                        </div>

                        {/* Balances */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Opening Balance
                            </p>
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                              UGX{" "}
                              {Number(
                                customer.opening_balance
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Current Balance
                            </p>
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                              UGX{" "}
                              {Number(
                                customer.current_balance
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="flex-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 px-4 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700 text-xs">
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Phone
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Address
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Opening Bal.
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Current Bal.
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className="border-b border-gray-100 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors text-xs sm:text-sm"
                          >
                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                              {customer.full_name}
                            </td>
                            <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                              {customer.phone || (
                                <span className="text-gray-400">
                                  Not provided
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                              {customer.address || (
                                <span className="text-gray-400">
                                  Not provided
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-400">
                              UGX{" "}
                              {Number(
                                customer.opening_balance
                              ).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-red-700 dark:text-red-400">
                              UGX{" "}
                              {Number(
                                customer.current_balance
                              ).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                  customer.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {customer.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(customer)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(customer)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                  title="Edit customer"
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
              {filteredCustomers.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Page{" "}
                    <span className="font-semibold">{currentPage}</span> of{" "}
                    <span className="font-semibold">{totalPages}</span> • Showing{" "}
                    {paginatedCustomers.length} customers
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                      {currentPage}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(totalPages, p + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 disabled:opacity-40 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
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

      {/* Details Modal */}
      {isModalOpen && selectedCustomer && (
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
                    Customer Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Full information for this milling customer
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
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Full Name
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {selectedCustomer.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedCustomer.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {selectedCustomer.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Contact
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Phone
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedCustomer.phone || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Address
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedCustomer.address || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balances & System Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Balance Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700 transition-colors">
                      <span className="text-gray-600 dark:text-gray-400">
                        Opening Balance
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        UGX{" "}
                        {Number(
                          selectedCustomer.opening_balance
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current Balance
                      </span>
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        UGX{" "}
                        {Number(
                          selectedCustomer.current_balance
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    System Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700 transition-colors">
                      <span className="text-gray-600 dark:text-gray-400">
                        Created At
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedCustomer.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        Last Updated
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(selectedCustomer.updated_at)}
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
              <button
                onClick={handleOpenEditFromDetails}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && editCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-2xl transition-colors">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Milling Customer
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {editCustomer.full_name}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Customer full name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Optional"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Current Balance (UGX)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editCurrentBalance}
                    onChange={(e) =>
                      setEditCurrentBalance(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              {editError && (
                <div className="text-xs p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
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
