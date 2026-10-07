import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

// FIGMA-002 — manifesto de fixtures do LOTE, por ID exato.
//
// Por que não "limpar por prefixo": prefixo de título NÃO prova propriedade. Duas
// execuções do mesmo lote (ou uma execução e a prova de quem veio antes) usam os
// mesmos marcadores, e um DELETE por prefixo no `beforeAll` apaga fixture da
// outra. Isso não é limpeza, é.destroy cross-run — e apaga prova anterior.
//
// Regra do módulo: nada é apagado sem estar NA LISTA deste manifesto. A lista é
// criada vazia no início da execução, cresce só quando a própria execução cria
// uma linha, e o `finally` apaga exatamente o que está nela. Nenhuma consulta de
// limpeza contém `like`, `ilike` ou `truncate`.
//
// O arquivo em disco é registro forense do que ESTA execução criou — nenhuma
// outra execução o lê para apagar nada.

// `storage.protect_delete()` recusa DELETE direto em storage.objects: a remoção
// de arquivo é sempre pela Storage API, com os caminhos exatos do manifesto.
const CONTAINER = "supabase_db_bivaque-figma001-proof"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ManifestKind = "listings" | "posts" | "reports" | "conversations" | "objects"

export interface RunManifest {
  runId: string
  /** Processo dono do manifesto. Recuperação só toca manifesto cujo pid morreu. */
  pid: number
  createdAt: string
  listings: string[]
  posts: string[]
  reports: string[]
  conversations: string[]
  objects: string[]
}

function recordsDir(): string {
  // O diretório é sobrescrevível para que um teste unitário do próprio módulo não
  // escreva registro dentro da pasta de evidências do lote. Em execução real
  // (Playwright) ninguém define isto e o caminho é o de sempre.
  const override = process.env["BIVAQUE_FIGMA002_RUNS_DIR"]
  return override ?? join(process.cwd(), ".visual/opencode-figma-20261005/figma002-runtime/runs")
}

function manifestPath(runId: string): string {
  return join(recordsDir(), `${runId}.json`)
}

export function createRunManifest(): RunManifest {
  const manifest: RunManifest = {
    runId: randomUUID(),
    pid: process.pid,
    createdAt: new Date().toISOString(),
    listings: [],
    posts: [],
    reports: [],
    conversations: [],
    objects: [],
  }
  mkdirSync(recordsDir(), { recursive: true })
  writeFileSync(manifestPath(manifest.runId), JSON.stringify(manifest, null, 2), "utf8")
  return manifest
}

/** Registra um id criado por ESTA execução. Qualquer coisa fora do manifesto
 *  simplesmente não existe para a limpeza — inclusive para ela. */
export function track(manifest: RunManifest, kind: ManifestKind, id: string): void {
  if (kind === "objects") {
    if (!/^[0-9a-f-]{36}\//i.test(id)) throw new Error(`Invalid object path: ${id}`)
    if (!manifest.objects.includes(id)) manifest.objects.push(id)
  } else {
    if (!UUID.test(id)) throw new Error(`Invalid ${kind} id: ${id}`)
    const list = manifest[kind]
    if (!list.includes(id)) list.push(id)
  }
  writeFileSync(manifestPath(manifest.runId), JSON.stringify(manifest, null, 2), "utf8")
}

export const ISOLATED_RUNTIME_URL = "http://127.0.0.1:55621"

/**
 * FAIL-CLOSED: nada é escrito, removido ou apagado fora do stack ISOLADO deste
 * lote.
 *
 * A URL vem do ambiente, e o ambiente é exatamente o vetor que este lote não
 * pode furar: apontar para 55321/55322 (stack COMPARTILHADO) faria a limpeza de
 * fixture cair em dados de outra pessoa. Por isso a comparação é por IGUALDADE
 * exata — não `includes`, não "parece", não "o padrão local" — e a ausência da
 * variável também é negativa.
 *
 * O guard roda antes de qualquer coisa: inclusive antes do caso de manifesto
 * vazio, e dentro do próprio `psql`, para que nenhum caminho novo o contorne.
 */
export function assertIsolatedRuntime(): string {
  const url = process.env["SUPABASE_URL"]
  if (!url) throw new Error("BIVAQUE_GUARD: SUPABASE_URL ausente — limpeza proibida")
  if (url !== ISOLATED_RUNTIME_URL) {
    throw new Error(
      `BIVAQUE_GUARD: stack não isolado (${url}) — limpeza proibida; esperado ${ISOLATED_RUNTIME_URL}`,
    )
  }
  return url
}

function psql(sql: string, tuplesOnly = false): string {
  assertIsolatedRuntime()
  const args = [
    "exec",
    CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ]
  if (tuplesOnly) args.push("-At")
  args.push("-c", sql)
  return execFileSync("docker", args, { encoding: "utf8", timeout: 30_000 }).trim()
}

function uuidArray(ids: string[]): string {
  return `array[${ids.map((id) => `'${id}'::uuid`).join(",")}]`
}

export interface CleanupReport {
  runId: string
  objects: number
  listings: number
  posts: number
  skippedBecauseEmpty: string[]
}

/**
 * Apaga EXATAMENTE o que esta execução criou. Cada statement só é emitido quando
 * a lista correspondente tem ao menos um id — e nenhum deles vem de consulta
 * aberta, filtro de texto ou busca por marcador.
 */
export async function cleanupRunManifest(manifest: RunManifest): Promise<CleanupReport> {
  // Primeiro passo, sempre: fora do stack isolado este módulo não executa nada —
  // nem psql, nem Storage API, nem o caso de manifesto vazio.
  const url = assertIsolatedRuntime()

  const report: CleanupReport = {
    runId: manifest.runId,
    objects: 0,
    listings: 0,
    posts: 0,
    skippedBecauseEmpty: [],
  }

  // Objetos: as linhas de mídia dos anúncios DESTE manifesto, por id exato.
  const mediaPaths: string[] =
    manifest.listings.length === 0
      ? []
      : psql(
          `select object_path from public.listing_media
            where listing_id = any(${uuidArray(manifest.listings)});`,
          true,
        )
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
  const paths = [...new Set([...manifest.objects, ...mediaPaths])]
  if (paths.length > 0) {
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]
    if (!serviceKey) throw new Error("BIVAQUE_GUARD: SUPABASE_SERVICE_ROLE_KEY ausente")
    const client = createClient(url, serviceKey, { auth: { persistSession: false } })
    const removed = await client.storage.from("listing-photos").remove(paths)
    if (removed.error) throw removed.error
    report.objects = paths.length
  }

  if (manifest.reports.length > 0) {
    psql(`
delete from public.notifications
 where type = 'report_resolved' and target_id = any(${uuidArray(manifest.reports)});
delete from public.reports where id = any(${uuidArray(manifest.reports)});`)
  } else {
    report.skippedBecauseEmpty.push("reports")
  }

  if (manifest.conversations.length > 0) {
    psql(
      `delete from public.dm_conversations where id = any(${uuidArray(manifest.conversations)});`,
    )
  } else {
    report.skippedBecauseEmpty.push("conversations")
  }

  if (manifest.listings.length > 0) {
    psql(`delete from public.listings where id = any(${uuidArray(manifest.listings)});`)
    report.listings = manifest.listings.length
  } else {
    report.skippedBecauseEmpty.push("listings")
  }

  if (manifest.posts.length > 0) {
    psql(`delete from public.posts where id = any(${uuidArray(manifest.posts)});`)
    report.posts = manifest.posts.length
  } else {
    report.skippedBecauseEmpty.push("posts")
  }

  // O manifesto NÃO é apagado: ele é a única trilha de quais ids esta execução
  // criou. Fica gravado com o desfecho da limpeza para auditoria. Nenhuma outra
  // execução o lê para apagar nada — a lista é sempre a da própria execução, e
  // a recuperação só alcança manifesto cujo processo dono já morreu.
  const record = {
    ...manifest,
    cleanedAt: new Date().toISOString(),
    cleanup: report,
  }
  writeFileSync(manifestPath(manifest.runId), JSON.stringify(record, null, 2), "utf8")
  return report
}

/** Estado deixado por esta execução depois do `finally` — para a prova. */
export async function countManifestResidue(manifest: RunManifest): Promise<Record<string, number>> {
  assertIsolatedRuntime()
  const ids = [...manifest.listings, ...manifest.posts]
  if (ids.length === 0) return { listings: 0, posts: 0 }
  const out = psql(
    `select
       (select count(*) from public.listings where id = any(${uuidArray(manifest.listings)})),
       (select count(*) from public.posts where id = any(${uuidArray(manifest.posts)}));`,
    true,
  ).split("|")
  return { listings: Number(out[0]), posts: Number(out[1]) }
}

interface StoredManifest extends Partial<RunManifest> {
  cleanedAt?: string
  recoveredAt?: string
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export interface RecoveryReport {
  recovered: string[]
  skippedAlive: string[]
  skippedFinished: string[]
  skippedUnattributed: string[]
}

/**
 * Recuperação DE INTERRUPÇÃO, e só ela.
 *
 * Um worker morto no meio de um teste não executa o `finally`: o anúncio, o
 * save, a denúncia e o objeto ficam, e o teste seguinte falha por resíduo
 * alheio — alarme falso que cansa quem lê o log.
 *
 * O que esta função toca, e nada mais:
 *   * apenas manifestos ESCRITOS POR ESTE MÓDULO (o diretório de registros);
 *   * apenas os que estão SEM `cleanedAt` — ou seja, cujo `finally` não rodou;
 *   * apenas os cujo `pid` NÃO está mais vivo — execução com writer/test ativo
 *     é pulada, porque pertence a alguém rodando agora;
 *   * apenas os ids declarados NESSE manifesto, por igualdade exata.
 *
 * Manifesto sem `pid` é pulado: não dá para atribuir a um processo morto, e
 * adivinhar seria exatamente o defeito que a troca por prefixo criou.
 */
export async function recoverInterruptedRuns(): Promise<RecoveryReport> {
  assertIsolatedRuntime()
  const report: RecoveryReport = {
    recovered: [],
    skippedAlive: [],
    skippedFinished: [],
    skippedUnattributed: [],
  }
  let entries: string[]
  try {
    entries = readdirSync(recordsDir()).filter((name) => name.endsWith(".json"))
  } catch {
    return report
  }
  for (const entry of entries) {
    const file = join(recordsDir(), entry)
    let stored: StoredManifest
    try {
      stored = JSON.parse(readFileSync(file, "utf8")) as StoredManifest
    } catch {
      continue
    }
    if (stored.cleanedAt) {
      report.skippedFinished.push(stored.runId ?? entry)
      continue
    }
    if (typeof stored.pid !== "number") {
      report.skippedUnattributed.push(stored.runId ?? entry)
      continue
    }
    if (isAlive(stored.pid)) {
      report.skippedAlive.push(stored.runId ?? entry)
      continue
    }
    const manifest: RunManifest = {
      runId: stored.runId ?? entry.replace(/\.json$/, ""),
      pid: stored.pid,
      createdAt: stored.createdAt ?? "",
      listings: stored.listings ?? [],
      posts: stored.posts ?? [],
      reports: stored.reports ?? [],
      conversations: stored.conversations ?? [],
      objects: stored.objects ?? [],
    }
    await cleanupRunManifest(manifest)
    writeFileSync(
      file,
      JSON.stringify(
        { ...manifest, recoveredAt: new Date().toISOString(), note: "writer morto; ids exatos" },
        null,
        2,
      ),
      "utf8",
    )
    report.recovered.push(manifest.runId)
  }
  return report
}
