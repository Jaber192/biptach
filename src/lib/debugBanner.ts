/**
 * Tiny event bus for on-screen debug diagnostics.
 * Diagnostic call sites use debugLog() which both console.logs AND emits
 * an event that the DebugBanner component renders on screen — so issues
 * can be observed on a phone without opening DevTools.
 */

export type DebugEvent = {
  time: string;
  message: string;
  level: "info" | "warn" | "error";
};

type Listener = (event: DebugEvent) => void;

const listeners = new Set<Listener>();

export function subscribeDebugEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Log to console AND broadcast to the on-screen DebugBanner. */
export function debugLog(message: string, level: DebugEvent["level"] = "info"): void {
  const time = new Date().toLocaleTimeString();
  const prefixed = `[DataWipe] ${message}`;
  if (level === "error") console.error(prefixed);
  else if (level === "warn") console.warn(prefixed);
  else console.log(prefixed);

  const event: DebugEvent = { time, message, level };
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Never let banner errors break the app
    }
  });
}
