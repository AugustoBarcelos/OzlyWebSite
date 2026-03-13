/**
 * Post-build script: copies index.html into SPA route directories
 * that don't already have a static HTML file (from public/).
 */
import { mkdirSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

const routes = [
  "/support",
  "/guide",
];

const src = join(dist, "index.html");

for (const route of routes) {
  const dir = join(dist, route);
  const target = join(dir, "index.html");
  if (existsSync(target)) {
    console.log(`  ⏭ ${route}/index.html (static file exists)`);
    continue;
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  copyFileSync(src, target);
  console.log(`  ✓ ${route}/index.html`);
}

console.log("Post-build: done.");
