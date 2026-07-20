// Render an Ozly carousel HTML (N stacked .canvas blocks) into N PNGs.
// Usage: node render-carousel.mjs <src.html> <outDir> <prefix>
//   e.g. node render-carousel.mjs ~/Downloads/ozly-carousel-shift-tip-08-en.html \
//        "/Users/augustoeamanda/Downloads/SHIFT TIP #08" shift-tip-08
// Output: <outDir>/<prefix>-1.png ... <prefix>-N.png  (1080x1350 each, scale 1)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , srcPath, outDir, prefix] = process.argv;
if (!srcPath || !outDir || !prefix) {
  console.error('usage: node render-carousel.mjs <src.html> <outDir> <prefix>');
  process.exit(1);
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const src = readFileSync(srcPath, 'utf8');
const style = (src.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const bodyInner = src.slice(src.indexOf('<body>') + 6, src.indexOf('</body>'));
const parts = bodyInner.split('<div class="canvas">').slice(1);
if (parts.length === 0) { console.error('no .canvas blocks found'); process.exit(1); }

// Pull canvas pixel size from the CSS so output matches the design.
const wMatch = style.match(/\.canvas\{[^}]*width:\s*(\d+)px/);
const hMatch = style.match(/\.canvas\{[^}]*height:\s*(\d+)px/);
const W = wMatch ? wMatch[1] : '1080';
const H = hMatch ? hMatch[1] : '1350';

mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), 'ozly-carousel-' + prefix);
mkdirSync(work, { recursive: true });

parts.forEach((p, i) => {
  const canvasHtml = '<div class="canvas">' + p.replace(/<\/body>[\s\S]*/, '').trim();
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">${style}` +
    `<style>html,body{margin:0!important;padding:0!important;background:#fff!important;}` +
    `.canvas{margin:0!important;box-shadow:none!important;}</style></head><body>${canvasHtml}</body></html>`;
  const htmlPath = join(work, `slide-${i + 1}.html`);
  writeFileSync(htmlPath, doc);
  const outPng = join(outDir, `${prefix}-${i + 1}.png`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    '--allow-file-access-from-files', '--virtual-time-budget=4000',
    `--screenshot=${outPng}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' });
  console.log('rendered', outPng);
});

rmSync(work, { recursive: true, force: true });
console.log(`\nDone: ${parts.length} PNG(s) -> ${outDir}`);
