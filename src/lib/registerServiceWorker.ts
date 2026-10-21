/**
 * Registers public/sw.js so the console can be installed as a desktop app (browsers only offer
 * installation to pages with a manifest and a service worker that handles fetch), and reports when a
 * newer version has been deployed so the UI can offer a refresh.
 * In dev the worker would cache Vite's HMR traffic, so any existing one is removed instead.
 */
let updateReady = false;
const subscribers = new Set<() => void>();

export const subscribeUpdate = (cb: () => void): (() => void) => {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
};
export const isUpdateReady = (): boolean => updateReady;

function markUpdateReady() {
  if (updateReady) return;
  updateReady = true;
  subscribers.forEach((cb) => cb());
}

const CHECK_EVERY_MS = 60 * 60 * 1000;

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) {
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    return;
  }

  // A worker taking over a page that already had one means newer assets were deployed.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) markUpdateReady(); });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) markUpdateReady();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) markUpdateReady();
          });
        });

        // An installed desktop app can stay open for days: look for a new version hourly and when it regains focus.
        const check = () => { void registration.update().catch(() => undefined); };
        window.setInterval(check, CHECK_EVERY_MS);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
      })
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}
