"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [isDark, setIsDark] = useState(false);

  // Check system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchDashboardStats = async () => {
    setStatsLoading(true);

    try {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7
      );
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Suppliers count
      const { count: suppliersCount, error: suppliersError } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true });

      if (suppliersError) {
        console.error("Error fetching suppliers count:", suppliersError);
      }

      // Coffee records
      const {
        data: recordsData,
        error: recordsError,
        count: totalRecordsCount,
      } = await supabase
        .from("coffee_records")
        .select("kilograms,bags,date", { count: "exact" });

      if (recordsError) {
        console.error("Error fetching coffee records:", recordsError);
        return;
      }

      const records = recordsData || [];

      const parseDate = (d: string | null | undefined) =>
        d ? new Date(d) : null;

      const sumBags = (rows: any[]) =>
        rows.reduce((sum, r) => sum + (r.bags || 0), 0);

      const sumKilograms = (rows: any[]) =>
        rows.reduce(
          (sum, r) => sum + (Number(r.kilograms || 0) || 0),
          0
        );

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

      const dailyBags = sumBags(dailyRecordsArr);
      const dailyKilograms = sumKilograms(dailyRecordsArr);

      const weeklyBags = sumBags(weeklyRecordsArr);
      const weeklyKilograms = sumKilograms(weeklyRecordsArr);

      const monthlyBags = sumBags(monthlyRecordsArr);
      const monthlyKilograms = sumKilograms(monthlyRecordsArr);

      setStats({
        totalSuppliers: suppliersCount || 0,
        totalCoffeeRecords: totalRecordsCount || records.length,
        totalBags,
        totalKilograms,
        dailyRecords: dailyRecordsArr.length,
        dailyBags,
        dailyKilograms,
        weeklyRecords: weeklyRecordsArr.length,
        weeklyBags,
        weeklyKilograms,
        monthlyRecords: monthlyRecordsArr.length,
        monthlyBags,
        monthlyKilograms,
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
        return {
          records: stats.dailyRecords,
          bags: stats.dailyBags,
          kilograms: stats.dailyKilograms,
        };
      case "weekly":
        return {
          records: stats.weeklyRecords,
          bags: stats.weeklyBags,
          kilograms: stats.weeklyKilograms,
        };
      case "monthly":
      default:
        return {
          records: stats.monthlyRecords,
          bags: stats.monthlyBags,
          kilograms: stats.monthlyKilograms,
        };
    }
  };

  const filteredStats = getFilteredStats();

  const timeLabel =
    timeFilter === "daily"
      ? "Today"
      : timeFilter === "weekly"
      ? "This Week"
      : "This Month";

  // Theme classes
  const bgClass = isDark ? "bg-gray-900" : "bg-gray-50";
  const cardBgClass = isDark ? "bg-gray-800" : "bg-white";
  const borderClass = isDark ? "border-gray-700" : "border-gray-200";
  const textClass = isDark ? "text-gray-100" : "text-gray-900";
  const textMutedClass = isDark ? "text-gray-400" : "text-gray-600";
  const hoverClass = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const greenTextClass = isDark ? "text-green-400" : "text-green-700";
  const greenBgClass = isDark ? "bg-green-900" : "bg-green-50";
  const greenBorderClass = isDark ? "border-green-800" : "border-green-200";

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

  return (
    <main className={`min-h-screen ${bgClass} transition-colors duration-200`}>
      {/* Header */}
      <header
        className={`${cardBgClass} border-b ${borderClass} px-4 py-4 transition-colors duration-200`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${greenTextClass}`}>
                Great Pearl Coffee
              </h1>
              <p className={`text-sm ${textMutedClass} mt-1`}>
                Welcome back,{" "}
                <span className={greenTextClass}>{user?.email}</span>
              </p>
            </div>

            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${textMutedClass} ${hoverClass} rounded-lg transition-colors border ${borderClass}`}
            >
              {logoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {logoutLoading ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Suppliers */}
              <Link
                href="/suppliers"
                className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`${greenBgClass} rounded-lg p-3 group-hover:${
                      isDark ? "bg-green-800" : "bg-green-100"
                    } transition-colors border ${greenBorderClass}`}
                  >
                    <Users className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}
                    >
                      Manage Suppliers
                    </h3>
                    <p className={`text-sm ${textMutedClass} mt-1`}>
                      View and manage suppliers
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`}
                  />
                </div>
              </Link>

              {/* Coffee Records */}
              <Link
                href="/coffee-records"
                className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`${greenBgClass} rounded-lg p-3 group-hover:${
                      isDark ? "bg-green-800" : "bg-green-100"
                    } transition-colors border ${greenBorderClass}`}
                  >
                    <Coffee className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}
                    >
                      Coffee Records
                    </h3>
                    <p className={`text-sm ${textMutedClass} mt-1`}>
                      Manage delivery records
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`}
                  />
                </div>
              </Link>

              {/* Milling Management */}
              <Link
                href="/milling"
                className={`${cardBgClass} rounded-lg border ${borderClass} p-6 hover:border-green-300 hover:shadow-sm transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`${greenBgClass} rounded-lg p-3 group-hover:${
                      isDark ? "bg-green-800" : "bg-green-100"
                    } transition-colors border ${greenBorderClass}`}
                  >
                    <Package className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${textClass} group-hover:${greenTextClass} transition-colors`}
                    >
                      Milling Records
                    </h3>
                    <p className={`text-sm ${textMutedClass} mt-1`}>
                      Create batches & track milling
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${textMutedClass} group-hover:${greenTextClass} transition-colors`}
                  />
                </div>
              </Link>
            </div>
          </div>

          {/* Stats Overview with Time Filter */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className={`text-lg font-semibold ${textClass}`}>Overview</h2>

              {/* Time Filter */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setTimeFilter("daily")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeFilter === "daily"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTimeFilter("weekly")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeFilter === "weekly"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimeFilter("monthly")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeFilter === "monthly"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {statsLoading ? (
              <div
                className={`${cardBgClass} rounded-lg border ${borderClass} p-8 text-center`}
              >
                <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
                <p className={textMutedClass}>Loading statistics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Suppliers */}
                <div
                  className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}
                >
                  <div
                    className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}
                  >
                    <Users className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <p className={`text-2xl font-bold ${greenTextClass}`}>
                    {stats?.totalSuppliers || 0}
                  </p>
                  <p className={`text-sm ${textMutedClass}`}>Total Suppliers</p>
                </div>

                {/* Total Coffee Records */}
                <div
                  className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}
                >
                  <div
                    className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}
                  >
                    <Coffee className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <p className={`text-2xl font-bold ${greenTextClass}`}>
                    {stats?.totalCoffeeRecords || 0}
                  </p>
                  <p className={`text-sm ${textMutedClass}`}>Total Records</p>
                </div>

                {/* Time-filtered Records + Bags */}
                <div
                  className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}
                >
                  <div
                    className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}
                  >
                    <Calendar className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <p className={`text-2xl font-bold ${greenTextClass}`}>
                    {filteredStats.records}
                  </p>
                  <p className={`text-xs ${textMutedClass}`}>
                    {timeLabel} · {filteredStats.bags} bags
                  </p>
                </div>

                {/* Time-filtered Kilograms */}
                <div
                  className={`${cardBgClass} rounded-lg border ${borderClass} p-4 text-center`}
                >
                  <div
                    className={`${greenBgClass} rounded-lg p-2 w-12 h-12 mx-auto mb-2 flex items-center justify-center border ${greenBorderClass}`}
                  >
                    <BarChart3 className={`w-6 h-6 ${greenTextClass}`} />
                  </div>
                  <p className={`text-2xl font-bold ${greenTextClass}`}>
                    {filteredStats.kilograms.toLocaleString()}
                  </p>
                  <p className={`text-xs ${textMutedClass}`}>
                    {timeLabel} · kilograms
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div
            className={`${cardBgClass} rounded-lg border ${borderClass} p-6`}
          >
            <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
              Recent Activity
            </h2>
            {statsLoading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto mb-2" />
                <p className={textMutedClass}>Loading activity...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`flex items-center justify-between py-2 border-b ${borderClass} last:border-b-0`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`${greenBgClass} rounded p-1.5 border ${greenBorderClass}`}
                    >
                      <Users className={`w-4 h-4 ${greenTextClass}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textClass}`}>
                        {stats?.totalSuppliers || 0} suppliers registered
                      </p>
                      <p className={`text-xs ${textMutedClass}`}>
                        Total in system
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between py-2 border-b ${borderClass} last:border-b-0`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`${greenBgClass} rounded p-1.5 border ${greenBorderClass}`}
                    >
                      <Coffee className={`w-4 h-4 ${greenTextClass}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textClass}`}>
                        {stats?.totalCoffeeRecords || 0} coffee records
                      </p>
                      <p className={`text-xs ${textMutedClass}`}>
                        All-time deliveries
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between py-2 border-b ${borderClass} last:border-b-0`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`${greenBgClass} rounded p-1.5 border ${greenBorderClass}`}
                    >
                      <BarChart3 className={`w-4 h-4 ${greenTextClass}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textClass}`}>
                        {stats?.totalKilograms.toLocaleString() || 0} kgs
                        received
                      </p>
                      <p className={`text-xs ${textMutedClass}`}>
                        Total weight all-time
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`${greenBgClass} rounded p-1.5 border ${greenBorderClass}`}
                    >
                      <Package className={`w-4 h-4 ${greenTextClass}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textClass}`}>
                        {stats?.monthlyKilograms.toLocaleString() || 0} kgs this
                        month
                      </p>
                      <p className={`text-xs ${textMutedClass}`}>
                        {stats?.monthlyRecords || 0} records ·{" "}
                        {stats?.monthlyBags || 0} bags
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
