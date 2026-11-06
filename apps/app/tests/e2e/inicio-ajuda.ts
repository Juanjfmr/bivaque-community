import type { Page } from "@playwright/test"

/**
 * Ajuda do E2E do Início e da Busca (LAN-F02).
 *
 * As duas telas deixaram de ler a demonstração e passaram a falar só com
 * `/api/app/inicio` e `/api/app/busca` (`apps/app/lib/dados/inicio.ts`). Sem
 * sessão o servidor responde 401 e a tela mostra erro — por isso os specs que
 * medem conteúdo precisam da rota simulada, com o mesmo formato que a rota real
 * devolve (projeção do banco: id, title, reply_count, is_resolved, group_name,
 * kind, price_cents, neighborhood, display_name, category, members).
 *
 * A busca filtra pelo termo, como a RPC do servidor: `q=berço` devolve o berço
 * da cidade; termo sem correspondência devolve listas vazias, que é o caminho
 * do "Nada sobre …". O filtro casa com o que cada spec digita ("berço",
 * "zzzzsemresultado", "saude").
 *
 * Os ids são os da demonstração local para que o detalhe aberto a partir do
 * cartão (`/app/negocio/b9`, `/app/anuncio/i3`) ainda encontre a persona na
 * mesma fixture que as outras telas usam.
 */
const NEGOCIOS = [
  { id: "b9", display_name: "Sorriso Kids Odontopediatria", category: "saude_e_bem_estar" },
  { id: "b5", display_name: "Prof. Sérgio, matemática", category: "educacao_e_aulas" },
  { id: "b6", display_name: "Jorge Eletricista", category: "casa_e_reformas" },
  { id: "b2", display_name: "Mudanças Rio Negro", category: "mudanca_e_transporte" },
  { id: "b8", display_name: "Clínica Vet 24h Turismo", category: "pets" },
  { id: "b4", display_name: "Bolos da Cláudia", category: "alimentacao" },
] as const

const ANUNCIOS = [
  {
    id: "i3",
    title: "Berço com colchão",
    kind: "item",
    price_cents: 45000,
    neighborhood: "Flores",
  },
  {
    id: "i2",
    title: "Apartamento 3 quartos",
    kind: "property",
    price_cents: 320000,
    neighborhood: "Ponta Negra",
  },
  {
    id: "i1",
    title: "Sofá retrátil seminovo",
    kind: "item",
    price_cents: 80000,
    neighborhood: "Ponta Negra",
  },
  {
    id: "i4",
    title: "Geladeira duplex 400 L",
    kind: "item",
    price_cents: 150000,
    neighborhood: "Dom Pedro",
  },
] as const

const PERGUNTAS = [
  {
    id: "p-1",
    title: "Pediatra que atenda pelo plano da Força perto do Parque 10?",
    reply_count: 3,
    is_resolved: false,
    group_name: "Turma Manaus 2027",
  },
  {
    id: "p-2",
    title: "Diarista de confiança que atenda no Planalto?",
    reply_count: 1,
    is_resolved: false,
    group_name: "Turma Manaus 2027",
  },
] as const

const GRUPOS = [{ id: "g-cmm", name: "Turma Manaus 2027", members: 3 }] as const

const GUIA = [
  {
    id: "guia-moradia",
    name: "Organize moradia, mudança e serviços",
    description: "Um roteiro prático para se estabelecer na cidade.",
  },
] as const

function combina(texto: string, termo: string): boolean {
  return termo === "" || texto.toLocaleLowerCase("pt-BR").includes(termo)
}

export async function simularInicio(page: Page): Promise<void> {
  await page.route(/\/api\/app\/inicio(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        cidade: "Manaus",
        perguntas: PERGUNTAS,
        eventos: [],
        anuncios: ANUNCIOS,
        negocios: NEGOCIOS,
        grupos: GRUPOS,
        proximo: null,
      },
    }),
  )
  await page.route(/\/api\/app\/busca(?:\?|$)/, (rota) => {
    const termo = (new URL(rota.request().url()).searchParams.get("q") ?? "").toLocaleLowerCase(
      "pt-BR",
    )
    return rota.fulfill({
      json: {
        cidade: "Manaus",
        perguntas: PERGUNTAS.filter((linha) => combina(linha.title, termo)),
        grupos: GRUPOS.filter((linha) => combina(linha.name, termo)),
        anuncios: ANUNCIOS.filter((linha) => combina(linha.title, termo)),
        negocios: NEGOCIOS.filter((linha) => combina(linha.display_name, termo)),
        guia: GUIA.filter((linha) => combina(linha.name, termo)),
      },
    })
  })
}
