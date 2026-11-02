import { useEffect, useMemo, useRef, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { dadosDoApp } from "@/lib/dados"
import { moeda } from "@/lib/formato"
import { useNavegacao } from "@/lib/navegacao/react"
import { useCasca } from "@/src/contexto/casca"
import { type AnuncioVisual, apresentar, filtrarAnuncios } from "./dados"
import { FilterPanel } from "./ecomcn/filter-panel"
import type { FilterFacet, FilterState } from "./ecomcn/filter-params"
import { FilterSheet } from "./ecomcn/filter-sheet"
import { ProductGrid } from "./ecomcn/product-grid"
import "./mercado-lab.css"

export function MercadoLab() {
  const { cidade } = useCasca()
  const navegacao = useNavegacao()
  const [anuncios, setAnuncios] = useState<AnuncioVisual[] | null>(null)
  const [erro, setErro] = useState(false)
  const [tipo, setTipo] = useState("desapegos")
  const [consulta, setConsulta] = useState("")
  const [filtros, setFiltros] = useState<FilterState>({})
  const [ordem, setOrdem] = useState("recentes")
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [aberto, setAberto] = useState<AnuncioVisual | null>(null)
  const acionadorDoDetalhe = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const controle = new AbortController()
    setAnuncios(null)
    setErro(false)
    void dadosDoApp
      .lerCidade(cidade, { signal: controle.signal })
      .then((dados) => {
        if (!controle.signal.aborted) setAnuncios(dados.anuncios.map(apresentar))
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [cidade])

  const facetas = useMemo<FilterFacet[]>(() => {
    const atuais = (anuncios ?? []).filter((anuncio) => anuncio.tipo === tipo)
    const bairros = [...new Set(atuais.map((anuncio) => anuncio.neighborhood ?? ""))]
      .filter(Boolean)
      .sort()
    return [
      {
        id: "bairro",
        type: "list",
        label: "Bairro",
        options: bairros.map((bairro) => ({
          value: bairro,
          label: bairro,
          count: atuais.filter((anuncio) => anuncio.neighborhood === bairro).length,
        })),
      },
      {
        id: "preco",
        type: "list",
        label: tipo === "imoveis" ? "Aluguel por mês" : "Faixa de preço",
        options: [
          { value: "ate500", label: "Até R$ 500" },
          { value: "ate1500", label: "De R$ 500 a R$ 1.500" },
          { value: "acima1500", label: "Acima de R$ 1.500" },
        ],
      },
    ]
  }, [anuncios, tipo])
  const resultados = filtrarAnuncios(anuncios ?? [], tipo, consulta, filtros)
  if (ordem !== "recentes")
    resultados.sort((a, b) => {
      const diferenca = (a.price_cents ?? 0) - (b.price_cents ?? 0)
      return ordem === "menor" ? diferenca : -diferenca
    })
  const limpar = () => {
    setFiltros({})
    setConsulta("")
  }
  const salvar = (id: string) =>
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })

  return (
    <section className="mercado-lab" data-tela="mercado-lab">
      <div className="lab-nota">
        <span>PRÉVIA DE MERCADO</span>
        <span>Dados de demonstração · salvos só nesta prévia</span>
      </div>
      <header className="lab-cabecalho">
        <div>
          <p className="lab-local">
            <Icone nome="location_on" /> {cidade}
          </p>
          <h1>Encontre por perto.</h1>
          <p>O que a comunidade de {cidade} está anunciando.</p>
        </div>
        <Button className="lab-acao-principal" onClick={() => void navegacao.irPara("mercado")}>
          <Icone nome="chevron_right" /> Ver Mercado atual
        </Button>
      </header>

      <ToggleGroup
        type="single"
        value={tipo}
        aria-label="Seções do Mercado"
        className="lab-abas"
        onValueChange={(valor) => {
          if (valor) {
            setTipo(valor)
            setFiltros({})
          }
        }}
      >
        <ToggleGroupItem value="desapegos">
          <Icone nome="sell" /> Desapegos
        </ToggleGroupItem>
        <ToggleGroupItem value="imoveis">
          <Icone nome="apartment" /> Imóveis
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="lab-ferramentas">
        <div className="lab-busca">
          <Icone nome="search" />
          <Input
            aria-label="Buscar anúncios"
            placeholder={
              tipo === "imoveis" ? "Busque um lugar para morar" : "O que você está procurando?"
            }
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
          />
          {consulta && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              onClick={() => setConsulta("")}
            >
              <Icone nome="close" />
            </Button>
          )}
        </div>
        <div className="lab-filtro-movel">
          <FilterSheet
            facets={facetas}
            value={filtros}
            onValueChange={setFiltros}
            getResultCount={(provisorios) =>
              filtrarAnuncios(anuncios ?? [], tipo, consulta, provisorios).length
            }
            dismissBehavior="discard"
            side="bottom"
            label="Filtros"
            title="Filtrar anúncios"
            currency="BRL"
            locale="pt-BR"
            contentClassName="lab-folha-filtros"
          />
        </div>
      </div>

      <div className="lab-corpo">
        <aside className="lab-filtros" aria-label="Filtros dos anúncios">
          <FilterPanel
            facets={facetas}
            value={filtros}
            onValueChange={setFiltros}
            title="Filtros"
            locale="pt-BR"
          />
          <div className="lab-dica">
            <Icone nome="location_on" />
            <p>Perto de casa, mais fácil de combinar.</p>
            <span>O endereço exato é combinado com quem anuncia.</span>
          </div>
        </aside>
        <div className="lab-resultados">
          <div className="lab-resumo">
            <p role="status">
              {resultados.length} {resultados.length === 1 ? "anúncio" : "anúncios"} em {cidade}
            </p>
            <label>
              Ordenar por{" "}
              <select
                aria-label="Ordenar anúncios"
                value={ordem}
                onChange={(evento) => setOrdem(evento.target.value)}
              >
                <option value="recentes">Mais recentes</option>
                <option value="menor">Menor preço</option>
                <option value="maior">Maior preço</option>
              </select>
            </label>
          </div>
          {erro ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar</AlertTitle>
              <AlertDescription>Recarregue a prévia para tentar novamente.</AlertDescription>
            </Alert>
          ) : (
            <ProductGrid
              products={resultados}
              loading={anuncios === null}
              empty={
                <div className="lab-vazio">
                  <Icone nome="search_off" />
                  <h2>Nenhum anúncio com esses filtros</h2>
                  <p>Tente outro bairro, outra faixa de preço ou uma busca diferente.</p>
                  <Button variant="outline" onClick={limpar}>
                    Limpar busca e filtros
                  </Button>
                </div>
              }
              renderCard={(anuncio) => (
                <Card className="lab-cartao" data-anuncio={anuncio.id}>
                  <div className="lab-foto">
                    <button
                      type="button"
                      aria-label={`Ver ${anuncio.title}`}
                      onClick={(evento) => {
                        acionadorDoDetalhe.current = evento.currentTarget
                        setAberto(anuncio)
                      }}
                    >
                      {anuncio.imagem ? (
                        <img src={anuncio.imagem} alt={anuncio.title} loading="lazy" />
                      ) : (
                        <Icone nome="photo_camera" />
                      )}
                    </button>
                    <Badge className="lab-selo">
                      {anuncio.tipo === "imoveis" ? "Aluguel" : "Desapego"}
                    </Badge>
                    <Button
                      className="lab-salvar"
                      variant="secondary"
                      size="icon"
                      aria-label={`${salvos.has(anuncio.id) ? "Remover dos salvos" : "Salvar"}: ${anuncio.title}`}
                      aria-pressed={salvos.has(anuncio.id)}
                      onClick={() => salvar(anuncio.id)}
                    >
                      <Icone nome="bookmark" preenchido={salvos.has(anuncio.id)} />
                    </Button>
                  </div>
                  <CardContent className="lab-cartao-corpo">
                    <p className="lab-preco">
                      {moeda((anuncio.price_cents ?? 0) / 100)}
                      {anuncio.tipo === "imoveis" && <span> / mês</span>}
                    </p>
                    <h2>
                      <button
                        type="button"
                        onClick={(evento) => {
                          acionadorDoDetalhe.current = evento.currentTarget
                          setAberto(anuncio)
                        }}
                      >
                        {anuncio.title}
                      </button>
                    </h2>
                    <p className="lab-bairro">
                      <Icone nome="location_on" />
                      {anuncio.neighborhood} · {cidade}
                    </p>
                    <div className="lab-vendedor">
                      <span className="lab-avatar" aria-hidden="true">
                        {anuncio.vendedor.slice(0, 1)}
                      </span>
                      <span>{anuncio.vendedor}</span>
                      <Icone nome="chevron_right" />
                    </div>
                  </CardContent>
                </Card>
              )}
            />
          )}
          {!erro && resultados.length > 0 && (
            <div className="lab-fim">
              <Icone nome="sell" />
              <div>
                <strong>Tem algo que pode servir a outra família?</strong>
                <p>O que já foi útil para você pode começar uma nova história por aqui.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={aberto !== null}
        onOpenChange={(valor) => {
          if (!valor) setAberto(null)
        }}
      >
        <SheetContent
          side="right"
          className="lab-detalhe"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault()
            acionadorDoDetalhe.current?.focus()
          }}
        >
          <SheetHeader>
            <SheetTitle>{aberto?.title}</SheetTitle>
            <SheetDescription>
              {aberto?.neighborhood} · {cidade}
            </SheetDescription>
          </SheetHeader>
          {aberto && (
            <div className="lab-detalhe-corpo">
              {aberto.imagem && <img src={aberto.imagem} alt={aberto.title} />}
              <p className="lab-preco">{moeda((aberto.price_cents ?? 0) / 100)}</p>
              <p>{aberto.description}</p>
              <p className="lab-bairro">Anunciado por {aberto.vendedor}</p>
              <Button
                className="lab-acao-principal"
                onClick={() => void navegacao.irPara("anuncio", { parametros: { id: aberto.id } })}
              >
                Ver anúncio no app
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <footer className="lab-origem">
        Bancada visual · grade e filtros adaptados de ecomcn · componentes shadcn/ui · fotos do
        protótipo
      </footer>
    </section>
  )
}
