import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { type ListaDeNegocios, lerNegocios } from "@/lib/dados/negocios"
import { useEntradaDaTela, useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "./FalhaDaLeitura"

export function Negocios() {
  const navegacao = useNavegacao()
  const entrada = useEntradaDaTela()
  const categoria = entrada.filtros["categoria-negocio"] ?? ""
  const [dados, setDados] = useState<ListaDeNegocios | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const controle = useRef<AbortController | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura por pedido da pessoa
  useEffect(() => {
    const leitura = new AbortController()
    controle.current = leitura
    setDados(null)
    setErro(null)
    setMais(false)
    setErroMais(false)
    void lerNegocios({ categoria, signal: leitura.signal })
      .then((lidos) => {
        if (!leitura.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!leitura.signal.aborted) setErro(falha)
      })
    return () => leitura.abort()
  }, [categoria, rodada])

  async function carregarMais() {
    const leitura = controle.current
    if (dados === null || dados.proximo === null || mais || leitura === null) return
    setMais(true)
    setErroMais(false)
    try {
      const lidos = await lerNegocios({ categoria, depois: dados.proximo, signal: leitura.signal })
      if (!leitura.signal.aborted)
        setDados({ ...lidos, negocios: [...dados.negocios, ...lidos.negocios] })
    } catch {
      if (!leitura.signal.aborted) setErroMais(true)
    } finally {
      if (!leitura.signal.aborted) setMais(false)
    }
  }

  return (
    <section data-tela="negocios" className="grid gap-2">
      <CabecaDePagina
        titulo="Negócios locais"
        subtitulo={
          dados === null
            ? "Serviços da sua cidade."
            : `O que a comunidade de ${dados.cidade} está anunciando.`
        }
        acao={
          <Botao tom="texto" onClick={() => void navegacao.irPara("pedidos")}>
            Meus pedidos
          </Botao>
        }
      />
      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : (
        <>
          <ChipsDeFiltro
            rotulo="Categorias de negócios"
            valor={categoria || "todas"}
            itens={[
              { id: "todas", rotulo: "Todas" },
              ...dados.categorias.map((item) => ({ id: item.id, rotulo: item.nome })),
            ]}
            aoEscolher={(id) =>
              void navegacao.atualizar({
                filtros: { "categoria-negocio": id === "todas" ? "" : id },
              })
            }
          />
          {dados.negocios.length === 0 ? (
            <EstadoVazio
              titulo="Ainda sem negócios cadastrados"
              texto="Quando um negócio desta categoria estiver disponível na sua cidade, ele aparece aqui."
              icone="storefront"
            />
          ) : (
            <>
              <p className="text-sm text-(--on-surface-variant)">
                {dados.negocios.length} {dados.negocios.length === 1 ? "negócio" : "negócios"} em{" "}
                {dados.cidade}
              </p>
              <Grade formato="cartoes">
                {dados.negocios.map((negocio) => (
                  <CartaoDeNegocio
                    key={negocio.id}
                    negocio={{
                      id: negocio.id,
                      nome: negocio.nome,
                      categoria: negocio.categoriaNome,
                      cidade: dados.cidade,
                      salvo: salvos.has(negocio.id),
                    }}
                    aoAbrir={() =>
                      void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                    }
                    aoSalvar={() =>
                      setSalvos((atual) => {
                        const proximos = new Set(atual)
                        if (proximos.has(negocio.id)) proximos.delete(negocio.id)
                        else proximos.add(negocio.id)
                        return proximos
                      })
                    }
                  />
                ))}
              </Grade>
            </>
          )}
          {erroMais ? (
            <p role="alert" className="text-sm text-(--destructive)">
              Não foi possível carregar mais negócios. Os anteriores continuam aqui.
            </p>
          ) : null}
          {dados.proximo === null ? null : (
            <Botao tom="contornado" disabled={mais} onClick={() => void carregarMais()}>
              {mais ? "Carregando…" : erroMais ? "Tentar de novo" : "Ver mais negócios"}
            </Botao>
          )}
        </>
      )}
    </section>
  )
}
