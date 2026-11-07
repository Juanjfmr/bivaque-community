"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { LinhaDeAjuste } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { lerPerfil, type PerfilDaConta, salvarPerfil } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { PreferenciasDeAvisos } from "@/src/avisos/PreferenciasDeAvisos"
import { EdicaoDePerfil } from "@/src/voce/EdicaoDePerfil"
import { Familia } from "@/src/voce/Familia"

/**
 * Você (onda 8, F10): identidade, contadores e os atalhos principais, agora
 * lidos da conta de verdade (`/api/app/voce`) em vez da demonstração. O desenho
 * é o aprovado; o que mudou foi a fonte do dado e a edição do próprio perfil.
 */
export function Voce() {
  const navegacao = useNavegacao()
  const [conta, setConta] = useState<PerfilDaConta | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)

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

  const gravar = (dados: { nome: string; bio: string }) => {
    setSalvando(true)
    setMensagem(null)
    void salvarPerfil(dados)
      .then((gravado) => {
        setConta((atual) => (atual === null ? atual : { ...atual, perfil: gravado }))
        setEditando(false)
      })
      .catch((falha: unknown) => {
        setMensagem(
          falha instanceof FalhaDaApi && falha.mensagem !== null
            ? falha.mensagem
            : "Não foi possível salvar. Tente de novo.",
        )
      })
      .finally(() => setSalvando(false))
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
              {perfil === null ? "perfil indisponível agora" : perfil.cidade}
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
