"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ArrowLeft,
  Coffee,
  TrendingUp,
  Users,
  Package,
  Scale,
  BarChart3,
  Award,
  Star,
  Loader2,
  Printer,
  Download,
  Filter,
  X,
  SlidersHorizontal,
  RefreshCw,
  Activity,
  PieChart as PieChartIcon,
  Zap,
  Calendar,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Eye,
  History,
  Truck,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

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
};

type Supplier = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  origin: string;
  opening_balance: number;
  date_registered: string;
};

type SupplierPerformance = {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  origin: string;
  total_kilograms: number;
  total_bags: number;
  total_deliveries: number;
  coffee_types: Record<string, number>;
  average_bag_weight: number;
  last_delivery_date: string | null;
  performance_score: number;
};

type Transaction = {
  id: string;
  date: string;
  batch_number: string;
  coffee_type: string;
  kilograms: number;
  bags: number;
  status: string;
};

const SUPPLIERS_PAGE_SIZE = 10;
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function CoffeeAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [coffeeRecords, setCoffeeRecords] = useState<CoffeeRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"all" | "30days" | "90days" | "year">("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);
  const [supplierTransactions, setSupplierTransactions] = useState<Transaction[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"score" | "volume" | "deliveries" | "name">("score");
  const [minPerformance, setMinPerformance] = useState<number>(0);
  
  const [suppliersCurrentPage, setSuppliersCurrentPage] = useState(1);
  
  const analyticsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/auth");
        return;
      }
      setUser(data.user);
      await Promise.all([fetchCoffeeRecords(), fetchSuppliers()]);
    };

    checkAuthAndLoad();
  }, [router]);

  const fetchCoffeeRecords = async () => {
    const { data, error } = await supabase
      .from("coffee_records")
      .select("*")
      .order("date", { ascending: false });

    if (!error && data) {
      setCoffeeRecords(data as CoffeeRecord[]);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");

    if (!error && data) {
      setSuppliers(data as Supplier[]);
      setLoading(false);
    } else if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchSupplierTransactions = async (supplierId: string) => {
    setLoadingTransactions(true);
    const { data, error } = await supabase
      .from("coffee_records")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("date", { ascending: false })
      .limit(20);

    if (!error && data) {
      const transactions: Transaction[] = data.map(record => ({
        id: record.id,
        date: record.date,
        batch_number: record.batch_number,
        coffee_type: record.coffee_type,
        kilograms: record.kilograms,
        bags: record.bags,
        status: record.status,
      }));
      setSupplierTransactions(transactions);
    } else {
      setSupplierTransactions([]);
    }
    setLoadingTransactions(false);
  };

  const handleViewSupplierDetails = async (supplier: SupplierPerformance) => {
    setSelectedSupplier(supplier);
    await fetchSupplierTransactions(supplier.supplier_id);
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
    setSelectedSupplier(null);
    setSupplierTransactions([]);
  };

  const filteredRecords = useMemo(() => {
    if (timeRange === "all") return coffeeRecords;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case "30days":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return coffeeRecords.filter(record => new Date(record.date) >= cutoffDate);
  }, [coffeeRecords, timeRange]);

  const supplierPerformance = useMemo((): SupplierPerformance[] => {
    const performanceMap = new Map<string, SupplierPerformance>();

    suppliers.forEach(supplier => {
      performanceMap.set(supplier.id, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_code: supplier.code,
        origin: supplier.origin,
        total_kilograms: 0,
        total_bags: 0,
        total_deliveries: 0,
        coffee_types: {},
        average_bag_weight: 0,
        last_delivery_date: null,
        performance_score: 0,
      });
    });

    filteredRecords.forEach(record => {
      if (!record.supplier_id) return;
      
      const stats = performanceMap.get(record.supplier_id);
      if (stats) {
        stats.total_kilograms += record.kilograms;
        stats.total_bags += record.bags;
        stats.total_deliveries += 1;
        
        stats.coffee_types[record.coffee_type] = 
          (stats.coffee_types[record.coffee_type] || 0) + record.kilograms;
        
        if (!stats.last_delivery_date || record.date > stats.last_delivery_date) {
          stats.last_delivery_date = record.date;
        }
      }
    });

    const performances = Array.from(performanceMap.values());
    const maxKilograms = Math.max(...performances.map(p => p.total_kilograms), 1);
    const maxDeliveries = Math.max(...performances.map(p => p.total_deliveries), 1);

    performances.forEach(stats => {
      if (stats.total_bags > 0) {
        stats.average_bag_weight = stats.total_kilograms / stats.total_bags;
      }
      
      const kgScore = (stats.total_kilograms / maxKilograms) * 60;
      const deliveryScore = (stats.total_deliveries / maxDeliveries) * 40;
      stats.performance_score = kgScore + deliveryScore;
    });

    return performances;
  }, [filteredRecords, suppliers]);

  const filteredAndSortedSuppliers = useMemo(() => {
    let result = [...supplierPerformance];
    
    if (filterOrigin !== "all") {
      result = result.filter(s => s.origin === filterOrigin);
    }
    
    if (filterStatus !== "all") {
      result = result.filter(s => 
        filterStatus === "active" ? s.total_deliveries > 0 : s.total_deliveries === 0
      );
    }
    
    result = result.filter(s => s.performance_score >= minPerformance);
    
    switch (sortBy) {
      case "volume":
        result.sort((a, b) => b.total_kilograms - a.total_kilograms);
        break;
      case "deliveries":
        result.sort((a, b) => b.total_deliveries - a.total_deliveries);
        break;
      case "name":
        result.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
        break;
      default:
        result.sort((a, b) => b.performance_score - a.performance_score);
    }
    
    return result;
  }, [supplierPerformance, filterOrigin, filterStatus, sortBy, minPerformance]);

  const uniqueOrigins = useMemo(() => {
    const origins = new Set(supplierPerformance.map(s => s.origin));
    return ["all", ...Array.from(origins).sort()];
  }, [supplierPerformance]);

  const overallMetrics = useMemo(() => {
    const totalKgs = filteredRecords.reduce((sum, r) => sum + r.kilograms, 0);
    const totalBags = filteredRecords.reduce((sum, r) => sum + r.bags, 0);
    const activeSuppliers = supplierPerformance.filter(s => s.total_deliveries > 0).length;
    
    const coffeeTypeDistribution: Record<string, number> = {};
    filteredRecords.forEach(record => {
      coffeeTypeDistribution[record.coffee_type] = 
        (coffeeTypeDistribution[record.coffee_type] || 0) + record.kilograms;
    });
    
    const monthlyData: { month: string; kgs: number; bags: number; deliveries: number }[] = [];
    const last12Months = new Array(12).fill(0).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return date.toLocaleString('default', { month: 'short', year: '2-digit' });
    });
    
    last12Months.forEach(month => {
      monthlyData.push({ month, kgs: 0, bags: 0, deliveries: 0 });
    });
    
    filteredRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const monthYear = recordDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      const trendIndex = last12Months.indexOf(monthYear);
      if (trendIndex !== -1) {
        monthlyData[trendIndex].kgs += record.kilograms;
        monthlyData[trendIndex].bags += record.bags;
        monthlyData[trendIndex].deliveries += 1;
      }
    });
    
    const daysWithData = new Set(filteredRecords.map(r => r.date)).size;
    const dailyAverage = daysWithData > 0 ? totalKgs / daysWithData : 0;
    
    return {
      totalKgs,
      totalBags,
      activeSuppliers,
      coffeeTypeDistribution,
      monthlyData,
      dailyAverage,
      totalDeliveries: filteredRecords.length,
      totalSuppliers: suppliers.length,
      daysWithData,
    };
  }, [filteredRecords, supplierPerformance, suppliers]);

  const coffeeTypeData = Object.entries(overallMetrics.coffeeTypeDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const topPerformersData = filteredAndSortedSuppliers.slice(0, 8).map((s, i) => ({
    name: s.supplier_name.split(' ')[0],
    kgs: s.total_kilograms,
    deliveries: s.total_deliveries,
    score: s.performance_score,
    color: COLORS[i % COLORS.length],
    fullName: s.supplier_name,
  }));

  const activeCount = supplierPerformance.filter(s => s.total_deliveries > 0).length;
  const inactiveCount = supplierPerformance.filter(s => s.total_deliveries === 0).length;
  const statusData = [
    { name: "Active", value: activeCount, color: "#10b981" },
    { name: "Inactive", value: inactiveCount, color: "#6b7280" },
  ];

  const cumulativeData = overallMetrics.monthlyData.map((d, i) => ({
    ...d,
    cumulative: overallMetrics.monthlyData.slice(0, i + 1).reduce((sum, item) => sum + item.kgs, 0)
  }));

  const dominantSupplier = filteredAndSortedSuppliers[0];
  const dominantCoffeeType = coffeeTypeData[0];

  const totalSupplierPages = Math.max(1, Math.ceil(filteredAndSortedSuppliers.length / SUPPLIERS_PAGE_SIZE));
  const paginatedSuppliers = useMemo(() => {
    const start = (suppliersCurrentPage - 1) * SUPPLIERS_PAGE_SIZE;
    return filteredAndSortedSuppliers.slice(start, start + SUPPLIERS_PAGE_SIZE);
  }, [filteredAndSortedSuppliers, suppliersCurrentPage]);

  useEffect(() => {
    setSuppliersCurrentPage(1);
  }, [timeRange, filterOrigin, filterStatus, sortBy, minPerformance]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Supplier Name", "Code", "Origin", "Total KG", "Total Bags", "Deliveries", "Avg Bag Weight", "Last Delivery", "Status", "Performance Score"];
    const data = filteredAndSortedSuppliers.map(s => [
      s.supplier_name,
      s.supplier_code,
      s.origin,
      s.total_kilograms,
      s.total_bags,
      s.total_deliveries,
      s.average_bag_weight.toFixed(1),
      s.last_delivery_date || "N/A",
      s.total_deliveries > 0 ? "Active" : "Inactive",
      s.performance_score.toFixed(1)
    ]);
    
    const csvContent = [headers, ...data].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coffee-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilterOrigin("all");
    setFilterStatus("all");
    setSortBy("score");
    setMinPerformance(0);
    setTimeRange("all");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-20 print:static">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 border border-green-200 dark:border-green-800">
                <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-700 dark:text-green-400">Coffee Analytics</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Interactive visualizations & supplier insights</p>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200">
                <Download className="w-4 h-4" /> Export
              </button>
              <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-4 h-4" /> Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 py-6" ref={analyticsRef}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" /> Advanced Filters
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="all">All Time</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                  <select value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white">
                    {uniqueOrigins.map(origin => <option key={origin} value={origin}>{origin === "all" ? "All Origins" : origin}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="all">All Suppliers</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="score">Performance Score</option>
                    <option value="volume">Total Volume</option>
                    <option value="deliveries">Delivery Count</option>
                    <option value="name">Supplier Name</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Performance: {minPerformance}%</label>
                  <input type="range" min="0" max="100" step="5" value={minPerformance} onChange={(e) => setMinPerformance(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer" />
                </div>

                <div className="flex items-end">
                  <button onClick={resetFilters} className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Coffee</p>
                  <p className="text-2xl font-bold text-green-600">{overallMetrics.totalKgs.toLocaleString()} kg</p>
                  <p className="text-xs text-gray-500 mt-1">{overallMetrics.totalBags.toLocaleString()} bags</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3"><Coffee className="w-6 h-6 text-green-600" /></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
                  <p className="text-2xl font-bold text-green-600">{overallMetrics.activeSuppliers}</p>
                  <p className="text-xs text-gray-500 mt-1">Out of {overallMetrics.totalSuppliers} total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3"><Users className="w-6 h-6 text-green-600" /></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Average</p>
                  <p className="text-2xl font-bold text-green-600">{overallMetrics.dailyAverage.toFixed(0)} kg</p>
                  <p className="text-xs text-gray-500 mt-1">Over {overallMetrics.daysWithData} days</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3"><Calendar className="w-6 h-6 text-green-600" /></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-2xl font-bold text-green-600">{overallMetrics.totalDeliveries}</p>
                  <p className="text-xs text-gray-500 mt-1">Coffee deliveries</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3"><Package className="w-6 h-6 text-green-600" /></div>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend Line Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Monthly Coffee Intake Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overallMetrics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#10b981" />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="kgs" stroke="#10b981" strokeWidth={2} name="Kilograms" />
                  <Line yAxisId="right" type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={2} name="Deliveries" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Coffee Type Distribution Pie Chart - FIXED */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 Coffee Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={coffeeTypeData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    label={({ name, percent }) => {
                      const percentage = percent ? (percent * 100).toFixed(0) : 0;
                      return `${name}: ${percentage}%`;
                    }} 
                    outerRadius={100} 
                    dataKey="value"
                  >
                    {coffeeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Second Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers Bar Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top 8 Suppliers by Volume</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPerformersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="kgs" fill="#10b981" radius={[8, 8, 0, 0]}>
                    {topPerformersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Supplier Status Radial Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Supplier Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" barSize={20} data={statusData}>
                  <RadialBar background dataKey="value" cornerRadius={15} fill="#10b981" />
                  <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Growth Area Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Cumulative Coffee Intake Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dominant Insights Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-700 uppercase">Top Performer</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{dominantSupplier?.supplier_name || "No data"}</h3>
              <p className="text-sm text-gray-600 mb-4">{dominantSupplier?.origin} • Code: {dominantSupplier?.supplier_code}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Total Supply:</span>
                  <span className="font-semibold">{dominantSupplier?.total_kilograms.toLocaleString() || 0} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Deliveries:</span>
                  <span className="font-semibold">{dominantSupplier?.total_deliveries || 0} times</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Performance Score:</span>
                  <span className="font-semibold text-green-700">{dominantSupplier?.performance_score.toFixed(1) || 0}/100</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase">Most Popular</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{dominantCoffeeType?.name || "No data"}</h3>
              <p className="text-sm text-gray-600 mb-4">Dominant coffee variety</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">Total Volume:</span>
                  <span className="font-semibold">{dominantCoffeeType?.value?.toLocaleString() || 0} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">Market Share:</span>
                  <span className="font-semibold text-purple-700">
                    {overallMetrics.totalKgs > 0 && dominantCoffeeType?.value
                      ? ((dominantCoffeeType.value / overallMetrics.totalKgs) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* All Suppliers Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">📋 All Suppliers Performance</h2>
              <p className="text-sm text-gray-600 mt-1">Page {suppliersCurrentPage} of {totalSupplierPages} • Showing {filteredAndSortedSuppliers.length} suppliers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600">Supplier</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600">Code</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600">Origin</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600">Total KG</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600">Deliveries</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-600">Last Delivery</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-gray-600">Score</th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSuppliers.map((supplier) => (
                    <tr key={supplier.supplier_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6 font-medium">{supplier.supplier_name}</td>
                      <td className="py-3 px-6 text-sm font-mono text-gray-600">{supplier.supplier_code}</td>
                      <td className="py-3 px-6 text-sm text-gray-600">{supplier.origin}</td>
                      <td className="py-3 px-6 text-right font-semibold text-green-600">{supplier.total_kilograms.toLocaleString()} kg</td>
                      <td className="py-3 px-6 text-right">{supplier.total_deliveries}</td>
                      <td className="py-3 px-6 text-sm text-gray-600">{supplier.last_delivery_date ? new Date(supplier.last_delivery_date).toLocaleDateString() : "No deliveries"}</td>
                      <td className="py-3 px-6 text-right">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${supplier.total_deliveries > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {supplier.total_deliveries > 0 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${supplier.performance_score}%` }} />
                          </div>
                          <span className="text-xs font-medium">{supplier.performance_score.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <button
                          onClick={() => handleViewSupplierDetails(supplier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Transactions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalSupplierPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-gray-600">
                    Showing {((suppliersCurrentPage - 1) * SUPPLIERS_PAGE_SIZE) + 1} to{" "}
                    {Math.min(suppliersCurrentPage * SUPPLIERS_PAGE_SIZE, filteredAndSortedSuppliers.length)} of{" "}
                    {filteredAndSortedSuppliers.length} suppliers
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSuppliersCurrentPage(1)} disabled={suppliersCurrentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40">
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSuppliersCurrentPage(prev => Math.max(1, prev - 1))} disabled={suppliersCurrentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-2 text-xs rounded-lg bg-gray-200">{suppliersCurrentPage}</span>
                    <button onClick={() => setSuppliersCurrentPage(prev => Math.min(totalSupplierPages, prev + 1))} disabled={suppliersCurrentPage === totalSupplierPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSuppliersCurrentPage(totalSupplierPages)} disabled={suppliersCurrentPage === totalSupplierPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40">
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              📊 Analytics based on {filteredRecords.length} coffee records • Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Supplier Transactions Modal */}
      {showSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                  <History className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSupplier.supplier_name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Code: {selectedSupplier.supplier_code} • Origin: {selectedSupplier.origin}
                  </p>
                </div>
              </div>
              <button onClick={closeSupplierModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Supplier Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Total Deliveries</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-1">{selectedSupplier.total_deliveries}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Total Coffee</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{selectedSupplier.total_kilograms.toLocaleString()} kg</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-600">Total Bags</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 mt-1">{selectedSupplier.total_bags} bags</p>
                </div>
              </div>

              {/* Coffee Type Breakdown */}
              {Object.keys(selectedSupplier.coffee_types).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Coffee Type Breakdown
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedSupplier.coffee_types).map(([type, kgs]) => (
                      <span key={type} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {type}: {kgs.toLocaleString()} kg
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions Table */}
              <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Recent Deliveries
              </h3>
              
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
                </div>
              ) : supplierTransactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No delivery records found for this supplier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Batch Number</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Coffee Type</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">KG</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Bags</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {supplierTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-mono text-xs">{transaction.batch_number}</td>
                          <td className="py-3 px-4">{transaction.coffee_type}</td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">{transaction.kilograms.toLocaleString()} kg</td>
                          <td className="py-3 px-4 text-right">{transaction.bags}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.status === "delivered" ? "bg-green-100 text-green-700" :
                              transaction.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {transaction.status.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Performance Metrics */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Performance Insights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Bag Weight:</span>
                    <span className="font-semibold">{selectedSupplier.average_bag_weight.toFixed(1)} kg/bag</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance Score:</span>
                    <span className="font-semibold text-green-700">{selectedSupplier.performance_score.toFixed(1)}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Delivery:</span>
                    <span className="font-semibold">{selectedSupplier.last_delivery_date ? new Date(selectedSupplier.last_delivery_date).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Status:</span>
                    <span className={`font-semibold ${selectedSupplier.total_deliveries > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {selectedSupplier.total_deliveries > 0 ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={closeSupplierModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Close
              </button>
              <Link
                href={`/coffee-records?supplier=${selectedSupplier.supplier_id}`}
                className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View All Records
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          body { background-color: white; }
          .shadow-sm, .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}