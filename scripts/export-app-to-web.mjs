import { cpSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"

/*
 * Publicação conjunta (SPA ADR §8): o app é servido em `/app` pelo mesmo
 * domínio da web. O Next serve `apps/web/public` e o rewrite de `/app/*`
 * devolve o `index.html` do app; este script põe o build do Vite lá.
 *
 * A cópia é gerada, não versionada (`apps/web/public/app/` está no .gitignore):
 * o artefato tem que sair do mesmo build do app que o resto do gate usa.
 */

const origem = join("apps", "app", "dist")
const destino = join("apps", "web", "public", "app")

if (!existsSync(join(origem, "index.html"))) {
  console.error(`export-app: ${origem}/index.html não existe — rode o build do app antes.`)
  process.exit(1)
}

rmSync(destino, { recursive: true, force: true })
cpSync(origem, destino, { recursive: true })
console.log(`export-app: ${origem} -> ${destino}`)
