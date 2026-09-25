// Casamento entre o padrão de rota de uma prancha (`/guide/[id]`) e as rotas
// concretas capturadas. Módulo puro: compare.mjs é um script que executa ao ser
// importado (lê .visual/, escreve o HTML e encerra o processo sem .visual/), e
// um teste não pode depender disso nem produzir esse efeito colateral.
//
// A captura não guarda o padrão, guarda a rota concreta (`/communities/71000.../admin/media`
// depois de substituir o `[id]` máscara e adicionar query real). Sem casar concreto com o padrão,
// toda prancha de rota dinâmica parecia "sem captura" quando na verdade estava no disco.
const DYNAMIC_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// `[id]` é chave de banco e só casa com UUID — é o que separa /guide/sugerir
// (rota estática) de /guide/[id]. Outros parâmetros (`[token]` de convite) não
// têm formato fixo e casam com qualquer segmento não vazio.
function segmentMatches(pattern, concrete) {
  if (!pattern.startsWith("[")) return pattern === concrete
  if (!concrete) return false
  return pattern === "[id]" ? DYNAMIC_SEGMENT.test(concrete) : true
}

export function achadosPara(padrao, mapa) {
  const out = []
  const pSegs = padrao.split("/").filter(Boolean)
  for (const [concreta, dados] of mapa) {
    const limpa = concreta.split("?")[0]
    if (padrao === "/publicacoes/[id]" && limpa === "/publicacoes/nova") continue
    const segs = limpa.split("/").filter(Boolean)
    if (pSegs.length !== segs.length) continue
    if (pSegs.every((s, i) => segmentMatches(s, segs[i]))) {
      for (const dado of dados) out.push({ rota: concreta, dado })
    }
  }
  return out
}
