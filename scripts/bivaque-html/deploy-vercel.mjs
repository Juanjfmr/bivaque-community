// Publica o protótipo HTML como link de teste na Vercel (projeto separado "bivaque-prototipo").
// Uso: node scripts/bivaque-html/deploy-vercel.mjs [--dry-run]
// Só sobe o HTML gerado (nenhum código do repositório), com noindex e sem cache do index,
// depois de conferir que o dist está atualizado e que a referência congelada está íntegra.
import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../..")
const project = "bivaque-prototipo"
const folder = join(root, ".visual", project)
const dist = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")

for (const args of [
  ["scripts/bivaque-html/verify_reference.py"],
  ["scripts/bivaque-html/build.py", "--check-current"],
])
  execFileSync("python", args, { cwd: root, stdio: "inherit" })

mkdirSync(folder, { recursive: true })
copyFileSync(dist, join(folder, "index.html"))
writeFileSync(
  join(folder, "vercel.json"),
  `${JSON.stringify(
    {
      cleanUrls: true,
      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Robots-Tag", value: "noindex, nofollow" },
            { key: "Cache-Control", value: "no-cache" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "no-referrer" },
          ],
        },
      ],
    },
    null,
    2,
  )}\n`,
)

if (process.argv.includes("--dry-run")) {
  console.log(`Pasta pronta, sem publicar: ${folder}`)
  process.exit(0)
}
const run = spawnSync("vercel", ["deploy", "--prod", "--yes"], {
  cwd: folder,
  encoding: "utf8",
  shell: true,
})
process.stdout.write(run.stdout ?? "")
process.stderr.write(run.stderr ?? "")
process.exitCode = run.status ?? 1
