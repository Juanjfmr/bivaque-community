"use client"

import { useLocation } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { LinhaDeAjuste, Lista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { sairDoApp } from "@/lib/dados/push"
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
import { dataLegivel, destinoDoEndereco, mensagemDaMudanca } from "@/lib/voce/cidade"
import { PreferenciasDeAvisos } from "@/src/avisos/PreferenciasDeAvisos"
import { useCasca } from "@/src/contexto/casca"
import { Avatar } from "@/src/pecas/pecas"
import { Cidade, type PedidoDeMudanca } from "@/src/voce/Cidade"
import { digitosDoCep, EdicaoDePerfil } from "@/src/voce/EdicaoDePerfil"
import { Familia } from "@/src/voce/Familia"
import { ForcaEOm } from "@/src/voce/ForcaEOm"
import { Interesses } from "@/src/voce/Interesses"

/** O que a confirmação da tela vai executar. Uma por vez: o diálogo é um só. */
type Pedido = { readonly tipo: "sair" } | ({ readonly tipo: "mudar" } & PedidoDeMudanca)

/** O contador sem leitura: traço visível e o nome que o leitor de tela anuncia. */
const INDISPONIVEL = "Contagem indisponível agora"

/**
 * Você (onda 8, F10): o hub abre no perfil e na lista "Seu Bivaque". Os
 * formulários — mudança de cidade e Força/OM — ficam atrás de linhas da lista,
 * como as Configurações do Nextdoor (Mobbin f187554e): a tela de entrada é
 * identidade e caminhos, não mecanismo.
 *
 * O nome lido aqui é a fonte única da identidade: a barra de baixo mostra o
 * avatar desta leitura (`casca.definir`), então as duas superfícies dizem a
 * mesma pessoa — a demonstração não inventa nome na barra (REGUA-002).
 */
export function Voce() {
  const navegacao = useNavegacao()
  const casca = useCasca()
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
  const [cidadeAberta, setCidadeAberta] = useState(false)
  const [forcaAberta, setForcaAberta] = useState(false)
  const busca = useLocation({ select: (linha) => linha.search as Record<string, unknown> })
  const destinoPedido = destinoDoEndereco(busca)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // O CTA "Vou me mudar para cá" da consulta a outra cidade chega como
  // `/app/voce?mudar=<id>`: o formulário abre com o destino escolhido. Id que o
  // catálogo não conhece deixa o formulário vazio — nunca uma cidade inventada.
  useEffect(() => {
    if (destinoPedido === null) return
    const controle = new AbortController()
    setCidadeAberta(true)
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
        if (controle.signal.aborted) return
        setConta(lida)
        // A identidade da barra é a da leitura do perfil, não a da demonstração.
        casca.definir({ nomeDaPessoa: lida.perfil.nome })
      })
      .catch(() => {
        if (controle.signal.aborted) return
        setErro(true)
        // Sem leitura não há identidade: a barra cai no ícone, sem nome herdado.
        casca.definir({ nomeDaPessoa: "" })
      })
    return () => controle.abort()
  }, [rodada])

  const perfil = conta?.perfil ?? null
  const carregando = conta === null && !erro

  // O rodapé do seletor de cidade da casca web traz `/app/voce#cidade` — o
  // destino é o formulário, não a linha fechada (achado 4 da revisão de
  // código). A âncora abre a linha sozinha, como o `?mudar=` já faz, e
  // aterrissa no bloco quando o perfil já está na tela.
  useEffect(() => {
    if (window.location.hash !== "#cidade") return
    setCidadeAberta(true)
    if (perfil === null) return
    document.getElementById("cidade")?.scrollIntoView({ block: "start" })
  }, [perfil])

  const gravar = (dados: { nome: string; bio: string; cep: string | null }) => {
    setSalvando(true)
    setMensagem(null)
    void (async () => {
      try {
        const gravado = await salvarPerfil({ nome: dados.nome, bio: dados.bio })
        setConta((atual) => (atual === null ? atual : { ...atual, perfil: gravado }))
        casca.definir({ nomeDaPessoa: gravado.nome })
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
        // A revogação do push corre ANTES de encerrar a sessão: depois dela o
        // DELETE voltaria 401 e a inscrição ficaria no servidor. A falha da
        // revogação não segura a saída.
        await sairDoApp(sairDaConta)
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
   * A mudança de cidade (F10), agora atrás da linha "Mudar de cidade". A
   * confirmação é a MESMA peça da saída — a sobreposição é da entrada, então
   * uma confirmação de cada vez: o pedido pendente é quem decide a copy e a
   * ação. O estado novo vem do servidor e a tela relê o resto pelo GET.
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

  const abrirCidade = () => {
    setForcaAberta(false)
    setCidadeAberta((aberto) => !aberto)
  }

  const abrirForca = () => {
    setCidadeAberta(false)
    setForcaAberta((aberto) => !aberto)
  }

  return (
    <section data-tela="voce" className="grid gap-2 md:mx-auto md:max-w-[640px] lg:max-w-[720px]">
      <CabecaDePagina titulo="Você" subtitulo="Sua conta, seus anúncios e seus ajustes." />

      {carregando ? (
        <EsqueletoDeLista linhas={1} />
      ) : erro ? (
        // A falha mora no cartão do perfil (revisão às cegas, 2): a caixa é a
        // mesma do estado de sucesso e a saída é um botão de verdade, ao lado
        // da mensagem — não um texto solto no canto da tela.
        <div
          data-aviso="perfil"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
        >
          <p role="alert" className="min-w-0 grow text-sm text-(--destructive)">
            Leitura do perfil indisponível agora.
          </p>
          <Botao
            tom="contornado"
            className="shrink-0"
            onClick={() => setRodada((atual) => atual + 1)}
          >
            Tentar de novo
          </Botao>
        </div>
      ) : perfil === null ? null : (
        <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
          <Avatar nome={perfil.nome} tamanho={56} />
          <div className="grid min-w-0 grow gap-0.5">
            <b className="text-[17px]">{perfil.nome}</b>
            {cidadeAberta ? null : (
              <p className="text-sm text-(--on-surface-variant)">
                Sua cidade é <b>{perfil.cidade.nome}</b>.
              </p>
            )}
            {perfil.bio === null || perfil.bio === undefined ? null : (
              <small className="text-(--on-surface-variant)">{perfil.bio}</small>
            )}
          </div>
          <Botao
            tom="texto"
            icone="edit"
            className="shrink-0"
            onClick={() => {
              setMensagem(null)
              setEditando((aberto) => !aberto)
            }}
          >
            {/* Em telas estreitas o rótulo visual sai e sobra o lápis (revisão
                às cegas, 12): nome e bio usam a largura; o nome acessível
                continua "Editar". */}
            <span className="max-md:sr-only">Editar</span>
          </Botao>
        </div>
      )}

      {perfil?.outbound && !cidadeAberta ? (
        <p
          data-aviso="saindo"
          className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm ring-1 ring-(--outline-variant)"
        >
          {perfil.outbound.readOnly
            ? `Você não participa mais de ${perfil.outbound.nome}. A sua cidade agora é ${perfil.cidade.nome}.`
            : `Você está saindo de ${perfil.outbound.nome}${perfil.outbound.uf === "" ? "" : `, ${perfil.outbound.uf}`}${
                perfil.outbound.endsAt === ""
                  ? ""
                  : ` — participa de lá até ${dataLegivel(perfil.outbound.endsAt)}`
              }. Uma nova mudança fica disponível depois desse prazo.`}
        </p>
      ) : null}

      {perfil !== null && perfil.localizacao.cep !== null && !perfil.distanciaDisponivel ? (
        <p
          data-aviso="cep-sem-distancia"
          className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm text-(--on-surface-variant) ring-1 ring-(--outline-variant)"
        >
          Guardamos seu CEP {perfil.localizacao.cep}, mas ainda não conseguimos localizar esse CEP
          no mapa. Por isso a distância até o seu bairro ainda não pode ser calculada.
        </p>
      ) : null}

      {editando && perfil !== null ? (
        <EdicaoDePerfil
          perfil={perfil}
          salvando={salvando}
          mensagem={mensagem}
          aoSalvar={gravar}
          aoCancelar={() => setEditando(false)}
        />
      ) : null}

      {carregando || erro ? null : <Contadores conta={conta} />}

      <Secao titulo="Seu Bivaque">
        {/* As linhas viram cartão com divisória (revisão cega R1, M11): a
            área clicável fica delimitada e o chevron mora no fim do cartão,
            não da tela. */}
        <Lista>
          <LinhaDeAjuste
            icone="bookmark"
            titulo="Salvos"
            subtitulo="Guardados para ver com calma"
            onClick={() => void navegacao.irPara("salvos")}
          />
          <LinhaDeAjuste
            icone="sell"
            titulo="Meus anúncios"
            subtitulo="Os seus e o estado de cada"
            onClick={() => void navegacao.irPara("meus-anuncios")}
          />
          <LinhaDeAjuste
            icone="notifications_active"
            titulo="Alertas de imóvel"
            subtitulo="Imóveis novos do seu interesse"
            onClick={() => void navegacao.irPara("alertas-de-imovel")}
          />
          <LinhaDeAjuste
            icone="forum"
            titulo="Minhas indicações"
            subtitulo="Suas perguntas e as respostas"
            onClick={() => void navegacao.irPara("minhas")}
          />
          <LinhaDeAjuste
            icone="build"
            titulo="Pedidos de serviço"
            subtitulo="Propostas e orçamentos"
            onClick={() => void navegacao.irPara("pedidos")}
          />
          <LinhaDeAjuste
            icone="interests"
            titulo="Interesses"
            subtitulo="Grupos que você quer ver"
            onClick={() => setInteressesAbertos(true)}
          />
          {perfil === null ? null : (
            <>
              <LinhaDeAjuste
                icone="location_on"
                titulo="Mudar de cidade"
                subtitulo="Levar sua conta para outra cidade"
                aria-expanded={cidadeAberta || undefined}
                onClick={abrirCidade}
              />
              <LinhaDeAjuste
                icone="badge"
                titulo="Força e OM"
                subtitulo="Declarar é opcional"
                aria-expanded={forcaAberta || undefined}
                onClick={abrirForca}
              />
            </>
          )}
        </Lista>
      </Secao>

      {perfil === null ? null : (
        <>
          {/* Âncora de `/app/voce#cidade`: é o destino do rodapé do seletor de
              cidade da casca web. */}
          <div id="cidade">
            {cidadeAberta ? (
              <Cidade
                perfil={perfil}
                destinoInicial={destinoDoLink?.id === perfil.cidade.id ? null : destinoDoLink}
                pendente={mudando}
                mensagem={mensagemDaCidade}
                aoPedirMudanca={(mudanca) => abrirConfirmacao({ tipo: "mudar", ...mudanca })}
              />
            ) : null}
          </div>
          {forcaAberta ? <ForcaEOm /> : null}
        </>
      )}

      {interessesAbertos ? <Interesses aoFechar={() => setInteressesAbertos(false)} /> : null}

      <Secao titulo="Família">
        <Familia />
      </Secao>

      <Secao titulo="Avisos">
        <PreferenciasDeAvisos />
      </Secao>

      <Secao titulo="Privacidade e ajuda">
        {/* Mesmo cartão do "Seu Bivaque" (revisão cega R1, M11): linha
            delimitada, chevron no fim do cartão. */}
        <Lista>
          <LinhaDeAjuste
            icone="visibility_off"
            titulo="Ocultados"
            subtitulo="O que você ocultou"
            onClick={() => void navegacao.irPara("ocultados")}
          />
          <LinhaDeAjuste
            icone="person"
            titulo="Pessoas bloqueadas"
            subtitulo="Quem não aparece para você"
            onClick={() => void navegacao.irPara("bloqueados")}
          />
          <LinhaDeAjuste
            icone="support"
            titulo="Ajuda"
            subtitulo="Perguntas frequentes e contato"
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
        </Lista>
        {falhaAoSair ? (
          <p role="alert" className="text-sm text-(--destructive)">
            Não foi possível sair agora. Você continua na sua conta — tente de novo.
          </p>
        ) : null}
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

/**
 * Os quatro contadores. `conta` nula é leitura indisponível — o mesmo estado que
 * abre o painel de erro do perfil. Falha de leitura nunca vira zero na tela; zero
 * só aparece quando a leitura de verdade devolveu zero (regra do apps/app).
 */
export function Contadores({ conta }: { conta: PerfilDaConta | null }) {
  const contagens = conta?.contagens ?? null
  return (
    <div className="grid grid-cols-4 gap-2">
      <Contador valor={contagens?.salvos ?? null} rotulo={["salvo", "salvos"]} />
      <Contador valor={contagens?.anuncios ?? null} rotulo={["anúncio", "anúncios"]} />
      <Contador valor={contagens?.perguntas ?? null} rotulo={["pergunta", "perguntas"]} />
      <Contador valor={contagens?.grupos ?? null} rotulo={["grupo", "grupos"]} />
    </div>
  )
}

function Contador({ valor, rotulo }: { valor: number | null; rotulo: readonly [string, string] }) {
  return (
    <div
      className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-2 py-3 ring-1 ring-(--outline-variant)"
      title={valor === null ? INDISPONIVEL : undefined}
    >
      <b className="text-[18px]">
        {valor ?? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{INDISPONIVEL}</span>
          </>
        )}
      </b>
      <small className="text-center text-[11.5px] text-(--on-surface-variant)">
        {valor === 1 ? rotulo[0] : rotulo[1]}
      </small>
    </div>
  )
}
