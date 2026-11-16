import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { FaixaDeContexto } from "@/components/bivaque/faixa-de-contexto"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { type ConsultaDeCidade, lerCidadeConsulta } from "@/lib/dados/cidade"
import { moeda, rotuloDeData } from "@/lib/formato"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { ICONE_DA_CATEGORIA, ROTULO_DA_CATEGORIA } from "@/src/guia/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A consulta de cidade (CIDADE-169), portada do `city-consult` da web.
 *
 * É LEITURA, e só: a regra de ler outra cidade é a aprovada pelo dono em
 * 25/09/2026 (`ADR-20260925-consulta-outra-cidade`) e já é a RLS de
 * `apps/web/app/api/app/cidade/[id]`. O que a pessoa vê é o Guia aprovado, os
 * encontros de alcance cidade e os anúncios ativos de alcance cidade daquela
 * cidade; publicar, participar e confirmar presença continuam na cidade dela —
 * por isso não há convite a publicar aqui, nem comunidades, nem perguntas.
 *
 * Cada linha abre o detalhe de sempre (`/app/guia`, `/app/evento`,
 * `/app/anuncio`), que já sabe receber quem é de fora. Mudar a SUA cidade é
 * outra coisa, com consequência: o CTA aponta para o fluxo do perfil na web
 * enquanto a transferência não pousa no app (F10-TROCA-PERFIL-PROPRIO).
 */
export function CidadeConsulta() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  useRolagemEFoco(CARGA_CONCLUIDA)

  const validacao = validarParametros("cidade", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  return (
    <section data-tela="cidade" className="grid gap-2">
      <Consulta id={id} />
    </section>
  )
}

function rotuloDaCategoria(categoria: string): string {
  return ROTULO_DA_CATEGORIA[categoria as keyof typeof ROTULO_DA_CATEGORIA] ?? "Guia"
}

function iconeDaCategoria(categoria: string): NomeDeIcone {
  return ICONE_DA_CATEGORIA[categoria as keyof typeof ICONE_DA_CATEGORIA] ?? "menu_book"
}

function Consulta({ id }: { id: string }) {
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ConsultaDeCidade | null>(null)
  const [falha, setFalha] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura por pedido da pessoa
  useEffect(() => {
    const leitura = new AbortController()
    setDados(null)
    setFalha(null)
    void lerCidadeConsulta(id, { signal: leitura.signal })
      .then((lida) => {
        if (!leitura.signal.aborted) setDados(lida)
      })
      .catch((erro: unknown) => {
        if (!leitura.signal.aborted) setFalha(erro)
      })
    return () => leitura.abort()
  }, [id, rodada])

  if (falha !== null) {
    if (falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado") {
      return <TelaIndisponivel motivo="Esta cidade não está no catálogo." />
    }
    return (
      <EstadoDeErro
        titulo="Não foi possível carregar a cidade"
        texto="Confira a conexão e tente de novo."
        aoTentar={() => setRodada((atual) => atual + 1)}
      />
    )
  }
  if (dados === null) return <EsqueletoDeLista linhas={4} />

  const vazio =
    dados.guia.length === 0 &&
    dados.encontros.length === 0 &&
    dados.desapegos.length === 0 &&
    dados.imoveis.length === 0

  return (
    <>
      <CabecaDePagina
        titulo={`${dados.cidade.nome}, ${dados.cidade.uf}`}
        subtitulo={
          dados.minha
            ? "A sua cidade: é daqui que você publica e participa."
            : "Consulta: o Guia, os encontros e os anúncios desta cidade."
        }
        acao={
          <Etiqueta tom="info" icone="location_on">
            {dados.cidade.uf}
          </Etiqueta>
        }
      />

      {dados.minha || dados.atual === null ? null : (
        <FaixaDeContexto icone="visibility" tom="nota">
          Você continua publicando e participando em {dados.atual.nome}. Para publicar aqui, mude a
          sua cidade no perfil.
        </FaixaDeContexto>
      )}

      {vazio ? (
        <EstadoVazio
          titulo={`Ainda não há nada publicado em ${dados.cidade.nome}`}
          texto="Quando os membros de lá compartilharem o Guia, encontros e anúncios, eles aparecem aqui."
        />
      ) : (
        <>
          {dados.guia.length === 0 ? null : (
            <Secao titulo="Guia de chegada">
              <Lista>
                {dados.guia.map((referencia) => (
                  <LinhaDeLista
                    key={referencia.id}
                    icone={iconeDaCategoria(referencia.categoria)}
                    titulo={referencia.nome}
                    subtitulo={rotuloDaCategoria(referencia.categoria)}
                    onClick={() =>
                      void navegacao.irPara("verbete", { parametros: { id: referencia.id } })
                    }
                  />
                ))}
              </Lista>
            </Secao>
          )}

          {dados.encontros.length === 0 ? null : (
            <Secao titulo="Próximos encontros">
              <Lista>
                {dados.encontros.map((encontro) => (
                  <LinhaDeLista
                    key={encontro.id}
                    icone="event"
                    titulo={encontro.titulo}
                    subtitulo={`${rotuloDeData(encontro.comecaEm.slice(0, 10))} · ${
                      encontro.local ?? dados.cidade.nome
                    }`}
                    onClick={() =>
                      void navegacao.irPara("evento", { parametros: { id: encontro.id } })
                    }
                  />
                ))}
              </Lista>
            </Secao>
          )}

          {dados.desapegos.length === 0 ? null : (
            <Secao titulo="Desapegos">
              <Lista>
                {dados.desapegos.map((anuncio) => (
                  <LinhaDeLista
                    key={anuncio.id}
                    icone="sell"
                    titulo={anuncio.titulo}
                    subtitulo={anuncio.bairro ?? undefined}
                    fim={
                      anuncio.precoCents === null ? undefined : (
                        <Etiqueta tom="neutro">{moeda(anuncio.precoCents / 100)}</Etiqueta>
                      )
                    }
                    onClick={() =>
                      void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                    }
                  />
                ))}
              </Lista>
            </Secao>
          )}

          {dados.imoveis.length === 0 ? null : (
            <Secao titulo="Imóveis">
              <Lista>
                {dados.imoveis.map((imovel) => (
                  <LinhaDeLista
                    key={imovel.id}
                    icone="apartment"
                    titulo={imovel.titulo}
                    subtitulo={imovel.bairro ?? undefined}
                    onClick={() =>
                      void navegacao.irPara("anuncio", { parametros: { id: imovel.id } })
                    }
                  />
                ))}
              </Lista>
            </Secao>
          )}
        </>
      )}

      {dados.minha ? null : (
        <Secao className="pb-6">
          {/* RUN-172: a transferência é do Você no app (RUN-170), e o destino
              vai na query que a tela lê. O chip do cabeçalho web usa a mesma
              porta; o 307 de `/profile` é só rede para link antigo. */}
          <a
            data-acao="mudar-para-ca"
            href={`/app/voce?mudar=${encodeURIComponent(dados.cidade.id)}`}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-(--primary) px-4 text-sm font-semibold text-(--on-primary)"
          >
            Vou me mudar para cá
          </a>
        </Secao>
      )}
    </>
  )
}
