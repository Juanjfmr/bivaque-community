import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const manifest = JSON.parse(readFileSync("source-manifest.json", "utf8"));
const app = readFileSync("src/App.tsx", "utf8");
const sourceMap = manifest.sourceMap;
if (sourceMap.length !== 23) throw Error(`Expected 23 official sources, found ${sourceMap.length}`);
let referenced = 0;
for (const entry of sourceMap) {
  if (!existsSync(entry.original)) throw Error(`Original source missing: ${entry.slug}`);
  const content = readFileSync(entry.original);
  const hash = createHash("sha256").update(content).digest("hex");
  if (!entry.sha256 || hash !== entry.sha256) throw Error(`Upstream changed: ${entry.slug}. Restore exact official source.`);
  if (app.includes(`/21st/upstream/${entry.slug}`) || app.includes(`/21st/${entry.slug}`)) referenced++;
}
if (referenced < 12) throw Error(`Insufficient 21st.dev integration references: ${referenced}`);
console.log(`Official 21st.dev sources: ${sourceMap.length}/${sourceMap.length} immutable; references in App: ${referenced}`);
console.log("Note: license clearance and visual acceptance are independent checks.");
