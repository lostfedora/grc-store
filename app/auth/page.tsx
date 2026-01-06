'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import supabase from '@/lib/supabaseClient';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
} from 'lucide-react';

type Msg = { text: string; type: 'success' | 'error' | 'info' } | null;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<Msg>(null);

  const [sessionState, setSessionState] = useState<{
    hasSession: boolean;
    userEmail?: string | null;
    storageHint?: string;
    origin?: string;
  }>({ hasSession: false });

  // Detect existing session and show it (helps debugging)
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionState({
        hasSession: !!data.session,
        userEmail: data.session?.user?.email ?? null,
        origin,
        storageHint: getStorageHint(),
      });
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getSession();
      setSessionState((prev) => ({
        ...prev,
        hasSession: !!data.session,
        userEmail: data.session?.user?.email ?? null,
      }));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  function getStorageHint() {
    try {
      // session needs localStorage/cookies to work in typical SPA auth
      const k = '__sb_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return 'localStorage OK';
    } catch {
      return 'localStorage BLOCKED (session may not persist)';
    }
  }

  const togglePasswordVisibility = () => setShowPassword((p) => !p);

  const logoutAndClear = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await supabase.auth.signOut();
      setMessage({ text: 'Signed out. You can login again now.', type: 'info' });
    } catch (e: any) {
      setMessage({ text: `Sign out failed: ${e?.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!email || !password) {
        setMessage({ text: 'Please enter both email and password.', type: 'error' });
        setLoading(false);
        return;
      }

      // 1) Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage({ text: `Sign in failed: ${error.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      // 2) Must have session returned
      if (!data.session) {
        setMessage({
          text:
            'Login succeeded but no session was returned. This usually means browser storage is blocked or auth is misconfigured.',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // 3) Confirm session persists in browser storage
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        setMessage({ text: `Session check failed: ${sessionErr.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        // This is exactly what causes AuthSessionMissingError later
        const origin = window.location.origin;
        const originHint =
          origin.includes('127.0.0.1') || origin.includes('localhost')
            ? `You are on ${origin}. Make sure you ALWAYS use only one (prefer http://localhost:3000).`
            : `Origin: ${origin}`;

        setMessage({
          text:
            'You signed in, but the session did NOT persist in the browser. Fix: disable privacy/adblock extensions, allow storage, and use only localhost (not 127.0.0.1). ' +
            originHint,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // 4) All good → redirect immediately (no timeout)
      setMessage({ text: 'Signed in successfully! Redirecting...', type: 'success' });

      router.push('/');
    } catch (err: any) {
      setMessage({ text: `Unexpected error: ${err?.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900 px-4 py-8 transition-colors">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center mb-4 shadow-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200/70 dark:border-emerald-700/70 overflow-hidden">
            <Image
              src="/logo.png"
              alt="Lite Manager / Great Pearl Coffee"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Sign in to your Lite Manager account</p>
        </div>

        {/* Debug/status card (helps you see session + origin issues) */}
        <div className="mb-4 bg-white/70 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Session: <b>{sessionState.hasSession ? 'ACTIVE' : 'NONE'}</b>
            {sessionState.userEmail ? ` • ${sessionState.userEmail}` : ''}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {sessionState.storageHint} • Origin: {sessionState.origin}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">
            Tip: Use only <b>http://localhost:3000</b> (avoid switching to <b>127.0.0.1</b>) or session may appear missing.
          </p>

          {sessionState.hasSession && (
            <button
              onClick={logoutAndClear}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sign out (clear session)
            </button>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-400 dark:focus:border-green-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-lg font-semibold text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Sign In
                </div>
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`mt-6 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : message.type === 'info'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              } transition-colors`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : message.type === 'info' ? (
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center mb-2">
            <div className="w-6 h-6 rounded-md overflow-hidden bg-white/80 dark:bg-slate-800/80 border border-emerald-300/70 dark:border-emerald-700/70 flex items-center justify-center mr-2">
              <Image src="/logo.png" alt="Lite Manager Logo" width={20} height={20} className="object-contain" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Lite Manager · Great Pearl Coffee</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">Secure authentication powered by Supabase</p>
        </div>
      </div>
    </main>
  );
}
