'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import {
  Scale,
  Filter,
  CalendarDays,
  Loader2,
  RefreshCcw,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  Users,
  BadgeCheck,
  Banknote,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  DollarSign,
  Coffee,
  Package,
  FileText,
  Calendar,
  User,
  Tag,
  Download,
} from 'lucide-react';

type Preset = 'daily' | 'weekly' | 'monthly' | 'custom';

type CoffeeRecord = {
  id: string;
  coffee_type: string;
  date: string; // coffee_records.date (YYYY-MM-DD)
  kilograms: number;
  bags: number;
  supplier_name: string;
  status: string;
  batch_number: string;
};

type QualityAssessment = {
  id: string;
  store_record_id: string | null;
  batch_number: string;
  status: string;
  date_assessed: string;
  assessed_by: string;
  final_price: number | null;
  suggested_price: number;
};

type FinanceTxn = {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference: string | null;
  status: 'pending' | 'confirmed';
  created_at: string;
};

type DetailedError = {
  title: string;
  message: string;
  kind: 'NETWORK' | 'ENV' | 'SUPABASE' | 'AUTH' | 'RLS' | 'UNKNOWN';
  details?: any;
  when: string;
  hints: string[];
  requestDebug?: {
    online: boolean;
    supabaseUrlPresent: boolean;
    anonKeyPresent: boolean;
    userAgent?: string;
  };
};

type FinanceState = 'missing' | 'pending' | 'confirmed';
type AssessedFilter = 'all' | 'assessed' | 'not_assessed';
type FinanceFilter = 'all' | FinanceState;
type BalancedFilter = 'all' | 'balanced' | 'unbalanced';

type FlowRow = {
  record: CoffeeRecord;
  assessment: QualityAssessment | null;
  txns: FinanceTxn[];
  paidTotal: number;
  confirmedPaid: number;
  hasAssessment: boolean;
  financeState: FinanceState;
  isBalanced: boolean;
};

/* -------------------- helpers -------------------- */

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeekYMD() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function startOfMonthYMD() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function fmt(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString();
}
function fmtUGX(n: number) {
  return `UGX ${fmt(Number(n || 0))}`;
}
function pct(num: number, den: number) {
  if (!den) return '0%';
  return `${Math.round((num / den) * 100)}%`;
}
function chunkArray<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function uniqueById<T extends { id: string }>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) if (!m.has(it.id)) m.set(it.id, it);
  return Array.from(m.values());
}
function envDebug() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    supabaseUrlPresent: !!url && url.startsWith('http'),
    anonKeyPresent: !!key && key.length > 20,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/**
 * IMPORTANT:
 * - Finance matching uses reference == coffee_records.id OR reference == batch_number
 * - Update these transaction types to match your real values in finance_cash_transactions.transaction_type
 */
const FINANCE_PURCHASE_TYPES = ['coffee_purchase', 'supplier_payment', 'purchase_payment'];
const BATCH_SIZE = 50;

export default function BalancingReportPage() {
  const [preset, setPreset] = useState<Preset>('daily');
  const [fromDate, setFromDate] = useState<string>(todayYMD());
  const [toDate, setToDate] = useState<string>(todayYMD());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const [errors, setErrors] = useState<DetailedError[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [coffee, setCoffee] = useState<CoffeeRecord[]>([]);
  const [assessments, setAssessments] = useState<QualityAssessment[]>([]);
  const [finance, setFinance] = useState<FinanceTxn[]>([]);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [assessedFilter, setAssessedFilter] = useState<AssessedFilter>('all');
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>('all');
  const [balancedFilter, setBalancedFilter] = useState<BalancedFilter>('all');
  const [coffeeTypeFilter, setCoffeeTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // client-only timestamps (hydration safe)
  const [generatedAtText, setGeneratedAtText] = useState<string>('');
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setGeneratedAtText(now.toLocaleString());
    setLastUpdatedText(now.toLocaleTimeString());
  }, []);

  // Presets
  useEffect(() => {
    if (preset === 'daily') {
      setFromDate(todayYMD());
      setToDate(todayYMD());
    } else if (preset === 'weekly') {
      setFromDate(startOfWeekYMD());
      setToDate(todayYMD());
    } else if (preset === 'monthly') {
      setFromDate(startOfMonthYMD());
      setToDate(todayYMD());
    }
  }, [preset]);

  const pushError = (e: DetailedError) => {
    setErrors((prev) => [e, ...prev].slice(0, 12));
    setShowErrorPanel(true);
  };

  const classifySupabaseError = (title: string, err: any): DetailedError => {
    const dbg = envDebug();
    const msg = String(err?.message || err || 'Unknown error');

    if (!dbg.supabaseUrlPresent || !dbg.anonKeyPresent) {
      return {
        title,
        kind: 'ENV',
        message: 'Supabase environment variables are missing/invalid.',
        when: new Date().toISOString(),
        details: { raw: err },
        hints: [
          'Check .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          'Restart dev server after changing env.',
          'Ensure NEXT_PUBLIC_SUPABASE_URL starts with https://',
        ],
        requestDebug: dbg,
      };
    }

    if (!dbg.online) {
      return {
        title,
        kind: 'NETWORK',
        message: 'You appear to be offline. Check your internet connection.',
        when: new Date().toISOString(),
        details: { raw: msg },
        hints: ['Check internet connection.', 'Try refreshing the page.'],
        requestDebug: dbg,
      };
    }

    if (msg.toLowerCase().includes('failed to fetch')) {
      return {
        title,
        kind: 'NETWORK',
        message: 'Failed to fetch: browser could not reach Supabase (network/CORS/blocked/extension).',
        when: new Date().toISOString(),
        details: { raw: msg },
        hints: [
          'Try Incognito mode / disable adblock or privacy extensions.',
          'Try another network (hotspot).',
          'DevTools → Network → inspect failing request.',
        ],
        requestDebug: dbg,
      };
    }

    if (err?.name === 'AuthSessionMissingError' || msg.toLowerCase().includes('authsessionmissingerror')) {
      return {
        title,
        kind: 'AUTH',
        message: 'No active Supabase session found (AuthSessionMissingError).',
        when: new Date().toISOString(),
        details: { raw: err },
        hints: ['Log in again.', 'If RLS is ON, add SELECT policies for authenticated users.'],
        requestDebug: dbg,
      };
    }

    const status = err?.status || err?.raw?.status;
    if (
      status === 401 ||
      status === 403 ||
      msg.toLowerCase().includes('permission') ||
      msg.toLowerCase().includes('rls') ||
      msg.toLowerCase().includes('not authorized')
    ) {
      return {
        title,
        kind: 'RLS',
        message: 'Permission denied or blocked by Row Level Security (RLS).',
        when: new Date().toISOString(),
        details: { raw: err },
        hints: [
          'Check RLS policies on coffee_records, quality_assessments, finance_cash_transactions.',
          'Confirm your logged-in user is authenticated.',
          'If testing, temporarily disable RLS or add SELECT policies.',
        ],
        requestDebug: dbg,
      };
    }

    if (err?.code || err?.details || err?.hint || err?.status) {
      return {
        title,
        kind: 'SUPABASE',
        message: err?.message || 'Supabase returned an error response.',
        when: new Date().toISOString(),
        details: {
          code: err?.code,
          status: err?.status,
          details: err?.details,
          hint: err?.hint,
          raw: err,
        },
        hints: [
          'Verify table/column names match schema.',
          'Check Row Level Security (RLS) policies.',
          'Confirm the logged-in user has permission to read these tables.',
        ],
        requestDebug: dbg,
      };
    }

    return {
      title,
      kind: 'UNKNOWN',
      message: msg,
      when: new Date().toISOString(),
      details: { raw: err },
      hints: ['Open DevTools Console for more details.'],
      requestDebug: dbg,
    };
  };

  // Auth check
  const ensureAuth = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        pushError(classifySupabaseError('Auth check failed', error));
        return false;
      }
      if (!data?.user) {
        pushError({
          title: 'Not authenticated',
          kind: 'AUTH',
          message: 'No logged-in user found. Please log in.',
          when: new Date().toISOString(),
          details: { note: 'supabase.auth.getUser() returned no user' },
          hints: ['Go to your login page and sign in again.', 'If you just logged in, refresh the page once.'],
          requestDebug: envDebug(),
        });
        return false;
      }
      return true;
    } catch (e: any) {
      pushError(classifySupabaseError('Auth check failed', e));
      return false;
    }
  };

  const loadReport = async () => {
    setLoading(true);

    const ok = await ensureAuth();
    if (!ok) {
      setCoffee([]);
      setAssessments([]);
      setFinance([]);
      setLoading(false);
      return;
    }

    if (fromDate > toDate) {
      pushError({
        title: 'Invalid date range',
        kind: 'UNKNOWN',
        message: 'From date cannot be after To date.',
        when: new Date().toISOString(),
        details: { fromDate, toDate },
        hints: ['Choose a valid date range and try again.'],
        requestDebug: envDebug(),
      });
      setLoading(false);
      return;
    }

    try {
      // 1) Coffee records
      const coffeeRes = await supabase
        .from('coffee_records')
        .select('id, coffee_type, date, kilograms, bags, supplier_name, status, batch_number')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });

      if (coffeeRes.error) {
        pushError(classifySupabaseError('Loading coffee_records failed', coffeeRes.error));
        setCoffee([]);
        setAssessments([]);
        setFinance([]);
        setLoading(false);
        return;
      }

      const coffeeRows = (coffeeRes.data || []) as CoffeeRecord[];
      setCoffee(coffeeRows);

      if (coffeeRows.length === 0) {
        setAssessments([]);
        setFinance([]);
        setLoading(false);
        setLastUpdatedText(new Date().toLocaleTimeString());
        return;
      }

      const ids = coffeeRows.map((r) => r.id).filter(Boolean);
      const batches = Array.from(new Set(coffeeRows.map((r) => r.batch_number).filter(Boolean)));

      // 2) Assessments (by store_record_id OR batch_number)
      const assessmentOut: QualityAssessment[] = [];

      for (const chunk of chunkArray(ids, BATCH_SIZE)) {
        const aRes = await supabase
          .from('quality_assessments')
          .select('id, store_record_id, batch_number, status, date_assessed, assessed_by, final_price, suggested_price')
          .in('store_record_id', chunk)
          .order('date_assessed', { ascending: false });

        if (aRes.error) {
          pushError(classifySupabaseError('Loading quality_assessments (by store_record_id) failed', aRes.error));
          break;
        }
        assessmentOut.push(...((aRes.data || []) as QualityAssessment[]));
      }

      for (const chunk of chunkArray(batches, BATCH_SIZE)) {
        const aRes = await supabase
          .from('quality_assessments')
          .select('id, store_record_id, batch_number, status, date_assessed, assessed_by, final_price, suggested_price')
          .in('batch_number', chunk)
          .order('date_assessed', { ascending: false });

        if (aRes.error) {
          pushError(classifySupabaseError('Loading quality_assessments (by batch_number) failed', aRes.error));
          break;
        }
        assessmentOut.push(...((aRes.data || []) as QualityAssessment[]));
      }

      setAssessments(uniqueById(assessmentOut));

      // 3) Finance transactions (reference matches record id OR batch number)
      const financeOut: FinanceTxn[] = [];

      for (const chunk of chunkArray(ids, BATCH_SIZE)) {
        const fRes = await supabase
          .from('finance_cash_transactions')
          .select('id, transaction_type, amount, balance_after, reference, status, created_at')
          .in('transaction_type', FINANCE_PURCHASE_TYPES)
          .in('reference', chunk)
          .order('created_at', { ascending: false });

        if (fRes.error) {
          pushError(classifySupabaseError('Loading finance_cash_transactions (by record id) failed', fRes.error));
          break;
        }
        financeOut.push(...((fRes.data || []) as FinanceTxn[]));
      }

      for (const chunk of chunkArray(batches, BATCH_SIZE)) {
        const fRes = await supabase
          .from('finance_cash_transactions')
          .select('id, transaction_type, amount, balance_after, reference, status, created_at')
          .in('transaction_type', FINANCE_PURCHASE_TYPES)
          .in('reference', chunk)
          .order('created_at', { ascending: false });

        if (fRes.error) {
          pushError(classifySupabaseError('Loading finance_cash_transactions (by batch_number) failed', fRes.error));
          break;
        }
        financeOut.push(...((fRes.data || []) as FinanceTxn[]));
      }

      setFinance(uniqueById(financeOut));
      setPage(1);
      setLastUpdatedText(new Date().toLocaleTimeString());
    } catch (e: any) {
      pushError(classifySupabaseError('Unexpected fetch failure', e));
      setCoffee([]);
      setAssessments([]);
      setFinance([]);
      setLastUpdatedText(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  // Matching maps
  const assessmentMaps = useMemo(() => {
    const byStoreId = new Map<string, QualityAssessment>();
    const byBatch = new Map<string, QualityAssessment>();
    const sorted = [...assessments].sort((a, b) => (b.date_assessed || '').localeCompare(a.date_assessed || ''));

    for (const a of sorted) {
      if (a.store_record_id && !byStoreId.has(a.store_record_id)) byStoreId.set(a.store_record_id, a);
      if (a.batch_number && !byBatch.has(a.batch_number)) byBatch.set(a.batch_number, a);
    }
    return { byStoreId, byBatch };
  }, [assessments]);

  const financeByRef = useMemo(() => {
    const m = new Map<string, FinanceTxn[]>();
    for (const t of finance) {
      const k = (t.reference || '').trim();
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [finance]);

  const flowRows: FlowRow[] = useMemo(() => {
    return coffee.map((r) => {
      const assessment = assessmentMaps.byStoreId.get(r.id) || assessmentMaps.byBatch.get(r.batch_number) || null;
      const txns = financeByRef.get(r.id) || financeByRef.get(r.batch_number) || [];
      const paidTotal = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
      const confirmedPaid = txns.filter((t) => t.status === 'confirmed').reduce((s, t) => s + Number(t.amount || 0), 0);

      const hasAssessment = !!assessment;
      const financeState: FinanceState =
        txns.length === 0 ? 'missing' : txns.some((t) => t.status === 'confirmed') ? 'confirmed' : 'pending';

      const isBalanced = hasAssessment && financeState !== 'missing';

      return { record: r, assessment, txns, paidTotal, confirmedPaid, hasAssessment, financeState, isBalanced };
    });
  }, [coffee, assessmentMaps, financeByRef]);

  // Options
  const coffeeTypeOptions = useMemo(() => {
    const s = new Set<string>();
    coffee.forEach((r) => r.coffee_type && s.add(r.coffee_type));
    return ['all', ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [coffee]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    coffee.forEach((r) => r.status && s.add(r.status));
    return ['all', ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [coffee]);

  // Filters
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return flowRows.filter((row) => {
      if (assessedFilter === 'assessed' && !row.hasAssessment) return false;
      if (assessedFilter === 'not_assessed' && row.hasAssessment) return false;

      if (financeFilter !== 'all' && row.financeState !== financeFilter) return false;

      if (balancedFilter === 'balanced' && !row.isBalanced) return false;
      if (balancedFilter === 'unbalanced' && row.isBalanced) return false;

      if (coffeeTypeFilter !== 'all' && row.record.coffee_type !== coffeeTypeFilter) return false;
      if (statusFilter !== 'all' && row.record.status !== statusFilter) return false;

      if (q) {
        const hay = `${row.record.batch_number} ${row.record.supplier_name} ${row.record.coffee_type} ${row.record.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [flowRows, searchText, assessedFilter, financeFilter, balancedFilter, coffeeTypeFilter, statusFilter]);

  // Pagination
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRows, pageSize, safePage]);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // Statistics
  const sumKg = useMemo(() => filteredRows.reduce((s, r) => s + Number(r.record.kilograms || 0), 0), [filteredRows]);
  const sumBags = useMemo(() => filteredRows.reduce((s, r) => s + Number(r.record.bags || 0), 0), [filteredRows]);
  const sumPaid = useMemo(() => filteredRows.reduce((s, r) => s + r.paidTotal, 0), [filteredRows]);
  const sumConfirmed = useMemo(() => filteredRows.reduce((s, r) => s + r.confirmedPaid, 0), [filteredRows]);

  const assessedCount = useMemo(() => filteredRows.filter((x) => x.hasAssessment).length, [filteredRows]);
  const notAssessedCount = useMemo(() => filteredRows.length - assessedCount, [filteredRows, assessedCount]);

  const financeMissingCount = useMemo(() => filteredRows.filter((x) => x.financeState === 'missing').length, [filteredRows]);
  const financePendingCount = useMemo(() => filteredRows.filter((x) => x.financeState === 'pending').length, [filteredRows]);
  const financeConfirmedCount = useMemo(() => filteredRows.filter((x) => x.financeState === 'confirmed').length, [filteredRows]);

  const balancedCount = useMemo(() => filteredRows.filter((x) => x.isBalanced).length, [filteredRows]);
  const unbalancedCount = useMemo(() => filteredRows.length - balancedCount, [filteredRows, balancedCount]);

  const flowHealth = useMemo(() => {
    const total = filteredRows.length || 1;
    const assessmentCoverage = assessedCount / total;
    const financeCoverage = (total - financeMissingCount) / total;
    return Math.round(((assessmentCoverage + financeCoverage) / 2) * 100);
  }, [filteredRows.length, assessedCount, financeMissingCount]);

  const filtersSummaryText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Period: ${fromDate} to ${toDate}`);
    if (assessedFilter !== 'all') parts.push(`Assessment: ${assessedFilter}`);
    if (financeFilter !== 'all') parts.push(`Finance: ${financeFilter}`);
    if (balancedFilter !== 'all') parts.push(`Balance: ${balancedFilter}`);
    if (coffeeTypeFilter !== 'all') parts.push(`Coffee: ${coffeeTypeFilter}`);
    if (statusFilter !== 'all') parts.push(`Status: ${statusFilter}`);
    if (searchText.trim()) parts.push(`Search: "${searchText.trim()}"`);
    return parts.join(' - ');
  }, [fromDate, toDate, assessedFilter, financeFilter, balancedFilter, coffeeTypeFilter, statusFilter, searchText]);

  // CSV Download Functionality
  const downloadCSV = () => {
    if (filteredRows.length === 0) {
      pushError({
        title: 'No data to export',
        kind: 'UNKNOWN',
        message: 'There are no records to export as CSV.',
        when: new Date().toISOString(),
        details: { filteredRows: filteredRows.length },
        hints: ['Apply different filters to get some data to export.'],
        requestDebug: envDebug(),
      });
      return;
    }

    setDownloadingCSV(true);

    try {
      // Prepare CSV headers
      const headers = [
        'Date',
        'Supplier Name',
        'Coffee Type',
        'Status',
        'Kilograms',
        'Bags',
        'Batch Number',
        'Assessment Status',
        'Assessment Date',
        'Assessed By',
        'Suggested Price',
        'Final Price',
        'Finance Status',
        'Total Paid (UGX)',
        'Confirmed Paid (UGX)',
        'Number of Payments',
        'Balance Status',
        'Record ID'
      ];

      // Prepare CSV rows
      const csvRows = filteredRows.map(row => {
        const assessment = row.assessment;
        
        return [
          `"${row.record.date}"`,
          `"${row.record.supplier_name || ''}"`,
          `"${row.record.coffee_type || ''}"`,
          `"${row.record.status || ''}"`,
          row.record.kilograms || 0,
          row.record.bags || 0,
          `"${row.record.batch_number || ''}"`,
          `"${assessment?.status || 'Missing'}"`,
          `"${assessment?.date_assessed || ''}"`,
          `"${assessment?.assessed_by || ''}"`,
          assessment?.suggested_price || 0,
          assessment?.final_price || 0,
          `"${row.financeState}"`,
          row.paidTotal,
          row.confirmedPaid,
          row.txns.length,
          `"${row.isBalanced ? 'Balanced' : 'Unbalanced'}"`,
          `"${row.record.id}"`
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...csvRows].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `balancing_report_${fromDate}_to_${toDate}_${timestamp}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      pushError(classifySupabaseError('CSV export failed', error));
    } finally {
      setDownloadingCSV(false);
    }
  };

  // Download Summary CSV
  const downloadSummaryCSV = () => {
    setDownloadingCSV(true);

    try {
      // Prepare summary data
      const summaryData = [
        ['Balancing Report Summary', '', ''],
        ['Generated', generatedAtText, ''],
        ['Period', `${fromDate} to ${toDate}`, ''],
        ['Filters Applied', filtersSummaryText, ''],
        ['', '', ''],
        ['Metric', 'Value', 'Details'],
        ['Total Records', filteredRows.length, ''],
        ['Total Weight', `${fmt(sumKg)} kg`, `${fmt(sumBags)} bags`],
        ['Total Payments', fmtUGX(sumPaid), `Confirmed: ${fmtUGX(sumConfirmed)}`],
        ['Assessment Coverage', `${assessedCount} of ${filteredRows.length}`, pct(assessedCount, filteredRows.length)],
        ['Finance Coverage', `${financeConfirmedCount + financePendingCount} of ${filteredRows.length}`, pct(financeConfirmedCount + financePendingCount, filteredRows.length)],
        ['Missing Finance', financeMissingCount, pct(financeMissingCount, filteredRows.length)],
        ['Balanced Records', balancedCount, pct(balancedCount, filteredRows.length)],
        ['Unbalanced Records', unbalancedCount, pct(unbalancedCount, filteredRows.length)],
        ['Flow Health Score', `${flowHealth}%`, ''],
        ['', '', ''],
        ['Finance Types Used', FINANCE_PURCHASE_TYPES.join(', '), ''],
        ['Matching Logic', 'Assessment by store_record_id or batch_number, Finance by reference', '']
      ];

      // Convert to CSV
      const csvContent = summaryData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `balancing_report_summary_${fromDate}_to_${toDate}_${timestamp}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      pushError(classifySupabaseError('Summary CSV export failed', error));
    } finally {
      setDownloadingCSV(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .dark .glass-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(30, 41, 59, 0.5);
        }
      `}</style>

      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Balancing Report
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Purchase - Assessment - Finance flow</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowErrorPanel(!showErrorPanel)}
                className={`relative p-2 rounded-lg transition-colors ${
                  errors.length > 0
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={errors.length > 0 ? `Show ${errors.length} error${errors.length > 1 ? 's' : ''}` : 'No errors'}
              >
                <AlertCircle className="w-5 h-5" />
                {errors.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {errors.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={showFilters ? 'Hide filters' : 'Show filters'}
              >
                {showFilters ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>

              <div className="relative group">
                <button
                  onClick={downloadCSV}
                  disabled={downloadingCSV || loading || filteredRows.length === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1"
                  title={filteredRows.length === 0 ? "No data to export" : "Download CSV"}
                >
                  {downloadingCSV ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
                
                {/* CSV Export Options Tooltip */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Export Options</div>
                  <button
                    onClick={downloadCSV}
                    disabled={downloadingCSV || loading || filteredRows.length === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Full Data CSV</div>
                      <div className="text-xs text-gray-500">{filteredRows.length} records</div>
                    </div>
                  </button>
                  <button
                    onClick={downloadSummaryCSV}
                    disabled={downloadingCSV || loading}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Summary CSV</div>
                      <div className="text-xs text-gray-500">Statistics only</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Error panel */}
        {errors.length > 0 && showErrorPanel && (
          <div className="glass-card rounded-2xl border border-red-200 dark:border-red-800 shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-700 dark:text-red-200">Detailed Errors</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {errors.length} error{errors.length > 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowErrorPanel(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-2">
                {errors.map((e, idx) => (
                  <div
                    key={`${e.when}-${idx}`}
                    className="rounded-xl border border-red-100 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">{e.title}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300">
                        {e.kind}
                      </span>
                    </div>

                    <p className="text-sm text-red-700 dark:text-red-300">{e.message}</p>

                    {e.requestDebug && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        online: <b>{String(e.requestDebug.online)}</b> • hasUrl: <b>{String(e.requestDebug.supabaseUrlPresent)}</b> • hasAnonKey:{' '}
                        <b>{String(e.requestDebug.anonKeyPresent)}</b>
                      </p>
                    )}

                    {e.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">Show technical details</summary>
                        <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-2 overflow-auto">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      </details>
                    )}

                    {e.hints.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Suggestions:</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                          {e.hints.map((hint, i) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters card */}
        {showFilters && (
          <div className="glass-card rounded-2xl shadow-lg">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Filter className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Filters & Date Range</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Using coffee_records.date</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search supplier, batch, type, status…"
                    className="pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Date Range</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'custom'] as Preset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreset(p)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        preset === p
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date inputs + quick filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setPreset('custom');
                      setFromDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setPreset('custom');
                      setToDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <SelectBox
                  label="Coffee Type"
                  icon={<Coffee className="w-4 h-4" />}
                  value={coffeeTypeFilter}
                  onChange={(v) => {
                    setCoffeeTypeFilter(v);
                    setPage(1);
                  }}
                  options={coffeeTypeOptions.map((v) => ({ value: v, label: v === 'all' ? 'All Types' : v }))}
                />

                <SelectBox
                  label="Status"
                  icon={<Tag className="w-4 h-4" />}
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={statusOptions.map((v) => ({ value: v, label: v === 'all' ? 'All Status' : v }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectBox
                  label="Assessment Status"
                  icon={<BadgeCheck className="w-4 h-4" />}
                  value={assessedFilter}
                  onChange={(v) => {
                    setAssessedFilter(v as any);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Assessments' },
                    { value: 'assessed', label: 'Assessed' },
                    { value: 'not_assessed', label: 'Not Assessed' },
                  ]}
                />

                <SelectBox
                  label="Finance Status"
                  icon={<Banknote className="w-4 h-4" />}
                  value={financeFilter}
                  onChange={(v) => {
                    setFinanceFilter(v as any);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Finance' },
                    { value: 'missing', label: 'Missing Finance' },
                    { value: 'pending', label: 'Pending Payment' },
                    { value: 'confirmed', label: 'Confirmed Payment' },
                  ]}
                />

                <SelectBox
                  label="Balance Status"
                  icon={<Scale className="w-4 h-4" />}
                  value={balancedFilter}
                  onChange={(v) => {
                    setBalancedFilter(v as any);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Records' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'unbalanced', label: 'Unbalanced' },
                  ]}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    Matching: assessment by{' '}
                    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">store_record_id</code> or{' '}
                    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">batch_number</code> • finance by{' '}
                    <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">reference</code>
                  </div>

                  <SelectBox
                    label=""
                    value={String(pageSize)}
                    onChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                    options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} rows per page` }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/10">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-300 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading Balancing Report</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Fetching and processing your data...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Layers className="w-5 h-5" />}
                title="Total Records"
                value={fmt(filteredRows.length)}
                sub={`${fmt(sumKg)} kg • ${fmt(sumBags)} bags`}
                trend="neutral"
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                icon={<BadgeCheck className="w-5 h-5" />}
                title="Assessment Rate"
                value={pct(assessedCount, filteredRows.length)}
                sub={`${fmt(assessedCount)} assessed • ${fmt(notAssessedCount)} pending`}
                trend={filteredRows.length ? (assessedCount / filteredRows.length > 0.8 ? 'up' : 'down') : 'neutral'}
                gradient="from-emerald-500 to-green-500"
              />
              <StatCard
                icon={<Banknote className="w-5 h-5" />}
                title="Finance Coverage"
                value={pct(financeConfirmedCount + financePendingCount, filteredRows.length)}
                sub={`${fmt(financeConfirmedCount)} confirmed • ${fmt(financeMissingCount)} missing`}
                trend={financeMissingCount === 0 ? 'up' : 'down'}
                gradient="from-purple-500 to-violet-500"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                title="Flow Health"
                value={`${flowHealth}%`}
                sub={`${fmt(balancedCount)} balanced • ${fmt(unbalancedCount)} issues`}
                trend={flowHealth > 80 ? 'up' : flowHealth < 60 ? 'down' : 'neutral'}
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <StatMiniCard
                icon={<DollarSign className="w-4 h-4" />}
                title="Total Payments"
                value={fmtUGX(sumPaid)}
                sub={`${fmtUGX(sumConfirmed)} confirmed`}
                bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                iconColor="text-emerald-600 dark:text-emerald-300"
              />
              <StatMiniCard
                icon={<Package className="w-4 h-4" />}
                title="Average per Record"
                value={`${fmt(Math.round(sumKg / (filteredRows.length || 1)) || 0)} kg`}
                sub={`${fmt(Math.round(sumBags / (filteredRows.length || 1)) || 0)} bags avg`}
                bgColor="bg-blue-50 dark:bg-blue-900/20"
                iconColor="text-blue-600 dark:text-blue-300"
              />
              <StatMiniCard
                icon={<Users className="w-4 h-4" />}
                title="Suppliers Tracked"
                value={fmt(new Set(filteredRows.map((r) => r.record.supplier_name)).size)}
                sub={`${filteredRows.length} total records`}
                bgColor="bg-purple-50 dark:bg-purple-900/20"
                iconColor="text-purple-600 dark:text-purple-300"
              />
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      Records Flow
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {filtersSummaryText} • Showing {Math.min(totalRows, safePage * pageSize)} of {totalRows} records
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Generated: {generatedAtText || ''} • Last updated: {lastUpdatedText || ''}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadCSV}
                      disabled={downloadingCSV || filteredRows.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {downloadingCSV ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export CSV ({filteredRows.length} records)
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left">
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Coffee</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Weight</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Batch</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Assessment</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Finance</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                      <th className="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 px-4 text-center">
                          <div className="max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800">
                              <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold mb-2">No records found</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              No rows match your current filters. Try adjusting your search criteria.
                            </p>
                            <button
                              onClick={() => {
                                setSearchText('');
                                setAssessedFilter('all');
                                setFinanceFilter('all');
                                setBalancedFilter('all');
                                setCoffeeTypeFilter('all');
                                setStatusFilter('all');
                                setPage(1);
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((r, idx) => (
                        <tr
                          key={r.record.id}
                          className={`border-t border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/50'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="font-medium">{r.record.date}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium truncate max-w-[180px]">{r.record.supplier_name}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              <Coffee className="w-3 h-3" />
                              {r.record.coffee_type}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <StatusBadge status={r.record.status} />
                          </td>

                          <td className="py-4 px-4">
                            <div>
                              <div className="font-semibold">{fmt(Number(r.record.kilograms || 0))} kg</div>
                              <div className="text-xs text-gray-500">{fmt(Number(r.record.bags || 0))} bags</div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs">
                              {r.record.batch_number}
                            </code>
                          </td>

                          <td className="py-4 px-4">{AssessmentBadge(r.assessment)}</td>
                          <td className="py-4 px-4">{FinanceBadge(r.financeState)}</td>

                          <td className="py-4 px-4">
                            <div className="font-semibold">{fmtUGX(r.paidTotal)}</div>
                            {r.txns.length > 0 && <div className="text-xs text-gray-500">{r.txns.length} payment(s)</div>}
                          </td>

                          <td className="py-4 px-4">
                            {r.isBalanced ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                                <Check className="w-3 h-3" />
                                Balanced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Unbalanced
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagedRows.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing <span className="font-semibold">{(safePage - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-semibold">{Math.min(safePage * pageSize, totalRows)}</span> of{' '}
                      <span className="font-semibold">{totalRows}</span> records
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Page <span className="font-semibold">{safePage}</span> of <span className="font-semibold">{totalPages}</span>
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <div>Finance types used: {FINANCE_PURCHASE_TYPES.join(', ')}</div>
                  <div className="text-right">Last updated: {lastUpdatedText || ''}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* -------------------- UI Components -------------------- */

function StatCard({
  icon,
  title,
  value,
  sub,
  trend,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  gradient: string;
}) {
  const trendColors = {
    up: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30',
    down: 'text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/30',
    neutral: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800',
  };

  const arrow = trend === 'up' ? '^' : trend === 'down' ? 'v' : '-';

  return (
    <div className="glass-card rounded-2xl p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${trendColors[trend]}`}>{icon}</div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>{arrow}</div>
      </div>
      <div className="mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{sub}</p>
    </div>
  );
}

function StatMiniCard({
  icon,
  title,
  value,
  sub,
  bgColor,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function SelectBox({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {icon ? (
            <div className="flex items-center gap-2">
              {icon} {label}
            </div>
          ) : (
            label
          )}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    quality_review: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    pricing: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    batched: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    drying: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    sales: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    inventory: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    submitted_to_finance: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    assessed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  const colorClass = map[s] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${colorClass}`}>{status}</span>;
}

function AssessmentBadge(a: QualityAssessment | null) {
  if (!a) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
        <AlertCircle className="w-3 h-3" />
        Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
      <CheckCircle2 className="w-3 h-3" />
      {a.status}
    </span>
  );
}

function FinanceBadge(state: FinanceState) {
  if (state === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
        <AlertCircle className="w-3 h-3" />
        Missing
      </span>
    );
  }
  if (state === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
      <CheckCircle2 className="w-3 h-3" />
      Confirmed
    </span>
  );
}