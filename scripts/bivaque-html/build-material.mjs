// Gera prototypes/bivaque-html/src/vendor/material-web-2.5.0.js de forma reproduzível.
// As dependências ficam numa pasta isolada (ignorada pelo Git), instaladas a partir do lockfile
// versionado em scripts/bivaque-html/material-build/ (fixa também lit, lit-html e tslib):
//   mkdir -p .visual/material-build
//   cp scripts/bivaque-html/material-build/package*.json .visual/material-build/
//   (cd .visual/material-build && npm ci)
//   node scripts/bivaque-html/build-material.mjs
// Saída: IIFE minificado com licenças preservadas. A checagem de registro abaixo é estática;
// a verificação definitiva é no navegador (round09-proof: material-components-registered).

import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"

const MATERIAL_VERSION = "2.5.0"
const ESBUILD_VERSION = "0.28.2"
// 32 componentes registrados no pacote original + md-menu-item e 5 da Rodada 09.
export const COMPONENTS = [
  "md-assist-chip",
  "md-checkbox",
  "md-chip-set",
  "md-circular-progress",
  "md-dialog",
  "md-divider",
  "md-elevation",
  "md-filled-button",
  "md-filled-field",
  "md-filled-text-field",
  "md-filled-tonal-button",
  "md-filled-tonal-icon-button",
  "md-filter-chip",
  "md-focus-ring",
  "md-icon",
  "md-icon-button",
  "md-item",
  "md-linear-progress",
  "md-list",
  "md-list-item",
  "md-menu",
  "md-menu-item",
  "md-outlined-button",
  "md-outlined-field",
  "md-outlined-select",
  "md-outlined-text-field",
  "md-primary-tab",
  "md-radio",
  "md-ripple",
  "md-select-option",
  "md-switch",
  "md-tabs",
  "md-text-button",
  "md-input-chip",
  "md-suggestion-chip",
  "md-slider",
  "md-fab",
  "md-secondary-tab",
]

const root = resolve(import.meta.dirname, "../..")
const deps = resolve(root, process.env.BIVAQUE_MATERIAL_DEPS ?? ".visual/material-build")
const output = join(root, "prototypes/bivaque-html/src/vendor/material-web-2.5.0.js")
const require = createRequire(join(deps, "package.json"))
// Lê direto da pasta: alguns pacotes (lit) não exportam package.json pelo mapa de exports.
const version = (name) =>
  JSON.parse(readFileSync(join(deps, "node_modules", name, "package.json"), "utf8")).version

const found = { material: version("@material/web"), esbuild: version("esbuild") }
if (found.material !== MATERIAL_VERSION || found.esbuild !== ESBUILD_VERSION)
  throw new Error(
    `Versões fixadas ${MATERIAL_VERSION}/${ESBUILD_VERSION}, instaladas ${found.material}/${found.esbuild}`,
  )
// Toda dependência instalada precisa bater com o lockfile versionado (lit, tslib etc.).
const lock = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "material-build/package-lock.json"), "utf8"),
)
const drift = []
for (const [key, entry] of Object.entries(lock.packages)) {
  if (!key || key.startsWith("node_modules/@esbuild/")) continue
  const name = key.replace(/^node_modules\//, "")
  let installed
  try {
    installed = version(name)
  } catch {
    drift.push(`${name}: ausente`)
    continue
  }
  if (installed !== entry.version) drift.push(`${name}: ${installed} ≠ ${entry.version}`)
}
if (drift.length) throw new Error(`Dependências fora do lockfile: ${drift.join("; ")}`)

const manifest = JSON.parse(
  readFileSync(require.resolve("@material/web/custom-elements.json"), "utf8"),
)
const modules = new Map()
for (const mod of manifest.modules)
  for (const declaration of mod.declarations ?? [])
    if (declaration.tagName) modules.set(declaration.tagName, mod.path)
const missing = COMPONENTS.filter((tag) => !modules.has(tag))
if (missing.length) throw new Error(`Sem módulo no catálogo oficial: ${missing.join(", ")}`)
const entry = [...new Set(COMPONENTS.map((tag) => modules.get(tag)))]
  .sort()
  .map((path) => `import "@material/web/${path}";`)
  .join("\n")

const esbuild = require("esbuild")
const result = await esbuild.build({
  stdin: { contents: entry, resolveDir: deps, loader: "js" },
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  legalComments: "inline",
  write: false,
})
const code = result.outputFiles[0].text

const registered = [...new Set([...code.matchAll(/\(\s*"(md-[a-z-]+)"\s*\)/g)].map((m) => m[1]))]
  .filter((tag) => COMPONENTS.includes(tag) || modules.has(tag))
  .sort()
const expected = [...COMPONENTS].sort()
if (JSON.stringify(registered) !== JSON.stringify(expected))
  throw new Error(
    `Registro divergente.\nfaltam: ${expected.filter((t) => !registered.includes(t))}\nsobram: ${registered.filter((t) => !expected.includes(t))}`,
  )

writeFileSync(output, code)
console.log(`OK: ${registered.length} componentes, ${code.length} bytes → ${output}`)
