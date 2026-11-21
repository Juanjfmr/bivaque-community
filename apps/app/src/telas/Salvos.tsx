"use client"

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { criarAcaoOtimista } from "@/lib/acao-otimista"
import { FalhaDaApi } from "@/lib/api/cliente"
import { agirNaPublicacao, lerPublicacoesSalvas, type PublicacaoReal } from "@/lib/dados/grupos"
import { type EntradaDoGuia, lerSalvosDoGuia, marcarNoGuia } from "@/lib/dados/guia"
import { type AnuncioDaLista, listarAnunciosSalvos, marcarSalvoAnuncio } from "@/lib/dados/mercado"
import { lerPerguntasSalvas, marcarSalvaPergunta, type PerguntaSalva } from "@/lib/dados/perguntas"
import { iconeDeDado } from "@/lib/icones"
import { lerDaLista, lerTextoDaLista, mudancaDaLista } from "@/lib/navegacao/listas"
import {
  useCargaDaLista,
  useEntradaDaTela,
  useNavegacao,
  useRolagemEFoco,
} from "@/lib/navegacao/react"
import { foiAbortada } from "@/src/eventos/formulario"
import { ICONE_DA_CATEGORIA } from "@/src/guia/comum"
import { Aviso, Botao as BotaoDaPeca, CampoDeBusca, Chip, useAviso } from "@/src/pecas/pecas"

type AbaDosSalvos = "desapegos" | "imoveis"

/** As seções que sabem remover — o nome guarda, por seção, quem está saindo. */
type SecaoDosSalvos = "anuncios" | "publicacoes" | "perguntas" | "guia"

const ABAS: ReadonlyArray<{ readonly id: AbaDosSalvos; readonly rotulo: string }> = [
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
  // Aba e busca moram na entrada (NAV-001): voltar de um anúncio devolve a
  // mesma seção, com o mesmo filtro digitado.
  const entrada = useEntradaDaTela()
  const [aba, setAba] = useState<AbaDosSalvos>(
    () =>
      lerDaLista(
        entrada.filtros,
        "salvos-aba",
        ["desapegos", "imoveis"],
        "desapegos",
      ) as AbaDosSalvos,
  )
  const [busca, setBusca] = useState(() => lerTextoDaLista(entrada.filtros, "salvos-busca"))
  const trocarAba = (nova: AbaDosSalvos) => {
    setAba(nova)
    void navegacao.atualizar(mudancaDaLista("salvos-aba", nova))
  }
  const trocarBusca = (texto: string) => {
    setBusca(texto)
    void navegacao.atualizar(mudancaDaLista("salvos-busca", texto))
  }
  const [anuncios, setAnuncios] = useState<readonly AnuncioDaLista[] | null>(null)
  const [erroDosAnuncios, setErroDosAnuncios] = useState(false)
  const [rodadaDosAnuncios, setRodadaDosAnuncios] = useState(0)
  /** O segmento INATIVO está vazio na última leitura; `null` é "não sei ainda". */
  const [outroVazio, setOutroVazio] = useState<boolean | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [acao] = useState(criarAcaoOtimista)
  const avisos = useAviso()
  const [publicacoes, setPublicacoes] = useState<readonly PublicacaoReal[] | null>(null)
  const [erroDasPublicacoes, setErroDasPublicacoes] = useState(false)
  const [rodadaDasPublicacoes, setRodadaDasPublicacoes] = useState(0)
  const [guia, setGuia] = useState<readonly EntradaDoGuia[] | null>(null)
  const [erroDoGuia, setErroDoGuia] = useState(false)
  const [rodadaDoGuia, setRodadaDoGuia] = useState(0)
  const [perguntas, setPerguntas] = useState<readonly PerguntaSalva[] | null>(null)
  const [erroDasPerguntas, setErroDasPerguntas] = useState(false)
  const [rodadaDasPerguntas, setRodadaDasPerguntas] = useState(0)

  // A lista só devolve a rolagem quando o dado chegou (NAV-001).
  const carga = useCargaDaLista(anuncios !== null || erroDosAnuncios)
  useRolagemEFoco(carga)

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
    // Trocou de segmento, mudou quem é "o outro": o conhecimento anterior sai.
    setOutroVazio(null)
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

  // O vazio dos anúncios só se decide pelos DOIS segmentos (achado 1 da
  // revisão de código): quando o ativo vem vazio, lê-se o inativo. Quem só tem
  // imóveis salvos não pode ouvir "nada salvo" de uma tela cujo contador diz
  // outra coisa — os chips continuam à mão e o conteúdo segue um toque longe.
  useEffect(() => {
    if (anuncios === null || anuncios.length > 0 || outroVazio !== null) return
    const controle = new AbortController()
    void listarAnunciosSalvos(
      { tipo: aba === "imoveis" ? "item" : "property", limite: 50 },
      { signal: controle.signal },
    )
      .then((lista) => {
        if (!controle.signal.aborted) setOutroVazio(lista.anuncios.length === 0)
      })
      .catch(() => {
        // Sem leitura do inativo não se afirma "nada salvo": o colapso exige
        // confirmação dos dois segmentos.
        if (!controle.signal.aborted) setOutroVazio(false)
      })
    return () => controle.abort()
  }, [aba, anuncios, outroVazio])

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
  async function remover<T extends { id: string }>({
    secao,
    id,
    lista,
    definir,
    gravar,
    repor,
    mesmaSecao = () => true,
  }: {
    secao: SecaoDosSalvos
    id: string
    lista: readonly T[] | null
    definir: Dispatch<SetStateAction<readonly T[] | null>>
    gravar: () => Promise<unknown>
    /** A gravação inversa: o Desfazer do Aviso grava o estado anterior de verdade. */
    repor: () => Promise<unknown>
    mesmaSecao?: () => boolean
  }) {
    const onde = lista?.findIndex((item) => item.id === id) ?? -1
    const item = lista?.find((outro) => outro.id === id)
    const tirar = () => definir((atual) => atual?.filter((outro) => outro.id !== id) ?? atual)
    // shortcut: repõe no índice original; se um vizinho anterior também saiu,
    // ela entra depois dele.
    const recolocar = () => {
      if (item === undefined || !mesmaSecao()) return
      definir((atual) => {
        if (atual === null || atual.some((outro) => outro.id === id)) return atual
        const comOItem = [...atual]
        comOItem.splice(onde < 0 ? comOItem.length : Math.min(onde, comOItem.length), 0, item)
        return comOItem
      })
    }

    setAviso(null)
    segurar(secao, id)
    const resultado = await acao.executar(id, {
      aplicar: tirar,
      reverter: recolocar,
      gravar,
      mensagemDaRecusa: (falha) => (foiAbortada(falha) ? "" : falhaAoRemover(falha)),
      aoGravando: (gravando) =>
        setRemovendo((atual) => (gravando ? id : atual === id ? null : atual)),
    })
    largar(secao, id)
    if (resultado.tipo === "recusa") {
      if (resultado.mensagem !== "") setAviso(resultado.mensagem)
      return
    }
    // Sucesso: o item sai também da lista que voltou durante a chamada, e
    // leituras já começadas que chegarem depois não o repõem.
    confirmar(secao, id)
    tirar()
    avisos.mostrar("Removido dos salvos.", () => {
      void acao
        .executar(id, {
          aplicar: recolocar,
          reverter: tirar,
          gravar: repor,
          mensagemDaRecusa: (falha) => (foiAbortada(falha) ? "" : falhaAoRemover(falha)),
        })
        .then((desfeito) => {
          if (desfeito.tipo === "recusa" && desfeito.mensagem !== "") setAviso(desfeito.mensagem)
        })
    })
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

  // Um vazio só, da tela inteira, quando nada foi salvo: quatro vazios
  // empilhados dizem quatro vezes a mesma coisa (REGUA-002). Ele exige os DOIS
  // segmentos de anúncio vazios (achado 1) e não conta as perguntas seguidas,
  // que não são salvos: seguidas existem sem marcador e continuam listadas
  // abaixo do vazio, na seção própria delas (revisão às cegas, 8).
  const nadaSalvo =
    anuncios !== null &&
    anuncios.length === 0 &&
    outroVazio === true &&
    publicacoes !== null &&
    publicacoes.length === 0 &&
    guia !== null &&
    guia.length === 0

  // No colapso não há campo de busca na tela: um termo que ficou digitado não
  // pode seguir filtrando as perguntas seguidas por baixo do vazio.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `trocarBusca` grava na entrada; o colapso é a única condição
  useEffect(() => {
    if (nadaSalvo) trocarBusca("")
  }, [nadaSalvo])

  // A seção das perguntas seguidas é própria (revisão às cegas, 8): seguir não
  // é salvar, então ela não entra na conta do vazio e sobrevive a ele com o
  // título claro dela — o vazio não pode contradizer o que segue listado.
  const secaoDePerguntas = (
    <section data-salvos="perguntas" className="grid gap-2">
      <h2 className="text-[17px]">Perguntas que você segue</h2>
      {erroDasPerguntas ? (
        <AvisoDaSecao
          texto="Não foi possível carregar suas perguntas."
          aoTentar={() => setRodadaDasPerguntas((atual) => atual + 1)}
        />
      ) : perguntas === null || perguntasVisiveis === null ? (
        <EsqueletoDeLista linhas={2} />
      ) : perguntas.length === 0 ? (
        <p className="text-sm text-(--on-surface-variant)">
          Nenhuma pergunta seguida ainda. Toque em Seguir respostas em uma pergunta para acompanhar
          as respostas dela.
        </p>
      ) : (
        <Lista>
          {perguntasVisiveis.map((pergunta) => (
            <div key={pergunta.id} className="flex items-center gap-2 pr-3">
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
                className="bg-(--muted)"
                disabled={removendo === pergunta.id}
                onClick={() =>
                  void remover({
                    secao: "perguntas",
                    id: pergunta.id,
                    lista: perguntas,
                    definir: setPerguntas,
                    gravar: () => marcarSalvaPergunta(pergunta.id, false),
                    repor: () => marcarSalvaPergunta(pergunta.id, true),
                  })
                }
              />
            </div>
          ))}
        </Lista>
      )}
    </section>
  )

  return (
    <section data-tela="salvos" className="grid gap-2 md:mx-auto md:max-w-[640px] lg:max-w-[720px]">
      <CabecaDePagina
        titulo="Salvos"
        subtitulo="Anúncios, publicações, perguntas e referências do guia guardados para ver com calma."
      />

      {nadaSalvo ? (
        <>
          {/* O vazio é compacto (revisão cega R1, M9): largura máxima
              própria, centrado na coluna — sem cartão de 720 px esticado. */}
          <div className="mx-auto w-full max-w-[27rem]">
            <EstadoVazio
              titulo="Nada salvo ainda"
              texto="Toque no marcador para guardar por aqui."
              icone="bookmark_border"
            >
              {/* A saída do vazio tem cara de ação (revisão às cegas, 5): a
                  ardósia preenchida de concluir, não o pálido de um secundário.
                  O escopo `.pc` traz as variáveis da peça. */}
              <div className="pc pc-embutido">
                <BotaoDaPeca
                  data-acao="acao-do-vazio"
                  onClick={() => void navegacao.irPara("mercado")}
                >
                  Ver o Mercado
                </BotaoDaPeca>
              </div>
            </EstadoVazio>
          </div>
          {/* Seguidas existem sem marcador: a seção segue de pé sob o vazio,
              sem busca e sem chips — não há salvos para filtrar. */}
          {erroDasPerguntas || (perguntas !== null && perguntas.length > 0)
            ? secaoDePerguntas
            : null}
        </>
      ) : (
        <>
          {/* O escopo `.pc` traz as variáveis das peças (borda, cartão, tinta):
              sem ele o campo da peça perde a forma (REGUA-002). */}
          <div className="pc pc-embutido">
            <CampoDeBusca
              rotulo="Buscar nos salvos"
              placeholder="Buscar nos salvos"
              value={busca}
              onChange={(evento) => trocarBusca(evento.target.value)}
            />
          </div>

          {aviso === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {aviso}
            </p>
          )}

          <section data-salvos="anuncios" className="grid gap-2">
            <h2 className="text-[17px]">Anúncios salvos</h2>
            <fieldset
              aria-label="Seções dos salvos"
              className="pc pc-embutido flex flex-wrap gap-2 border-0 p-0"
            >
              {ABAS.map((abaDeAnuncio) => (
                <Chip
                  key={abaDeAnuncio.id}
                  selecionado={aba === abaDeAnuncio.id}
                  onClick={() => trocarAba(abaDeAnuncio.id)}
                >
                  {abaDeAnuncio.rotulo}
                </Chip>
              ))}
            </fieldset>

            {erroDosAnuncios ? (
              <AvisoDaSecao
                texto="Não foi possível carregar seus anúncios salvos."
                aoTentar={() => setRodadaDosAnuncios((atual) => atual + 1)}
              />
            ) : anuncios === null || anunciosVisiveis === null ? (
              <EsqueletoDeLista linhas={3} />
            ) : anuncios.length === 0 ? (
              <p className="text-sm text-(--on-surface-variant)">
                {imoveis
                  ? "Nenhum imóvel salvo ainda. Toque no marcador de um imóvel para guardá-lo."
                  : "Nenhum anúncio salvo ainda. Toque no marcador de um anúncio para guardá-lo."}
              </p>
            ) : anunciosVisiveis.length === 0 ? (
              // A busca não casou nesta seção, mas os chips continuam à mão:
              // é por eles que se chega ao imóvel procurado.
              <p role="status" className="text-sm text-(--on-surface-variant)">
                {imoveis
                  ? "Nenhum imóvel salvo corresponde à busca."
                  : "Nenhum anúncio salvo corresponde à busca."}
              </p>
            ) : (
              // A grade mora na coluna de leitura da jornada (revisão às cegas,
              // 7): preenche a coluna em 3 cartões no 1440, sem esticar até a
              // borda. Colunas por tela, não pelo viewport: a coluna de 720
              // não comporta as 4 faixas do `.bv-grade`.
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {anunciosVisiveis.map((anuncio) => (
                  <CartaoDeFoto
                    key={anuncio.id}
                    anuncio={{
                      id: anuncio.id,
                      fonte: anuncio.foto,
                      titulo: anuncio.titulo,
                      preco: anuncio.precoCents === null ? null : anuncio.precoCents / 100,
                      porMes: anuncio.deal === "rent",
                      icone:
                        anuncio.tipo === "property" ? "apartment" : iconeDeDado(anuncio.categoria),
                      meta: anuncio.bairro ?? anuncio.cidade ?? "",
                      salvo: true,
                    }}
                    aoSalvar={() =>
                      void remover({
                        secao: "anuncios",
                        id: anuncio.id,
                        lista: anuncios,
                        definir: setAnuncios,
                        gravar: () => marcarSalvoAnuncio(anuncio.id, false),
                        repor: () => marcarSalvoAnuncio(anuncio.id, true),
                        mesmaSecao: () => abaAtual.current === aba,
                      })
                    }
                    aoAbrir={() =>
                      void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {mostra(publicacoes, publicacoesVisiveis) ? (
            <section data-salvos="publicacoes" className="grid gap-2">
              <h2 className="text-[17px]">Publicações salvas</h2>
              {erroDasPublicacoes ? (
                <AvisoDaSecao
                  texto="Não foi possível carregar suas publicações."
                  aoTentar={() => setRodadaDasPublicacoes((atual) => atual + 1)}
                />
              ) : publicacoes === null || publicacoesVisiveis === null ? (
                <EsqueletoDeLista linhas={2} />
              ) : publicacoes.length === 0 ? (
                <p className="text-sm text-(--on-surface-variant)">
                  Nenhuma publicação salva ainda. Toque em Salvar publicação no menu de uma
                  publicação de grupo.
                </p>
              ) : (
                <Lista>
                  {publicacoesVisiveis.map((publicacao) => (
                    <div key={publicacao.id} className="flex items-center gap-2 pr-3">
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
                      {/* O alvo de remover tem círculo, rótulo acessível e os 44 px do
                          `BotaoDeIcone`, com respiro de 12 px da borda
                          (revisão cega R1, M7): dois glifos colados não se
                          separam sob o dedo. */}
                      <BotaoDeIcone
                        rotulo={`Remover dos salvos: ${publicacao.texto}`}
                        nome="bookmark_remove"
                        className="bg-(--muted)"
                        disabled={removendo === publicacao.id}
                        onClick={() =>
                          void remover({
                            secao: "publicacoes",
                            id: publicacao.id,
                            lista: publicacoes,
                            definir: setPublicacoes,
                            gravar: () => agirNaPublicacao(publicacao.id, "salvar", false),
                            repor: () => agirNaPublicacao(publicacao.id, "salvar", true),
                          })
                        }
                      />
                    </div>
                  ))}
                </Lista>
              )}
            </section>
          ) : null}

          {mostra(perguntas, perguntasVisiveis) ? secaoDePerguntas : null}

          {mostra(guia, guiaVisivel) ? (
            <section data-salvos="guia" className="grid gap-2">
              <h2 className="text-[17px]">Referências do guia</h2>
              {erroDoGuia ? (
                <AvisoDaSecao
                  texto="Não foi possível carregar suas referências."
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
                    <div key={entrada.id} className="flex items-center gap-2 pr-3">
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
                        className="bg-(--muted)"
                        disabled={removendo === entrada.id}
                        onClick={() =>
                          void remover({
                            secao: "guia",
                            id: entrada.id,
                            lista: guia,
                            definir: setGuia,
                            gravar: () => marcarNoGuia(entrada.id, false),
                            repor: () => marcarNoGuia(entrada.id, true),
                          })
                        }
                      />
                    </div>
                  ))}
                </Lista>
              )}
            </section>
          ) : null}
        </>
      )}
      <Aviso aviso={avisos.aviso} aoSumir={avisos.limpar} />
    </section>
  )
}

/** A falha de uma seção: aviso único com a saída, sem trocar a estrutura. */
function AvisoDaSecao({
  texto,
  aoTentar,
}: {
  readonly texto: string
  readonly aoTentar: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p role="alert" className="text-sm text-(--destructive)">
        {texto}
      </p>
      <Botao tom="texto" className="shrink-0" onClick={aoTentar}>
        Tentar de novo
      </Botao>
    </div>
  )
}
