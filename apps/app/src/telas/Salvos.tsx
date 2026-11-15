"use client"

import { useEffect, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import type { ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { lerPublicacoesSalvas, type PublicacaoReal } from "@/lib/dados/grupos"
import { type EntradaDoGuia, lerSalvosDoGuia } from "@/lib/dados/guia"
import { type AnuncioDaLista, listarAnunciosSalvos, marcarSalvoAnuncio } from "@/lib/dados/mercado"
import { lerPerguntasSalvas, type PerguntaSalva } from "@/lib/dados/perguntas"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { foiAbortada } from "@/src/eventos/formulario"
import { ICONE_DA_CATEGORIA } from "@/src/guia/comum"
import { mensagemDaFalha } from "@/src/mercado/falha"
import { Segmentos } from "@/src/pecas/segmentos"

type AbaDosSalvos = "desapegos" | "imoveis"

const ABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
]

/**
 * Salvos: os anúncios que a pessoa guardou, as publicações de grupo, as perguntas
 * que ela segue e as referências do guia. A seção de anúncios deixou de ser
 * demonstração (LAN-F06): vem de `/api/app/mercado/salvos`, na ordem do
 * salvamento, e dessalvar aqui apaga a linha em `listing_saves` — o anúncio some
 * desta lista e o marcador dele nas outras telas volta a "não salvo". As demais
 * seções já vinham das rotas da sessão.
 */
export function Salvos() {
  const navegacao = useNavegacao()
  const [aba, setAba] = useState<AbaDosSalvos>("desapegos")
  const [anuncios, setAnuncios] = useState<readonly AnuncioDaLista[] | null>(null)
  const [erroDosAnuncios, setErroDosAnuncios] = useState(false)
  const [rodadaDosAnuncios, setRodadaDosAnuncios] = useState(0)
  const [avisoDosAnuncios, setAvisoDosAnuncios] = useState<string | null>(null)
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

  // Uma página por aba basta para a tela; o cursor da rota cobre quem guardar
  // mais que isso.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setAnuncios(null)
    setErroDosAnuncios(false)
    void listarAnunciosSalvos(
      { tipo: aba === "imoveis" ? "property" : "item", limite: 50 },
      { signal: controle.signal },
    )
      .then((lista) => {
        if (!controle.signal.aborted) setAnuncios(lista.anuncios)
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
    void lerSalvosDoGuia({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setGuia(lidas)
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
    void lerPublicacoesSalvas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPublicacoes(lidas)
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
    void lerPerguntasSalvas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPerguntas(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDasPerguntas(true)
      })
    return () => controle.abort()
  }, [rodadaDasPerguntas])

  /** Dessalvar daqui apaga a linha no banco; a linha da tela sai na hora. */
  async function dessalvar(id: string) {
    const anterior = anuncios
    setAvisoDosAnuncios(null)
    setAnuncios((atual) => (atual === null ? atual : atual.filter((anuncio) => anuncio.id !== id)))
    try {
      await marcarSalvoAnuncio(id, false)
    } catch (falha: unknown) {
      setAnuncios(anterior)
      if (!foiAbortada(falha)) setAvisoDosAnuncios(mensagemDaFalha(falha, "salvar"))
    }
  }

  const imoveis = aba === "imoveis"

  return (
    <section data-tela="salvos" className="grid gap-2">
      <CabecaDePagina
        titulo="Salvos"
        subtitulo="Anúncios e referências do guia guardados para ver com calma."
      />

      <section data-salvos="anuncios" className="grid gap-2">
        <Segmentos
          itens={ABAS}
          valor={aba}
          aoEscolher={(escolhida) => setAba(escolhida === "imoveis" ? "imoveis" : "desapegos")}
          rotulo="Seções dos salvos"
          grupo="salvos"
        />

        {avisoDosAnuncios === null ? null : (
          <p role="alert" className="text-sm text-(--destructive)">
            {avisoDosAnuncios}
          </p>
        )}

        {erroDosAnuncios ? (
          <EstadoDeErro
            titulo="Não foi possível carregar seus anúncios salvos"
            aoTentar={() => setRodadaDosAnuncios((atual) => atual + 1)}
          />
        ) : anuncios === null ? (
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
        ) : (
          <Grade formato="cartoes">
            {anuncios.map((anuncio) => (
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
                aoSalvar={() => void dessalvar(anuncio.id)}
                aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
              />
            ))}
          </Grade>
        )}
      </section>

      <section data-salvos="publicacoes" className="grid gap-2">
        <h2 className="text-[17px]">Publicações salvas</h2>
        {erroDasPublicacoes ? (
          <EstadoDeErro
            titulo="Não foi possível carregar suas publicações"
            aoTentar={() => setRodadaDasPublicacoes((atual) => atual + 1)}
          />
        ) : publicacoes === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : publicacoes.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhuma publicação salva ainda. Toque em Salvar publicação no menu de uma publicação de
            grupo.
          </p>
        ) : (
          <Lista>
            {publicacoes.map((publicacao) => (
              <LinhaDeLista
                key={publicacao.id}
                icone="forum"
                titulo={publicacao.texto}
                subtitulo={publicacao.autor || "Membro do grupo"}
                tituloMultilinha
                onClick={() =>
                  void navegacao.irPara("publicacao", { parametros: { id: publicacao.id } })
                }
              />
            ))}
          </Lista>
        )}
      </section>

      <section data-salvos="perguntas" className="grid gap-2">
        <h2 className="text-[17px]">Perguntas que você segue</h2>
        {erroDasPerguntas ? (
          <EstadoDeErro
            titulo="Não foi possível carregar suas perguntas"
            aoTentar={() => setRodadaDasPerguntas((atual) => atual + 1)}
          />
        ) : perguntas === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : perguntas.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhuma pergunta seguida ainda. Toque em Seguir respostas em uma pergunta para
            acompanhar as respostas dela.
          </p>
        ) : (
          <Lista>
            {perguntas.map((pergunta) => (
              <LinhaDeLista
                key={pergunta.id}
                icone="forum"
                titulo={pergunta.titulo}
                subtitulo={pergunta.resolvida ? "Resolvida" : pergunta.assunto}
                tituloMultilinha
                onClick={() =>
                  void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                }
              />
            ))}
          </Lista>
        )}
      </section>

      <section data-salvos="guia" className="grid gap-2">
        <h2 className="text-[17px]">Referências do guia</h2>
        {erroDoGuia ? (
          <EstadoDeErro
            titulo="Não foi possível carregar suas referências"
            aoTentar={() => setRodadaDoGuia((atual) => atual + 1)}
          />
        ) : guia === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : guia.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhuma referência do guia salva ainda.
          </p>
        ) : (
          <Lista>
            {guia.map((entrada) => (
              <LinhaDeLista
                key={entrada.id}
                icone={ICONE_DA_CATEGORIA[entrada.categoria]}
                titulo={entrada.nome}
                subtitulo={entrada.descricao}
                onClick={() => void navegacao.irPara("verbete", { parametros: { id: entrada.id } })}
              />
            ))}
          </Lista>
        )}
      </section>
    </section>
  )
}
