import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_TERM_DAYS,
  defaultTermDate,
  MAX_TERM_DAYS,
  maxTermDate,
  moveErrorMessage,
  validateMove,
} from "../../../apps/web/lib/locality/move-city"

// Cidade no perfil + consulta a outra cidade (decisão do dono, 25/09/2026).
// A regra de leitura é provada no banco (supabase/tests/consulta-outra-cidade.sql);
// aqui, a validação da mudança e a costura das telas, por leitura de fonte.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")
const web = (...segments: string[]) => read("apps", "web", ...segments)

const TODAY = new Date("2026-09-25T12:00:00Z")
const HOME = "00000000-0000-4000-8000-000000000001"
const DEST = "00000000-0000-4000-8000-000000000002"

describe("validação da mudança de cidade", () => {
  it("aceita destino válido com prazo dentro da janela", () => {
    expect(
      validateMove({ destinationId: DEST, currentId: HOME, termDate: "2026-10-25" }, TODAY),
    ).toBeNull()
  })

  it("recusa sem destino, destino igual à atual, data inválida, passada ou longe demais", () => {
    const base = { destinationId: DEST, currentId: HOME, termDate: "2026-10-25" }
    expect(validateMove({ ...base, destinationId: "" }, TODAY)).toMatch(/Escolha a cidade/)
    expect(validateMove({ ...base, destinationId: HOME }, TODAY)).toMatch(/já é a sua cidade/)
    expect(validateMove({ ...base, termDate: "25/10/2026" }, TODAY)).toMatch(/Informe/)
    expect(validateMove({ ...base, termDate: "2026-09-24" }, TODAY)).toMatch(/passado/)
    expect(validateMove({ ...base, termDate: "2027-12-31" }, TODAY)).toMatch(
      new RegExp(`${MAX_TERM_DAYS} dias`),
    )
  })

  it("o prazo padrão é de 30 dias e o teto, de 180", () => {
    expect(DEFAULT_TERM_DAYS).toBe(30)
    expect(defaultTermDate(TODAY)).toBe("2026-10-25")
    expect(maxTermDate(TODAY)).toBe("2027-03-24")
  })

  it("erro do banco vira frase de pessoa, nunca o texto cru", () => {
    expect(moveErrorMessage({ code: "23505" })).toMatch(/mudança em andamento/)
    expect(moveErrorMessage({ code: "23514" })).toMatch(/Escolha outra cidade/)
    expect(moveErrorMessage({ code: "XX000" })).toMatch(/Tente novamente/)
  })
})

describe("costura das telas", () => {
  it("o chip do cabeçalho é um botão que abre a consulta, em toda largura", () => {
    const shell = web("app", "components", "bivaque", "app-shell.tsx")
    const switcher = web("app", "components", "shell", "city-switcher.tsx")
    expect(shell).toContain("<CitySwitcher />")
    expect(switcher).toContain('data-testid="shell-locality-pill"')
    expect(switcher).toContain("router.push(`/cidade/${city.id}` as Route)")
    expect(switcher).toContain('href={"/profile#cidade" as Route}')
    // O botão tem nome acessível em toda largura (o texto visível só do md para cima).
    expect(switcher).toContain("aria-label={`Sua cidade: ${cityLabel}. Ver outra cidade`}")
  })

  it("mudar a cidade chama a transferência com o cliente da sessão, nunca service_role", () => {
    const action = web("app", "(shell)", "profile", "city-actions.ts")
    expect(action).toContain('supabase.rpc("declare_locality_transfer"')
    expect(action).toContain("createServerClient<Database>(url, anonKey")
    expect(action).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(action).toContain("validateMove(")
  })

  it("o perfil mostra a cidade e não pede endereço", () => {
    const page = web("app", "(shell)", "profile", "page.tsx")
    const section = web("app", "(shell)", "profile", "city-section.tsx")
    expect(page).toContain("<CitySection />")
    expect(section).toContain('id="cidade"')
    expect(section).toContain("não pede nem guarda o seu endereço")
    expect(section).not.toMatch(/name="(endereco|address|rua|cep)"/i)
  })

  it("a consulta só lê: sem convite a publicar e sem as comunidades de lá", () => {
    const consult = web("app", "(shell)", "cidade", "[id]", "city-consult.tsx")
    expect(consult).toContain("withCommunities: false")
    expect(consult).toContain("loadMarketHighlights(listingsClient(), localityId, [])")
    expect(consult.match(/ consult \/>/g)?.length).toBe(4)
    expect(consult).not.toContain("CommunitySection")
    expect(consult).not.toContain("OpenQuestions")
  })

  it("a própria cidade volta ao Início e id inválido é 404", () => {
    const page = web("app", "(shell)", "cidade", "[id]", "page.tsx")
    expect(page).toContain('redirect("/inicio")')
    expect(page).toContain("if (!UUID.test(id)) notFound()")
  })

  // O banco recusa presença, pergunta ao organizador e correção do Guia a quem
  // é de fora; a tela não oferece o botão que falharia.
  it("quem consulta não vê ações que o banco recusaria", () => {
    const event = web("app", "(shell)", "events", "[id]", "page.tsx")
    expect(event).toContain("const isVisitor = localMembership === null")
    expect(event).toContain("{!isOrganizer && !isVisitor ? (")
    expect(event).toContain("Encontro de outra cidade")
    const guide = web("app", "(shell)", "guide", "[id]", "page.tsx")
    expect(guide).toContain("const isVisitor = localMembership === null")
    expect(guide).toContain("{isVisitor ? null : (")
  })

  it("a busca de Imóveis diz sempre de que cidade é", () => {
    const queries = web("lib", "listings", "queries.ts")
    expect(queries).toContain("scope: PropertyScope,")
    expect(queries).toContain('query.eq("locality_id", scope.localityId)')
    expect(web("app", "(shell)", "imoveis", "page.tsx")).toContain("withCommunities: true")
  })
})
