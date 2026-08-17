// generate-catalog.mjs — P0 Task 1: catálogo canônico de municípios (IBGE)
// e feriados nacionais, a partir da BrasilAPI.
//
// DEPENDÊNCIA DE GERAÇÃO, NUNCA DE RUNTIME. O onboarding não chama a BrasilAPI:
// este script roda quando alguém decide rodar, consulta os 27 UFs uma vez e
// emite SQL versionado no repositório (migration de dados timestamped). Não
// entra em CI, não entra em build, não entra em request.
//
// Termos de uso (README da BrasilAPI): "O volume de consultas deve ter a
// natureza de uma pessoa real requisitando um determinado dado." Vinte e sete
// requisições uma vez respeita isso; uma chamada por cadastro, não.
//
// Uso:
//   node scripts/localities/generate-catalog.mjs            # imprime o SQL no stdout
//   node scripts/localities/generate-catalog.mjs --out <arquivo>   # grava no arquivo
//
// As funções puras são exportadas para o teste unitário:
//   tests/unit/localities/generate-catalog.test.ts

const UF_URL = "https://brasilapi.com.br/api/ibge/uf/v1"
const MUNICIPIOS_URL = (uf) => `https://brasilapi.com.br/api/ibge/municipios/v1/${uf}`
const FERIADOS_URL = (ano) => `https://brasilapi.com.br/api/feriados/v1/${ano}`

// Anos de feriado nacional: anos corrente e seguintes. Só feriado nacional
// existe nessa rota — municipal e estadual não, e não são inventados aqui.
const FERIADOS_ANOS = [2026, 2027, 2028, 2029, 2030]

const STOP_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "em"])

// "ALVARÃES" -> "Alvarães". Primeira letra de cada palavra maiúscula (exceto
// preposições no meio), resto minúsculo. Trata hífen e apóstrofo.
export function normalizeCityName(name) {
  const words = name.trim().split(/\s+/)
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      // Preposição no meio do nome fica minúscula ("São José do Rio Preto").
      if (index > 0 && STOP_WORDS.has(lower)) return lower
      // Primeira letra de cada parte maiúscula, resto minúsculo; trata hífen
      // e apóstrofo ("Embu-Guaçu", "Olho d'Água").
      return lower
        .split(/([-'])/g)
        .map((part, i) => (i % 2 === 1 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join("")
    })
    .join(" ")
}

// "Bom Jesus" -> "bom-jesus". Sem acento, minúsculo, hifenizado.
export function slugifyBase(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Slug com sufixo da UF: "Bom Jesus"/PI -> "bom-jesus-pi". O sufixo existe
// porque nomes de município se repetem entre estados ("Bom Jesus" existe em
// vários) e slug sem UF colide na inserção.
export function buildSlug(cityName, stateCode) {
  return `${slugifyBase(cityName)}-${stateCode.toLowerCase()}`
}

// Escapa aspas simples para o SQL.
function sqlEscape(value) {
  return value.replace(/'/g, "''")
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } })
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchCatalog() {
  const ufs = await fetchJson(UF_URL)
  const municipalities = []
  for (const uf of ufs) {
    const rows = await fetchJson(MUNICIPIOS_URL(uf.sigla))
    for (const row of rows) {
      municipalities.push({
        cityName: normalizeCityName(row.nome),
        ibgeCode: row.codigo_ibge,
        stateCode: uf.sigla,
      })
    }
  }
  return { ufs: ufs.length, municipalities }
}

export async function fetchHolidays() {
  const holidays = []
  for (const ano of FERIADOS_ANOS) {
    const rows = await fetchJson(FERIADOS_URL(ano))
    for (const row of rows) {
      holidays.push({ date: row.date, name: row.name, type: row.type ?? "national" })
    }
  }
  return holidays
}

function assertUnique(municipalities) {
  const slugs = new Map()
  const codes = new Map()
  for (const m of municipalities) {
    const slug = buildSlug(m.cityName, m.stateCode)
    if (slugs.has(slug)) {
      throw new Error(`slug duplicado: ${slug} (${slugs.get(slug)} e ${m.cityName}/${m.stateCode})`)
    }
    slugs.set(slug, m.cityName)
    if (codes.has(m.ibgeCode)) {
      throw new Error(`ibge_code duplicado: ${m.ibgeCode}`)
    }
    codes.set(m.ibgeCode, slug)
  }
}

// Monta o SQL da migration de dados. O cabeçalho registra o número produzido —
// o pgTAP assere contra ele em vez de escrever de memória um total.
export function renderDataMigrationSql({ municipalities, holidays }) {
  assertUnique(municipalities)
  const rows = municipalities
    .map(
      (m) =>
        `  ('${sqlEscape(buildSlug(m.cityName, m.stateCode))}', '${sqlEscape(m.cityName)}', '${m.stateCode}', 'BR', '${m.ibgeCode}')`,
    )
    .join(",\n")

  const holidayRows = holidays
    .map((h) => `  ('${h.date}', '${sqlEscape(h.name)}', '${sqlEscape(h.type)}')`)
    .join(",\n")

  return `-- P0 Task 1 — catálogo canônico de municípios (IBGE) e feriados nacionais.
-- GERADO por scripts/localities/generate-catalog.mjs em ${new Date().toISOString().slice(0, 10)}.
-- Não editar à mão: regenerar com o script.
--
-- Produzidos por este gerador:
--   ${municipalities.length} municípios em ${new Set(municipalities.map((m) => m.stateCode)).size} UFs
--   ${holidays.length} feriados nacionais (${FERIADOS_ANOS[0]}–${FERIADOS_ANOS[FERIADOS_ANOS.length - 1]})
--
-- A identidade canônica é o ibge_code (7 dígitos, texto). O slug carrega a UF
-- para homônimos não colidirem. Manaus já existe com UUID durável e slug
-- 'manaus-am': o ON CONFLICT (slug) atualiza o ibge_code da linha existente e
-- preserva o UUID — nunca delete+insert (P0 Task 1, Step 3).

begin;

insert into public.localities (slug, city_name, state_code, country_code, ibge_code)
values
${rows}
on conflict (slug) do update set ibge_code = excluded.ibge_code;

-- Feriados nacionais (P0 Task 1, Step 5): insumo da Task 4 da onda F
-- (encontro recorrente). Só feriado nacional existe nessa rota.
-- PK composta (date, name): Páscoa de 2030 cai em 21/04, o mesmo dia de
-- Tiradentes — dois feriados nacionais legítimos na mesma data.
create table public.national_holidays (
  date date not null,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (char_length(type) between 1 and 40),
  primary key (date, name)
);

alter table public.national_holidays enable row level security;
alter table public.national_holidays force row level security;

revoke all on table public.national_holidays from anon, authenticated;
grant all on table public.national_holidays to service_role;

insert into public.national_holidays (date, name, type)
values
${holidayRows};

-- ibge_code fica nullable só o tempo da migration de dados; agora é a identidade
-- canônica e passa a ser obrigatório.
alter table public.localities alter column ibge_code set not null;

commit;
`
}

async function main() {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf("--out")
  const outPath = outIndex >= 0 ? args[outIndex + 1] : null

  const [{ municipalities, ufs }, holidays] = await Promise.all([fetchCatalog(), fetchHolidays()])
  const sql = renderDataMigrationSql({ municipalities, holidays })
  process.stderr.write(
    `produzidos: ${municipalities.length} municípios em ${ufs} UFs, ${holidays.length} feriados nacionais\n`,
  )
  if (outPath) {
    const { writeFileSync } = await import("node:fs")
    writeFileSync(outPath, sql, "utf8")
    process.stderr.write(`SQL gravado em ${outPath}\n`)
  } else {
    process.stdout.write(sql)
  }
}

// Roda quando chamado diretamente (node scripts/localities/generate-catalog.mjs).
// Quando importado por teste, não dispara rede.
const isDirectRun = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("scripts/localities/generate-catalog.mjs")
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`ERRO: ${error.message}\n`)
    process.exit(1)
  })
}
