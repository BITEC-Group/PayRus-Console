import { useT } from "../lib/extra-copy";
import { useCallback, useEffect, useState } from "react";
import {
  channelTypeReadiness, clearChannelTypeCountry, listChannelTypeCountries, listChannelTypes, setChannelType, setChannelTypeCountry, simulateChannelType,
  type ChannelTypeCountryRow, type ChannelTypeRow, type ChannelTypeSim, type ReadinessRow,
} from "../lib/partners.ts";

// Payout types — PayRus agent, partner distributor, mobile money, bank remittance: their pricing parameters, per-country overrides and onboarding readiness.
const CATEGORIES = ["agent_network", "distribution_partner", "wallet", "bank"];
const METHODS = ["mobile_money", "bank", "cash_pickup"];
const DELIVERY = ["near_real_time", "same_day", "t_plus_1", "t_plus_2"];
const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const SEV: Record<string, ReturnType<typeof chip>> = { blocker: chip("#A3243B", "#fff"), warning: chip("#FFF1D6", "#8A5A00"), ok: chip("#DDF3E8", "#1B6B45") };
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : "Error");
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;
const n2 = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const blankOverride = (code: string): ChannelTypeCountryRow => ({ code, country: "", active: true, ownCostFlatEur: null, ownCostPercent: null, marginFlatEur: null, marginPercent: null, premiumEur: null, minFeeEur: null, maxFeeEur: null, deliveryTime: null });
const blankType = (): ChannelTypeRow => ({
  code: "", label: "", category: "distribution_partner", method: "cash_pickup", agentKind: null, costSource: "partner", active: true, sortOrder: 100, ownCostFlatEur: 0, ownCostPercent: 0,
  marginFlatEur: 0, marginPercent: 0, premiumEur: 0, minFeeEur: null, maxFeeEur: null, deliveryTime: null, onboardingRequirements: [], notes: null, countryOverrides: 0,
});

export function PayoutTypesTab({ isSuper, notify }: { isSuper: boolean; notify: (m: string) => void }) {
  const tx = useT();
  const [types, setTypes] = useState<ChannelTypeRow[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelTypeRow | null>(null);
  const [ready, setReady] = useState<ReadinessRow[]>([]);
  const [overrides, setOverrides] = useState<ChannelTypeCountryRow[]>([]);
  const [ov, setOv] = useState<ChannelTypeCountryRow | null>(null);
  const [sim, setSim] = useState<{ country: string; amount: string; rows: ChannelTypeSim[] | null }>({ country: "CD", amount: "100", rows: null });
  const load = useCallback(() => { listChannelTypes().then(setTypes).catch((e) => notify(errText(e))); }, [notify]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!sel) return;
    void channelTypeReadiness(sel).then(setReady).catch(() => setReady([]));
    void listChannelTypeCountries(sel).then(setOverrides).catch(() => setOverrides([]));
  }, [sel, types]);
  const pick = (t: ChannelTypeRow) => { setSel(t.code); setForm({ ...t }); setOv(null); setSim((s) => ({ ...s, rows: null })); };
  const ask = () => window.prompt(tx("Written reason (5+ characters):"));
  const save = () => {
    if (!form) return; const reason = ask(); if (reason === null) return;
    setChannelType(form, reason).then(() => { notify(tx("Saved")); setSel(form.code); load(); }).catch((e) => notify(errText(e)));
  };
  const saveOv = () => {
    if (!ov) return; const reason = ask(); if (reason === null) return;
    setChannelTypeCountry({ ...ov, country: ov.country.toUpperCase() }, reason).then(() => { notify(tx("Saved")); setOv(null); load(); if (sel) void listChannelTypeCountries(sel).then(setOverrides); }).catch((e) => notify(errText(e)));
  };
  const numField = (label: string, get: number | null, set: (v: number | null) => void) => (
    <div className="field"><label>{label}<input className="input" type="number" step="0.01" disabled={!isSuper} value={get == null ? "" : String(get)} onChange={(e) => set(numOrNull(e.target.value))} /></label></div>
  );
  const ovNum = (label: string, k: "ownCostFlatEur" | "ownCostPercent" | "marginFlatEur" | "marginPercent" | "premiumEur" | "minFeeEur" | "maxFeeEur") => (
    <div className="field"><label>{label}<input className="input" type="number" step="0.01" disabled={!isSuper} placeholder={tx("type default")} value={ov?.[k] == null ? "" : String(ov[k])} onChange={(e) => ov && setOv({ ...ov, [k]: numOrNull(e.target.value) })} /></label></div>
  );
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="text-muted" style={{ fontSize: 12 }}>
        {tx("The transfer price varies with how the money is paid out. Each type below is priced from its own cost (PayRus agents) or from the partner contract terms, plus the policy margin and the adjustments set here. Every parameter can be overridden per country. Only the superadmin changes them.")}
      </div>
      {!isSuper && <div className="tag tag-neutral">{tx("Only the superadmin can change payout types.")}</div>}
      {(types ?? []).map((t) => (
        <button key={t.code} type="button" onClick={() => pick(t)} className="card" style={{ textAlign: "left", cursor: "pointer", border: sel === t.code ? "2px solid var(--color-primary-500, #1D3F6B)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{t.label} <span className="text-muted" style={{ fontWeight: 400 }}>· {t.code}</span></strong>
            <span style={t.active ? chip("#DDF3E8", "#1B6B45") : chip("#FBE0E4", "#A3243B")}>{t.active ? "on" : "off"}</span>
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {tx("{{category}} · {{method}} · cost {{cost}} · margin {{marginFlat}} EUR + {{marginPct}}% · {{delivery}}{{overrides}}", { category: t.category.replace("_", " "), method: t.method, cost: t.costSource === "own" ? tx("own {{flat}} EUR + {{pct}}%", { flat: n2(t.ownCostFlatEur), pct: n2(t.ownCostPercent * 100) }) : tx("partner terms"), marginFlat: n2(t.marginFlatEur), marginPct: n2(t.marginPercent * 100), delivery: t.deliveryTime?.replace(/_/g, " ") ?? tx("delivery from terms"), overrides: t.countryOverrides > 0 ? tx(" · {{n}} country override(s)", { n: t.countryOverrides }) : "" })}
          </span>
        </button>
      ))}
      <div><button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => { setSel(null); setForm(blankType()); setOv(null); }}>{tx("Add a payout type")}</button></div>

      {form && (
        <div className="card" style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="card-title">{form.code ? `Set up: ${form.label}` : "New payout type"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "var(--space-2)" }}>
            <div className="field"><label>{tx("Code")}<input className="input" disabled={!isSuper || !!sel} maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} /></label></div>
            <div className="field"><label>{tx("Label")}<input className="input" disabled={!isSuper} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label></div>
            <div className="field"><label>{tx("Category")}<select className="input" disabled={!isSuper} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></label></div>
            <div className="field"><label>{tx("Payout method")}<select className="input" disabled={!isSuper} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label></div>
            <div className="field"><label>{tx("Agent network")}<select className="input" disabled={!isSuper} value={form.agentKind ?? ""} onChange={(e) => setForm({ ...form, agentKind: e.target.value || null })}><option value="">—</option><option value="payrus_direct">{tx("PayRus direct agents")}</option><option value="correspondent">{tx("Partner agents")}</option></select></label></div>
            <div className="field"><label>{tx("Cost comes from")}<select className="input" disabled={!isSuper} value={form.costSource} onChange={(e) => setForm({ ...form, costSource: e.target.value })}><option value="partner">{tx("Partner contract terms")}</option><option value="own">{tx("PayRus own cost")}</option></select></label></div>
            <div className="field"><label>{tx("Default delivery")}<select className="input" disabled={!isSuper} value={form.deliveryTime ?? ""} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value || null })}><option value="">{tx("from terms")}</option>{DELIVERY.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}</select></label></div>
            {numField(tx("Sort order"), form.sortOrder, (v) => setForm({ ...form, sortOrder: v ?? 100 }))}
            {numField(tx("Own cost flat EUR"), form.ownCostFlatEur, (v) => setForm({ ...form, ownCostFlatEur: v ?? 0 }))}
            {numField(tx("Own cost % (0.008)"), form.ownCostPercent, (v) => setForm({ ...form, ownCostPercent: v ?? 0 }))}
            {numField(tx("Type margin flat EUR"), form.marginFlatEur, (v) => setForm({ ...form, marginFlatEur: v ?? 0 }))}
            {numField(tx("Type margin % (0.005)"), form.marginPercent, (v) => setForm({ ...form, marginPercent: v ?? 0 }))}
            {numField(tx("Premium EUR"), form.premiumEur, (v) => setForm({ ...form, premiumEur: v ?? 0 }))}
            {numField(tx("Min fee EUR"), form.minFeeEur, (v) => setForm({ ...form, minFeeEur: v }))}
            {numField(tx("Max fee EUR"), form.maxFeeEur, (v) => setForm({ ...form, maxFeeEur: v }))}
          </div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={!isSuper} checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />{tx("Offered to senders")}</label>
          <div className="field"><label>{tx("Onboarding requirements (one per line)")}
            <textarea className="input" rows={5} disabled={!isSuper} value={form.onboardingRequirements.join("\n")} onChange={(e) => setForm({ ...form, onboardingRequirements: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })} /></label></div>
          <div className="field"><label>{tx("Notes")}<input className="input" disabled={!isSuper} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></label></div>
          <div><button type="button" className="btn btn-primary" disabled={!isSuper || !form.code || !form.label} onClick={save}>{tx("Save payout type")}</button></div>

          {sel && (
            <>
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>{tx("Onboarding readiness")}</div>
              {ready.map((r, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}><span style={SEV[r.severity]}>{r.severity}</span><span>{r.message}</span></div>)}
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>{tx("Country overrides")}</div>
              {overrides.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>{tx("None — every country follows the type defaults.")}</div>}
              {overrides.map((o) => (
                <div key={o.country} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
                  <strong>{o.country}</strong><span>{o.active ? "on" : "off"}</span>
                  <span className="text-muted">{tx("margin {{marginFlat}} / {{marginPercent}} · own {{ownFlat}} / {{ownPercent}} · premium {{premium}} · fee {{minFee}}–{{maxFee}}", { marginFlat: n2(o.marginFlatEur), marginPercent: n2(o.marginPercent), ownFlat: n2(o.ownCostFlatEur), ownPercent: n2(o.ownCostPercent), premium: n2(o.premiumEur), minFee: n2(o.minFeeEur), maxFee: n2(o.maxFeeEur) })}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => setOv({ ...o })}>{tx("Edit")}</button>
                  <button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => { const r = ask(); if (r === null) return; clearChannelTypeCountry(o.code, o.country, r).then(() => { notify(tx("Removed")); load(); }).catch((e) => notify(errText(e))); }}>{tx("Remove")}</button>
                </div>
              ))}
              <div><button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => setOv(blankOverride(sel))}>{tx("Add a country override")}</button></div>
              {ov && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-2)" }}>
                  <div className="field"><label>{tx("Country")}<input className="input" maxLength={2} disabled={!isSuper} value={ov.country} onChange={(e) => setOv({ ...ov, country: e.target.value.toUpperCase() })} /></label></div>
                  {ovNum(tx("Own cost flat EUR"), "ownCostFlatEur")}{ovNum(tx("Own cost %"), "ownCostPercent")}{ovNum(tx("Margin flat EUR"), "marginFlatEur")}{ovNum(tx("Margin %"), "marginPercent")}{ovNum(tx("Premium EUR"), "premiumEur")}{ovNum(tx("Min fee EUR"), "minFeeEur")}{ovNum(tx("Max fee EUR"), "maxFeeEur")}
                  <div className="field"><label>{tx("Delivery")}<select className="input" disabled={!isSuper} value={ov.deliveryTime ?? ""} onChange={(e) => setOv({ ...ov, deliveryTime: e.target.value || null })}><option value="">{tx("type default")}</option>{DELIVERY.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}</select></label></div>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={!isSuper} checked={ov.active} onChange={(e) => setOv({ ...ov, active: e.target.checked })} />{tx("Offered here")}</label>
                  <div><button type="button" className="btn btn-primary" disabled={!isSuper || ov.country.length !== 2} onClick={saveOv}>{tx("Save override")}</button></div>
                </div>
              )}
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>{tx("Price check")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="field"><label>{tx("Country")}<input className="input" style={{ width: 70 }} maxLength={2} value={sim.country} onChange={(e) => setSim({ ...sim, country: e.target.value.toUpperCase() })} /></label></div>
                <div className="field"><label>{tx("Amount USD")}<input className="input" style={{ width: 100 }} inputMode="decimal" value={sim.amount} onChange={(e) => setSim({ ...sim, amount: e.target.value })} /></label></div>
                <button type="button" className="btn btn-primary" onClick={() => simulateChannelType(sim.country, sel, Number(sim.amount) || 100).then((rows) => setSim((s) => ({ ...s, rows }))).catch((e) => notify(errText(e)))}>{tx("Simulate")}</button>
              </div>
              {sim.rows?.map((r, i) => <div key={i} style={{ fontSize: 13 }}>{tx("Sender fee")} <strong>{n2(r.feeEur)} {tx("EUR")}</strong> {tx("· PayRus cost {{cost}} EUR · {{partner}} · {{delivery}} · {{source}}", { cost: n2(r.costEur), partner: r.partnerName ?? tx("PayRus network"), delivery: r.deliveryTime?.replace(/_/g, " ") ?? "—", source: r.source })}</div>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
