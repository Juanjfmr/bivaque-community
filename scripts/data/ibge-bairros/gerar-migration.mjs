// RUN-028 / DATA-IBGE-BAIRROS: gera a migration de carga nacional de bairros
// a partir da malha oficial do IBGE (Censo 2022). Reexecutável a cada censo.
//
// Como rodar: node scripts/data/ibge-bairros/gerar-migration.mjs
//
// A malha (zip de ~27 MB) é baixada para o diretório temporário do sistema,
// nunca para o repositório. Só o SQL gerado entra no git.
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const shapefile = require("shapefile")
const centerOfMass = require("@turf/center-of-mass").default
const pointOnFeature = require("@turf/point-on-feature").default
const booleanPointInPolygon = require("@turf/boolean-point-in-polygon").default

const URL_MALHA =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/BR/BR_bairros_CD2022.zip"
const NOME_BASE = "BR_bairros_CD2022"
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const TMP = path.join(os.tmpdir(), "ibge-bairros")
const ZIP = path.join(TMP, `${NOME_BASE}.zip`)
const SHP = path.join(TMP, NOME_BASE, `${NOME_BASE}.shp`)

async function baixar() {
  if (existsSync(SHP.replace(/\.shp$/, ".dbf"))) return
  if (!existsSync(ZIP)) {
    console.log(`baixando a malha para ${TMP} ...`)
    mkdirSync(TMP, { recursive: true })
    const res = await fetch(URL_MALHA)
    if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`)
    writeFileSync(ZIP, Buffer.from(await res.arrayBuffer()))
  }
  const dir = path.dirname(SHP)
  mkdirSync(dir, { recursive: true })
  let r = spawnSync("tar", ["-xf", ZIP, "-C", dir], { stdio: "inherit" })
  if (r.status !== 0) r = spawnSync("unzip", ["-qq", "-o", ZIP, "-d", dir], { stdio: "inherit" })
  if (r.status !== 0) throw new Error(`extraia manualmente o zip em ${dir}`)
}

function nomeKey(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

async function lerMalha() {
  const source = await shapefile.open(SHP, SHP.replace(/\.shp$/, ".dbf"), { encoding: "utf-8" })
  const rows = new Map()
  const stats = {
    features: 0,
    semNome: 0,
    codigoInvalido: 0,
    centroCorrigido: 0,
    semCentro: 0,
    duplicados: 0,
    truncados: [],
  }
  for (;;) {
    const { done, value: feature } = await source.read()
    if (done) break
    stats.features++
    const code = feature.properties.CD_MUN
    if (typeof code !== "string" || !/^[0-9]{7}$/.test(code)) {
      stats.codigoInvalido++
      continue
    }
    let nome = String(feature.properties.NM_BAIRRO ?? "")
      .trim()
      .replace(/\s+/g, " ")
    if (!nome) {
      stats.semNome++
      continue
    }
    if (nome.length > 80) {
      stats.truncados.push(`${code} ${nome} -> ${nome.slice(0, 80)}`)
      nome = nome.slice(0, 80).trimEnd()
    }
    const chave = `${code}\u0000${nomeKey(nome)}`
    if (rows.has(chave)) {
      stats.duplicados++
      continue
    }
    const geom = feature.geometry
    let centro = centerOfMass(geom)
    centro = Array.isArray(centro) ? centro : centro?.geometry?.coordinates
    if (!centro || !Number.isFinite(centro[0]) || !booleanPointInPolygon(centro, geom)) {
      const interior = pointOnFeature(geom)
      centro = interior?.geometry?.coordinates
      stats.centroCorrigido++
    }
    if (!centro || !Number.isFinite(centro[0])) {
      stats.semCentro++
      rows.delete(chave)
      continue
    }
    rows.set(chave, {
      code,
      nome,
      lat: Math.round(centro[1] * 1e6) / 1e6,
      lng: Math.round(centro[0] * 1e6) / 1e6,
    })
  }
  return {
    linhas: [...rows.values()].sort(
      (a, b) => a.code.localeCompare(b.code) || nomeKey(a.nome).localeCompare(nomeKey(b.nome)),
    ),
    stats,
  }
}

function nomeArquivoMigration() {
  const agora = new Date()
  const dir = path.join(REPO, "supabase", "migrations")
  const ultimo = readdirSync(dir)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .map((f) => f.slice(0, 14))
    .sort()
    .at(-1)
  const ts = `${String(agora.getUTCFullYear())}${String(agora.getUTCMonth() + 1).padStart(2, "0")}${String(agora.getUTCDate()).padStart(2, "0")}${String(agora.getUTCHours()).padStart(2, "0")}${String(agora.getUTCMinutes()).padStart(2, "0")}${String(agora.getUTCSeconds()).padStart(2, "0")}`
  if (ultimo && ts <= ultimo) {
    const d = new Date(
      `${ultimo.slice(0, 8)}T${ultimo.slice(8, 10)}:${ultimo.slice(10, 12)}:${ultimo.slice(12, 14)}Z`,
    )
    d.setUTCSeconds(d.getUTCSeconds() + 1)
    return `${d
      .toISOString()
      .replace(/[-:TZ]/g, "")
      .slice(0, 14)}_ibge_bairros_censo_2022.sql`
  }
  return `${ts}_ibge_bairros_censo_2022.sql`
}

const sqlTexto = (s) => s.replace(/'/g, "''")

async function main() {
  await baixar()
  const { linhas, stats } = await lerMalha()
  const municipios = new Set(linhas.map((l) => l.code)).size
  const hoje = new Date().toISOString().slice(0, 10)
  const valores = linhas
    .map((l) => `  ('${l.code}', '${sqlTexto(l.nome)}', ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)})`)
    .join(",\n")
  const sql = `-- RUN-028 / DATA-IBGE-BAIRROS: catálogo nacional de bairros (malha do IBGE, Censo 2022).
-- GERADO por scripts/data/ibge-bairros/gerar-migration.mjs em ${hoje} (UTC).
-- Não editar à mão: reexecute o script. Fonte: ${URL_MALHA}
--
-- ${stats.features} polígonos na malha -> ${linhas.length} bairros em ${municipios} municípios.
-- Centros corrigidos para ponto interior: ${stats.centroCorrigido}. Nomes truncados a 80: ${stats.truncados.length}.
-- Duplicados por (município, nome normalizado) descartados na geração: ${stats.duplicados}.
--
-- IDEMPOTENTE: on conflict (locality_id, name_key) do nothing — os bairros do
-- protótipo (20261022120100) ficam como estão; perfis que apontam para eles
-- continuam válidos. O join por ibge_code faz município ausente de
-- \`localities\` virar zero linhas, nunca erro. Só nome e ponto central público
-- entram; nada de CEP, setor censitário ou população (contrato RUN-028).

insert into public.neighborhoods (locality_id, name, center_lat, center_lng)
select l.id, c.name, c.center_lat, c.center_lng
from (values
${valores}
) as c(ibge_code, name, center_lat, center_lng)
join public.localities l on l.ibge_code = c.ibge_code
on conflict (locality_id, name_key) do nothing;
`
  const destino = path.join(REPO, "supabase", "migrations", nomeArquivoMigration())
  writeFileSync(destino, sql)
  console.log(`migration: ${path.relative(REPO, destino)}`)
  console.log(`tamanho: ${statSync(destino).size} bytes`)
  console.log(
    `features=${stats.features} bairros=${linhas.length} municipios=${municipios} centroCorrigido=${stats.centroCorrigido} truncados=${stats.truncados.length} duplicados=${stats.duplicados} semNome=${stats.semNome} semCentro=${stats.semCentro} codigoInvalido=${stats.codigoInvalido}`,
  )
  if (stats.truncados.length) console.log(`nomes truncados:\n${stats.truncados.join("\n")}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
