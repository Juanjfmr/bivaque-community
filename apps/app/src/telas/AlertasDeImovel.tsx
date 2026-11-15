"use client"

import { useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AlertaDeImovel,
  apagarAlerta,
  type CriteriosDoAlerta,
  criarAlerta,
  lerAlertas,
  resumoDoAlerta,
  salvarAlerta,
  situacaoDoAlerta,
} from "@/lib/dados/alertas"
import { moeda } from "@/lib/formato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"

/** Os valores que o formulário oferece, em reais — os mesmos da busca. */
const VALORES = [1500, 2500, 4000, 6000] as const
const QUARTOS = [1, 2, 3, 4] as const

/**
 * Inclui o valor gravado na lista de opções quando ele não é um dos da tela: um
 * alerta antigo com outro teto continua visível e editável em vez de aparecer
 * com o campo em branco e perder o critério no primeiro "Salvar".
 */
function opcoesNumericas(
  base: readonly number[],
  atual: number | null,
  titulo: (valor: number) => string,
): readonly { readonly valor: string; readonly titulo: string }[] {
  const valores =
    atual !== null && !base.includes(atual) ? [...base, atual].sort((a, b) => a - b) : base
  return valores.map((valor) => ({ valor: String(valor), titulo: titulo(valor) }))
}

function criteriosDe(alerta: AlertaDeImovel, ativo = alerta.ativo): CriteriosDoAlerta {
  return {
    nome: alerta.nome,
    bairro: alerta.bairro,
    tipoNegocio: alerta.tipoNegocio,
    valorMaxCents: alerta.valorMaxCents,
    quartos: alerta.quartos,
    ativo,
  }
}

function mensagemDaFalha(falha: unknown): string {
  if (falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado")
    return "Este alerta não existe mais. Recarregue a lista."
  return "Não foi possível salvar agora. Tente de novo."
}

/**
 * Alertas de busca de imóvel (F06, RUN-169): a lista real da sessão, a criação,
 * a edição, o liga/desliga e a exclusão — o que a tela `/imoveis/alertas` da web
 * servia antes do 307 para o app.
 *
 * Cada ação chama a rota e espera a resposta: nada é otimista, e a linha só
 * muda depois que o servidor confirma. O aviso de um imóvel novo continua
 * chegando em Avisos e abre o anúncio, como antes.
 */
export function AlertasDeImovel() {
  const navegacao = useNavegacao()
  const navegar = useNavigate()
  const [lista, setLista] = useState<readonly AlertaDeImovel[] | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<AlertaDeImovel | null>(null)
  const [nome, setNome] = useState("")
  const [bairro, setBairro] = useState("")
  const [negocio, setNegocio] = useState("todos")
  const [valor, setValor] = useState("sem-teto")
  const [quartos, setQuartos] = useState("qualquer")

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setLista(null)
    setErro(null)
    void lerAlertas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setLista(lidas)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        if (sessaoVencida(falha)) setErro("sessao")
        else if (acessoNegado(falha)) setErro("negado")
        else setErro("falhou")
      })
    return () => controle.abort()
  }, [rodada])

  const carregando = lista === null && erro === null
  const alertas = lista ?? []

  const abrirNovo = () => {
    setMensagem(null)
    setEditandoId(null)
    setNome("")
    setBairro("")
    setNegocio("todos")
    setValor("sem-teto")
    setQuartos("qualquer")
    setFormAberto(true)
  }

  const abrirEdicao = (alerta: AlertaDeImovel) => {
    setMensagem(null)
    setEditandoId(alerta.id)
    setNome(alerta.nome)
    setBairro(alerta.bairro ?? "")
    setNegocio(alerta.tipoNegocio ?? "todos")
    setValor(alerta.valorMaxCents === null ? "sem-teto" : String(alerta.valorMaxCents / 100))
    setQuartos(alerta.quartos === null ? "qualquer" : String(alerta.quartos))
    setFormAberto(true)
  }

  const fecharFormulario = () => {
    setFormAberto(false)
    setEditandoId(null)
  }

  const gravar = () => {
    if (ocupado) return
    const anterior = alertas.find((alerta) => alerta.id === editandoId) ?? null
    const criterios: CriteriosDoAlerta = {
      nome,
      bairro: bairro.trim() === "" ? null : bairro.trim(),
      tipoNegocio: negocio === "rent" || negocio === "sale" ? negocio : null,
      valorMaxCents: valor === "sem-teto" ? null : Number(valor) * 100,
      quartos: quartos === "qualquer" ? null : Number(quartos),
      // Editar os critérios não liga de volta um alerta pausado.
      ativo: anterior?.ativo ?? true,
    }
    setOcupado(true)
    setMensagem(null)
    const chamada =
      editandoId === null ? criarAlerta(criterios) : salvarAlerta(editandoId, criterios)
    void chamada
      .then((gravado) => {
        setLista((atual) => {
          const base = atual ?? []
          return editandoId === null
            ? [gravado, ...base]
            : base.map((alerta) => (alerta.id === gravado.id ? gravado : alerta))
        })
        setMensagem(editandoId === null ? "Alerta criado." : "Alerta atualizado.")
        fecharFormulario()
      })
      .catch((falha: unknown) => setMensagem(mensagemDaFalha(falha)))
      .finally(() => setOcupado(false))
  }

  const alternar = (alerta: AlertaDeImovel) => {
    if (ocupado) return
    setOcupado(true)
    setMensagem(null)
    void salvarAlerta(alerta.id, criteriosDe(alerta, !alerta.ativo))
      .then((gravado) =>
        setLista((atual) => (atual ?? []).map((item) => (item.id === gravado.id ? gravado : item))),
      )
      .catch((falha: unknown) => setMensagem(mensagemDaFalha(falha)))
      .finally(() => setOcupado(false))
  }

  const apagar = () => {
    if (alvo === null) return
    const id = alvo.id
    setOcupado(true)
    setMensagem(null)
    void apagarAlerta(id)
      .then(() => {
        setLista((atual) => (atual ?? []).filter((alerta) => alerta.id !== id))
        setMensagem("Alerta excluído.")
      })
      .catch((falha: unknown) => setMensagem(mensagemDaFalha(falha)))
      .finally(() => {
        setAlvo(null)
        setOcupado(false)
      })
  }

  const pedirExclusao = (alerta: AlertaDeImovel) => {
    setMensagem(null)
    setAlvo(alerta)
    void navegacao.abrir("confirmacao")
  }

  return (
    <section data-tela="imoveis-alertas" className="grid gap-2">
      <CabecaDePagina
        titulo="Alertas de imóvel"
        subtitulo="Avisos quando um imóvel novo atende ao que você procura."
        acao={
          <Botao icone="add" tom="tonal" data-acao="criar-alerta" onClick={abrirNovo}>
            Criar alerta
          </Botao>
        }
      />

      {mensagem === null ? null : (
        <p role="status" className="text-sm text-(--on-surface-variant)">
          {mensagem}
        </p>
      )}

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso aos alertas agora." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : alertas.length === 0 && !formAberto ? (
        <EstadoVazio
          titulo="Nenhum alerta ainda"
          texto="Escolha o que procura — alugar ou comprar, um bairro, um teto de valor — e o Bivaque avisa quando um imóvel novo encaixar."
          icone="notifications_none"
          acao={{ rotulo: "Criar alerta", aoAcionar: abrirNovo }}
        />
      ) : (
        <ul data-lista="alertas" className="grid gap-2">
          {alertas.map((alerta) => (
            <li
              key={alerta.id}
              className="rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--muted) text-(--on-surface-variant)">
                  <Icone
                    nome={alerta.ativo ? "notifications_active" : "notifications_off"}
                    className="size-6"
                  />
                </span>
                <div className="grid min-w-0 grow gap-0.5">
                  <button
                    type="button"
                    data-acao="ver-resultados"
                    data-valor={alerta.id}
                    onClick={() =>
                      void navegar({
                        to: "/imoveis",
                        search: alerta.busca,
                        replace: true,
                        state: true,
                        resetScroll: false,
                      })
                    }
                    className="text-left text-[15px] font-semibold underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
                  >
                    {alerta.nome}
                  </button>
                  <small className="text-[13px] text-(--on-surface-variant)">
                    {resumoDoAlerta(alerta)}
                  </small>
                  <small className="text-[13px] text-(--on-surface-variant)">
                    {situacaoDoAlerta(alerta)}
                  </small>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Botao
                  tom="texto"
                  icone="edit"
                  data-acao="editar-alerta"
                  data-valor={alerta.id}
                  disabled={ocupado}
                  onClick={() => abrirEdicao(alerta)}
                >
                  Editar
                </Botao>
                <Botao
                  tom="texto"
                  icone={alerta.ativo ? "notifications_off" : "notifications_active"}
                  data-acao="alternar-alerta"
                  data-valor={alerta.id}
                  disabled={ocupado}
                  onClick={() => alternar(alerta)}
                >
                  {alerta.ativo ? "Pausar" : "Ativar"}
                </Botao>
                <Botao
                  tom="perigo"
                  icone="delete"
                  data-acao="excluir-alerta"
                  data-valor={alerta.id}
                  disabled={ocupado}
                  onClick={() => pedirExclusao(alerta)}
                >
                  Excluir
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formAberto ? (
        <form
          data-formulario="alerta"
          className="grid gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            gravar()
          }}
        >
          <h2 className="text-base font-semibold">
            {editandoId === null ? "Novo alerta" : "Editar alerta"}
          </h2>

          <Campo
            id="alerta-nome"
            rotulo="Nome do alerta"
            valor={nome}
            aoMudar={setNome}
            nota="Opcional. Sem nome, ele é chamado pelo critério."
            maxLength={80}
          />

          <Campo
            id="alerta-bairro"
            rotulo="Bairro"
            valor={bairro}
            aoMudar={setBairro}
            nota="Em branco avisa sobre a cidade toda."
            maxLength={80}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Selecao
              id="alerta-negocio"
              rotulo="Negócio"
              valor={negocio}
              aoMudar={setNegocio}
              opcoes={[
                { valor: "todos", titulo: "Qualquer" },
                { valor: "rent", titulo: "Alugar" },
                { valor: "sale", titulo: "Comprar" },
              ]}
            />
            <Selecao
              id="alerta-valor"
              rotulo="Valor máximo"
              valor={valor}
              aoMudar={setValor}
              opcoes={[
                { valor: "sem-teto", titulo: "Sem teto" },
                ...opcoesNumericas(VALORES, valor === "sem-teto" ? null : Number(valor), (reais) =>
                  moeda(reais),
                ),
              ]}
            />
            <Selecao
              id="alerta-quartos"
              rotulo="Quartos"
              valor={quartos}
              aoMudar={setQuartos}
              opcoes={[
                { valor: "qualquer", titulo: "Qualquer" },
                ...opcoesNumericas(
                  QUARTOS,
                  quartos === "qualquer" ? null : Number(quartos),
                  (minimo) => `${minimo}+`,
                ),
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Botao type="submit" disabled={ocupado}>
              {editandoId === null ? "Criar alerta" : "Salvar alterações"}
            </Botao>
            <Botao tom="texto" type="button" onClick={fecharFormulario}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : null}

      <Confirmacao
        titulo="Excluir o alerta?"
        texto="Você deixa de receber avisos de imóveis novos com estes critérios. As buscas e os avisos que já chegaram ficam."
        confirmar="Excluir"
        perigo
        aoConfirmar={apagar}
      />
    </section>
  )
}
