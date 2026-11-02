// PROTO-001 — a navegação simplificada da jornada.
//
// Decisão de teste do dono: as telas principais são rotas de verdade do Next, e
// a aba ativa sai do endereço. O protótipo antigo guardava a "origem" dentro do
// estado do histórico (`shell/navigation.js`, activeTab/origin); aqui não há
// estado nenhum — a barra acende o que o caminho diz, e o voltar é o do
// navegador.

export type AbaPrincipal = "inicio" | "comunidade" | "conversas" | "voce"

export type Aba = {
  id: AbaPrincipal
  href: string
  rotulo: string
}

// A ordem da barra: o Criar entra entre Comunidade e Conversas (o "slot" do
// protótipo, `shell/navigation.js`).
export const ABAS: Aba[] = [
  { id: "inicio", href: "/inicio", rotulo: "Início" },
  { id: "comunidade", href: "/comunidade", rotulo: "Comunidade" },
  { id: "conversas", href: "/conversas", rotulo: "Conversas" },
  { id: "voce", href: "/voce", rotulo: "Você" },
]

// Minhas perguntas e indicações pertencem à Comunidade: a barra acende
// Comunidade enquanto se lê o histórico.
const ROTAS_DA_COMUNIDADE = ["/comunidade", "/minhas"]

function limpar(caminho: string): string {
  const [semBarra] = caminho.split("?")
  const semHash = (semBarra ?? "").split("#")[0] ?? ""
  if (semHash.length > 1 && semHash.endsWith("/")) return semHash.slice(0, -1)
  return semHash
}

export function abaAtiva(caminho: string): AbaPrincipal {
  const limpo = limpar(caminho)
  if (limpo === "/" || limpo === "/inicio") return "inicio"
  if (limpo === "/conversas") return "conversas"
  if (limpo === "/voce") return "voce"
  for (const rota of ROTAS_DA_COMUNIDADE) {
    if (limpo === rota || limpo.startsWith(`${rota}/`)) return "comunidade"
  }
  return "inicio"
}

export type AbaDaComunidade = "indicacoes" | "grupos"

// A aba de dentro da Comunidade também sai do endereço (`?aba=grupos`), para o
// voltar e o link direto funcionarem sem estado.
export function abaDaComunidade(valor: string | null | undefined): AbaDaComunidade {
  return valor === "grupos" ? "grupos" : "indicacoes"
}

export function hrefDaComunidade(aba: AbaDaComunidade): string {
  return aba === "grupos" ? "/comunidade?aba=grupos" : "/comunidade"
}
