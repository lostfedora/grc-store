"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Users,
  Coffee,
  Scale,
  Settings,
  LogOut,
  User,
  UserCheck,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Suppliers", href: "/suppliers", icon: Users },
  { label: "Coffee Records", href: "/coffee-records", icon: Coffee },
  { label: "Milling", href: "/milling", icon: Scale },
  { label: "Milling Customers", href: "/milling-customers", icon: UserCheck },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleDrawer = () => setOpen((prev) => !prev);
  const closeDrawer = () => setOpen(false);

  // Mock user data - replace with your actual auth context/user data
  const user = {
    name: "Admin User",
    email: "admin@greatpearlcoffee.com",
    role: "Administrator",
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Add your actual logout logic here
      localStorage.removeItem("auth-token");
      sessionStorage.removeItem("user-session");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      handleLogout();
    }
  };

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
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand / logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-emerald-300/70 dark:border-emerald-700/70 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Lite Manager Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Lite Manager
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coffee & Milling Console
              </p>
            </div>
          </div>

          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={closeDrawer}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1">
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

        {/* Footer with Logout */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800">
          {/* Settings Link (optional) */}
          <Link
            href="/settings"
            onClick={closeDrawer}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-800"
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Settings</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={confirmLogout}
            disabled={isLoggingOut}
            className={`
              flex items-center gap-3 w-full px-4 py-3 text-sm font-medium
              transition-colors
              ${
                isLoggingOut
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              }
            `}
          >
            <LogOut
              className={`w-4 h-4 ${isLoggingOut ? "animate-pulse" : ""}`}
            />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>

          {/* System Info */}
          <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <div>
              <p className="font-medium">Yeda Group System</p>
              <p className="mt-0.5">Lite Manager · v1.0</p>
            </div>
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-emerald-300/70 dark:border-emerald-700/70 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Lite Manager"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
          </div>
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
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-emerald-300/70 dark:border-emerald-700/70 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Lite Manager"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Lite Manager
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Coffee & Milling Console
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
