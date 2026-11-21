import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/*
 * Povoa o Supabase LOCAL com a demonstração de Manaus (supabase/dev/demo-manaus.sql).
 *
 * É ferramenta de desenvolvimento, não de pipeline: não roda em CI, não recebe
 * URL remota, não usa chave e não aceita --linked. O alvo é um só — o contêiner
 * de banco da stack local deste projeto — e o script recusa qualquer outro.
 *
 *   npx pnpm@11.18.0 exec supabase db reset --local   # banco com seed
 *   node scripts/dev/popular-local.mjs                # dados de demonstração
 *
 * O arquivo é uma transação idempotente: rodar duas vezes não duplica nada.
 */

const CONTAINER = "supabase_db_bivaque-community"
const ARQUIVO = join("supabase", "dev", "demo-manaus.sql")

function recusar(motivo) {
  console.error(`popular-local: ${motivo}`)
  console.error(
    "popular-local: nada foi executado. Este script só escreve no banco LOCAL (npx pnpm@11.18.0 exec supabase start).",
  )
  process.exit(1)
}

// 1. O alvo precisa existir, estar rodando e ser a stack local deste projeto.
const inspecao = spawnSync(
  "docker",
  [
    "inspect",
    "--type",
    "container",
    "--format",
    "{{json .State}}|{{json .Config.Labels}}",
    CONTAINER,
  ],
  { encoding: "utf8", timeout: 20_000 },
)

if (inspecao.error) {
  const detalhe = inspecao.error.message ?? String(inspecao.error)
  recusar(`docker indisponível (${detalhe})`)
}
if (inspecao.status !== 0) {
  recusar(`o contêiner ${CONTAINER} não existe — suba a stack local antes (supabase start)`)
}

const [estadoBruto, rotulosBruto] = inspecao.stdout.split("|")
let estado
let rotulos
try {
  estado = JSON.parse(estadoBruto ?? "{}")
  rotulos = JSON.parse(rotulosBruto ?? "{}") ?? {}
} catch {
  recusar("o docker devolveu uma resposta que este script não consegue ler")
}

if (estado?.Running !== true) recusar(`o contêiner ${CONTAINER} existe mas não está rodando`)

// Guarda extra, sem depender do nome do rótulo: se houver rótulo de projeto de
// compose e ele não for o desta stack, o alvo não é o banco local do Bivaque.
const projeto = rotulos["com.docker.compose.project"]
if (projeto !== undefined && projeto !== "supabase" && projeto !== "bivaque-community") {
  recusar(`o contêiner ${CONTAINER} pertence ao projeto "${projeto}", não a esta stack local`)
}

// 2. O SQL é lido do disco e vai pela entrada padrão do psql — sem arquivo
// copiado para dentro do contêiner e sem caminho absoluto de máquina.
if (!existsSync(ARQUIVO)) recusar(`${ARQUIVO} não existe`)
const sql = readFileSync(ARQUIVO, "utf8")
if (sql.trim() === "") recusar(`${ARQUIVO} está vazio`)

// 3. Executa dentro do contêiner. ON_ERROR_STOP para a transação inteira no
// primeiro erro; o rollback deixa o banco como estava.
const execucao = spawnSync(
  "docker",
  ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
  { input: sql, stdio: ["pipe", "inherit", "inherit"], encoding: "utf8" },
)

if (execucao.error) recusar(`falha ao executar o psql (${execucao.error.message})`)
if (execucao.status !== 0) {
  console.error("popular-local: o SQL falhou; a transação foi desfeita.")
  process.exit(execucao.status ?? 1)
}

console.log("popular-local: demonstração aplicada. Persona: demo-ana@bivaque.example.invalid")
