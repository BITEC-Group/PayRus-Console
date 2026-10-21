import type { TX } from "./extra-copy.tsx";

/**
 * Text the database writes in English (transfer states, notes, audit actions, rules-based triage).
 * Each helper maps a known message onto an EXTRA entry so it follows the language switch; anything
 * unrecognised (free text a person typed, AI-written advice) is returned as written.
 */
const words = (s: string) => s.replace(/_/g, " ");
const cap = (s: string) => s.replace(/^./, (c) => c.toLocaleUpperCase());

/** A state, type, status, priority or action word ("refund_pending", "convert_out") in the active language. */
export const wordText = (tx: TX, s: string): string => tx(words(s));
export const actionText = (tx: TX, s: string): string => cap(tx(words(s)));

const NOTE_EXACT = new Set(["Travel installment charge", "Travel demo funds", "Sandbox test funds", "Bills", "Pitch repayment"]);
const NOTE_PATTERNS: [RegExp, string][] = [
  [/^Game bet: (.+)$/, "Game bet: {{x}}"], [/^Game bet win: (.+)$/, "Game bet win: {{x}}"], [/^Refund: (.+)$/, "Refund: {{x}}"],
  [/^Fundraise: (.+)$/, "Fundraise: {{x}}"], [/^Payout to (.+)$/, "Payout to {{x}}"], [/^Tontine payout: (.+)$/, "Tontine payout: {{x}}"],
  [/^Tontine: (.+)$/, "Tontine: {{x}}"], [/^Invest: (.+)$/, "Invest: {{x}}"], [/^Savings: (.+)$/, "Savings: {{x}}"], [/^Bill: (.+)$/, "Bill: {{x}}"],
  [/^Loyalty spend: (.+)$/, "Loyalty spend: {{x}}"], [/^Expense reimbursement: (.+)$/, "Expense reimbursement: {{x}}"],
];

/** A note the backend wrote on a transfer ("Game bet: sports"); notes people typed are shown as written. */
export function noteText(tx: TX, note: string): string {
  if (NOTE_EXACT.has(note)) return tx(note);
  for (const [re, key] of NOTE_PATTERNS) {
    const m = note.match(re);
    if (m) return tx(key, { x: m[1] });
  }
  return note;
}

const AUDIT_TABLES: Record<string, string> = {
  user_roles: "User roles", users: "Users", transfers: "Transfers", support_escalations: "Support escalations", support_permissions: "Support permissions",
  gate_passwords: "Gate passwords", profile_features: "Profile features", console_role_tabs: "Console role tabs", fx_margin_config: "FX margin settings",
  expense_reports: "Expense reports", partner_contract_terms: "Partner contract terms", notifications: "Notifications", wallet_views: "Wallet views",
  quotes: "Quotes", cards: "Cards", travel_bookings: "Travel bookings", travel_installments: "Travel instalments", capability_registry: "Capability registry",
  linked_payment_methods: "Linked payment methods", game_bets: "Game bets", payout_agents: "Payout agents", travel_installment_plans: "Travel instalment plans",
  payout_orders: "Payout orders", loyalty_accounts: "Loyalty accounts", rg_limits: "Responsible-gaming limits", fundraise_campaigns: "Fundraise campaigns",
};
const AUDIT_VERBS: Record<string, string> = { insert: "created", update: "updated", delete: "deleted" };

export const auditTableText = (tx: TX, table: string): string => tx(AUDIT_TABLES[table] ?? cap(words(table)));

/** "users.update" as "Utilisateurs · modifié"; the raw identifier stays available as a tooltip. */
export function auditActionText(tx: TX, action: string): string {
  const [table, verb] = action.split(".");
  if (!verb) return action;
  return `${auditTableText(tx, table)} · ${tx(AUDIT_VERBS[verb] ?? verb)}`;
}
export const auditActorText = (tx: TX, label: string): string => (label === "none" ? tx("System") : label === "authenticated" ? tx("Signed-in user") : label);
export const auditReasonText = (tx: TX, reason: string): string => (reason === "support user edit" ? tx("Support user edit") : reason);

// ---- rules-based escalation triage (supabase/migrations/0027 support_rules_triage) ----
type WhyPattern = [RegExp, string, (m: RegExpMatchArray, tx: TX) => Record<string, string | number>];
const st = (tx: TX, s: string) => wordText(tx, s);
const WHY: WhyPattern[] = [
  [/^Transaction (\S+) has been (\S+) for ([\d.]+) h and can legally move to paid\.$/, "Transaction {{ref}} has been {{state}} for {{hours}} h and can legally move to paid.", (m, tx) => ({ ref: m[1], state: st(tx, m[2]), hours: m[3] })],
  [/^A (\S+) transaction cannot be completed\.$/, "A {{state}} transaction cannot be completed.", (m, tx) => ({ state: st(tx, m[1]) })],
  [/^Transaction (\S+) is (\S+), which is refundable; approval credits (\S+) (\S+) back\.$/, "Transaction {{ref}} is {{state}}, which is refundable; approval credits {{amount}} {{currency}} back.", (m, tx) => ({ ref: m[1], state: st(tx, m[2]), amount: m[3], currency: m[4] })],
  [/^The transaction is paid with no dispute opened; a refund needs a dispute first\.$/, "The transaction is paid with no dispute opened; a refund needs a dispute first.", () => ({})],
  [/^A (\S+) transaction cannot be refunded\.$/, "A {{state}} transaction cannot be refunded.", (m, tx) => ({ state: st(tx, m[1]) })],
  [/^Transaction (\S+) has an open dispute that can be closed\.$/, "Transaction {{ref}} has an open dispute that can be closed.", (m) => ({ ref: m[1] })],
  [/^There is no open dispute on this transaction\.$/, "There is no open dispute on this transaction.", () => ({})],
  [/^Transaction (\S+) never executed \((\S+)\); voiding is safe \(superadmin \+ password required\)\.$/, "Transaction {{ref}} never executed ({{state}}); voiding is safe (superadmin + password required).", (m, tx) => ({ ref: m[1], state: st(tx, m[2]) })],
  [/^A (\S+) transaction has executed and can never be voided\.$/, "A {{state}} transaction has executed and can never be voided.", (m, tx) => ({ state: st(tx, m[1]) })],
  [/^Modest adjustment of (\S+) (\S+) for a KYC-verified user; confirm the missing funds in the ledger first\.$/, "Modest adjustment of {{amount}} {{currency}} for a KYC-verified user; confirm the missing funds in the ledger first.", (m) => ({ amount: m[1], currency: m[2] })],
  [/^Adjustment of (\S+) (\S+) needs evidence \((user is not KYC-verified|large amount)\)\.$/, "Adjustment of {{amount}} {{currency}} needs evidence ({{reason}}).", (m, tx) => ({ amount: m[1], currency: m[2], reason: tx(m[3]) })],
  [/^This request needs a human reading of the details\.$/, "This request needs a human reading of the details.", () => ({})],
];

function whyText(tx: TX, why: string): string {
  for (const [re, key, params] of WHY) {
    const m = why.match(re);
    if (m) return tx(key, params(m, tx));
  }
  return why;
}

/** Summary line ("refund for Amina on TXN-1 — recommend reject.") of a rules-based suggestion. */
export function triageSummaryText(tx: TX, s: string): string {
  const m = s.match(/^(.+?) for (.+?)(?: on (\S+))? — recommend (.+)\.$/);
  if (!m) return s;
  const params = { action: tx(m[1]), name: m[2], ref: m[3] ?? "", rec: tx(m[4]) };
  return tx(m[3] ? "{{action}} for {{name}} on {{ref}} — recommend {{rec}}." : "{{action}} for {{name}} — recommend {{rec}}.", params);
}

/** Rationale: the reason sentence followed by any risk-flag sentences. */
export function triageRationaleText(tx: TX, s: string): string {
  const m = s.match(/^(.*?)((?: User is not KYC-verified\.)?(?: (\d+) other escalations in 30 days\.)?(?: (\d+) earlier escalations were rejected\.)?)$/);
  if (!m) return s;
  const parts = [whyText(tx, m[1])];
  if (m[2].includes("User is not KYC-verified.")) parts.push(tx("User is not KYC-verified."));
  if (m[3]) parts.push(tx("{{count}} other escalations in 30 days.", { count: m[3] }));
  if (m[4]) parts.push(tx("{{count}} earlier escalations were rejected.", { count: m[4] }));
  return parts.join(" ");
}

const REPLIES: [RegExp, string][] = [
  [/^Hello (.+?), we reviewed your request and approved it: (.*) We will confirm once it is applied\.$/, "Hello {{name}}, we reviewed your request and approved it: {{why}} We will confirm once it is applied."],
  [/^Hello (.+?), we reviewed your request and could not approve it: (.*) If you have more information, please reply and we will look again\.$/, "Hello {{name}}, we reviewed your request and could not approve it: {{why}} If you have more information, please reply and we will look again."],
  [/^Hello (.+?), to continue with your request we need a little more information: (.*)$/, "Hello {{name}}, to continue with your request we need a little more information: {{why}}"],
];

/** Draft reply to the customer of a rules-based suggestion. */
export function triageReplyText(tx: TX, s: string): string {
  for (const [re, key] of REPLIES) {
    const m = s.match(re);
    if (m) return tx(key, { name: m[1], why: whyText(tx, m[2]) });
  }
  return s;
}
