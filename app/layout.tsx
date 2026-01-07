// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import PWAHead from "@/components/PWAHead";

// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["monospace"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Lite Manager",
  description: "Lite Manager – simple, fast management for Yeda Group / Great Pearl Coffee.",
  manifest: "/manifest.webmanifest",
  applicationName: "Lite Manager",
  authors: [{ name: "Yeda Group" }],
  generator: "Next.js",
  keywords: ["coffee", "management", "milling", "suppliers", "lite manager"],
  referrer: "origin-when-cross-origin",
  creator: "Yeda Group",
  publisher: "Great Pearl Coffee",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lite Manager",
  },
  openGraph: {
    type: "website",
    title: "Lite Manager",
    description: "Coffee & Milling Management System",
    siteName: "Lite Manager",
  },
  twitter: {
    card: "summary",
    title: "Lite Manager",
    description: "Coffee & Milling Management System",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#15803d" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-white"
      suppressHydrationWarning
    >
      <head>
        {/* PWA Head component for better PWA support */}
        <PWAHead />
        
        {/* Theme color for Windows */}
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Prevent phone number detection */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Mobile web app capable */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/icons/icon-192x192.png"
          as="image"
          type="image/png"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased h-full`}
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
        
        {/* PWA install prompt script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detect PWA installation
              window.addEventListener('DOMContentLoaded', () => {
                // Check if app is running in standalone mode (PWA)
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true ||
                  document.referrer.includes('android-app://');
                
                // Add class to body for PWA mode
                if (isStandalone) {
                  document.body.classList.add('pwa-mode');
                  console.log('Running in PWA mode');
                }
                
                // Handle beforeinstallprompt event
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  deferredPrompt = e;
                  console.log('PWA install prompt available');
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}