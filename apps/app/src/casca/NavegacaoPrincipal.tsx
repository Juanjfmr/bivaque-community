import { MembroAvatar } from "@/components/bivaque/avatar"
import { Icone } from "@/components/bivaque/icone"
import { Marca } from "@/components/bivaque/marca"
import { criaVisivel, navegacaoVisivel } from "@/lib/casca"
import { useAbaDaEntrada, useNavegacao, useRotaAtual } from "@/lib/navegacao/react"
import type { Aba } from "@/lib/navegacao/rotas"
import { cn } from "@/lib/utils"
import { useCasca } from "@/src/contexto/casca"

/**
 * A navegação principal (ADR §3.1): Início · Comunidade · **Criar** · Mercado ·
 * Você. O mesmo nó é a barra de baixo no celular e a coluna da esquerda a partir
 * de 720 px, como no protótipo.
 *
 * Conversas **não** está aqui: é o ícone do topo, com o contador de não lidas. A
 * aba acesa é a do dono da tela, com a origem da entrada onde há mais de uma
 * porta (§3.2) — quem diz é `abaAtiva`, não o endereço.
 *
 * O Criar encolhe quando a barra minimiza ao rolar (§6, itens 27 e 28).
 */

type GlifoDeAba = "home" | "volunteer_activism" | "storefront" | "person"

const PRIMEIRAS: ReadonlyArray<{ id: Aba; rotulo: string; icone: GlifoDeAba }> = [
  { id: "inicio", rotulo: "Início", icone: "home" },
  { id: "comunidade", rotulo: "Comunidade", icone: "volunteer_activism" },
]

const ULTIMAS: ReadonlyArray<{ id: Aba; rotulo: string; icone: GlifoDeAba }> = [
  { id: "mercado", rotulo: "Mercado", icone: "storefront" },
]

export function NavegacaoPrincipal({
  largura,
  minimizada,
}: {
  readonly largura: number
  readonly minimizada: boolean
}) {
  const rota = useRotaAtual()
  const navegacao = useNavegacao()
  const aba = useAbaDaEntrada()
  const larguraDaBarra = navegacaoVisivel(rota.nome, largura)
  const compacto = minimizada && larguraDaBarra

  return (
    <nav
      data-nav="principal"
      aria-label="Navegação principal"
      data-visivel={larguraDaBarra ? "sim" : "nao"}
      data-minimizada={compacto ? "sim" : "nao"}
    >
      <span data-marca="rail" className="md:mb-2 md:grid md:place-items-center">
        <Marca className="size-9" />
      </span>

      {PRIMEIRAS.map((item) => (
        <ItemDeAba key={item.id} item={item} ativa={aba === item.id} navegacao={navegacao} />
      ))}

      {criaVisivel(rota.nome, largura) ? (
        <button
          type="button"
          data-acao="criar"
          aria-label="Criar"
          data-compacto={compacto ? "sim" : "nao"}
          aria-haspopup="menu"
          aria-keyshortcuts="C"
          onClick={() => void navegacao.abrir("menu-criar")}
        >
          <span data-criar="botao">
            <Icone nome="add" className="size-7" />
          </span>
          <span data-criar="rotulo">Criar</span>
        </button>
      ) : null}

      {ULTIMAS.map((item) => (
        <ItemDeAba key={item.id} item={item} ativa={aba === item.id} navegacao={navegacao} />
      ))}

      <ItemDeAba
        item={{ id: "voce", rotulo: "Você", icone: "person" }}
        ativa={aba === "voce"}
        navegacao={navegacao}
      />
    </nav>
  )
}

function ItemDeAba({
  item,
  ativa,
  navegacao,
}: {
  readonly item: { readonly id: Aba; readonly rotulo: string; readonly icone: GlifoDeAba }
  readonly ativa: boolean
  readonly navegacao: ReturnType<typeof useNavegacao>
}) {
  const casca = useCasca()
  return (
    <button
      type="button"
      data-aba={item.id}
      id={`navegacao-${item.id}`}
      aria-current={ativa ? "page" : undefined}
      onClick={() => void navegacao.irPara(item.id)}
      className={cn(ativa && "font-semibold")}
    >
      <span data-icone-slot="sim" className="grid size-7 place-items-center rounded-lg">
        {item.id === "voce" && casca.nomeDaPessoa !== "" ? (
          <MembroAvatar nome={casca.nomeDaPessoa} tamanho="pequeno" propria />
        ) : (
          <Icone nome={item.icone} className="size-6" />
        )}
      </span>
      <span>{item.rotulo}</span>
    </button>
  )
}
