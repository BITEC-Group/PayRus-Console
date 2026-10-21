import { useT } from "../lib/extra-copy";

// PRS-BR-012: non-production banner (see App/src/components/ui/env-banner.tsx). VITE_APP_ENV=production hides it.
export default function EnvBanner() {
  const tx = useT();
  const env = (import.meta.env.VITE_APP_ENV as string | undefined) ?? (import.meta.env.DEV ? "development" : "sandbox");
  if (env === "production") return null;
  // The environment name is translated when it is one of the known ones, then upper-cased.
  const name = tx(env.charAt(0).toUpperCase() + env.slice(1)).toUpperCase();
  return (
    <div role="status" data-testid="env-banner" style={{ background: "#FEF3C7", color: "#78350F", fontSize: 11, fontWeight: 600, textAlign: "center", padding: "4px 12px", borderBottom: "1px solid #FCD34D" }}>
      {tx("{{env}} environment — balances and transfers are simulated, not real money", { env: name })}
    </div>
  );
}
