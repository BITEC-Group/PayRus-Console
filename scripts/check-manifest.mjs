// Guards the Console's web app manifest: node scripts/check-manifest.mjs
// The Console (…/PayRus-Console/) and the App (…/payrus/) share one site. A manifest "id" of "./" resolves to the site
// root for both, so browsers would treat them as one app. Each must keep its own id, scope and start URL.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const consoleManifest = read(path.join(ROOT, "public", "site.webmanifest"));
const problems = [];

if (consoleManifest.id !== "/PayRus-Console/") problems.push(`id must be "/PayRus-Console/", found ${JSON.stringify(consoleManifest.id)}`);
if (consoleManifest.start_url !== "./" || consoleManifest.scope !== "./") problems.push("start_url and scope must stay relative to the Console folder (./)");
if (consoleManifest.display !== "standalone") problems.push("display must be standalone");
const sizes = new Set((consoleManifest.icons ?? []).map((i) => i.sizes));
for (const s of ["192x192", "512x512"]) if (!sizes.has(s)) problems.push(`missing ${s} icon`);

// when the App sits next to the Console (this workspace), the two must not share an identity
const appFile = path.join(ROOT, "..", "App", "public", "site.webmanifest");
if (fs.existsSync(appFile)) {
  const app = read(appFile);
  if (app.id === consoleManifest.id) problems.push(`the App and the Console share the manifest id ${JSON.stringify(app.id)}`);
  if (app.name === consoleManifest.name) problems.push("the App and the Console share the same name");
}

console.log(`console manifest: ${problems.length} problem(s)`);
for (const p of problems) console.log("  " + p);
process.exit(problems.length ? 1 : 0);
