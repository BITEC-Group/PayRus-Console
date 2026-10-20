// PRS-BR-012: non-production banner (see App/src/components/ui/env-banner.tsx). VITE_APP_ENV=production hides it.
export default function EnvBanner() {
  const env = (import.meta.env.VITE_APP_ENV as string | undefined) ?? (import.meta.env.DEV ? "development" : "sandbox");
  if (env === "production") return null;
  return (
    <div role="status" data-testid="env-banner" style={{ background: "#FEF3C7", color: "#78350F", fontSize: 11, fontWeight: 600, textAlign: "center", padding: "4px 12px", borderBottom: "1px solid #FCD34D" }}>
      {env.toUpperCase()} environment — balances and transfers are simulated, not real money
    </div>
  );
}
