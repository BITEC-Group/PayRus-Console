/**
 * Registers public/sw.js so the console can be installed as a desktop app (browsers only offer
 * installation to pages with a manifest and a service worker that handles fetch).
 * In dev the worker would cache Vite's HMR traffic, so any existing one is removed instead.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) {
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => console.warn("Service worker registration failed:", err));
  });
}
