"use client"

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react"
import { BotaoDeIcone } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import type { ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { FalhaDaApi } from "@/lib/api/cliente"
import { agirNaPublicacao, lerPublicacoesSalvas, type PublicacaoReal } from "@/lib/dados/grupos"
import { type EntradaDoGuia, lerSalvosDoGuia, marcarNoGuia } from "@/lib/dados/guia"
import { type AnuncioDaLista, listarAnunciosSalvos, marcarSalvoAnuncio } from "@/lib/dados/mercado"
import { lerPerguntasSalvas, marcarSalvaPergunta, type PerguntaSalva } from "@/lib/dados/perguntas"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { foiAbortada } from "@/src/eventos/formulario"
import { ICONE_DA_CATEGORIA } from "@/src/guia/comum"
import { CampoDeBusca } from "@/src/pecas/pecas"
import { Segmentos } from "@/src/pecas/segmentos"

type AbaDosSalvos = "desapegos" | "imoveis"

/** As seções que sabem remover — o nome guarda, por seção, quem está saindo. */
type SecaoDosSalvos = "anuncios" | "publicacoes" | "perguntas" | "guia"

const ABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
]

/** O motivo do servidor vem primeiro; a frase da ação é o último recurso. */
function falhaAoRemover(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
    if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
    if (falha.mensagem !== null) return falha.mensagem
  }
  return "Não foi possível remover dos salvos. Tente de novo."
}

/**
 * Salvos: os anúncios que a pessoa guardou, as publicações de grupo, as perguntas
 * que ela segue e as referências do guia. Todas as seções vêm das rotas da sessão
 * (`/api/app/mercado/salvos`, `/grupos/salvas`, `/perguntas/salvas`,
 * `/guia/salvos`) e dessalvar aqui apaga a linha da tabela de salvamento — a
 * linha sai da tela e o marcador na origem volta a "não salvo".
 *
 * A busca filtra, por título, o que as seções JÁ carregaram: nenhuma chamada
 * nova sai do campo (ADR-20261117-salvos, divergência das abas por tipo).
 */
export function Salvos() {
  const navegacao = useNavegacao()
  const [aba, setAba] = useState<AbaDosSalvos>("desapegos")
  const [busca, setBusca] = useState("")
  const [anuncios, setAnuncios] = useState<readonly AnuncioDaLista[] | null>(null)
  const [erroDosAnuncios, setErroDosAnuncios] = useState(false)
  const [rodadaDosAnuncios, setRodadaDosAnuncios] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [publicacoes, setPublicacoes] = useState<readonly PublicacaoReal[] | null>(null)
  const [erroDasPublicacoes, setErroDasPublicacoes] = useState(false)
  const [rodadaDasPublicacoes, setRodadaDasPublicacoes] = useState(0)
  const [guia, setGuia] = useState<readonly EntradaDoGuia[] | null>(null)
  const [erroDoGuia, setErroDoGuia] = useState(false)
  const [rodadaDoGuia, setRodadaDoGuia] = useState(0)
  const [perguntas, setPerguntas] = useState<readonly PerguntaSalva[] | null>(null)
  const [erroDasPerguntas, setErroDasPerguntas] = useState(false)
  const [rodadaDasPerguntas, setRodadaDasPerguntas] = useState(0)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // A aba em vigor agora, para a volta de um anúncio não cair na lista do
  // segmento seguinte depois de a pessoa trocar de seção.
  const abaAtual = useRef(aba)

  // Quem está saindo agora, por seção. Uma leitura que chega enquanto o DELETE
  // corre pode ter lido a linha antes da gravação: sem este guarda, o anúncio
  // removido reaparece na volta ao segmento.
  const saindo = useRef(new Map<SecaoDosSalvos, Set<string>>())

  function segurar(secao: SecaoDosSalvos, id: string): void {
    const ids = saindo.current.get(secao) ?? new Set<string>()
    ids.add(id)
    saindo.current.set(secao, ids)
  }

  function largar(secao: SecaoDosSalvos, id: string): void {
    saindo.current.get(secao)?.delete(id)
  }

  // Relógio lógico das leituras e das remoções confirmadas. Uma leitura que
  // começou ANTES de uma remoção ser confirmada pode ter lido a linha antes do
  // commit e chegar depois do sucesso: ela sai sem o item. Uma leitura que começa
  // DEPOIS da confirmação mostra o que o servidor devolver — inclusive o item, se
  // a pessoa o salvou de novo.
  const relogio = useRef(0)
  const confirmadas = useRef(new Map<SecaoDosSalvos, Map<string, number>>())

  function marcarLeitura(): number {
    relogio.current += 1
    return relogio.current
  }

  function confirmar(secao: SecaoDosSalvos, id: string): void {
    relogio.current += 1
    const ids = confirmadas.current.get(secao) ?? new Map<string, number>()
    ids.set(id, relogio.current)
    confirmadas.current.set(secao, ids)
  }

  /**
   * A lista lida sem quem está saindo (a gravação ainda não tinha terminado) e
   * sem quem saiu depois que esta leitura começou.
   */
  function semOsQueSaem<T extends { id: string }>(
    secao: SecaoDosSalvos,
    lista: readonly T[],
    inicio: number,
  ): readonly T[] {
    const pendentes = saindo.current.get(secao)
    const saidas = confirmadas.current.get(secao)
    return lista.filter((item) => {
      if (pendentes?.has(item.id)) return false
      const quando = saidas?.get(item.id)
      return quando === undefined || quando < inicio
    })
  }

  // Uma página por aba basta para a tela; o cursor da rota cobre quem guardar
  // mais que isso.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    abaAtual.current = aba
    setAnuncios(null)
    setErroDosAnuncios(false)
    const inicio = marcarLeitura()
    void listarAnunciosSalvos(
      { tipo: aba === "imoveis" ? "property" : "item", limite: 50 },
      { signal: controle.signal },
    )
      .then((lista) => {
        if (!controle.signal.aborted) setAnuncios(semOsQueSaem("anuncios", lista.anuncios, inicio))
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDosAnuncios(true)
      })
    return () => controle.abort()
  }, [aba, rodadaDosAnuncios])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setGuia(null)
    setErroDoGuia(false)
    const inicio = marcarLeitura()
    void lerSalvosDoGuia({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setGuia(semOsQueSaem("guia", lidas, inicio))
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDoGuia(true)
      })
    return () => controle.abort()
  }, [rodadaDoGuia])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPublicacoes(null)
    setErroDasPublicacoes(false)
    const inicio = marcarLeitura()
    void lerPublicacoesSalvas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPublicacoes(semOsQueSaem("publicacoes", lidas, inicio))
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDasPublicacoes(true)
      })
    return () => controle.abort()
  }, [rodadaDasPublicacoes])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPerguntas(null)
    setErroDasPerguntas(false)
    const inicio = marcarLeitura()
    void lerPerguntasSalvas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPerguntas(semOsQueSaem("perguntas", lidas, inicio))
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDasPerguntas(true)
      })
    return () => controle.abort()
  }, [rodadaDasPerguntas])

  /**
   * Dessalvar apaga a linha no banco; a linha da tela sai na hora e VOLTA se o
   * servidor recusar, com o motivo no aviso — nunca some em silêncio.
   *
   * Remover e repor são atualizações funcionais sobre a lista do momento: duas
   * remoções na mesma seção não desfazem uma à outra. `mesmaSecao` impede que a
   * volta de um anúncio caia na lista do segmento seguinte.
   *
   * `secao` alimenta o guarda de quem está saindo: enquanto o DELETE corre, uma
   * releitura da seção sai sem o item, e o sucesso também o tira da lista que
   * chegou no meio da chamada.
   */
  async function remover<T extends { id: string }>(
    secao: SecaoDosSalvos,
    id: string,
    lista: readonly T[] | null,
    definir: Dispatch<SetStateAction<readonly T[] | null>>,
    gravar: () => Promise<unknown>,
    mesmaSecao: () => boolean = () => true,
  ) {
    const onde = lista?.findIndex((item) => item.id === id) ?? -1
    const item = lista?.find((outro) => outro.id === id)
    setAviso(null)
    setRemovendo(id)
    segurar(secao, id)
    definir((atual) => atual?.filter((outro) => outro.id !== id) ?? atual)
    try {
      await gravar()
      // Sucesso: o item sai também da lista que voltou durante a chamada, e
      // leituras já começadas que chegarem depois não o repõem.
      confirmar(secao, id)
      definir((atual) => atual?.filter((outro) => outro.id !== id) ?? atual)
    } catch (falha: unknown) {
      // shortcut: repõe no índice original; se um vizinho anterior também saiu,
      // ela entra depois dele.
      if (item !== undefined && mesmaSecao()) {
        definir((atual) => {
          if (atual === null || atual.some((outro) => outro.id === id)) return atual
          const comOItem = [...atual]
          comOItem.splice(onde < 0 ? comOItem.length : Math.min(onde, comOItem.length), 0, item)
          return comOItem
        })
      }
      if (!foiAbortada(falha)) setAviso(falhaAoRemover(falha))
    } finally {
      largar(secao, id)
      setRemovendo((atual) => (atual === id ? null : atual))
    }
  }

  const termo = busca.trim().toLocaleLowerCase("pt-BR")
  const filtrando = termo !== ""
  const combina = (titulo: string) =>
    termo === "" || titulo.toLocaleLowerCase("pt-BR").includes(termo)

  const anunciosVisiveis = anuncios?.filter((anuncio) => combina(anuncio.titulo)) ?? null
  const publicacoesVisiveis = publicacoes?.filter((publicacao) => combina(publicacao.texto)) ?? null
  const perguntasVisiveis = perguntas?.filter((pergunta) => combina(pergunta.titulo)) ?? null
  const guiaVisivel = guia?.filter((entrada) => combina(entrada.nome)) ?? null

  // Enquanto busca, a seção que tem conteúdo e não casou sai de cena: o vazio
  // dela ("Nenhuma publicação salva ainda") seria mentira para quem busca. A
  // seção de anúncios fica: é dela o controle Desapegos/Imóveis.
  const mostra = (lista: readonly unknown[] | null, visivel: readonly unknown[] | null) =>
    !filtrando || lista === null || lista.length === 0 || (visivel?.length ?? 0) > 0

  const imoveis = aba === "imoveis"

  return (
    <section data-tela="salvos" className="grid gap-2">
      <CabecaDePagina
        titulo="Salvos"
        subtitulo="Anúncios, publicações, perguntas e referências do guia guardados para ver com calma."
      />

      <CampoDeBusca
        rotulo="Buscar nos salvos"
        placeholder="Buscar nos salvos"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
      />

      {aviso === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {aviso}
        </p>
      )}

      <section data-salvos="anuncios" className="grid gap-2">
        <Segmentos
          itens={ABAS}
          valor={aba}
          aoEscolher={(escolhida) => setAba(escolhida === "imoveis" ? "imoveis" : "desapegos")}
          rotulo="Seções dos salvos"
          grupo="salvos"
        />

        {erroDosAnuncios ? (
          <EstadoDeErro
            titulo="Não foi possível carregar seus anúncios salvos"
            aoTentar={() => setRodadaDosAnuncios((atual) => atual + 1)}
          />
        ) : anuncios === null || anunciosVisiveis === null ? (
          <EsqueletoDeLista linhas={3} />
        ) : anuncios.length === 0 ? (
          <EstadoVazio
            titulo={imoveis ? "Nenhum imóvel salvo" : "Nenhum anúncio salvo"}
            texto={
              imoveis
                ? "Toque no marcador de um imóvel para guardá-lo nesta lista."
                : "Toque no marcador de um anúncio para guardá-lo nesta lista."
            }
            icone="bookmark_border"
            acao={{
              rotulo: imoveis ? "Ver imóveis" : "Ver anúncios",
              aoAcionar: () => void navegacao.irPara(imoveis ? "imoveis" : "desapegos"),
            }}
          />
        ) : anunciosVisiveis.length === 0 ? (
          // A busca não casou nesta seção, mas os segmentos continuam à mão:
          // é por eles que se chega ao imóvel procurado.
          <p role="status" className="text-sm text-(--on-surface-variant)">
            {imoveis
              ? "Nenhum imóvel salvo corresponde à busca."
              : "Nenhum anúncio salvo corresponde à busca."}
          </p>
        ) : (
          <Grade formato="cartoes">
            {anunciosVisiveis.map((anuncio) => (
              <CartaoDeFoto
                key={anuncio.id}
                anuncio={{
                  id: anuncio.id,
                  fonte: anuncio.foto,
                  titulo: anuncio.titulo,
                  preco: anuncio.precoCents === null ? null : anuncio.precoCents / 100,
                  porMes: anuncio.deal === "rent",
                  icone: anuncio.tipo === "property" ? "apartment" : iconeDeDado(anuncio.categoria),
                  meta: anuncio.bairro ?? anuncio.cidade ?? "",
                  salvo: true,
                }}
                aoSalvar={() =>
                  void remover(
                    "anuncios",
                    anuncio.id,
                    anuncios,
                    setAnuncios,
                    () => marcarSalvoAnuncio(anuncio.id, false),
                    () => abaAtual.current === aba,
                  )
                }
                aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
              />
            ))}
          </Grade>
        )}
      </section>

      {mostra(publicacoes, publicacoesVisiveis) ? (
        <section data-salvos="publicacoes" className="grid gap-2">
          <h2 className="text-[17px]">Publicações salvas</h2>
          {erroDasPublicacoes ? (
            <EstadoDeErro
              titulo="Não foi possível carregar suas publicações"
              aoTentar={() => setRodadaDasPublicacoes((atual) => atual + 1)}
            />
          ) : publicacoes === null || publicacoesVisiveis === null ? (
            <EsqueletoDeLista linhas={2} />
          ) : publicacoes.length === 0 ? (
            <p className="text-sm text-(--on-surface-variant)">
              Nenhuma publicação salva ainda. Toque em Salvar publicação no menu de uma publicação
              de grupo.
            </p>
          ) : (
            <Lista>
              {publicacoesVisiveis.map((publicacao) => (
                <div key={publicacao.id} className="flex items-center gap-1 pr-1">
                  <LinhaDeLista
                    className="grow"
                    icone="forum"
                    titulo={publicacao.texto}
                    subtitulo={publicacao.autor || "Membro do grupo"}
                    tituloMultilinha
                    onClick={() =>
                      void navegacao.irPara("publicacao", { parametros: { id: publicacao.id } })
                    }
                  />
                  <BotaoDeIcone
                    rotulo={`Remover dos salvos: ${publicacao.texto}`}
                    nome="bookmark_remove"
                    disabled={removendo === publicacao.id}
                    onClick={() =>
                      void remover("publicacoes", publicacao.id, publicacoes, setPublicacoes, () =>
                        agirNaPublicacao(publicacao.id, "salvar", false),
                      )
                    }
                  />
                </div>
              ))}
            </Lista>
          )}
        </section>
      ) : null}

      {mostra(perguntas, perguntasVisiveis) ? (
        <section data-salvos="perguntas" className="grid gap-2">
          <h2 className="text-[17px]">Perguntas que você segue</h2>
          {erroDasPerguntas ? (
            <EstadoDeErro
              titulo="Não foi possível carregar suas perguntas"
              aoTentar={() => setRodadaDasPerguntas((atual) => atual + 1)}
            />
          ) : perguntas === null || perguntasVisiveis === null ? (
            <EsqueletoDeLista linhas={2} />
          ) : perguntas.length === 0 ? (
            <p className="text-sm text-(--on-surface-variant)">
              Nenhuma pergunta seguida ainda. Toque em Seguir respostas em uma pergunta para
              acompanhar as respostas dela.
            </p>
          ) : (
            <Lista>
              {perguntasVisiveis.map((pergunta) => (
                <div key={pergunta.id} className="flex items-center gap-1 pr-1">
                  <LinhaDeLista
                    className="grow"
                    icone="forum"
                    titulo={pergunta.titulo}
                    subtitulo={pergunta.resolvida ? "Resolvida" : pergunta.assunto}
                    tituloMultilinha
                    onClick={() =>
                      void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                    }
                  />
                  <BotaoDeIcone
                    rotulo={`Remover dos salvos: ${pergunta.titulo}`}
                    nome="bookmark_remove"
                    disabled={removendo === pergunta.id}
                    onClick={() =>
                      void remover("perguntas", pergunta.id, perguntas, setPerguntas, () =>
                        marcarSalvaPergunta(pergunta.id, false),
                      )
                    }
                  />
                </div>
              ))}
            </Lista>
          )}
        </section>
      ) : null}

      {mostra(guia, guiaVisivel) ? (
        <section data-salvos="guia" className="grid gap-2">
          <h2 className="text-[17px]">Referências do guia</h2>
          {erroDoGuia ? (
            <EstadoDeErro
              titulo="Não foi possível carregar suas referências"
              aoTentar={() => setRodadaDoGuia((atual) => atual + 1)}
            />
          ) : guia === null || guiaVisivel === null ? (
            <EsqueletoDeLista linhas={2} />
          ) : guia.length === 0 ? (
            <p className="text-sm text-(--on-surface-variant)">
              Nenhuma referência do guia salva ainda.
            </p>
          ) : (
            <Lista>
              {guiaVisivel.map((entrada) => (
                <div key={entrada.id} className="flex items-center gap-1 pr-1">
                  <LinhaDeLista
                    className="grow"
                    icone={ICONE_DA_CATEGORIA[entrada.categoria]}
                    titulo={entrada.nome}
                    subtitulo={entrada.descricao}
                    onClick={() =>
                      void navegacao.irPara("verbete", { parametros: { id: entrada.id } })
                    }
                  />
                  <BotaoDeIcone
                    rotulo={`Remover dos salvos: ${entrada.nome}`}
                    nome="bookmark_remove"
                    disabled={removendo === entrada.id}
                    onClick={() =>
                      void remover("guia", entrada.id, guia, setGuia, () =>
                        marcarNoGuia(entrada.id, false),
                      )
                    }
                  />
                </div>
              ))}
            </Lista>
          )}
        </section>
      ) : null}
    </section>
  )
}
