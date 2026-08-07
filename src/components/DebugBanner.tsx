import { useEffect, useState } from "react";
import { subscribeDebugEvents, type DebugEvent } from "../lib/debugBanner";

const MAX_EVENTS = 6;

/**
 * On-screen diagnostic banner (temporary — removed after the data-wipe bug
 * is diagnosed). Shows the latest [DataWipe] events so they can be read on
 * a phone without opening DevTools.
 */
export function DebugBanner() {
  const [events, setEvents] = useState<DebugEvent[]>([
    { time: new Date().toLocaleTimeString(), message: "banner ready — waiting for events", level: "info" },
  ]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    return subscribeDebugEvents((event) => {
      setEvents((prev) => [...prev.slice(-(MAX_EVENTS - 1)), event]);
    });
  }, []);

  if (events.length === 0) return null;

  const latest = events[events.length - 1];
  const hasWarnOrError = events.some((e) => e.level !== "info");

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-amber-400/40 bg-slate-900/95 px-3 py-2 font-mono text-[11px] leading-snug text-amber-200 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="font-bold text-amber-400">
            DBG {events.length} · {latest.time}
          </span>{" "}
          <span className={latest.level !== "info" ? "font-bold text-red-400" : ""}>
            {latest.message}
          </span>
        </button>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded bg-slate-700 px-2 py-0.5 text-amber-200"
          >
            {expanded ? "Hide" : "All"}
          </button>
          <button
            type="button"
            onClick={() => setEvents([])}
            className="rounded bg-slate-700 px-2 py-0.5 text-amber-200"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto border-t border-slate-700 pt-1">
          {events.map((e, i) => (
            <div key={i} className={e.level !== "info" ? "font-bold text-red-400" : ""}>
              {e.time} — {e.message}
            </div>
          ))}
        </div>
      )}

      {!expanded && hasWarnOrError && (
        <div className="mt-0.5 text-red-400">⚠ warning/error captured — tap "All"</div>
      )}
    </div>
  );
}
