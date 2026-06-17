#!/usr/bin/env node
/**
 * render-art.mjs — renders every asset declared in tools/art/draw.js onto a
 * canvas in a headless browser and writes the result as a PNG into img/.
 * All art is original procedural pixel-art (no third-party sprites).
 *
 * Usage: PLAYWRIGHT_BROWSERS_PATH=... node tools/render-art.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf8"><body style="margin:0;background:#fff"></body>');
await page.addScriptTag({ path: join(ROOT, 'tools/art/draw.js') });

const results = await page.evaluate(() => {
  const out = [];
  for (const a of window.ART.assets) {
    const cv = document.createElement('canvas');
    cv.width = a.w; cv.height = a.h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    try { a.draw(ctx); } catch (e) { return { error: a.file + ': ' + e.message }; }
    out.push({ file: a.file, data: cv.toDataURL('image/png') });
  }
  return out;
});

if (results.error) { console.error('Draw error:', results.error); process.exit(1); }

let n = 0;
for (const r of results) {
  const buf = Buffer.from(r.data.split(',')[1], 'base64');
  const p = join(ROOT, r.file);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, buf);
  n++;
  process.stdout.write(`  ✓ ${r.file} (${buf.length}b)\n`);
}
console.log(`Rendered ${n} assets → img/`);
await browser.close();
