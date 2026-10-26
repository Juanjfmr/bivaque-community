"use client"

import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo } from "@/components/bivaque/campos"
import { CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import type { Pergunta } from "@/lib/dados/contrato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { criarPerguntaLocal, lerPerguntasLocais } from "@/lib/perguntas-locais"
import { CHAVE_ABERTURA_PERGUNTA, PEDIDO_PERGUNTAR } from "@/lib/rascunhos-criacao"
import { useCasca } from "@/src/contexto/casca"
import { contagemDeRespostas, numero, registro, texto } from "@/src/telas/comum"

/**
 * A Comunidade da onda 3 (protótipo: features/community/views.js), com dados
 * de demonstração.
 *
 * V1: abas Indicações, Grupos e Negócios; filtros Para ajudar, Resolvidas e
 * Minhas; contagem de resolvidas; lista de perguntas e negócios. Ficam para o
 * refino: abas com indicador deslizante, botão "Perguntar", paginação e o
 * bloco de quem está esperando resposta.
 */

const ABAS: readonly ItemDeFiltro[] = [
  { id: "ind", rotulo: "Indicações" },
  { id: "grp", rotulo: "Grupos" },
  { id: "biz", rotulo: "Negócios" },
]

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "help", rotulo: "Para ajudar" },
  { id: "ok", rotulo: "Resolvidas" },
  { id: "mine", rotulo: "Minhas" },
]

export function Comunidade() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [aba, setAba] = useState("ind")
  const [filtro, setFiltro] = useState("help")
  const [criandoPergunta, setCriandoPergunta] = useState(false)
  const [tituloNovo, setTituloNovo] = useState("")
  const [topicoNovo, setTopicoNovo] = useState("")
  const [erroAoCriar, setErroAoCriar] = useState("")
  const [perguntasLocais, setPerguntasLocais] = useState<Pergunta[]>([])

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void dadosDoApp
      .lerCidade(casca.cidade, { signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [casca.cidade, rodada])

  useEffect(() => {
    setPerguntasLocais(lerPerguntasLocais(casca.cidade))
  }, [casca.cidade])

  useEffect(() => {
    const abrirPergunta = () => {
      try {
        window.sessionStorage.removeItem(CHAVE_ABERTURA_PERGUNTA)
      } catch {
        /* sem persistência */
      }
      setAba("ind")
      setCriandoPergunta(true)
    }
    window.addEventListener(PEDIDO_PERGUNTAR, abrirPergunta)
    try {
      if (window.sessionStorage.getItem(CHAVE_ABERTURA_PERGUNTA) === "1") abrirPergunta()
    } catch {
      /* CTA no cabeçalho continua disponível */
    }
    return () => window.removeEventListener(PEDIDO_PERGUNTAR, abrirPergunta)
  }, [])

  const publicarPergunta = () => {
    if (dados === null) return
    const criada = criarPerguntaLocal(casca.cidade, dados.localidade.id, tituloNovo, topicoNovo)
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
    setCriandoPergunta(false)
    void navegacao.irPara("pergunta", { parametros: { id: criada.id } })
  }

  const respostas = useMemo(() => contagemDeRespostas(dados), [dados])

  const perguntas = useMemo(() => {
    if (dados === null) return []
    return [...perguntasLocais, ...dados.perguntas]
      .map((pergunta) => ({ pergunta, apresentacao: registro(pergunta.apresentacao) }))
      .filter(({ pergunta, apresentacao }) => {
        const minha = apresentacao["mine"] === true
        if (filtro === "mine") return minha
        if (filtro === "ok") return pergunta.is_resolved === true
        return pergunta.is_resolved !== true && !minha
      })
      .sort((a, b) => (respostas.get(a.pergunta.id) ?? 0) - (respostas.get(b.pergunta.id) ?? 0))
  }, [dados, filtro, respostas, perguntasLocais])

  const resolvidas = useMemo(() => {
    if (dados === null) return 0
    return dados.perguntas.filter((pergunta) => pergunta.is_resolved === true).length
  }, [dados])

  const negocios = useMemo(() => {
    if (dados === null) return []
    return dados.negocios
      .map((negocio) => ({ negocio, apresentacao: registro(negocio.apresentacao) }))
      .sort((a, b) => numero(b.apresentacao["recN"]) - numero(a.apresentacao["recN"]))
  }, [dados])

  const grupos = useMemo(() => {
    if (dados === null) return []
    return dados.grupos.map((grupo) => ({ grupo, apresentacao: registro(grupo.apresentacao) }))
  }, [dados])

  const carregando = dados === null && !erro

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

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : aba === "ind" ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-(--secondary-container) px-4 py-3">
            <Icone nome="history_edu" className="size-6 shrink-0 text-(--primary)" />
            <span className="grid gap-0.5">
              <b className="text-[15px]">{resolvidas} indicações resolvidas</b>
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
              {perguntas.map(({ pergunta, apresentacao }) => (
                <LinhaDePergunta
                  key={pergunta.id}
                  pergunta={{
                    id: pergunta.id,
                    pergunta: texto(apresentacao["q"], pergunta.title),
                    autor: texto(apresentacao["who"], "Alguém da cidade"),
                    propria: apresentacao["mine"] === true,
                    tópico: texto(apresentacao["topic"], ""),
                    cidade: casca.cidade,
                    respostas: respostas.get(pergunta.id) ?? 0,
                    resolvida: pergunta.is_resolved === true,
                  }}
                  onClick={() =>
                    void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : aba === "grp" ? (
        grupos.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem grupos nesta cidade"
            texto="Grupos reúnem quem tem a mesma rotina, o mesmo ciclo ou o mesmo interesse."
            icone="group"
          />
        ) : (
          <div className="grid gap-2">
            {grupos.map(({ grupo, apresentacao }) => (
              <LinhaDeLista
                key={grupo.id}
                icone="group"
                titulo={texto(apresentacao["t"], grupo.name)}
                subtitulo={`${numero(apresentacao["members"])} membros`}
                onClick={() => void navegacao.irPara("grupo", { parametros: { id: grupo.id } })}
              />
            ))}
          </div>
        )
      ) : negocios.length === 0 ? (
        <EstadoVazio
          titulo="Ainda sem negócios cadastrados"
          texto="As indicações da comunidade ajudarão a formar o guia de serviços."
          icone="storefront"
        />
      ) : (
        <Secao
          acoes={
            <Botao tom="texto" onClick={() => void navegacao.irPara("negocios")}>
              Ver todos os negócios
            </Botao>
          }
        >
          <Grade formato="cartoes">
            {negocios.map(({ negocio, apresentacao }) => (
              <CartaoDeNegocio
                key={negocio.id}
                negocio={{
                  id: negocio.id,
                  fonte: texto(apresentacao["imagem"]),
                  nome: texto(apresentacao["name"], negocio.display_name),
                  categoria: texto(apresentacao["cat"], negocio.category ?? ""),
                  cidade: casca.cidade,
                  indicacoes: numero(apresentacao["recN"]),
                  patrocinado: apresentacao["spon"] === true,
                  aguardando: apresentacao["claimed"] === false,
                }}
                aoAbrir={() => void navegacao.irPara("negocio", { parametros: { id: negocio.id } })}
              />
            ))}
          </Grade>
        </Secao>
      )}
    </section>
  )
}
