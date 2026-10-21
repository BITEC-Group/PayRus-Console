import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/extra-copy";

// Chrome, Edge and Samsung Internet (desktop and Android) fire beforeinstallprompt once, possibly before React
// has mounted, so it is captured at module load and shared with every button.
// iPhones and iPads (every iOS browser) have no such event: installing there is "Share > Add to Home Screen",
// so the button opens a short how-to instead.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches === true || window.matchMedia?.("(display-mode: window-controls-overlay)").matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true);

// iPadOS 13+ reports itself as a Mac, so touch support tells them apart.
const isIos = () => typeof navigator !== "undefined" && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** "Install app": offers the console as an app. Renders nothing when the browser cannot install it or it is already installed. */
export default function InstallButton({ variant }: { variant: "auth" | "console" }) {
  const tx = useT();
  const [, force] = useState(0);
  const [help, setHelp] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    if (!help) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHelp(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [help]);

  if (isInstalled() || (!deferred && !isIos())) return null;

  const install = async () => {
    const event = deferred;
    if (!event) { setHelp(true); return; }
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") deferred = null; // the browser only allows one prompt per event
    notify();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        className={variant === "console" ? "btn btn-ghost" : undefined}
        style={
          variant === "auth"
            ? { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--auth-navy)", padding: "10px 6px" }
            : { fontSize: 13, gap: 6 }
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {tx("Install app")}
      </button>
      {help && (
        <div
          onClick={() => setHelp(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,47,92,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-help-title"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, boxSizing: "border-box", background: "#fff", color: "var(--auth-navy)", borderRadius: 20, padding: 20, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(10,42,74,0.3)", marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <strong id="install-help-title" style={{ fontSize: 17 }}>{tx("Add this app to your home screen")}</strong>
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5, color: "var(--auth-body)" }}>
              <li>{tx("Tap the Share button in the browser toolbar.")}</li>
              <li>{tx("Choose “Add to Home Screen”.")}</li>
              <li>{tx("Tap Add. PayRus then opens like an app from your home screen.")}</li>
            </ol>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setHelp(false)}
              style={{ border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", background: "var(--auth-navy)", color: "#fff" }}
            >
              {tx("Close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
