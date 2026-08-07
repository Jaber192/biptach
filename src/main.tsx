import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./hooks/useTheme";
import "./styles/index.css";

// Force service worker update check on every page load
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      // Check for updates every time the page loads
      registration.update();
      // Also check periodically (every 30 minutes)
      setInterval(() => registration.update(), 30 * 60 * 1000);
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
