import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// Texto de tela fala com quem usa, nunca explica o sistema. Decisão do dono em
// 25/09/2026, olhando a busca: "a copy está muito defensiva, lembre-se sempre
// de comunicar com o usuário, não um comentário de sistema". A varredura desse
// dia achou nome de função ("A RPC list_…"), regra interna ("(D43)", "§12"),
// mecânica ("O banco guarda apenas o digest do token", "?q=") e justificativa
// ("A tela não inventa volume…"). Explicação técnica mora em comentário.
//
// LIMITE: a varredura lê texto entre tags JSX e strings com frase; os
// comentários saem antes. Ela pega a volta desses padrões, não julga tom.

const APP = join(process.cwd(), "apps", "web", "app")

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".next" || entry.name === "node_modules") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (entry.name.endsWith(".tsx")) files.push(full)
  }
  return files
}

// Texto que alguém lê: entre tags JSX, ou string com duas palavras seguidas.
function visibleCopy(source: string): string[] {
  const code = stripComments(source)
  const texts: string[] = []
  for (const match of code.matchAll(/>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g)) {
    texts.push((match[1] ?? "").replace(/\s+/g, " ").trim())
  }
  for (const match of code.matchAll(/"([^"\n]*[a-zà-ú]{3,} [a-zà-ú]{2,}[^"\n]*)"/g)) {
    texts.push(match[1] ?? "")
  }
  return texts.filter((text) => text.length > 0)
}

const SYSTEM_TALK: Array<[string, RegExp]> = [
  ["nome de função do banco", /\b(RPC|RLS)\b|\blist_[a-z_]+|operator-only|read-only/],
  ["regra interna citada", /\(D\d{2}\)|§\s?\d|\bonda correspondente\b/],
  ["mecânica da URL", /\?q=|\bna URL\b/],
  ["o sistema se justificando", /estado vazio honesto|não inventa|contornaria o acesso/i],
  ["o banco explicado", /o banco guarda|digest do token|fonte oficial/i],
  ["refazer consulta", /refaz(er)? (as |a )?(consulta|busca)/i],
  ["promessa de recurso", /entra junto d[ae]|quando o canal de .+ estiver disponível/i],
]

describe("a copy fala com a pessoa, não sobre o sistema", () => {
  const files = walk(APP).map((file) => ({
    file: relative(process.cwd(), file).replaceAll("\\", "/"),
    copy: visibleCopy(readFileSync(file, "utf8")),
  }))

  it.each(SYSTEM_TALK)("nenhuma tela mostra %s", (_name, forbidden) => {
    const offenders = files.flatMap(({ file, copy }) =>
      copy.filter((text) => forbidden.test(text)).map((text) => `${file}: ${text}`),
    )
    expect(offenders).toEqual([])
  })

  it("a varredura pega o padrão quando ele é texto de tela, não comentário", () => {
    const sample = [
      "// A RPC list_x devolve vazio: comentário pode explicar o sistema",
      "<p>A RPC list_locality_arrivals_volume devolveu uma lista vazia.</p>",
      'description="O termo fica na URL como ?q=."',
    ].join("\n")
    const copy = visibleCopy(sample)
    expect(copy.some((text) => /list_[a-z_]+/.test(text))).toBe(true)
    expect(copy.some((text) => /\?q=/.test(text))).toBe(true)
    expect(copy.some((text) => /comentário pode explicar/.test(text))).toBe(false)
  })
})

describe("Tenho interesse no imóvel abre a conversa", () => {
  const button = readFileSync(
    join(APP, "(shell)", "imoveis", "[id]", "interest-button.tsx"),
    "utf8",
  )
  const page = readFileSync(join(APP, "(shell)", "imoveis", "[id]", "page.tsx"), "utf8")

  it("usa a mesma conversa do Mercado, pelo contexto do anúncio", () => {
    expect(button).toContain('rpc("open_conversation"')
    expect(button).toContain('p_context_type: "listing"')
    expect(button).toMatch(/router\.push\(`\/messages\?conversation=/)
  })

  it("a página não tem mais o botão desligado com promessa", () => {
    expect(page).toContain("<PropertyInterestButton")
    expect(page).not.toMatch(/<button[^>]*\sdisabled/)
  })
})
