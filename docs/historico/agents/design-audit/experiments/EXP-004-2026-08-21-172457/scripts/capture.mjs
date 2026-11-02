// Capture screenshots for EXP-004 candidates.
// Self-contained: no project config touched.
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "screenshots");

// Import playwright directly from the project's pnpm store via a
// dynamic import of its known entrypoint. This avoids adding any
// dependency to either the project or this experiment folder.
const playwrightUrl = pathToFileURL(
  resolve(
    ROOT,
    "..", // experiments/
    "..", // design-audit/
    "..", // agents/
    "..", // docs/
    "..", // bivaque-community/
    "node_modules",
    ".pnpm",
    "playwright@1.51.1",
    "node_modules",
    "playwright",
    "index.mjs",
  ),
).href;
const { chromium } = await import(playwrightUrl);

const CANDIDATES = ["candidate-A", "candidate-B", "candidate-C"];
const VIEWPORTS = [
  { name: "375",  width: 375,  height: 1100 },
  { name: "768",  width: 768,  height: 1100 },
  { name: "1440", width: 1440, height: 1100 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const candidate of CANDIDATES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      const url = pathToFileURL(resolve(ROOT, candidate, "index.html")).href;
      await page.goto(url, { waitUntil: "networkidle" });
      // Allow Google Fonts to settle.
      await page.waitForTimeout(900);
      const target = resolve(OUT, `${candidate}-${vp.name}.png`);
      await page.screenshot({ path: target, fullPage: true });
      console.log(`captured ${candidate} @ ${vp.name}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
