import { useState, useEffect } from "react";

interface CacheEntry {
  url: string;
  size?: string;
}

interface AuthStatus {
  online: boolean;
  localStorageKey: string | null;
  hasAccessToken: boolean;
  hasUser: boolean;
  userId: string | null;
}

interface SWStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  controller: string | null;
  cacheName: string;
  cacheEntries: CacheEntry[];
  cacheCount: number;
  auth: AuthStatus;
  lastUpdated: string;
}

export function SWDebugPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SWStatus>({
    supported: false,
    registered: false,
    active: false,
    controller: null,
    cacheName: "biptach-v3",
    cacheEntries: [],
    cacheCount: 0,
    auth: {
      online: navigator.onLine,
      localStorageKey: null,
      hasAccessToken: false,
      hasUser: false,
      userId: null,
    },
    lastUpdated: "",
  });

  async function refreshStatus() {
    const newStatus: SWStatus = {
      supported: "serviceWorker" in navigator,
      registered: false,
      active: false,
      controller: null,
      cacheName: "biptach-v3",
      cacheEntries: [],
      cacheCount: 0,
      auth: {
        online: navigator.onLine,
        localStorageKey: null,
        hasAccessToken: false,
        hasUser: false,
        userId: null,
      },
      lastUpdated: new Date().toLocaleTimeString(),
    };

    if (!newStatus.supported) {
      setStatus(newStatus);
      return;
    }

    // Check registration
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      newStatus.registered = !!reg;
      newStatus.active = !!reg?.active;
      newStatus.controller = navigator.serviceWorker.controller?.scriptURL || null;
    } catch (e) {
      console.error("SW registration check failed:", e);
    }

    // Check cache contents
    try {
      const cacheNames = await caches.keys();
      const allEntries: CacheEntry[] = [];

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const req of keys) {
          const resp = await cache.match(req);
          const size = resp?.headers.get("content-length");
          allEntries.push({
            url: req.url,
            size: size ? `${Math.round(parseInt(size) / 1024)}KB` : "unknown",
          });
        }
      }

      newStatus.cacheEntries = allEntries;
      newStatus.cacheCount = allEntries.length;
    } catch (e) {
      console.error("Cache check failed:", e);
    }

    // Check auth status
    try {
      const authData = localStorage.getItem("biptach-auth");
      if (authData) {
        newStatus.auth.localStorageKey = "biptach-auth";
        const parsed = JSON.parse(authData);
        newStatus.auth.hasAccessToken = !!parsed?.access_token;
        newStatus.auth.hasUser = !!parsed?.user;
        newStatus.auth.userId = parsed?.user?.id || null;
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    }

    setStatus(newStatus);
  }

  useEffect(() => {
    refreshStatus();
    // Refresh every 5 seconds when open
    const interval = open ? setInterval(refreshStatus, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-red-700"
      >
        🔍 SW Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-h-[70vh] w-96 overflow-auto rounded-xl border-2 border-red-500 bg-white p-4 shadow-2xl dark:bg-slate-900 dark:text-white">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-red-600">🔍 Service Worker Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={refreshStatus}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
          >
            Refresh
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded bg-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-400 dark:bg-slate-700 dark:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {/* Status Section */}
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <p className="font-semibold mb-1">Status</p>
          <div className="space-y-1">
            <p>
              SW Supported:{" "}
              <span className={status.supported ? "text-green-600" : "text-red-600"}>
                {status.supported ? "✅ Yes" : "❌ No"}
              </span>
            </p>
            <p>
              Registered:{" "}
              <span className={status.registered ? "text-green-600" : "text-red-600"}>
                {status.registered ? "✅ Yes" : "❌ No"}
              </span>
            </p>
            <p>
              Active:{" "}
              <span className={status.active ? "text-green-600" : "text-red-600"}>
                {status.active ? "✅ Yes" : "❌ No"}
              </span>
            </p>
            <p>
              Controller:{" "}
              <span className="break-all text-slate-500">
                {status.controller ? "✅ " + status.controller.split("/").pop() : "❌ None"}
              </span>
            </p>
          </div>
        </div>

        {/* Auth Section */}
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <p className="font-semibold mb-1">Auth</p>
          <div className="space-y-1">
            <p>
              Online:{" "}
              <span className={status.auth.online ? "text-green-600" : "text-orange-600"}>
                {status.auth.online ? "✅ Yes" : "⚠️ Offline"}
              </span>
            </p>
            <p>
              localStorage key:{" "}
              <span className={status.auth.localStorageKey ? "text-green-600" : "text-red-600"}>
                {status.auth.localStorageKey ? "✅ " + status.auth.localStorageKey : "❌ Not found"}
              </span>
            </p>
            <p>
              Has access_token:{" "}
              <span className={status.auth.hasAccessToken ? "text-green-600" : "text-red-600"}>
                {status.auth.hasAccessToken ? "✅ Yes" : "❌ No"}
              </span>
            </p>
            <p>
              Has user:{" "}
              <span className={status.auth.hasUser ? "text-green-600" : "text-red-600"}>
                {status.auth.hasUser ? "✅ Yes" : "❌ No"}
              </span>
            </p>
            {status.auth.userId && (
              <p className="text-slate-500 text-[10px] break-all">
                User ID: {status.auth.userId}
              </p>
            )}
          </div>
        </div>

        {/* Cache Section */}
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <p className="font-semibold mb-1">
            Cache ({status.cacheCount} items)
          </p>
          {status.cacheCount === 0 ? (
            <p className="text-red-600 font-semibold">⚠️ Cache is EMPTY — offline won't work!</p>
          ) : (
            <div className="max-h-48 overflow-auto space-y-1">
              {status.cacheEntries.map((entry, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-slate-200 pb-1 dark:border-slate-700">
                  <span className="break-all text-green-600">
                    {entry.url.replace(window.location.origin, "")}
                  </span>
                  <span className="text-slate-400 whitespace-nowrap">{entry.size}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Updated */}
        <p className="text-slate-400 text-center">
          Last updated: {status.lastUpdated}
        </p>
      </div>
    </div>
  );
}
