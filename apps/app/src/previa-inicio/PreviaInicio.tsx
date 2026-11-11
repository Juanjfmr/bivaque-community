import { type ReactNode, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import { BuscaGlobal, type ResultadoDeBusca } from "@/components/ui/busca-global"
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza"
import type { NomeDeIcone } from "@/lib/icones"
import { Avatar, Botao, Ilustracao } from "@/src/pecas/pecas"
import {
  ANUNCIOS,
  type Anuncio,
  distancia,
  ENCONTROS,
  type Faixa,
  IMOVEIS,
  type Momento,
  NEGOCIOS,
  type Negocio,
  PEDIDOS,
  preco,
  recortar,
} from "./dados"
import "./previa-inicio.css"

const foto = (arquivo: string) => `${import.meta.env.BASE_URL}demo/${arquivo}`

type Detalhe = { tipo: "anuncio"; item: Anuncio } | { tipo: "negocio"; item: Negocio } | null

function Secao({ titulo, acao, children }: { titulo: string; acao?: string; children: ReactNode }) {
  return (
    <section className="pi-secao" aria-label={titulo}>
      <div className="pi-secao-cabeca">
        <h2>{titulo}</h2>
        {acao && (
          <button type="button" className="pi-ver">
            {acao}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function Atalho({ icone, rotulo }: { icone: NomeDeIcone; rotulo: string }) {
  return (
    <button type="button" className="pi-atalho">
      <span className="pi-atalho-marca">
        <Icone nome={icone} />
      </span>
      {rotulo}
    </button>
  )
}

function Oferta({ a, aoAbrir }: { a: Anuncio; aoAbrir: () => void }) {
  return (
    <button type="button" className="pi-oferta" onClick={aoAbrir}>
      <span className="pi-oferta-foto">
        {a.foto ? (
          <img src={foto(a.foto)} alt="" loading="lazy" />
        ) : (
          <Icone nome="image" className="pi-sem-foto" />
        )}
        {a.saiEm !== undefined && <span className="pi-etiqueta">sai em {a.saiEm} dias</span>}
      </span>
      <span className="pi-preco">{preco(a.preco)}</span>
      <span className="pi-oferta-titulo">{a.titulo}</span>
      <span className="pi-miudo">a {distancia(a.km)} de você</span>
    </button>
  )
}

function Indicacao({ n, aoAbrir }: { n: Negocio; aoAbrir: () => void }) {
  return (
    <button type="button" className="pi-indicacao" onClick={aoAbrir}>
      {n.foto && <img className="pi-indicacao-foto" src={foto(n.foto)} alt="" loading="lazy" />}
      <span className="pi-indicacao-corpo">
        <span className="pi-indicacao-nome">{n.nome}</span>
        <span className="pi-miudo">
          {n.categoria} · {distancia(n.km)}
        </span>
        <span className="pi-frase">“{n.indicacao.frase}”</span>
        <span className="pi-quem">
          <Avatar nome={n.indicacao.quem} tamanho={32} />
          <span className="pi-miudo">{n.indicacao.quem.split(" ")[0]} indicou</span>
          <span className="pi-contagem">
            <Icone nome="thumb_up" />
            {n.indicacoes}
          </span>
        </span>
      </span>
    </button>
  )
}

function Vazio() {
  return (
    <div className="pi-vazio">
      <Ilustracao nome="cidade" proporcao="3 / 2" />
      <h2>Manaus está começando no Bivaque.</h2>
      <p>O primeiro anúncio costuma vender rápido. Quem chega procura móveis, berço e geladeira.</p>
      <Botao tom="principal">Anunciar o primeiro item</Botao>
    </div>
  )
}

const RESULTADOS: readonly ResultadoDeBusca[] = [
  ...ANUNCIOS.map((a) => ({
    id: a.id,
    tipo: "anuncio" as const,
    titulo: a.titulo,
    trecho: `${preco(a.preco)} · ${a.bairro}`,
    apoio: distancia(a.km),
    ...(a.foto ? { foto: foto(a.foto) } : {}),
  })),
  ...NEGOCIOS.map((n) => ({
    id: n.id,
    tipo: "negocio" as const,
    titulo: n.nome,
    trecho: `${n.categoria} · ${n.indicacoes} indicações`,
    apoio: distancia(n.km),
  })),
  ...IMOVEIS.map((m) => ({
    id: m.id,
    tipo: "imovel" as const,
    titulo: m.titulo,
    trecho: `${preco(m.aluguel)} por mês · ${m.bairro}`,
    apoio: distancia(m.kmDoTrabalho),
    foto: foto(m.foto),
  })),
  ...PEDIDOS.map((p) => ({
    id: p.id,
    tipo: "pergunta" as const,
    titulo: p.texto,
    trecho: `${p.quem} · ${p.bairro}`,
    apoio: "hoje",
  })),
]

export function PreviaInicio() {
  const [momento, setMomento] = useState<Momento>("chegando")
  const [faixa, setFaixa] = useState<Faixa>("viva")
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [cidadeAberta, setCidadeAberta] = useState(false)
  const [detalhe, setDetalhe] = useState<Detalhe>(null)

  const anuncios = recortar(ANUNCIOS, faixa)
  const saindo = anuncios.filter((a) => a.saiEm !== undefined)
  const negocios = recortar(
    momento === "saindo"
      ? [...NEGOCIOS].sort((a, b) => Number(!!b.mudanca) - Number(!!a.mudanca))
      : NEGOCIOS,
    faixa,
  )
  const imoveis = recortar(IMOVEIS, faixa)
  const pedidos = recortar(PEDIDOS, faixa)
  const encontro = recortar(ENCONTROS, faixa)[0]
  const perto = [...anuncios].sort((a, b) => a.km - b.km).slice(0, 4)

  const blocos: Record<string, ReactNode> = {
    destaque:
      momento === "saindo" ? (
        <div className="pi-destaque" key="destaque">
          <div>
            <span className="pi-miudo">Você sai em 12 dias</span>
            <h2>Anuncie o que não vai levar</h2>
            <p>Quem está chegando procura móveis, berço e geladeira.</p>
            <Botao tom="principal" compacto>
              Anunciar agora
            </Botao>
          </div>
          <Ilustracao nome="saindo" proporcao="1 / 1" />
        </div>
      ) : momento === "chegando" && saindo.length > 0 ? (
        <div className="pi-destaque" key="destaque">
          <div>
            <span className="pi-miudo">Montando a casa em Manaus</span>
            <h2>
              {saindo.length} {saindo.length === 1 ? "item" : "itens"} de quem está de saída
            </h2>
            <p>Com prazo para retirar, e por isso com preço melhor.</p>
          </div>
          <Ilustracao nome="chegando" proporcao="1 / 1" />
        </div>
      ) : null,
    saindo:
      saindo.length > 0 ? (
        <Secao titulo="De quem está de saída" acao="Ver todos" key="saindo">
          <div className="pi-trilho">
            {saindo.map((a) => (
              <Oferta key={a.id} a={a} aoAbrir={() => setDetalhe({ tipo: "anuncio", item: a })} />
            ))}
          </div>
        </Secao>
      ) : null,
    indicados:
      negocios.length > 0 ? (
        <Secao
          titulo={momento === "saindo" ? "Para a sua mudança" : "Indicados por quem mora aqui"}
          acao="Ver todos"
          key="indicados"
        >
          <div className="pi-trilho">
            {negocios.map((n) => (
              <Indicacao
                key={n.id}
                n={n}
                aoAbrir={() => setDetalhe({ tipo: "negocio", item: n })}
              />
            ))}
          </div>
        </Secao>
      ) : null,
    perto:
      perto.length > 0 ? (
        <Secao titulo="Desapegos perto de você" acao="Ver todos" key="perto">
          <div className="pi-grade">
            {perto.map((a) => (
              <Oferta key={a.id} a={a} aoAbrir={() => setDetalhe({ tipo: "anuncio", item: a })} />
            ))}
          </div>
        </Secao>
      ) : null,
    imoveis:
      imoveis.length > 0 ? (
        <Secao titulo="Imóveis para a sua chegada" acao="Ver todos" key="imoveis">
          <div className="pi-trilho">
            {imoveis.map((m) => (
              <button type="button" className="pi-casa" key={m.id}>
                <img src={foto(m.foto)} alt="" loading="lazy" />
                <span className="pi-preco">
                  {preco(m.aluguel)} <span className="pi-miudo">por mês</span>
                </span>
                <span className="pi-oferta-titulo">{m.titulo}</span>
                <span className="pi-miudo">
                  {m.bairro} · a {distancia(m.kmDoTrabalho)} do seu trabalho
                </span>
              </button>
            ))}
          </div>
        </Secao>
      ) : null,
    pedidos:
      pedidos.length > 0 ? (
        <Secao
          titulo={momento === "saindo" ? "Quem chega está procurando" : "Pediram indicação"}
          acao="Ver todas"
          key="pedidos"
        >
          <ul className="pi-lista">
            {pedidos.map((p) => (
              <li key={p.id}>
                <Avatar nome={p.quem} />
                <span className="pi-lista-texto">
                  <span>{p.texto}</span>
                  <span className="pi-miudo">
                    {p.bairro} ·{" "}
                    {p.indicacoes === 0
                      ? "ninguém indicou ainda"
                      : `${p.indicacoes} ${p.indicacoes === 1 ? "indicação" : "indicações"}`}
                  </span>
                </span>
                <Botao tom="tom" compacto>
                  Indicar
                </Botao>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null,
    encontro: encontro ? (
      <Secao titulo="Próximo encontro" acao="Ver agenda" key="encontro">
        <button type="button" className="pi-encontro">
          <span className="pi-data">
            <b>{encontro.dia.split(" ")[1]}</b>
            {encontro.dia.split(" ")[2]}
          </span>
          <span className="pi-lista-texto">
            <span>{encontro.nome}</span>
            <span className="pi-miudo">
              {encontro.hora} · {encontro.local} · {encontro.vao} pessoas vão
            </span>
          </span>
          <Icone nome="chevron_right" />
        </button>
      </Secao>
    ) : null,
  }
  const ordem: Record<Momento, string[]> = {
    chegando: ["destaque", "saindo", "indicados", "imoveis", "pedidos", "encontro"],
    morando: ["indicados", "pedidos", "perto", "encontro"],
    saindo: ["destaque", "pedidos", "indicados", "perto"],
  }

  return (
    <div className="pc pi" data-previa="inicio-comercial">
      <header className="pi-topo">
        <button type="button" className="pi-cidade" onClick={() => setCidadeAberta(true)}>
          Manaus <Icone nome="expand_more" />
        </button>
        <button type="button" className="pi-redondo" aria-label="Avisos">
          <Icone nome="notifications" />
          <i className="pi-ponto" />
        </button>
        <button type="button" className="pi-redondo" aria-label="Conversas">
          <Icone nome="chat_bubble" />
        </button>
      </header>

      <main className="pi-rolagem">
        <button type="button" className="pi-busca" onClick={() => setBuscaAberta(true)}>
          <Icone nome="search" />
          Do que você precisa?
        </button>
        <nav className="pi-atalhos" aria-label="Atalhos">
          <Atalho icone="sell" rotulo="Desapegos" />
          <Atalho icone="thumb_up" rotulo="Indicações" />
          <Atalho icone="home_work" rotulo="Imóveis" />
          <Atalho icone="event" rotulo="Encontros" />
          <Atalho icone="forum" rotulo="Perguntas" />
          <Atalho icone="map" rotulo="Mapa" />
        </nav>
        {faixa === "vazia" ? <Vazio /> : ordem[momento].map((chave) => blocos[chave])}
        {faixa === "rala" && (
          <p className="pi-convite">
            Manaus ainda tem pouco por aqui. Um anúncio ou uma indicação sua já muda a cidade.
          </p>
        )}
      </main>

      <div className="pi-barra">
        <nav aria-label="Principal">
          {(
            [
              ["home", "Início", true],
              ["groups", "Comunidade", false],
              ["sell", "Mercado", false],
              ["person", "Você", false],
            ] as const
          ).map(([icone, rotulo, atual]) => (
            <button type="button" key={rotulo} aria-current={atual ? "page" : undefined}>
              <Icone nome={icone} preenchido={atual} />
              {rotulo}
            </button>
          ))}
        </nav>
        <button type="button" className="pi-criar" aria-label="Criar">
          <Icone nome="edit_square" />
        </button>
      </div>

      <BuscaGlobal
        aberta={buscaAberta}
        aoMudarAberta={setBuscaAberta}
        aoEscolher={(r) => {
          setBuscaAberta(false)
          const a = ANUNCIOS.find((x) => x.id === r.id)
          const n = NEGOCIOS.find((x) => x.id === r.id)
          if (a) setDetalhe({ tipo: "anuncio", item: a })
          else if (n) setDetalhe({ tipo: "negocio", item: n })
        }}
        cidade="Manaus"
        ultimosAbertos={[]}
        recentes={RESULTADOS.slice(0, 4)}
        resultados={RESULTADOS}
      />

      <Credenza open={cidadeAberta} onOpenChange={setCidadeAberta}>
        <CredenzaContent className="pc">
          <CredenzaHeader>
            <CredenzaTitle>Manaus</CredenzaTitle>
            <CredenzaDescription>
              O Início segue o seu momento na cidade. Só você vê.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody className="pi-folha-cidade">
            <span className="pi-rotulo">Seu momento</span>
            <div className="pi-segmento">
              {(["chegando", "morando", "saindo"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={momento === m}
                  onClick={() => setMomento(m)}
                >
                  {m === "chegando" ? "Chegando" : m === "morando" ? "Morando" : "Saindo"}
                </button>
              ))}
            </div>
            <span className="pi-rotulo">Só na prévia: volume da cidade</span>
            <div className="pi-segmento">
              {(["viva", "rala", "vazia"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={faixa === f}
                  onClick={() => setFaixa(f)}
                >
                  {f === "viva" ? "Viva" : f === "rala" ? "Rala" : "Nova"}
                </button>
              ))}
            </div>
            <Botao tom="principal" onClick={() => setCidadeAberta(false)}>
              Pronto
            </Botao>
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>

      <Credenza open={detalhe !== null} onOpenChange={(aberta) => !aberta && setDetalhe(null)}>
        <CredenzaContent className="pc pi-detalhe">
          {detalhe?.item.foto && (
            <img className="pi-detalhe-foto" src={foto(detalhe.item.foto)} alt="" />
          )}
          <CredenzaHeader>
            <CredenzaTitle>
              {detalhe?.tipo === "anuncio" ? detalhe.item.titulo : (detalhe?.item.nome ?? "")}
            </CredenzaTitle>
            <CredenzaDescription>
              {detalhe?.tipo === "anuncio"
                ? `${preco(detalhe.item.preco)} · ${detalhe.item.bairro} · a ${distancia(detalhe.item.km)} de você`
                : detalhe
                  ? `${detalhe.item.categoria} · ${detalhe.item.indicacoes} indicações`
                  : ""}
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody className="pi-detalhe-corpo">
            <p>
              {detalhe?.tipo === "anuncio"
                ? detalhe.item.descricao
                : detalhe
                  ? `“${detalhe.item.indicacao.frase}” — ${detalhe.item.indicacao.quem}`
                  : ""}
            </p>
            <Botao tom="principal" onClick={() => setDetalhe(null)}>
              <Icone nome="chat_bubble" />
              {detalhe?.tipo === "anuncio" ? "Tenho interesse" : "Pedir orçamento"}
            </Botao>
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>
    </div>
  )
}
