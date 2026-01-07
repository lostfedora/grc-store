// /components/PWANavigationProvider.jsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPWA, setupPWANavigation } from '@/utils/pwa-utils';

export default function PWANavigationProvider({ children }) {
  const router = useRouter();
  
  useEffect(() => {
    if (isPWA()) {
      setupPWANavigation();
      
      // Clean up any Next.js scroll restoration
      if (window.history.scrollRestoration) {
        window.history.scrollRestoration = 'manual';
      }
    }
  }, []);
  
  return children;
}