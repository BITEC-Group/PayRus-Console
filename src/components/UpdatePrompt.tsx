import { useState, useSyncExternalStore } from "react";
import { useT } from "../lib/extra-copy";
import { isUpdateReady, subscribeUpdate } from "../lib/registerServiceWorker.ts";

/** "A new version is available": shown once a newer deploy has been installed; Refresh reloads onto it. */
export default function UpdatePrompt() {
  const tx = useT();
  const ready = useSyncExternalStore(subscribeUpdate, isUpdateReady, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!ready || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", left: 0, right: 0, bottom: "var(--space-4)", marginInline: "auto", zIndex: 200,
        display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center",
        width: "max-content", maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", padding: "12px 16px", borderRadius: 14,
        background: "var(--auth-navy)", color: "#fff", boxShadow: "0 10px 26px rgba(10,42,74,0.28)", fontSize: 14,
      }}
    >
      <span style={{ fontWeight: 600 }}>{tx("A new version is available")}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ border: 0, borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", background: "#fff", color: "var(--auth-navy)" }}
      >
        {tx("Refresh")}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{ border: "1px solid rgba(255,255,255,0.5)", borderRadius: 10, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", background: "transparent", color: "#fff" }}
      >
        {tx("Later")}
      </button>
    </div>
  );
}
