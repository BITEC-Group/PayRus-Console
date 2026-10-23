import { useCallback, useEffect, useState } from "react";
import { listPendingAdminGrants, approveAdminGrant, type PendingAdminGrant } from "../lib/adminStaff.ts";
import { useT } from "../lib/extra-copy";

// Admin rights are granted by an existing admin and approved by a second, different admin over a two-factor session.
export function AdminGrants({ notify }: { notify: (m: string) => void }) {
  const tx = useT();
  const [rows, setRows] = useState<PendingAdminGrant[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => { void listPendingAdminGrants().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);

  const approve = async (id: string) => {
    const pw = window.prompt(tx("Enter the admin password:"));
    if (!pw) return;
    setBusy(id);
    try { await approveAdminGrant(id, pw); notify(tx("Admin role granted.")); load(); }
    catch (e) { notify(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  return (
    <div className="card elev-sm" style={{ gap: "var(--space-2)" }}>
      <div className="card-title">{tx("Pending admin grants")}</div>
      <p className="card-body">{tx("Each request needs approval from a different administrator with a verified authenticator.")}</p>
      {rows && rows.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{tx("Nothing pending.")}</div>}
      {rows?.map((g) => (
        <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{g.targetName ?? g.targetEmail ?? "—"}</div>
            <div style={{ fontSize: 11 }} className="text-muted">{g.targetEmail} · {tx("requested by")} {g.requestedByName ?? "—"}</div>
          </div>
          <button type="button" className="btn btn-secondary" disabled={busy === g.id} onClick={() => void approve(g.id)}>{tx("Approve")}</button>
        </div>
      ))}
    </div>
  );
}
