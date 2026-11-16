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
  it("o chip da web manda a consulta para o app, em toda largura", () => {
    const shell = web("app", "components", "bivaque", "app-shell.tsx")
    const switcher = web("app", "components", "shell", "city-switcher.tsx")
    expect(shell).toContain("<CitySwitcher />")
    expect(switcher).toContain('data-testid="shell-locality-pill"')
    // CIDADE-169: a consulta é tela do app (/app/cidade/[id]); a tela web não
    // existe mais e o endereço antigo responde 307 (lan-troca).
    expect(switcher).toContain("router.push(`/app/cidade/${city.id}` as Route)")
    // RUN-172: a mudança de cidade é do Você no app, e o rodapé do chip chega
    // na seção ancorada em `#cidade`.
    expect(switcher).toContain('href={"/app/voce#cidade" as Route}')
    // O botão tem nome acessível em toda largura (o texto visível só do md para cima).
    expect(switcher).toContain("aria-label={`Sua cidade: ${cityLabel}. Ver outra cidade`}")
  })

  it("o painel de cidade do app consulta de verdade: id do catálogo ou `atual`", () => {
    const painel = read("apps", "app", "src", "casca", "PainelDeCidade.tsx")
    expect(painel).not.toContain("trocarCidade(")
    expect(painel).toContain('navegacao.irPara("cidade", { parametros: { id } })')
    expect(painel).toContain("abrir(CIDADE_ATUAL)")
    // O id vem do catálogo que a entrada já usa: nome de cidade não é endereço.
    expect(painel).toContain("lerCidadesDaUf(uf")
  })

  // RUN-172: a tela de transferência saiu da web e é a rota do app que grava —
  // com o cliente da SESSÃO (a RPC é SECURITY DEFINER e resolve o dono por
  // auth.uid()), nunca com privilégio, e com a mesma validação compartilhada.
  it("mudar a cidade chama a transferência com o cliente da sessão, nunca service_role", () => {
    const rota = web("app", "api", "app", "voce", "cidade", "route.ts")
    expect(rota).toContain('rpc("declare_locality_transfer"')
    expect(rota).toContain("auth.sessao.cliente")
    expect(rota).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(rota).toContain("validateMove(")
  })

  it("o Você mostra a cidade numa seção ancorada e não pede endereço", () => {
    const voce = read("apps", "app", "src", "telas", "Voce.tsx")
    const section = read("apps", "app", "src", "voce", "Cidade.tsx")
    expect(voce).toContain('<div id="cidade">')
    expect(voce).toContain("<Cidade")
    expect(section).toContain("o Bivaque não pede nem guarda o seu endereço")
    expect(section).not.toMatch(/name="(endereco|address|rua|cep)"/i)
  })

  it("a consulta só lê: sem convite a publicar e sem as comunidades de lá", () => {
    const tela = read("apps", "app", "src", "telas", "CidadeConsulta.tsx")
    expect(tela).toContain('irPara("verbete"')
    expect(tela).toContain('irPara("evento"')
    expect(tela).toContain('irPara("anuncio"')
    // Sem convite a publicar, sem comunidades e sem perguntas: a consulta é leitura.
    expect(tela).not.toMatch(/OpenQuestions|CommunitySection|"comunidades"|"perguntas"/)
    // A rota que alimenta a tela é a mesma leitura aprovada: guia aprovado,
    // encontros e anúncios ativos daquela cidade — nem perguntas, nem vitrine.
    const rota = read("apps", "web", "app", "api", "app", "cidade", "[id]", "route.ts")
    expect(rota).toContain("ADR-20260925-consulta-outra-cidade")
    expect(rota).not.toContain("recommendation_requests")
    expect(rota).not.toContain("search_providers")
  })

  it("a cidade do membro é `atual`, e id fora do formato é 404", () => {
    const rotas = read("apps", "app", "lib", "navegacao", "rotas.ts")
    expect(rotas).toContain('["cidade", "/cidade/$id"')
    const tela = read("apps", "app", "src", "telas", "CidadeConsulta.tsx")
    expect(tela).toContain('validarParametros("cidade", { id })')
    const rota = read("apps", "web", "app", "api", "app", "cidade", "[id]", "route.ts")
    expect(rota).toContain('if (valor === "atual") return { tipo: "atual" }')
    expect(rota).toContain("ehUuid(valor)")
    expect(rota).toContain('{ erro: "cidade-nao-encontrada" }, 404')
  })

  // O banco recusa presença, pergunta ao organizador e correção do Guia a quem
  // é de fora; a tela não oferece o botão que falharia. O detalhe do evento já
  // vive no app; o Guia ainda está na web até o lote F08.
  it("quem consulta não vê ações que o banco recusaria", () => {
    const event = read("apps", "app", "src", "telas", "Evento.tsx")
    expect(event).toContain("encontro.visitante")
    expect(event).toContain("Encontro de outra cidade")
    const guide = read("apps", "app", "src", "guia", "Verbete.tsx")
    // O Guia saiu da web no F08 (o verbete é tela do app): quem consulta vê a
    // referência, mas não o botão de salvar nem o formulário que a RLS recusaria.
    expect(guide).toContain("{verbete.podeSalvar ? (")
    expect(guide).toContain("Esta referência é de outra cidade.")
  })

  it("a busca de Imóveis diz sempre de que cidade é", () => {
    const queries = web("lib", "listings", "queries.ts")
    expect(queries).toContain("scope: PropertyScope,")
    expect(queries).toContain('query.eq("locality_id", scope.localityId)')
    // A lista de imóveis foi para o app (F06, LT-005); o caller web que ainda soma
    // as comunidades da cidade é o hub do Início.
    expect(web("app", "(shell)", "inicio", "use-hub-data.ts")).toContain("withCommunities: true")
  })
})
