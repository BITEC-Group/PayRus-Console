// i18n guard for the console (no test runner here): node scripts/check-i18n.mjs
//   1. every tx("English text") in src has a French, Portuguese and Spanish entry in src/lib/extra-copy.data.ts
//   2. every entry keeps the same {{placeholders}} as its English key; none is empty
//   3. no JSX text node is left hardcoded (it must go through tx() or the copy objects in i18n.ts)
// Exits 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const require = createRequire(path.join(ROOT, "package.json"));
const ts = require("typescript");

// the dictionary is TypeScript: transpile it on the fly
const dataSrc = fs.readFileSync(path.join(SRC, "lib", "extra-copy.data.ts"), "utf8");
const js = ts.transpileModule(dataSrc, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const tmp = path.join(ROOT, "node_modules", ".cache-i18n-check.mjs");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, js);
const { EXTRA } = await import(pathToFileURL(tmp).href);
fs.rmSync(tmp, { force: true });

const problems = [];
const ph = (s) => (String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).map((x) => x.replace(/\s/g, "")).sort().join(",");
const DYNAMIC = new Set(["Development", "Sandbox", "Staging", "Demo", "Pilot"]); // environment names are looked up at run time

const used = new Set();
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.tsx?$/.test(f.name)) files.push(p); } })(SRC);
for (const p of files) {
  const rel = path.relative(SRC, p).replace(/\\/g, "/");
  const text = fs.readFileSync(p, "utf8");
  if (!/extra-copy/.test(rel) && !/\.test\./.test(rel)) for (const m of text.matchAll(/\btx\(("(?:[^"\\]|\\.)*")/g)) used.add(JSON.parse(m[1]));
  if (p.endsWith(".tsx")) {
    const sf = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n) => {
      if (ts.isJsxText(n)) {
        const t = n.text.replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
        if (t && (t.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 2 && !/^[\W\d_]+$/.test(t) && !/^[·\s]*(FX|KYC|ID|EUR|USD|XAF)$/.test(t)) {
          problems.push(`hardcoded JSX text ${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} "${t.slice(0, 50)}"`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}
for (const k of used) {
  const e = EXTRA[k];
  if (!e) { problems.push(`no translation entry for: ${k.slice(0, 80)}`); continue; }
  for (const l of ["fr", "pt", "es"]) {
    if (!e[l] || !String(e[l]).trim()) problems.push(`${l} missing for: ${k.slice(0, 60)}`);
    else if (ph(e[l]) !== ph(k)) problems.push(`${l} placeholders differ for: ${k.slice(0, 60)}`);
  }
}
for (const k of Object.keys(EXTRA)) if (!used.has(k) && !DYNAMIC.has(k)) problems.push(`unused entry (remove or use it): ${k.slice(0, 80)}`);
console.log(`console i18n: ${used.size} strings in use, ${Object.keys(EXTRA).length} entries, ${problems.length} problem(s)`);
for (const p of problems) console.log("  " + p);
process.exit(problems.length ? 1 : 0);
