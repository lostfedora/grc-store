// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">You're Offline</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}