"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Capa } from "@/components/bivaque/capa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { buscarNegocio, type Negocio as FichaDoNegocio } from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { FormularioDePedido } from "@/src/negocios/FormularioDePedido"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

export function Negocio() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const navegacao = useNavegacao()
  const [negocio, setNegocio] = useState<FichaDoNegocio | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [salvo, setSalvo] = useState(false)
  const { aberto: pedindo, aoMudarAberto: setPedindo } =
    useSobreposicaoDaEntrada("contato-interesse")

  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setNegocio(null)
    setErro(null)
    setSalvo(false)
    void buscarNegocio(id, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setNegocio(lido)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [id, rodada])

  const validacao = validarParametros("negocio", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  return (
    <section data-tela="negocio" className="grid gap-2">
      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : negocio === null ? (
        <EsqueletoDeLista linhas={3} />
      ) : (
        <>
          {negocio.foto === null ? null : (
            <Capa
              fonte={negocio.foto}
              alt={negocio.fotoDescricao ?? negocio.nome}
              className="rounded-2xl"
            />
          )}
          <div className="grid gap-2 px-1">
            <Etiqueta tom="neutro">{negocio.categoriaNome}</Etiqueta>
            <h1
              id="titulo-da-tela"
              data-titulo-da-tela
              tabIndex={-1}
              className="text-[24px] leading-8"
            >
              {negocio.nome}
            </h1>
            <p className="text-sm text-(--on-surface-variant)">
              {negocio.categoriaNome} · {negocio.cidade}
            </p>
          </div>
          <Secao titulo="Como pode ajudar">
            <p className="text-[15px] leading-6">
              {negocio.descricao ?? "O responsável ainda não completou a descrição."}
            </p>
          </Secao>
          {negocio.servicos.length === 0 ? null : (
            <Secao titulo="Serviços">
              <ul className="flex flex-wrap gap-2">
                {negocio.servicos.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-h-9 items-center gap-1.5 rounded-full bg-(--surface-lowest) px-3 text-sm ring-1 ring-(--outline-variant)"
                  >
                    <Icone nome="check" className="size-4 text-(--primary)" />
                    {item.titulo}
                  </li>
                ))}
              </ul>
            </Secao>
          )}
          <Secao titulo="Pedir um serviço">
            <p className="text-sm text-(--on-surface-variant)">
              Descreva o que precisa. Valores e pagamento são combinados entre vocês.
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                icone="request_quote"
                disabled={!negocio.podePedir}
                onClick={() => setPedindo(true)}
              >
                Pedir orçamento
              </Botao>
              <Botao
                tom="contornado"
                icone={salvo ? "bookmark" : "bookmark_border"}
                aria-pressed={salvo}
                onClick={() => setSalvo((atual) => !atual)}
              >
                {salvo ? "Salvo nesta visita" : "Salvar negócio"}
              </Botao>
              <Botao tom="texto" onClick={() => void navegacao.irPara("pedidos")}>
                Meus pedidos
              </Botao>
            </div>
            {negocio.podePedir ? null : (
              <p className="text-sm text-(--on-surface-variant)">
                Esta é a sua ficha. Os pedidos de serviço são enviados a outros negócios.
              </p>
            )}
          </Secao>
          {pedindo && negocio.podePedir ? (
            <FormularioDePedido
              key={negocio.id}
              negocioId={negocio.id}
              nome={negocio.nome}
              aoFechar={() => setPedindo(false)}
              aoSalvar={(pedidoId) =>
                void navegacao.irPara("pedido", { parametros: { id: pedidoId } })
              }
            />
          ) : null}
        </>
      )}
    </section>
  )
}
