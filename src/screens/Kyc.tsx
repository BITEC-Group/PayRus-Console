import { useState } from "react";
import type { Desk, Locale, Role } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { uploadKycFile } from "../lib/kycUpload.ts";
import { upsertUserRole, submitKybParties } from "../lib/identity.ts";
import { KYB, BUSINESS_ROLES } from "../lib/kybCopy.ts";
import { consoleRoleToDbSlug, loadRoleDefinitions } from "../lib/roleMapping.ts";

// Inserted between role selection (ProfilePicker) and the dashboard — same
// three required uploads as App/'s KYC wizard (src/pages/profile/page.tsx's
// "id"/"selfie" steps), persisted via the same shared user_roles columns
// (supabase/migrations/0010_kyc_documents.sql).
export function Kyc({
  D,
  locale,
  setLocale,
  role,
  userId,
  onBack,
  onComplete,
  onLogoClick,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  role: Role;
  userId: string | null;
  onBack: () => void;
  onComplete: () => void;
  onLogoClick: () => void;
}) {
  const K = D.kyc;
  const [idFrontDocId, setIdFrontDocId] = useState<string | null>(null);
  const [uploadingIdFront, setUploadingIdFront] = useState(false);
  const [idBackDocId, setIdBackDocId] = useState<string | null>(null);
  const [uploadingIdBack, setUploadingIdBack] = useState(false);
  const [selfieDocId, setSelfieDocId] = useState<string | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusiness = BUSINESS_ROLES.has(role);
  const B = KYB[locale];
  const [declared, setDeclared] = useState(1);
  const [owners, setOwners] = useState<{ name: string; pct: string }[]>([{ name: "", pct: "" }]);
  const [repName, setRepName] = useState("");
  const kybComplete = !isBusiness || (
    declared >= 1 && owners.filter((o) => o.name.trim().length >= 2).length >= declared && repName.trim().length >= 2
  );
  const canContinue = !!idFrontDocId && !!idBackDocId && !!selfieDocId && kybComplete;

  const handleUpload = async (file: File, setId: (id: string | null) => void, setUploading: (v: boolean) => void) => {
    setUploading(true);
    setError(null);
    try {
      const storageId = await uploadKycFile(file);
      if (!storageId) {
        setError(K.saveFailed);
        return;
      }
      setId(storageId);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    setError(null);
    try {
      if (userId) {
        await loadRoleDefinitions();
        const roleId = await upsertUserRole({
          userId,
          role: consoleRoleToDbSlug(role),
          kind: isBusiness ? "organisation" : "individual",
          idFrontDocPath: idFrontDocId ?? undefined,
          idBackDocPath: idBackDocId ?? undefined,
          selfieDocPath: selfieDocId ?? undefined,
        });
        if (isBusiness) {
          await submitKybParties({
            userId, roleId, declaredOwners: declared,
            parties: [
              ...owners.filter((o) => o.name.trim().length >= 2).map((o) => ({ type: "ubo" as const, name: o.name.trim(), ownershipPct: o.pct ? Number(o.pct) : undefined })),
              { type: "authorised_rep" as const, name: repName.trim() },
            ],
          });
        }
      }
      onComplete();
    } catch {
      setError(K.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const dropzoneStyle = (uploaded: boolean) => ({
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8,
    border: "2px dashed", borderColor: uploaded ? "var(--auth-teal)" : "var(--auth-border)",
    background: uploaded ? "rgba(23,146,126,0.06)" : "#fff",
    borderRadius: 16, padding: "var(--space-6)", cursor: "pointer", textAlign: "center" as const,
  });

  const dropzone = (label: string, docId: string | null, uploading: boolean, setId: (id: string | null) => void, setUploading: (v: boolean) => void, capture: "environment" | "user") => (
    <label style={dropzoneStyle(!!docId)}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--auth-navy)" }}>{label}</span>
      <span style={{ fontSize: 12, color: docId ? "var(--auth-teal)" : "var(--auth-body)" }}>
        {uploading ? K.uploading : docId ? K.uploaded : K.uploadPrompt}
      </span>
      <input
        type="file"
        accept="image/*"
        capture={capture}
        style={{ display: "none" }}
        disabled={uploading}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, setId, setUploading); }}
      />
    </label>
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--auth-bg)",
        backgroundImage: "radial-gradient(rgba(10,47,92,0.06) 1px, transparent 1.2px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-6)" }}>
        <BackButton label={D.back} onClick={onBack} />
        <LocaleMenu value={locale} onChange={setLocale} variant="auth" />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", padding: "0 var(--space-6) var(--space-8)", maxWidth: 480, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <PayRusLogo size={140} onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>{K.headline}</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--auth-body)" }}>{K.subtitle}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%" }}>
          {dropzone(K.idFrontLabel, idFrontDocId, uploadingIdFront, setIdFrontDocId, setUploadingIdFront, "environment")}
          {dropzone(K.idBackLabel, idBackDocId, uploadingIdBack, setIdBackDocId, setUploadingIdBack, "environment")}
          {dropzone(K.selfieLabel, selfieDocId, uploadingSelfie, setSelfieDocId, setUploadingSelfie, "user")}
        </div>

        {isBusiness && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%", textAlign: "left" }}>
            <h2 style={{ margin: 0, fontSize: 16, color: "var(--auth-navy)" }}>{B.title}</h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--auth-body)" }}>{B.note}</p>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--auth-navy)" }}>
              {B.ownersCount}
              <input type="number" min={1} max={20} value={declared} className="input" style={{ display: "block", width: 100, marginTop: 6 }}
                onChange={(e) => setDeclared(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
            </label>
            {owners.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder={B.ownerName} aria-label={B.ownerName} value={o.name}
                  onChange={(e) => setOwners(owners.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="input" style={{ flex: 1, minWidth: 90 }} type="number" min={0} max={100} placeholder={B.ownerPct} aria-label={B.ownerPct} value={o.pct}
                  onChange={(e) => setOwners(owners.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
              </div>
            ))}
            {owners.length < declared && (
              <button type="button" className="btn btn-secondary" style={{ minHeight: 44, alignSelf: "flex-start" }} onClick={() => setOwners([...owners, { name: "", pct: "" }])}>{B.addOwner}</button>
            )}
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--auth-navy)" }}>
              {B.repName}
              <input className="input" style={{ display: "block", width: "100%", marginTop: 6 }} value={repName} onChange={(e) => setRepName(e.target.value)} />
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--auth-body)" }}>{B.repNote}</span>
            </label>
            {!kybComplete && <p style={{ margin: 0, fontSize: 12.5, color: "var(--auth-body)" }}>{B.incomplete}</p>}
          </div>
        )}

        {error && (
          <p style={{ margin: 0, fontSize: 12.5, color: "#C33F55", fontWeight: 600 }} role="alert">{error}</p>
        )}

        <button
          type="button"
          disabled={!canContinue || submitting}
          onClick={() => void handleContinue()}
          style={{
            width: "100%", border: 0, borderRadius: 16, color: "#fff", fontFamily: "var(--font-auth-heading)", fontWeight: 700,
            fontSize: 15, textAlign: "center", padding: "14px", cursor: canContinue && !submitting ? "pointer" : "not-allowed",
            opacity: canContinue && !submitting ? 1 : 0.5, background: "var(--auth-gradient)", boxShadow: "0 10px 26px rgba(10,42,74,0.14)",
          }}
        >
          {submitting ? D.checking : K.continueLabel}
        </button>
      </div>
    </div>
  );
}
