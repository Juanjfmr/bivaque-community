import { execFileSync } from "node:child_process"
import { copyFileSync, cpSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"

/*
 * Monta o conteúdo web do APK de experimento (EXP-CASCA-CAPACITOR) em
 * apps/app/dist-casca, o `webDir` do Capacitor:
 *
 *   dist-casca/index.html        cópia do index do app (ver abaixo)
 *   dist-casca/app/...           build `--mode casca`, na mesma base `/app/`
 *   dist-casca/app/casca/...     gravação da API e as imagens dela
 *
 * O servidor local do Capacitor devolve o `index.html` da raiz para todo
 * caminho sem extensão. O app é publicado em `/app/`, então o build fica na
 * subpasta e o index é copiado para a raiz: os endereços dele já apontam para
 * `/app/assets/...`.
 *
 * A gravação vem de `gravar-casca.mjs` (gerada, não versionada).
 */

const app = join(process.cwd(), "apps", "app")
const gravacao = join(app, "casca-gravacao")
const destino = join(app, "dist-casca")

if (!existsSync(join(gravacao, "gravacao.json"))) {
  console.error("montar-casca: falta a gravação — rode scripts/app/gravar-casca.mjs antes.")
  process.exit(1)
}

rmSync(destino, { recursive: true, force: true })
execFileSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules", "vite", "bin", "vite.js"),
    "build",
    "--mode",
    "casca",
    "--outDir",
    "dist-casca/app",
  ],
  { cwd: app, stdio: "inherit" },
)
copyFileSync(join(destino, "app", "index.html"), join(destino, "index.html"))
cpSync(gravacao, join(destino, "app", "casca"), { recursive: true })
console.log(`montar-casca: ${destino}`)
