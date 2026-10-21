import { useEffect, useState } from "react";
import { useT } from "../lib/extra-copy";

// The browser fires beforeinstallprompt once, possibly before React has mounted, so it is captured
// at module load and shared with every button.
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

const isInstalled = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches);

/** "Install app": offers the console as a desktop app. Renders nothing when the browser cannot install it or it is already installed. */
export default function InstallButton({ variant }: { variant: "auth" | "console" }) {
  const tx = useT();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  if (!deferred || isInstalled()) return null;

  const install = async () => {
    const event = deferred;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") deferred = null; // the browser only allows one prompt per event
    notify();
  };

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={variant === "console" ? "btn btn-ghost" : undefined}
      style={
        variant === "auth"
          ? { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--auth-navy)", padding: "6px 4px" }
          : { fontSize: 13, gap: 6 }
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tx("Install app")}
    </button>
  );
}
