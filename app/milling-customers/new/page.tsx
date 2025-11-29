"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Save,
  Users,
  Loader2,
  Phone,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function NewMillingCustomerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Theme init (same style as suppliers)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")
      .matches;

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

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      setUser(data.user);
    };

    checkAuth();
  }, [router]);

  const validateForm = (): string | null => {
    if (!fullName.trim()) {
      return "Customer full name is required.";
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const validationError = validateForm();
    if (validationError) {
      setMessage({ text: validationError, type: "error" });
      setSubmitting(false);
      return;
    }

    const opening = 0; // always 0 for new milling customers
    const status = "Active"; // default

    try {
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
        setMessage({
          text: `Failed to save customer: ${error.message}`,
          type: "error",
        });
      } else {
        setMessage({
          text: "Milling customer created successfully. Redirecting...",
          type: "success",
        });
        setTimeout(() => {
          router.push("/milling-customers");
        }, 1000);
      }
    } catch (err: any) {
      setMessage({
        text: `Unexpected error: ${err.message}`,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
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
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 border border-green-200 dark:border-green-700/70">
                <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Add Milling Customer
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Register a new customer for coffee milling / hulling
                </p>
              </div>
            </div>

            <Link
              href="/milling-customers"
              className="flex items-center gap-2 px-5 py-2.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-700 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Milling Customers
            </Link>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <section className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information Section */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
                      Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="fullName"
                        >
                          Full Name *
                        </label>
                        <div className="relative">
                          <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. Masika John"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Location Section */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
                      Contact Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Phone */}
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="phone"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. 0781 121 639"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                          htmlFor="address"
                        >
                          Address / Location
                        </label>
                        <div className="relative">
                          <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input
                            id="address"
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="e.g. Kasese, Kinyamaseke"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Alert */}
                  {message && (
                    <div
                      className={`p-4 rounded-xl border ${
                        message.type === "success"
                          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200"
                          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200"
                      }`}
                    >
                      <div className="flex items-center">
                        {message.type === "success" ? (
                          <svg
                            className="w-5 h-5 text-green-500 dark:text-green-300 mr-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-red-500 dark:text-red-300 mr-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <p className="font-medium">{message.text}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-3 bg-green-600 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving Customer...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Customer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar - Help & Information */}
            <div className="space-y-6">
              {/* Help Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Milling Customer Tips
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-1.5 mt-0.5">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Use full names
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enter a clear full name so that it appears well on
                        milling statements and SMS notifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-1.5 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Track by location
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Include trading centre / village to know where each
                        customer comes from.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Fields Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-6">
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
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Required Fields
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Only the full name is required. New milling customers
                      automatically start as{" "}
                      <span className="font-semibold">Active</span> with{" "}
                      <span className="font-semibold">zero balance</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* End Sidebar */}
          </div>
        </div>
      </section>
    </main>
  );
}
