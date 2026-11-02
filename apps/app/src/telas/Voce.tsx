"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { LinhaDeAjuste } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { registro } from "@/src/telas/comum"

/**
 * Você da onda 8 (protótipo: features/profile/views.js, renderProfile), com
 * dados de demonstração. V1: identidade, contadores e os atalhos principais.
 * Editar perfil, família, alertas e notificações ficam para o refino.
 */
export function Voce() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)

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

  const contagens = useMemo(() => {
    if (dados === null) return { salvos: 0, anuncios: 0, perguntas: 0, grupos: 0 }
    return {
      salvos: dados.anuncios.filter((anuncio) => registro(anuncio.apresentacao)["saved"] === true)
        .length,
      anuncios: dados.anuncios.filter((anuncio) => registro(anuncio.apresentacao)["mine"] === true)
        .length,
      perguntas: dados.perguntas.filter(
        (pergunta) => registro(pergunta.apresentacao)["mine"] === true,
      ).length,
      grupos: dados.grupos.filter((grupo) => registro(grupo.apresentacao)["on"] === true).length,
    }
  }, [dados])

  const nome = casca.nomeDaPessoa === "" ? "Você" : casca.nomeDaPessoa

  return (
    <section data-tela="voce" className="grid gap-2">
      <CabecaDePagina titulo="Você" subtitulo="Sua conta, seus anúncios e seus ajustes." />

      {erro ? <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} /> : null}

      <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-(--secondary-container) text-lg font-semibold">
          {iniciais(nome)}
        </span>
        <span className="grid gap-0.5">
          <b className="text-[17px]">{nome}</b>
          <small className="text-(--on-surface-variant)">
            {casca.cidade} · {erro ? "sem dados agora" : "perfil de demonstração"}
          </small>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Contador valor={contagens.salvos} rotulo="salvos" />
        <Contador valor={contagens.anuncios} rotulo="anúncios" />
        <Contador valor={contagens.perguntas} rotulo="perguntas" />
        <Contador valor={contagens.grupos} rotulo="grupos" />
      </div>

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
        </div>
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
            icone="delete"
            titulo="Apagar a conta"
            subtitulo="Remova seus dados do Bivaque"
            onClick={() => void navegacao.irPara("apagar-conta")}
          />
        </div>
      </Secao>
    </section>
  )
}

function Contador({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-2 py-3 ring-1 ring-(--outline-variant)">
      <b className="text-[18px]">{valor}</b>
      <small className="text-center text-[11.5px] text-(--on-surface-variant)">{rotulo}</small>
    </div>
  )
}
