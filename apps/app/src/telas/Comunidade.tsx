"use client"

import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Pergunta } from "@/lib/dados/contrato"
import { type FiltroDePerguntas, type ListaDePerguntas, lerPerguntas } from "@/lib/dados/perguntas"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { criarPerguntaLocal, lerPerguntasLocais } from "@/lib/perguntas-locais"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, foiAbortada, sessaoVencida } from "@/src/eventos/formulario"
import { mensagemDaFalha } from "@/src/perguntas/estado"
import { registro, texto } from "@/src/telas/comum"

/**
 * A Comunidade: as perguntas da cidade, do banco (F04 / ADR-20261105).
 *
 * O desenho não mudou — abas Indicações e Grupos, filtros Para ajudar, Resolvidas
 * e Minhas, contagem de resolvidas e lista de perguntas. Mudou de onde vem o
 * dado: `lib/dados/perguntas`, que fala com `/api/app/perguntas`, e por isso a
 * tela distingue carregando, vazio de verdade, falha recuperável, sessão vencida
 * e acesso negado. Banco fora não vira "ninguém perguntou nada".
 *
 * O que este lote NÃO liga: grupos (a aba mostra o vazio honesto até a jornada
 * existir), publicar com foto, Útil, salvar, seguir, fixar e denúncia. A caixa de
 * "Perguntar" continua gravando só nesta sessão de demonstração, como o próprio
 * texto dela diz — publicar de verdade é o lote seguinte.
 */

const ABAS: readonly ItemDeFiltro[] = [
  { id: "ind", rotulo: "Indicações" },
  { id: "grp", rotulo: "Grupos" },
]

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "help", rotulo: "Para ajudar" },
  { id: "ok", rotulo: "Resolvidas" },
  { id: "mine", rotulo: "Minhas" },
]

/** O filtro da tela vira o filtro do servidor: quem filtra é o banco. */
const FILTRO_DO_SERVIDOR: Readonly<Record<string, FiltroDePerguntas>> = {
  help: "ajuda",
  ok: "resolvidas",
  mine: "minhas",
}

export function Comunidade() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [lista, setLista] = useState<ListaDePerguntas | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [aba, setAba] = useState("ind")
  const [filtro, setFiltro] = useState("help")
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState<string | null>(null)
  const { aberto: criandoPergunta, aoMudarAberto: setCriandoPergunta } =
    useSobreposicaoDaEntrada("perguntar")
  const [tituloNovo, setTituloNovo] = useState("")
  const [topicoNovo, setTopicoNovo] = useState("")
  const [erroAoCriar, setErroAoCriar] = useState("")
  const [perguntasLocais, setPerguntasLocais] = useState<Pergunta[]>([])
  // Uma sessão de rede por tela: sair cancela a página que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())

  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => () => controle.abort(), [controle])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const pedido = new AbortController()
    setLista(null)
    setErro(null)
    setErroAoCarregarMais(null)
    void lerPerguntas({
      filtro: FILTRO_DO_SERVIDOR[filtro] ?? "ajuda",
      signal: pedido.signal,
    })
      .then((lidas) => {
        if (!pedido.signal.aborted) setLista(lidas)
      })
      .catch((falha: unknown) => {
        if (pedido.signal.aborted) return
        setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => pedido.abort()
  }, [filtro, rodada])

  useEffect(() => {
    setPerguntasLocais(lerPerguntasLocais(casca.cidade))
  }, [casca.cidade])

  const publicarPergunta = () => {
    // Publicar de verdade é o lote seguinte: a pergunta local vive só nesta aba,
    // como a caixa de texto já avisa.
    const criada = criarPerguntaLocal(casca.cidade, "", tituloNovo, topicoNovo)
    if (criada === "limite") {
      setErroAoCriar(
        "Limite de 30 perguntas nesta sessão atingido. As anteriores foram preservadas e seu texto continua no formulário.",
      )
      return
    }
    if (!criada) {
      setErroAoCriar(
        "Não foi possível guardar a pergunta nesta sessão. Confira o texto e tente novamente.",
      )
      return
    }
    setPerguntasLocais((atual) => [criada, ...atual])
    setTituloNovo("")
    setTopicoNovo("")
    setErroAoCriar("")
    setAba("ind")
    setFiltro("mine")
    void navegacao.irPara("pergunta", { parametros: { id: criada.id }, replace: true })
  }

  async function carregarMais() {
    if (lista === null || lista.proximo === null || carregandoMais) return
    setCarregandoMais(true)
    setErroAoCarregarMais(null)
    try {
      const proxima = await lerPerguntas({
        filtro: FILTRO_DO_SERVIDOR[filtro] ?? "ajuda",
        depois: lista.proximo,
        signal: controle.signal,
      })
      setLista({
        perguntas: [...lista.perguntas, ...proxima.perguntas],
        proximo: proxima.proximo,
        cidade: proxima.cidade || lista.cidade,
        resolvidas: lista.resolvidas,
      })
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) setErroAoCarregarMais(mensagemDaFalha(falha, "lista"))
    } finally {
      setCarregandoMais(false)
    }
  }

  const cidadeDaLista = lista?.cidade || casca.cidade

  const perguntas = useMemo(() => {
    const reais = (lista?.perguntas ?? []).map((pergunta) => ({
      id: pergunta.id,
      pergunta: pergunta.titulo,
      autor: pergunta.autor === "" ? "Alguém da cidade" : pergunta.autor,
      propria: pergunta.propria,
      tópico: pergunta.assunto,
      cidade: cidadeDaLista,
      respostas: pergunta.respostas,
      resolvida: pergunta.resolvida,
    }))
    // A pergunta criada na caixa de demonstração é sempre "minha" e nunca
    // resolvida: ela só aparece no filtro que a mostra.
    const locais =
      filtro === "mine"
        ? perguntasLocais.map((pergunta) => ({
            id: pergunta.id,
            pergunta: pergunta.title,
            autor: "Você",
            propria: true,
            tópico: texto(registro(pergunta.apresentacao)["topic"], ""),
            cidade: cidadeDaLista,
            respostas: 0,
            resolvida: false,
          }))
        : []
    return [...locais, ...reais]
  }, [lista, filtro, perguntasLocais, cidadeDaLista])

  const carregando = lista === null && erro === null
  const resolvidas = lista?.resolvidas ?? 0

  return (
    <section data-tela="comunidade" className="grid gap-2">
      <CabecaDePagina
        titulo="Comunidade"
        subtitulo="O que a comunidade sabe fica disponível para quem chegar depois."
        acao={
          aba === "ind" ? (
            <Botao
              data-acao="perguntar"
              icone="edit_square"
              tom="tonal"
              onClick={() => setCriandoPergunta(true)}
            >
              Perguntar
            </Botao>
          ) : undefined
        }
      />

      <div className="flex items-center justify-between gap-2">
        <ChipsDeFiltro
          itens={ABAS}
          valor={aba}
          aoEscolher={setAba}
          rotulo="Seções da Comunidade"
          className="min-w-0 flex-1"
        />
      </div>

      <Dialog open={criandoPergunta} onOpenChange={setCriandoPergunta}>
        <DialogContent
          showCloseButton
          unstyled
          data-fluxo="perguntar"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-5 shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <DialogTitle className="pr-12 text-xl">Pedir uma indicação</DialogTitle>
          <DialogDescription className="text-sm text-(--on-surface-variant)">
            A pergunta ficará somente nesta sessão de demonstração. Não será publicada para outros
            usuários.
          </DialogDescription>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(evento) => {
              evento.preventDefault()
              publicarPergunta()
            }}
          >
            <Campo
              id="nova-pergunta"
              rotulo="O que você precisa saber?"
              valor={tituloNovo}
              aoMudar={(valor) => {
                setTituloNovo(valor)
                setErroAoCriar("")
              }}
              minLength={12}
              maxLength={300}
              required
              placeholder="Ex.: alguém indica um pediatra no bairro?"
            />
            <Campo
              id="topico-pergunta"
              rotulo="Assunto (opcional)"
              valor={topicoNovo}
              aoMudar={setTopicoNovo}
              maxLength={60}
              placeholder="Saúde, escola, serviços..."
            />
            {erroAoCriar === "" ? null : (
              <p role="alert" className="text-sm text-(--destructive)">
                {erroAoCriar}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Botao type="button" tom="texto" onClick={() => setCriandoPergunta(false)}>
                Cancelar
              </Botao>
              <Botao type="submit" disabled={tituloNovo.trim().length < 12}>
                Adicionar pergunta
              </Botao>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso à comunidade desta cidade." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : aba === "ind" ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-(--secondary-container) px-4 py-3">
            <Icone nome="history_edu" className="size-6 shrink-0 text-(--primary)" />
            <span className="grid gap-0.5">
              <b className="text-[15px]">
                {resolvidas} {resolvidas === 1 ? "indicação resolvida" : "indicações resolvidas"}
              </b>
              <small className="text-(--on-surface-variant)">
                Busque uma resposta antes de perguntar.
              </small>
            </span>
          </div>

          {filtro === "help" && perguntas.length > 0 ? (
            <p className="flex items-center gap-2 text-sm text-(--on-surface-variant)">
              <Icone nome="volunteer_activism" className="size-5" />
              Perguntas sem resposta aparecem primeiro. Responder leva um minuto.
            </p>
          ) : null}

          <ChipsDeFiltro
            itens={FILTROS}
            valor={filtro}
            aoEscolher={setFiltro}
            rotulo="Filtrar perguntas"
          />

          {perguntas.length === 0 ? (
            <EstadoVazio
              titulo={
                filtro === "help" ? "Ninguém esperando resposta" : "Nenhuma pergunta por aqui"
              }
              texto="Você pode buscar uma indicação ou iniciar uma nova pergunta."
              icone="forum"
              acao={{
                rotulo: "Pedir indicação",
                aoAcionar: () => setCriandoPergunta(true),
              }}
            />
          ) : (
            <div className="grid gap-2">
              {perguntas.map((pergunta) => (
                <LinhaDePergunta
                  key={pergunta.id}
                  pergunta={pergunta}
                  onClick={() =>
                    void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                  }
                />
              ))}
            </div>
          )}

          {lista !== null && lista.proximo === null ? null : (
            <div className="grid justify-items-center gap-2 pt-2">
              {erroAoCarregarMais === null ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {erroAoCarregarMais}
                </p>
              )}
              <Botao tom="tonal" disabled={carregandoMais} onClick={() => void carregarMais()}>
                {carregandoMais ? "Carregando…" : "Ver mais perguntas"}
              </Botao>
            </div>
          )}
        </>
      ) : (
        <EstadoVazio
          titulo="Ainda sem grupos nesta cidade"
          texto="Grupos reúnem quem tem a mesma rotina, o mesmo ciclo ou o mesmo interesse."
          icone="group"
        />
      )}
    </section>
  )
}
