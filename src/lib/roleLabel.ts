import type { TX } from "./extra-copy.tsx";

const SPECIAL: Record<string, string> = { ngo: "NGO" };

/** A role slug from the database ("public_institution", "ngo") as a name in the active language. */
export function roleLabel(tx: TX, slug: string): string {
  return tx(SPECIAL[slug] ?? slug.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));
}
