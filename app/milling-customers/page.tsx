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

  const totalOpening = useMemo(
    () =>
      customers.reduce(
        (sum, c) => sum + Number(c.opening_balance || 0),
        0
      ),
    [customers]
  );

  const totalBalance = useMemo(
    () =>
      customers.reduce(
        (sum, c) => sum + Number(c.current_balance || 0),
        0
      ),
    [customers]
  );

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
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors"
                  >
                    <option value="all">All Status</option>
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredCustomers.length} of {customers.length} customers
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
              {/* Records Grid */}
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer) => (
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
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
                        <button
                          onClick={() => handleViewDetails(customer)}
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
              {!loading && customers.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Customers
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {customers.length}
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
                          Opening Balances
                        </p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                          UGX {totalOpening.toLocaleString()}
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
                          Current Balances
                        </p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                          UGX {totalBalance.toLocaleString()}
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
                          Filtered
                        </p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {filteredCustomers.length}
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
              {/* You can later wire this to /milling-customers/[id]/edit */}
              {/* <Link
                href={`/milling-customers/${selectedCustomer.id}/edit`}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit Customer
              </Link> */}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
