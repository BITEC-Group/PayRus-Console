import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/extra-copy";
import { copyLink, detectInstallPlatform, shareOrCopyLink } from "../lib/installPlatform.ts";

// Chrome, Edge and Samsung Internet (desktop and Android) fire beforeinstallprompt once, possibly before React
// has mounted, so it is captured at module load and shared with every button.
// Safari (iPhone, iPad and Mac) has no such event: installing there goes through its own menus, so the button opens
// a how-to whose main button starts the part a website can start (the system Share sheet, or copying the link).
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

/** "Install app": offers the console as an app. Renders nothing when the browser cannot install it or it is already installed. */
export default function InstallButton({ variant }: { variant: "auth" | "console" }) {
  const tx = useT();
  const [, force] = useState(0);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    if (!help) return;
    setStatus(null);
    actionRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHelp(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [help]);

  const platform = detectInstallPlatform();
  if (isInstalled() || (!deferred && platform === "none")) return null;

  const install = async () => {
    const event = deferred;
    if (!event) { setHelp(true); return; }
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") deferred = null; // the browser only allows one prompt per event
    notify();
  };

  // The main button of the how-to. iPhone/iPad: the Share sheet lists "Add to Home Screen" (and "Open in Safari" from
  // in-app browsers). Mac: nothing can open the File menu, so the link is copied for sharing or reopening in Safari.
  const canShare = platform !== "mac-safari" && typeof navigator.share === "function";
  const act = async () => {
    setBusy(true);
    setStatus(null);
    const url = window.location.href.split("#")[0];
    const result = canShare ? await shareOrCopyLink({ title: "PayRus", text: tx("Install PayRus on your device"), url }) : await copyLink(url);
    setBusy(false);
    if (result === "shared") setHelp(false);
    else if (result === "copied") setStatus({ ok: true, text: tx("Link copied") });
    else if (result === "failed") setStatus({ ok: false, text: tx("Couldn't open the Share menu. Copy the link from the address bar instead.") });
  };

  const mac = platform === "mac-safari";
  const steps = mac
    ? [tx("In the menu bar, open the File menu."), tx("Choose “Add to Dock…”."), tx("Click Add. PayRus then opens like an app from your Dock.")]
    : [tx("Tap the Share button in the browser toolbar."), tx("Choose “Add to Home Screen”."), tx("Tap Add. PayRus then opens like an app from your home screen.")];
  const intro = platform === "ios-inapp" ? tx("This in-app browser cannot install apps. Open this page in Safari first (Share menu > “Open in Safari”, or copy the link), then follow these steps.") : null;

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
            <strong id="install-help-title" style={{ fontSize: 17 }}>{mac ? tx("Add this app to your Dock") : tx("Add this app to your home screen")}</strong>
            {intro && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--auth-body)" }}>{intro}</p>}
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 14, lineHeight: 1.5, color: "var(--auth-body)" }}>
              {steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <button
              ref={actionRef}
              type="button"
              disabled={busy}
              onClick={() => void act()}
              style={{ border: 0, borderRadius: 12, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, background: "var(--auth-navy)", color: "#fff" }}
            >
              {canShare ? tx("Open the Share menu") : tx("Copy link")}
            </button>
            <div role="status" aria-live="polite" style={{ minHeight: 18, fontSize: 13, fontWeight: 600, color: status?.ok === false ? "#B3263E" : "var(--auth-teal)" }}>{status?.text ?? ""}</div>
            <button
              type="button"
              onClick={() => setHelp(false)}
              style={{ border: "1px solid var(--auth-border)", borderRadius: 12, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", background: "#fff", color: "var(--auth-navy)" }}
            >
              {tx("Close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
