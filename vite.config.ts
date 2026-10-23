import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Build stamp shown in Settings → About, so a test result can be tied to the exact deployed release (TCX-NEW-03).
const commit = process.env.APP_COMMIT ?? (() => { try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "dev"; } })();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? "dev"),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  // GitHub Pages serves a project repo under /<repo-name>/, not domain root.
  base: process.env.GITHUB_PAGES ? "/PayRus-Console/" : "/",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5174,
  },
});
