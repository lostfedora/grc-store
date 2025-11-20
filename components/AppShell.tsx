"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Users,
  Coffee,
  FileText,
  DollarSign,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Suppliers", href: "/suppliers", icon: Users },
  { label: "Coffee Records", href: "/coffee-records", icon: Coffee },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggleDrawer = () => setOpen((prev) => !prev);
  const closeDrawer = () => setOpen(false);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex">
      {/* Mobile overlay (always above page content) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[70] md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar (drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          transform transition-transform duration-200
          md:translate-x-0
          z-[80]
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand / logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Great Pearl Coffee
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Management Console
            </p>
          </div>

          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={closeDrawer}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors
                  ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active
                      ? "text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-4 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium">Yeda Group System</p>
          <p className="mt-0.5">v1.0 • Supabase & Next.js</p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="relative flex-1 flex flex-col md:ml-64 min-h-screen z-[10]">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-[20] bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={toggleDrawer}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Great Pearl Coffee
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Management Console
              </p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
