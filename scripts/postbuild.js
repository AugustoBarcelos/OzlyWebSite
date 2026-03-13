/**
 * Post-build script: copies index.html into each SPA route directory
 * so GitHub Pages serves 200 (not 404) for direct navigation.
 */
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

const routes = [
  "/support",
  "/guide",
  "/privacy-policy",
  "/terms-of-use",
];

const src = join(dist, "index.html");

for (const route of routes) {
  const dir = join(dist, route);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, "index.html"));
  console.log(`  ✓ ${route}/index.html`);
}

console.log("Post-build: all route pages created.");
