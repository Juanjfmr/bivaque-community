"use client"

import { useLocation } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { LinhaDeAjuste } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type CidadeDoCatalogo,
  cidadeDoLink,
  declararMudancaDeCidade,
  lerPerfil,
  type PerfilDaConta,
  sairDaConta,
  salvarLocalizacao,
  salvarPerfil,
} from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { dataLegivel, destinoDoEndereco, mensagemDaMudanca } from "@/lib/voce/cidade"
import { PreferenciasDeAvisos } from "@/src/avisos/PreferenciasDeAvisos"
import { Cidade, type PedidoDeMudanca } from "@/src/voce/Cidade"
import { digitosDoCep, EdicaoDePerfil } from "@/src/voce/EdicaoDePerfil"
import { Familia } from "@/src/voce/Familia"
import { ForcaEOm } from "@/src/voce/ForcaEOm"
import { Interesses } from "@/src/voce/Interesses"

/** O que a confirmação da tela vai executar. Uma por vez: o diálogo é um só. */
type Pedido = { readonly tipo: "sair" } | ({ readonly tipo: "mudar" } & PedidoDeMudanca)

/**
 * Você (onda 8, F10): identidade, contadores e os atalhos principais, agora
 * lidos da conta de verdade (`/api/app/voce`) em vez da demonstração. O desenho
 * é o aprovado; o que mudou foi a fonte do dado e a edição do próprio perfil.
 */
export function Voce() {
  const navegacao = useNavegacao()
  // A folha de interesses mora nesta tela: ela lê e grava os grupos da cidade
  // da sessão, e a porta natural é a linha abaixo.
  const { aberto: interessesAbertos, aoMudarAberto: setInteressesAbertos } =
    useSobreposicaoDaEntrada("interesses")
  const [conta, setConta] = useState<PerfilDaConta | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [saindo, setSaindo] = useState(false)
  const [falhaAoSair, setFalhaAoSair] = useState(false)
  const [mudando, setMudando] = useState(false)
  const [mensagemDaCidade, setMensagemDaCidade] = useState<string | null>(null)
  const [destinoDoLink, setDestinoDoLink] = useState<CidadeDoCatalogo | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const busca = useLocation({ select: (linha) => linha.search as Record<string, unknown> })
  const destinoPedido = destinoDoEndereco(busca)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // O CTA "Vou me mudar para cá" da consulta a outra cidade chega como
  // `/app/voce?mudar=<id>`: o formulário abre com o destino escolhido. Id que o
  // catálogo não conhece deixa o formulário vazio — nunca uma cidade inventada.
  useEffect(() => {
    if (destinoPedido === null) return
    const controle = new AbortController()
    void cidadeDoLink(destinoPedido, { signal: controle.signal })
      .then((cidade) => {
        if (!controle.signal.aborted) setDestinoDoLink(cidade)
      })
      .catch(() => {
        if (!controle.signal.aborted) setDestinoDoLink(null)
      })
    return () => controle.abort()
  }, [destinoPedido])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setConta(null)
    setErro(false)
    void lerPerfil({ signal: controle.signal })
      .then((lida) => {
        if (!controle.signal.aborted) setConta(lida)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  const perfil = conta?.perfil ?? null
  const carregando = conta === null && !erro
  const nome = perfil?.nome ?? "Você"
  const contagens = conta?.contagens ?? { salvos: 0, anuncios: 0, perguntas: 0, grupos: 0 }

  const gravar = (dados: { nome: string; bio: string; cep: string | null }) => {
    setSalvando(true)
    setMensagem(null)
    void (async () => {
      try {
        const gravado = await salvarPerfil({ nome: dados.nome, bio: dados.bio })
        setConta((atual) => (atual === null ? atual : { ...atual, perfil: gravado }))
        const cepAnterior = digitosDoCep(perfil?.localizacao.cep ?? "")
        if (dados.cep !== cepAnterior) {
          try {
            const salva = await salvarLocalizacao(dados.cep)
            setConta((atual) =>
              atual === null ? atual : { ...atual, perfil: { ...atual.perfil, ...salva } },
            )
          } catch (falha: unknown) {
            // O perfil acima já está gravado; só a localização não foi. Fechar
            // o formulário aqui seria fingir sucesso.
            setMensagem(mensagemDaLocalizacao(falha))
            return
          }
        }
        setEditando(false)
      } catch (falha: unknown) {
        setMensagem(
          falha instanceof FalhaDaApi && falha.mensagem !== null
            ? falha.mensagem
            : "Não foi possível salvar. Tente de novo.",
        )
      } finally {
        setSalvando(false)
      }
    })()
  }

  /**
   * A saída (F10). A confirmação não tem estado de erro nem de espera; quem os
   * tem é esta tela: `saindo` impede o duplo clique e `falhaAoSair` é a
   * mensagem que fica. Sessão já inexistente (401) é sucesso — o que a pessoa
   * pediu já é o estado atual.
   */
  const sair = () => {
    if (saindo) return
    setSaindo(true)
    setFalhaAoSair(false)
    void (async () => {
      try {
        await sairDaConta()
        irParaEntrada()
      } catch (falha: unknown) {
        if (falha instanceof FalhaDaApi && falha.status === 401) {
          irParaEntrada()
          return
        }
        setSaindo(false)
        setFalhaAoSair(true)
      }
    })()
  }

  /**
   * A mudança de cidade (F10). A confirmação é a MESMA peça da saída — a
   * sobreposição é da entrada, então uma confirmação de cada vez: o pedido
   * pendente é quem decide a copy e a ação. O estado novo vem do servidor e a
   * tela relê o resto (contagens e cidade) pelo GET.
   */
  const mudarCidade = (alvo: PedidoDeMudanca) => {
    if (mudando) return
    setMudando(true)
    setMensagemDaCidade(null)
    void (async () => {
      try {
        const gravado = await declararMudancaDeCidade(alvo.destino, alvo.prazo)
        setConta((atual) => (atual === null ? atual : { ...atual, perfil: gravado }))
        setDestinoDoLink(null)
        setRodada((atual) => atual + 1)
      } catch (falha: unknown) {
        setMensagemDaCidade(mensagemDaMudanca(falha))
      } finally {
        setMudando(false)
      }
    })()
  }

  const abrirConfirmacao = (novo: Pedido) => {
    setPedido(novo)
    void navegacao.abrir("confirmacao")
  }

  return (
    <section data-tela="voce" className="grid gap-2">
      <CabecaDePagina titulo="Você" subtitulo="Sua conta, seus anúncios e seus ajustes." />

      {erro ? <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} /> : null}

      {carregando ? (
        <EsqueletoDeLista linhas={1} />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-(--secondary-container) text-lg font-semibold">
            {iniciais(nome)}
          </span>
          <span className="grid min-w-0 grow gap-0.5">
            <b className="text-[17px]">{nome}</b>
            <small className="text-(--on-surface-variant)">
              {perfil === null ? "perfil indisponível agora" : perfil.cidade.nome}
            </small>
            {perfil?.bio === null || perfil?.bio === undefined ? null : (
              <small className="text-(--on-surface-variant)">{perfil.bio}</small>
            )}
          </span>
          {perfil === null ? null : (
            <Botao
              tom="texto"
              icone="edit"
              className="shrink-0"
              onClick={() => {
                setMensagem(null)
                setEditando((aberto) => !aberto)
              }}
            >
              Editar
            </Botao>
          )}
        </div>
      )}

      {perfil !== null && perfil.localizacao.cep !== null && !perfil.distanciaDisponivel ? (
        <p
          data-aviso="cep-sem-distancia"
          className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm text-(--on-surface-variant) ring-1 ring-(--outline-variant)"
        >
          Guardamos seu CEP {perfil.localizacao.cep}, mas ainda não conseguimos localizar esse CEP
          no mapa. Por isso a distância até o seu bairro ainda não pode ser calculada.
        </p>
      ) : null}

      {perfil === null ? null : (
        <>
          <Cidade
            perfil={perfil}
            destinoInicial={destinoDoLink?.id === perfil.cidade.id ? null : destinoDoLink}
            pendente={mudando}
            mensagem={mensagemDaCidade}
            aoPedirMudanca={(mudanca) => abrirConfirmacao({ tipo: "mudar", ...mudanca })}
          />
          <ForcaEOm />
        </>
      )}

      {editando && perfil !== null ? (
        <EdicaoDePerfil
          perfil={perfil}
          salvando={salvando}
          mensagem={mensagem}
          aoSalvar={gravar}
          aoCancelar={() => setEditando(false)}
        />
      ) : null}

      {carregando ? null : (
        <div className="grid grid-cols-4 gap-2">
          <Contador valor={contagens.salvos} rotulo={["salvo", "salvos"]} />
          <Contador valor={contagens.anuncios} rotulo={["anúncio", "anúncios"]} />
          <Contador valor={contagens.perguntas} rotulo={["pergunta", "perguntas"]} />
          <Contador valor={contagens.grupos} rotulo={["grupo", "grupos"]} />
        </div>
      )}

      <Secao titulo="Seu Bivaque">
        <div className="grid gap-2">
          <LinhaDeAjuste
            icone="bookmark"
            titulo="Salvos"
            subtitulo="Anúncios guardados para ver com calma"
            onClick={() => void navegacao.irPara("salvos")}
          />
          <LinhaDeAjuste
            icone="sell"
            titulo="Meus anúncios"
            subtitulo="Seus anúncios e o estado de cada um"
            onClick={() => void navegacao.irPara("meus-anuncios")}
          />
          <LinhaDeAjuste
            icone="notifications_active"
            titulo="Alertas de imóvel"
            subtitulo="Avisos de imóveis novos com o que você procura"
            onClick={() => void navegacao.irPara("alertas-de-imovel")}
          />
          <LinhaDeAjuste
            icone="forum"
            titulo="Minhas indicações"
            subtitulo="Perguntas que você fez e as respostas"
            onClick={() => void navegacao.irPara("minhas")}
          />
          <LinhaDeAjuste
            icone="build"
            titulo="Pedidos de serviço"
            subtitulo="Propostas e orçamentos combinados"
            onClick={() => void navegacao.irPara("pedidos")}
          />
          <LinhaDeAjuste
            icone="interests"
            titulo="Interesses"
            subtitulo="Grupos da sua cidade que você quer ver"
            onClick={() => setInteressesAbertos(true)}
          />
        </div>
      </Secao>

      {interessesAbertos ? <Interesses aoFechar={() => setInteressesAbertos(false)} /> : null}

      <Secao titulo="Família">
        <Familia />
      </Secao>

      <Secao titulo="Avisos">
        <PreferenciasDeAvisos />
      </Secao>

      <Secao titulo="Privacidade e ajuda">
        <div className="grid gap-2">
          <LinhaDeAjuste
            icone="visibility_off"
            titulo="Ocultados"
            subtitulo="O que você ocultou das suas listas"
            onClick={() => void navegacao.irPara("ocultados")}
          />
          <LinhaDeAjuste
            icone="person"
            titulo="Pessoas bloqueadas"
            subtitulo="Quem não aparece mais para você"
            onClick={() => void navegacao.irPara("bloqueados")}
          />
          <LinhaDeAjuste
            icone="support"
            titulo="Ajuda"
            subtitulo="Perguntas frequentes, contato e chamados"
            onClick={() => void navegacao.irPara("ajuda")}
          />
          <LinhaDeAjuste
            icone="lock"
            titulo="Política de privacidade"
            subtitulo="O que guardamos e por quê"
            onClick={() => void navegacao.irPara("privacidade")}
          />
          <LinhaDeAjuste
            icone="gavel"
            titulo="Código de conduta"
            subtitulo="O combinado da comunidade"
            onClick={() => void navegacao.irPara("conduta")}
          />
          <LinhaDeAjuste
            icone="logout"
            titulo="Sair da conta"
            subtitulo="Encerrar a sessão neste aparelho"
            disabled={saindo}
            onClick={() => abrirConfirmacao({ tipo: "sair" })}
          />
          <LinhaDeAjuste
            icone="delete"
            titulo="Apagar a conta"
            subtitulo="Remova seus dados do Bivaque"
            onClick={() => void navegacao.irPara("apagar-conta")}
          />
          {falhaAoSair ? (
            <p role="alert" className="text-sm text-(--destructive)">
              Não foi possível sair agora. Você continua na sua conta — tente de novo.
            </p>
          ) : null}
        </div>
      </Secao>

      <Confirmacao
        titulo={pedido?.tipo === "mudar" ? `Mudar para ${pedido.nome}?` : "Sair da conta?"}
        texto={
          pedido?.tipo === "mudar"
            ? `Até ${dataLegivel(pedido.prazo)} você continua lendo e publicando em ${
                perfil?.cidade.nome ?? "sua cidade"
              }. Depois disso a cidade de onde você está saindo fica só leitura, e uma nova mudança só fica disponível depois do prazo. Não dá para desfazer pelo app.`
            : "Você vai precisar entrar de novo com o seu e-mail. O que ainda não foi publicado aqui sai junto."
        }
        confirmar={pedido?.tipo === "mudar" ? "Mudar" : "Sair"}
        perigo
        aoConfirmar={() => {
          const atual = pedido
          setPedido(null)
          if (atual?.tipo === "mudar") mudarCidade(atual)
          else sair()
        }}
      />
    </section>
  )
}

/**
 * A entrada, e o cache local vai junto (SPA ADR §5.5): os rascunhos de criação
 * e as buscas recentes são do aparelho, não da conta que saiu. O `replace`
 * descarrega o estado do app e impede o Voltar de reabrir a tela autenticada.
 */
function irParaEntrada(): void {
  sessionStorage.clear()
  localStorage.clear()
  window.location.replace("/app/entrar")
}

/** A falha da localização dita para a pessoa, pelo motivo que o servidor deu. */
function mensagemDaLocalizacao(falha: unknown): string {
  const motivo = falha instanceof FalhaDaApi ? falha.motivoDoServidor : null
  if (motivo === "cep-nao-encontrado")
    return "Não encontramos esse CEP. Confira os oito dígitos e tente de novo."
  if (motivo === "geocodificador-indisponivel")
    return "Não conseguimos consultar o CEP agora. Tente de novo em instantes."
  return falha instanceof FalhaDaApi && falha.mensagem !== null
    ? falha.mensagem
    : "Perfil salvo, mas a localização não foi atualizada. Tente de novo."
}

function Contador({ valor, rotulo }: { valor: number; rotulo: readonly [string, string] }) {
  return (
    <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-2 py-3 ring-1 ring-(--outline-variant)">
      <b className="text-[18px]">{valor}</b>
      <small className="text-center text-[11.5px] text-(--on-surface-variant)">
        {valor === 1 ? rotulo[0] : rotulo[1]}
      </small>
    </div>
  )
}
