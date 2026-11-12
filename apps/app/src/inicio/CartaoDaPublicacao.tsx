import { MembroAvatar } from "@/components/bivaque/avatar"
import { Botao } from "@/components/bivaque/botao"
import { Etiqueta } from "@/components/bivaque/etiqueta"

/**
 * A publicação do feed do Início como cartão (parecer cego de 12/11: "feed é
 * uma lista de texto").
 *
 * Não desenha linguagem nova: compõe as peças da biblioteca — `MembroAvatar`,
 * `Etiqueta` e `Botao` — e só dispõe. O que o banco não devolve para o Início
 * (foto, contagem de "útil") fica de fora em vez de virar número inventado.
 */
export type PublicacaoDaCidade = {
  readonly id: string
  readonly autor: string
  readonly local: string
  readonly quando: string
  readonly texto: string
  readonly respostas: number
  readonly resolvida: boolean
}

export function CartaoDaPublicacao({
  publicacao,
  salva,
  aoAbrir,
  aoSalvar,
}: {
  readonly publicacao: PublicacaoDaCidade
  readonly salva: boolean
  readonly aoAbrir: () => void
  readonly aoSalvar: () => void
}) {
  return (
    <article data-cartao="publicacao" className="bv-publicacao">
      <header className="bv-publicacao-cabeca">
        <MembroAvatar nome={publicacao.autor} />
        <span className="grid min-w-0 grow gap-0.5">
          <b className="truncate text-[15px]">{publicacao.autor}</b>
          <small className="truncate text-xs text-(--on-surface-variant)">
            {publicacao.quando === ""
              ? publicacao.local
              : `${publicacao.local} · ${publicacao.quando}`}
          </small>
        </span>
        <Etiqueta tom={publicacao.resolvida ? "ok" : "neutro"}>
          {publicacao.resolvida
            ? "Resolvida"
            : publicacao.respostas === 0
              ? "Sem resposta"
              : publicacao.respostas === 1
                ? "1 resposta"
                : `${publicacao.respostas} respostas`}
        </Etiqueta>
      </header>
      <p className="bv-publicacao-texto">{publicacao.texto}</p>
      <footer className="bv-publicacao-acoes">
        <Botao tom="texto" icone="forum" onClick={aoAbrir}>
          {publicacao.respostas === 0 ? "Responder" : "Ver respostas"}
        </Botao>
        <Botao
          tom="texto"
          icone={salva ? "bookmark" : "bookmark_border"}
          aria-pressed={salva}
          onClick={aoSalvar}
        >
          {salva ? "Salva" : "Salvar"}
        </Botao>
      </footer>
    </article>
  )
}
