import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const sourcePath = path.join(root, "docs/agents/redesenho/schema-dump.sql")
const defaultOutput = path.join(root, "docs/agents/redesenho/R1-retrato.md")
const names = [
  "groups",
  "group_memberships",
  "group_join_reasons",
  "group_join_attempts",
  "posts",
  "comments",
  "post_reactions",
  "post_saves",
  "post_follows",
  "events",
  "event_rsvps",
  "recommendation_requests",
  "communities",
  "community_memberships",
  "community_invitations",
  "community_join_reasons",
  "provider_accounts",
  "provider_invitations",
  "provider_reach",
  "listings",
  "dm_conversations",
  "notifications",
  "reports",
]
const tables = names.map((name) => ({
  schema: name === "provider_invitations" ? "private" : "public",
  name,
  key: `${name === "provider_invitations" ? "private" : "public"}.${name}`,
}))
const storagePolicyBuckets = ["post", "event", "community"]
const quote = (value) => value.replaceAll("|", "\\|").replaceAll("\r", "").trim()
const ident = '"((?:[^" ]|"")+)"'
const tableRef = new RegExp(`(${ident})\\.(${ident})`)
const quotedName = (value) => value.replaceAll('""', '"')

function statements(sql) {
  const result = []
  let start = 0
  let quoteChar = ""
  let dollar = ""
  let lineComment = false
  let blockComment = false
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i]
    const next = sql[i + 1]
    if (lineComment) {
      if (c === "\n") lineComment = false
      continue
    }
    if (blockComment) {
      if (c === "*" && next === "/") {
        blockComment = false
        i += 1
      }
      continue
    }
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        i += dollar.length - 1
        dollar = ""
      }
      continue
    }
    if (quoteChar) {
      if (c === quoteChar && next === quoteChar) {
        i += 1
        continue
      }
      if (c === quoteChar && sql[i - 1] !== "\\") quoteChar = ""
      continue
    }
    if (c === "-" && next === "-") {
      lineComment = true
      i += 1
      continue
    }
    if (c === "/" && next === "*") {
      blockComment = true
      i += 1
      continue
    }
    if (c === "'" || c === '"') {
      quoteChar = c
      continue
    }
    if (c === "$" && (sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/) ?? [])[0]) {
      dollar = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)[0]
      i += dollar.length - 1
      continue
    }
    if (c === ";") {
      const item = sql.slice(start, i + 1).trim()
      if (item) result.push(item)
      start = i + 1
    }
  }
  const tail = sql.slice(start).trim()
  if (tail) result.push(tail)
  return result
}

function objectRef(text, keyword = "") {
  const match = text.match(new RegExp(`${keyword}\\s*${tableRef.source}`, "i"))
  return match
    ? {
        schema: quotedName(match[2]),
        name: quotedName(match[4]),
        key: `${quotedName(match[2])}.${quotedName(match[4])}`,
      }
    : null
}

function splitTop(text) {
  const parts = []
  let start = 0,
    depth = 0,
    q = "",
    dollar = ""
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i],
      next = text[i + 1]
    if (dollar) {
      if (text.startsWith(dollar, i)) {
        i += dollar.length - 1
        dollar = ""
      }
      continue
    }
    if (q) {
      if (c === q && next === q) {
        i += 1
        continue
      }
      if (c === q) q = ""
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      continue
    }
    if (c === "$" && text.slice(i).match(/^\$[A-Za-z0-9_]*\$/)) {
      dollar = text.slice(i).match(/^\$[A-Za-z0-9_]*\$/)[0]
      i += dollar.length - 1
      continue
    }
    if (c === "(") depth += 1
    if (c === ")") depth -= 1
    if (c === "," && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts.filter(Boolean)
}

function parenthesized(text, open) {
  let depth = 0,
    q = "",
    dollar = ""
  for (let i = open; i < text.length; i += 1) {
    const c = text[i],
      next = text[i + 1]
    if (dollar) {
      if (text.startsWith(dollar, i)) {
        i += dollar.length - 1
        dollar = ""
      }
      continue
    }
    if (q) {
      if (c === q && next === q) {
        i += 1
        continue
      }
      if (c === q) q = ""
      continue
    }
    if (c === "'" || c === '"') {
      q = c
      continue
    }
    if (c === "$" && text.slice(i).match(/^\$[A-Za-z0-9_]*\$/)) {
      dollar = text.slice(i).match(/^\$[A-Za-z0-9_]*\$/)[0]
      i += dollar.length - 1
      continue
    }
    if (c === "(") depth += 1
    if (c === ")") {
      depth -= 1
      if (depth === 0) return text.slice(open + 1, i)
    }
  }
  return ""
}

function add(items, type, name, text, details = "") {
  items.push({ type, name, text, details })
}
function mdCode(text) {
  return `\`${quote(text).replaceAll("`", "\\`")}\``
}
function sqlBlock(text) {
  return `\n\n\`\`\`sql\n${text.trim()}\n\`\`\``
}

const sql = await readFile(sourcePath, "utf8")
const stmts = statements(sql)
const found = new Map(tables.map((t) => [t.key, { ...t, columns: [], items: [], enums: [] }]))
const lookup = (ref) => ref && found.get(ref.key)

for (const statement of stmts) {
  const create = statement.match(
    new RegExp(`^CREATE TABLE(?: IF NOT EXISTS)? ${tableRef.source}\\s*\\(`, "i"),
  )
  if (create) {
    const ref = {
      schema: quotedName(create[2]),
      name: quotedName(create[4]),
      key: `${quotedName(create[2])}.${quotedName(create[4])}`,
    }
    const table = lookup(ref)
    if (!table) continue
    for (const part of splitTop(parenthesized(statement, create[0].length - 1))) {
      const col = part.match(/^"((?:[^"]|"")+)"\s+([\s\S]+)$/)
      if (!col) {
        if (/^(?:CONSTRAINT|PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)\b/i.test(part))
          add(
            table.items,
            "constraint",
            part.match(/^CONSTRAINT\s+"([^"]+)"/i)?.[1] ?? part.split(/\s/)[0],
            part,
          )
        continue
      }
      const rest = col[2].replace(/,$/, "").trim()
      const type =
        rest
          .match(
            /^(.+?)(?=\s+(?:NOT NULL|NULL|DEFAULT|GENERATED|COLLATE|CHECK|REFERENCES|PRIMARY KEY|UNIQUE)\b|$)/i,
          )?.[1]
          ?.trim() ?? rest
      const nn = /\bNOT NULL\b/i.test(rest)
      const def =
        rest
          .match(
            /\bDEFAULT\s+([\s\S]*?)(?=\s+(?:NOT NULL|NULL|GENERATED|COLLATE|CHECK|REFERENCES|PRIMARY KEY|UNIQUE)\b|$)/i,
          )?.[1]
          ?.trim() ?? ""
      table.columns.push({ name: quotedName(col[1]), type, nn, def, raw: part })
    }
  }
  const ref = objectRef(statement, "ALTER TABLE(?: ONLY)?")
  const table = lookup(ref)
  if (table && /ADD CONSTRAINT/i.test(statement)) {
    const con = statement.match(/ADD CONSTRAINT\s+"([^"]+)"\s+([\s\S]*);$/i)
    if (con) add(table.items, "constraint", con[1], con[2].trim())
  }
  const ix = statement.match(
    new RegExp(
      `^CREATE (UNIQUE )?INDEX(?: CONCURRENTLY)?\\s+"([^"]+)"\\s+ON ${tableRef.source}\\s+([\\s\\S]*);$`,
      "i",
    ),
  )
  if (ix?.[1]) {
    const t = lookup({ key: `${quotedName(ix[4])}.${quotedName(ix[6])}` })
    if (t) add(t.items, "unique index", ix[2], statement)
  }
  if (
    /^ALTER TABLE .* ENABLE ROW LEVEL SECURITY/i.test(statement) ||
    /^ALTER TABLE .* FORCE ROW LEVEL SECURITY/i.test(statement)
  ) {
    const t = lookup(objectRef(statement, "ALTER TABLE(?: ONLY)?"))
    if (t)
      add(
        t.items,
        "rls",
        / FORCE /i.test(statement) ? "FORCE" : "ENABLE",
        statement.replace(/;$/, ""),
      )
  }
  const policy = statement.match(
    new RegExp(`^CREATE POLICY\\s+"([^"]+)"\\s+ON ${tableRef.source}\\s+([\\s\\S]*);$`, "i"),
  )
  if (policy) {
    const t = lookup({ key: `${quotedName(policy[3])}.${quotedName(policy[5])}` })
    if (t) {
      const body = policy[6].trim()
      add(
        t.items,
        "policy",
        policy[1],
        statement,
        `comando ${body.match(/\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/i)?.[1] ?? "ALL"}; papéis ${body.match(/\bTO\s+([\s\S]*?)(?=\s+(?:USING|WITH CHECK)\s*\(|$)/i)?.[1] ?? "PUBLIC"}`,
      )
    }
  }
  const trigger = statement.match(
    new RegExp(
      `^CREATE OR REPLACE TRIGGER\\s+"([^"]+)"\\s+([\\s\\S]*?)\\s+ON ${tableRef.source}\\s+([\\s\\S]*);$`,
      "i",
    ),
  )
  if (trigger) {
    const t = lookup({ key: `${quotedName(trigger[4])}.${quotedName(trigger[6])}` })
    if (t) {
      const tail = trigger[7]
      const fn = tail.match(/EXECUTE FUNCTION\s+([\s\S]+?)\s*\(/i)?.[1] ?? ""
      const timing = trigger[2].match(/\b(BEFORE|AFTER|INSTEAD OF)\b/i)?.[1] ?? ""
      add(
        t.items,
        "trigger",
        trigger[1],
        statement,
        `${timing} ${trigger[2].replace(/^\s*(?:BEFORE|AFTER|INSTEAD OF)\s*/i, "")}; WHEN ${tail.match(/\bWHEN\s*(\([\s\S]*?\))\s+EXECUTE/i)?.[1] ?? "ausente"}; função ${fn}`,
      )
    }
  }
  if (/^(?:GRANT|REVOKE)\b/i.test(statement)) {
    for (const t of found.values()) {
      if (new RegExp(`\\bON(?: TABLE)?\\s+"${t.schema}"\\."${t.name}"`, "i").test(statement))
        add(t.items, "grant", statement.replace(/;$/, "").slice(0, 180), statement)
    }
  }
}

// CREATE POLICY parsing is also used for storage objects, regardless of bucket.
const storagePolicies = stmts.filter(
  (s) =>
    /^CREATE POLICY/i.test(s) &&
    /ON "storage"\."objects"/i.test(s) &&
    storagePolicyBuckets.some((b) => s.toLowerCase().includes(b)),
)
const enums = new Map()
for (const s of stmts) {
  const m = s.match(
    new RegExp(`^CREATE TYPE ${tableRef.source}\\s+AS ENUM\\s*\\(([\\s\\S]*?)\\);$`, "i"),
  )
  if (m)
    enums.set(
      `${quotedName(m[2])}.${quotedName(m[4])}`,
      splitTop(m[5]).map((v) => v.replace(/^'|'$/g, "").replaceAll("''", "'")),
    )
}
for (const t of found.values())
  for (const c of t.columns) {
    const type = c.type.match(new RegExp(tableRef.source))
    const key = type ? `${quotedName(type[2])}.${quotedName(type[4])}` : ""
    if (enums.has(key) && !t.enums.includes(key)) t.enums.push(key)
  }

const functions = []
for (const s of stmts) {
  const m = s.match(
    new RegExp(
      `^CREATE OR REPLACE FUNCTION ${tableRef.source}\\s*\\(([\\s\\S]*?)\\)\\s+RETURNS\\s+([\\s\\S]*?)(?=\\s+LANGUAGE\\b)`,
      "i",
    ),
  )
  if (!m || !["public", "private"].includes(quotedName(m[2]))) continue
  const body = s.slice(m[0].length)
  const touched = tables
    .map((t) => found.get(t.key))
    .filter((t) =>
      new RegExp(
        `(?:"${t.schema}"\\s*\\.\\s*"${t.name}"|\\b${t.schema}\\s*\\.\\s*${t.name}\\b)`,
        "i",
      ).test(body),
    )
  if (!touched.length) continue
  const fkey = `${quotedName(m[2])}.${quotedName(m[4])}`
  const grants = stmts.filter(
    (g) =>
      /^GRANT\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION/i.test(g) &&
      g.includes(`"${quotedName(m[2])}"."${quotedName(m[4])}"`),
  )
  functions.push({
    key: fkey,
    name: fkey,
    args: m[5].trim(),
    returns: m[6].trim(),
    security: /\bSECURITY DEFINER\b/i.test(s),
    searchPath: s.match(/SET\s+search_path\s*(?:=|TO)\s*([^\n;]+)/i)?.[1]?.trim() ?? "não definido",
    touched,
    grants,
    text: s,
  })
}

const all = []
for (const t of [...found.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  for (const c of t.columns) add(all, "column", `${t.key}.${c.name}`, `${t.key}.${c.name}`)
  for (const item of t.items) all.push({ ...item, tableKey: t.key })
  for (const e of t.enums) add(all, "enum", `${t.key}.${e}`, `${t.key}.${e}`)
}
for (const f of functions) add(all, "function", f.key, f.key)
for (const s of storagePolicies)
  add(all, "storage policy", s.match(/CREATE POLICY\s+"([^"]+)/i)?.[1] ?? s, s)
const typeOrder = [
  "column",
  "constraint",
  "unique index",
  "rls",
  "policy",
  "trigger",
  "grant",
  "enum",
  "function",
  "storage policy",
]
all.sort(
  (a, b) =>
    (a.tableKey?.split(".")[1] ?? "~functions").localeCompare(
      b.tableKey?.split(".")[1] ?? "~functions",
    ) ||
    (a.tableKey?.split(".")[0] ?? "").localeCompare(b.tableKey?.split(".")[0] ?? "") ||
    typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) ||
    a.name.localeCompare(b.name),
)
const ids = new Map(all.map((item, i) => [item, `R1-${String(i + 1).padStart(3, "0")}`]))
const idFor = (type, name, tableKey) =>
  ids.get(
    all.find((i) => i.type === type && i.name === name && i.tableKey === tableKey) ??
      all.find((i) => i.type === type && i.name === name),
  )
const output = [
  "# R1 — Retrato mecânico do esquema",
  "",
  "> Fonte: `schema-dump.sql`. Conteúdo extraído sem avaliação de finalidade ou autorização.",
  "",
]
const totals = {
  found: 0,
  policies: 0,
  triggers: 0,
  grants: 0,
  functions: functions.length,
  ids: all.length,
}
for (const t of [...found.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.schema.localeCompare(b.schema),
)) {
  const exists = t.columns.length > 0
  if (exists) totals.found += 1
  output.push(`## ${t.key}${exists ? "" : " — ausente no dump"}`, "")
  if (!exists) {
    output.push("Tabela não encontrada no despejo.", "")
    continue
  }
  output.push(
    "### Colunas",
    "",
    "| ID | Nome | Tipo | NOT NULL | Default |",
    "|---|---|---|---|---|",
  )
  for (const c of [...t.columns].sort((a, b) => a.name.localeCompare(b.name)))
    output.push(
      `| ${idFor("column", `${t.key}.${c.name}`, t.key)} | ${mdCode(c.name)} | ${mdCode(c.type)} | ${c.nn ? "sim" : "não"} | ${c.def ? mdCode(c.def) : "—"} |`,
    )
  for (const type of typeOrder.filter((v) =>
    ["constraint", "unique index", "rls", "policy", "trigger", "grant", "enum"].includes(v),
  )) {
    const items = t.items
      .filter((i) => i.type === type)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (type === "enum") {
      for (const key of t.enums)
        output.push(
          "",
          `### Enum ${key}`,
          "",
          `ID ${idFor("enum", `${t.key}.${key}`, t.key)} — valores: ${enums.get(key).map(mdCode).join(", ")}`,
        )
      continue
    }
    if (!items.length) continue
    output.push(
      "",
      `### ${{ constraint: "Constraints", "unique index": "Índices únicos", rls: "Row Level Security", policy: "Policies", trigger: "Triggers", grant: "Grants e revogações" }[type]}`,
      "",
    )
    for (const item of items) {
      const id = idFor(type, item.name, t.key)
      if (
        type === "policy" ||
        type === "grant" ||
        type === "constraint" ||
        type === "unique index" ||
        type === "trigger"
      )
        output.push(
          `- **${id} ${quote(item.name)}**${item.details ? ` — ${quote(item.details)}` : ""}${sqlBlock(item.text)}`,
        )
      else output.push(`- **${id}** ${quote(item.text)}`)
      if (type === "policy") totals.policies += 1
      if (type === "trigger") totals.triggers += 1
      if (type === "grant") totals.grants += 1
    }
  }
  const cited = functions.filter((f) => f.touched.includes(t))
  output.push(
    "",
    "### Funções que citam esta tabela",
    "",
    cited.length
      ? cited.map((f) => `- ${idFor("function", f.key)} ${mdCode(f.key)}`).join("\n")
      : "Nenhuma encontrada.",
    "",
  )
}
output.push("## Funções public/private que citam tabelas do retrato", "")
for (const f of functions.sort((a, b) => a.key.localeCompare(b.key))) {
  output.push(
    `### ${idFor("function", f.key)} ${f.key}`,
    "",
    `- Argumentos: ${mdCode(f.args)}`,
    `- Retorno: ${mdCode(f.returns)}`,
    `- SECURITY DEFINER: ${f.security ? "sim" : "não"}`,
    `- search_path: ${mdCode(f.searchPath)}`,
    `- Tabelas citadas: ${f.touched.map((t) => mdCode(t.key)).join(", ")}`,
    `- GRANT EXECUTE: ${f.grants.length ? f.grants.map((g) => mdCode(g.replace(/;$/, ""))).join("; ") : "nenhum explícito encontrado"}`,
    "",
  )
}
if (storagePolicies.length) {
  output.push("## Policies de storage.objects para buckets de post, evento ou comunidade", "")
  for (const s of storagePolicies)
    output.push(
      `- **${idFor("storage policy", s.match(/CREATE POLICY\s+"([^"]+)/i)?.[1] ?? s)}**${sqlBlock(s)}`,
    )
}
output.push(
  "## Contagens",
  "",
  "| Tabela | Colunas | Constraints | Policies | Triggers | Grants | Funções que citam |",
  "|---|---:|---:|---:|---:|---:|---:|",
)
for (const t of [...found.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.schema.localeCompare(b.schema),
))
  output.push(
    `| ${t.key}${t.columns.length ? "" : " (ausente)"} | ${t.columns.length} | ${t.items.filter((i) => i.type === "constraint").length} | ${t.items.filter((i) => i.type === "policy").length} | ${t.items.filter((i) => i.type === "trigger").length} | ${t.items.filter((i) => i.type === "grant").length} | ${functions.filter((f) => f.touched.includes(t)).length} |`,
  )
output.push(
  "",
  `Storage policies listadas: ${storagePolicies.length}. Tabelas encontradas: ${totals.found}/23. Policies: ${totals.policies}; triggers: ${totals.triggers}; grants/revokes: ${totals.grants}; funções: ${functions.length}; IDs: ${totals.ids}.`,
  "",
)
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutput
await writeFile(outputPath, output.join("\n"), "utf8")
