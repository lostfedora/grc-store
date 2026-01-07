// /utils/pwa-utils.js
export const isPWA = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const forceReloadIfStale = () => {
  if (typeof window === 'undefined') return;
  
  // Check if page was loaded from cache
  const perfEntries = performance.getEntriesByType('navigation');
  if (perfEntries.length > 0) {
    const navEntry = perfEntries[0] as PerformanceNavigationTiming;
    if (navEntry.type === 'back_forward') {
      // Page was loaded from cache (browser back/forward)
      window.location.reload();
    }
  }
};

export const setupPWANavigation = () => {
  if (typeof window === 'undefined' || !isPWA()) return;
  
  // Prevent default link behavior in PWA
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href) {
      e.preventDefault();
      window.location.href = link.href;
    }
  }, true);
};