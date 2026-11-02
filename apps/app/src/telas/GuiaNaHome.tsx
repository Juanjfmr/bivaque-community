"use client"

import { useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CartaoVitrineAnuncio, CartaoVitrineNegocio } from "@/components/bivaque/cartao-vitrine"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import type { DadosDaCidade } from "@/lib/dados"
import { iconeDeDado } from "@/lib/icones"
import { BAIRROS_MANAUS, OMS_MANAUS } from "@/src/telas/dados-da-guarnicao"

type Abrir = (id: string) => void
type Props = {
  dados: DadosDaCidade
  cidade: string
  salvos: ReadonlySet<string>
  aoSalvar: Abrir
  aoAbrirNegocio: Abrir
  aoAbrirAnuncio: Abrir
  aoAbrirGuia: () => void
  aoAbrirNegocios: () => void
  aoAbrirImoveis: () => void
}

type Classificavel = DadosDaCidade["negocios"][number]
type Anunciavel = DadosDaCidade["anuncios"][number]

function registro(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}
}
function texto(v: unknown, reserva = ""): string {
  return typeof v === "string" ? v : reserva
}
function numero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}
function primeiroBairro(v: unknown): string | null {
  return Array.isArray(v) && typeof v[0] === "string" ? v[0] : null
}
function categoriasDoNegocio(item: Classificavel): string[] {
  const categoria = (item.category ?? "").toLowerCase()
  if (categoria.includes("saude")) return ["saude", "familia"]
  if (categoria.includes("pets")) return ["pets", "familia"]
  if (categoria.includes("mudanca")) return ["mudanca", "casa"]
  if (categoria.includes("alimentacao") || categoria.includes("educacao")) return ["familia"]
  if (categoria.includes("automotivo")) return ["automotivo"]
  return ["casa"]
}
const FILTROS: readonly ItemDeFiltro[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "familia", rotulo: "Família" },
  { id: "casa", rotulo: "Casa" },
  { id: "saude", rotulo: "Saúde" },
  { id: "pets", rotulo: "Pets" },
  { id: "mudanca", rotulo: "Mudança" },
  { id: "automotivo", rotulo: "Carro" },
]

/** Favoritos são derivados das indicações nos dados, nunca de avaliações inventadas. */
export function FavoritosDaVizinhanca({
  dados, cidade, salvos, aoSalvar, aoAbrirNegocio, aoAbrirNegocios,
}: Pick<Props, "dados" | "cidade" | "salvos" | "aoSalvar" | "aoAbrirNegocio" | "aoAbrirNegocios">) {
  const [categoria, setCategoria] = useState("todos")
  const [bairro, setBairro] = useState("todos")
  const bairros = useMemo(() => {
    const nomes = new Set<string>()
    for (const negocio of dados.negocios) {
      const hoods = registro(negocio.apresentacao)["hoods"]
      if (Array.isArray(hoods)) {
        for (const nome of hoods) {
          if (typeof nome === "string" && !/toda manaus|interestadual|on-line/i.test(nome)) nomes.add(nome)
        }
      }
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [dados.negocios])

  const itens = useMemo(() => dados.negocios
    .map(negocio => ({ negocio, meta: registro(negocio.apresentacao) }))
    .filter(({ negocio, meta }) => {
      const hoods = meta["hoods"]
      const atendeBairro = bairro === "todos" ||
        (Array.isArray(hoods) && (hoods.includes(bairro) || hoods.includes("Toda Manaus")))
      return atendeBairro && (categoria === "todos" || categoriasDoNegocio(negocio).includes(categoria))
    })
    .sort((a, b) =>
      Number(a.meta["spon"] === true) - Number(b.meta["spon"] === true) ||
      numero(b.meta["recN"]) - numero(a.meta["recN"])
    ), [dados.negocios, bairro, categoria])

  return (
    <Secao
      titulo="Favoritos da vizinhança"
      acoes={<Botao tom="texto" onClick={aoAbrirNegocios}>Ver negócios</Botao>}
    >
      <p className="text-sm text-(--on-surface-variant)">
        Descubra lugares e serviços pelas indicações da comunidade de {cidade}.
      </p>
      <div className="grid min-w-0 gap-2">
        <ChipsDeFiltro itens={FILTROS} valor={categoria} aoEscolher={setCategoria} rotulo="Categoria dos favoritos" />
        <label className="flex items-center gap-2 text-sm text-(--on-surface-variant)">
          <span>Em</span>
          <select
            aria-label="Filtrar indicações por bairro"
            value={bairro}
            onChange={e => setBairro(e.target.value)}
            className="min-h-11 min-w-0 max-w-52 rounded-xl border border-(--outline-variant) bg-(--surface-lowest) px-3 text-(--on-surface)"
          >
            <option value="todos">Toda a cidade</option>
            {bairros.map(nome => <option key={nome} value={nome}>{nome}</option>)}
          </select>
        </label>
      </div>
      {itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma indicação com esses filtros"
          texto="Experimente outra categoria ou bairro."
          icone="storefront"
        />
      ) : (
        <Grade formato="carrossel-mobile">
          {itens.slice(0, 5).map(({ negocio, meta }) => (
            <CartaoVitrineNegocio
              key={negocio.id}
              negocio={{
                id: negocio.id,
                fonte: texto(meta["imagem"]),
                nome: texto(meta["name"], negocio.display_name),
                categoria: texto(meta["cat"], negocio.category ?? ""),
                bairro: primeiroBairro(meta["hoods"]),
                cidade,
                indicacoes: numero(meta["recN"]),
                patrocinado: meta["spon"] === true,
                aguardando: meta["claimed"] === false,
                salvo: salvos.has(negocio.id),
              }}
              aoSalvar={() => aoSalvar(negocio.id)}
              aoAbrir={() => aoAbrirNegocio(negocio.id)}
            />
          ))}
        </Grade>
      )}
    </Secao>
  )
}

function detalhesDoImovel(item: Anunciavel): string[] {
  const detalhes: string[] = []
  const qtde = item.title.match(/\b(\d+)\s+quartos?\b/i)?.[1]
  const area = item.description?.match(/\b(\d+(?:[.,]\d+)?)\s*m²/i)?.[1]
  const vagas = item.description?.match(/\b(\d+)\s+vagas?\b/i)?.[1]
  if (qtde) detalhes.push(qtde + " quartos")
  if (area) detalhes.push(area + " m²")
  if (vagas) detalhes.push(vagas + " vagas")
  return detalhes
}
function condominioInformado(item: Anunciavel): string | null {
  const achado = item.description?.match(/condomínio\s+de\s+R\$\s*([\d.,]+)/i)?.[1]
  return achado ?? null
}

export function MoradiaNaCidade({
  dados, cidade, salvos, aoSalvar, aoAbrirAnuncio, aoAbrirImoveis,
}: Pick<Props, "dados" | "cidade" | "salvos" | "aoSalvar" | "aoAbrirAnuncio" | "aoAbrirImoveis">) {
  const imoveis = dados.anuncios.filter(item =>
    item.status === "active" && (item.kind === "property" || item.kind === "imovel")
  )
  return (
    <Secao
      titulo="Imóveis para morar"
      acoes={<Botao tom="texto" onClick={aoAbrirImoveis}>Ver imóveis</Botao>}
    >
      <p className="text-sm text-(--on-surface-variant)">
        Aluguéis anunciados em {cidade}. Confira condições diretamente com o anunciante.
      </p>
      {imoveis.length === 0 ? (
        <EstadoVazio
          titulo="Ainda sem imóveis nesta cidade"
          texto="Veja o catálogo ou pergunte à comunidade sobre moradia."
          icone="apartment"
        />
      ) : (
        <Grade formato="carrossel-mobile">
          {imoveis.map(item => {
            const meta = registro(item.apresentacao)
            const condominio = condominioInformado(item)
            return <CartaoVitrineAnuncio
              key={item.id}
              anuncio={{
                id: item.id,
                fonte: texto(meta["imagem"]),
                rotulo: "Aluguel",
                porMes: true,
                titulo: item.title,
                preco: typeof item.price_cents === "number" ? item.price_cents / 100 : null,
                icone: iconeDeDado(meta["icon"]),
                meta: (item.neighborhood ?? cidade) +
                  (condominio ? " · Condomínio R$ " + condominio : " · condomínio não informado"),
                detalhes: detalhesDoImovel(item),
                salvo: salvos.has(item.id),
              }}
              aoSalvar={() => aoSalvar(item.id)}
              aoAbrir={() => aoAbrirAnuncio(item.id)}
            />
          })}
        </Grade>
      )}
    </Secao>
  )
}

/** Não cria uma segunda Home: é uma ponte curta entre a Home e o catálogo do Guia. */
export function GuiaDaCidadeNaHome({
  cidade, aoAbrirGuia, aoAbrirImoveis,
}: Pick<Props, "cidade" | "aoAbrirGuia" | "aoAbrirImoveis">) {
  const manaus = cidade.toLocaleLowerCase("pt-BR") === "manaus"
  return (
    <Secao
      titulo={"Conheça " + cidade + " antes de decidir"}
      acoes={<Botao tom="texto" onClick={aoAbrirGuia}>Abrir guia</Botao>}
    >
      <p className="text-sm text-(--on-surface-variant)">
        Informações da região para orientar a escolha de moradia e a chegada.
      </p>
      {manaus ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="min-w-0 rounded-2xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)">
            <h3 className="mb-2 text-base font-semibold">Bairros para morar</h3>
            {BAIRROS_MANAUS.slice(0, 3).map(item => (
              <div key={item.nome} className="border-b border-(--outline-variant) py-2 last:border-b-0">
                <b className="text-sm">{item.nome}</b>
                <p className="text-xs text-(--on-surface-variant)">{item.apoio}</p>
              </div>
            ))}
            <Botao tom="texto" onClick={aoAbrirImoveis}>Ver opções de moradia</Botao>
          </article>
          <article className="min-w-0 rounded-2xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)">
            <h3 className="mb-2 text-base font-semibold">Organizações militares</h3>
            {OMS_MANAUS.slice(0, 3).map(om => (
              <div key={om.id} className="flex gap-2 border-b border-(--outline-variant) py-2 last:border-b-0">
                <span className="shrink-0 text-xs font-semibold text-(--on-surface-variant)">{om.forca}</span>
                <span className="min-w-0 text-sm">{om.sigla} · {om.bairro ?? "Manaus"}</span>
              </div>
            ))}
            <p className="pt-2 text-xs text-(--on-surface-variant)">
              Catálogo documental; endereços e coordenadas ainda exigem validação.
            </p>
            <Botao tom="texto" onClick={aoAbrirGuia}>Consultar OMs</Botao>
          </article>
          <article className="min-w-0 rounded-2xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)">
            <h3 className="mb-2 text-base font-semibold">Escolas, saúde e chegada</h3>
            <p className="mb-3 text-sm text-(--on-surface-variant)">
              Compare instituições por bairro e confirme vagas, atendimento e deslocamento.
            </p>
            <p className="mb-3 text-sm">Checklist de mudança e orientações para os primeiros dias.</p>
            <Botao tom="texto" onClick={aoAbrirGuia}>Planejar chegada</Botao>
          </article>
        </div>
      ) : (
        <div className="rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
          <p className="text-sm text-(--on-surface-variant)">
            O conteúdo editorial desta cidade ainda não foi validado. Você pode consultar os imóveis e serviços cadastrados.
          </p>
          <Botao tom="texto" onClick={aoAbrirImoveis}>Ver imóveis</Botao>
        </div>
      )}
    </Secao>
  )
}
