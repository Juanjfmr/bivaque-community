import { useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { assetUrl } from "@/lib/assets"
import { useNavegacao } from "@/lib/navegacao/react"
import "./descoberta-lab.css"

type Categoria = "Tudo" | "Serviços" | "Desapegos" | "Moradia"
type Grupo = Exclude<Categoria, "Tudo">
type Item = {
  id: string
  grupo: Grupo
  titulo: string
  subtitulo: string
  bairro: string
  imagem: string
  descricao: string
  preco?: string
  destaque?: boolean
}

const CATEGORIAS: readonly Categoria[] = ["Tudo", "Serviços", "Desapegos", "Moradia"]
const ITENS: readonly Item[] = [
  {
    id: "casa-organizada",
    grupo: "Serviços",
    titulo: "Casa Organizada",
    subtitulo: "Organização e apoio doméstico",
    bairro: "Adrianópolis",
    imagem: "service",
    descricao: "Organização de ambientes e rotinas domésticas. Perfil fictício criado para testar a experiência de descoberta de serviços.",
    destaque: true,
  },
  {
    id: "pet-bem",
    grupo: "Serviços",
    titulo: "Pet Bem Manaus",
    subtitulo: "Cuidados com animais",
    bairro: "Parque Dez",
    imagem: "pets",
    descricao: "Cuidados e visitas para animais de estimação. Atendimento, disponibilidade e preços são ilustrativos.",
  },
  {
    id: "oficina-bairro",
    grupo: "Serviços",
    titulo: "Oficina do Bairro",
    subtitulo: "Reparos e manutenção",
    bairro: "Flores",
    imagem: "workshop",
    descricao: "Pequenos reparos e serviços de manutenção residencial. Dados de demonstração.",
  },
  {
    id: "sorriso-manaus",
    grupo: "Serviços",
    titulo: "Espaço Sorriso",
    subtitulo: "Saúde e bem-estar",
    bairro: "Vieiralves",
    imagem: "dentist",
    descricao: "Página de exemplo para testar uma ficha de profissional, sem representar atendimento real.",
  },
  {
    id: "berco",
    grupo: "Desapegos",
    titulo: "Berço em madeira",
    subtitulo: "Infantil · bom estado",
    bairro: "Aleixo",
    imagem: "crib",
    preco: "R$ 350",
    descricao: "Anúncio fictício de desapego com fotos, contexto local e negociação entre membros.",
  },
  {
    id: "sofa",
    grupo: "Desapegos",
    titulo: "Sofá de três lugares",
    subtitulo: "Casa e móveis",
    bairro: "Dom Pedro",
    imagem: "sofa",
    preco: "R$ 680",
    descricao: "Anúncio de demonstração. Não existe vendedor ou produto disponível para compra.",
  },
  {
    id: "apartamento",
    grupo: "Moradia",
    titulo: "Apartamento com varanda",
    subtitulo: "2 quartos · aluguel",
    bairro: "Ponta Negra",
    imagem: "apartment",
    preco: "R$ 2.600/mês",
    descricao: "Imóvel fictício para testar a descoberta de moradia e a passagem da lista para a página de detalhes.",
  },
  {
    id: "casa",
    grupo: "Moradia",
    titulo: "Casa perto de serviços",
    subtitulo: "3 quartos · aluguel",
    bairro: "Cidade Nova",
    imagem: "interior",
    preco: "R$ 2.100/mês",
    descricao: "Imóvel de demonstração. Endereço exato não é mostrado e não há disponibilidade real.",
  },
]

function normalizar(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function trocarComTransicao(atualizar: () => void) {
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const documento = document as Document & {
    startViewTransition?: (callback: () => void) => unknown
  }
  if (reduzido || !documento.startViewTransition) {
    atualizar()
    return
  }
  document.documentElement.classList.add("bv-lab-transicao")
  const transicao = documento.startViewTransition(() => flushSync(atualizar)) as {
    finished?: Promise<unknown>
  }
  const limpar = () => document.documentElement.classList.remove("bv-lab-transicao")
  void transicao.finished?.then(limpar, limpar)
}

export function DescobertaLab() {
  const navegacao = useNavegacao()
  const [categoria, setCategoria] = useState<Categoria>("Tudo")
  const [busca, setBusca] = useState("")
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [aberto, setAberto] = useState<Item | null>(null)
  const [rascunho, setRascunho] = useState("")
  const [mensagemEnviada, setMensagemEnviada] = useState(false)
  const origem = useRef<HTMLButtonElement | null>(null)
  const itens = useMemo(
    () =>
      ITENS.filter((item) => {
        const correspondeCategoria = categoria === "Tudo" || item.grupo === categoria
        const texto = [item.titulo, item.subtitulo, item.bairro, item.grupo].join(" ")
        return correspondeCategoria && normalizar(texto).includes(normalizar(busca.trim()))
      }),
    [categoria, busca],
  )

  const alternarSalvo = (id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const mudarDetalhe = (item: Item | null) => {
    trocarComTransicao(() => {
      setAberto(item)
      setRascunho("")
      setMensagemEnviada(false)
    })
  }

  return (
    <section className="bv-descoberta" data-tela="descoberta-lab">
      <div className="bv-descoberta-aviso">
        <span>LABORATÓRIO · NÃO PUBLICADO</span>
        <span>Perfis, preços e anúncios fictícios</span>
      </div>

      <header className="bv-descoberta-header">
        <div className="bv-descoberta-local">
          <Icone nome="location_on" /> Explorando Manaus
        </div>
        <h1>Descubra o que acontece perto de você.</h1>
        <p>Gente que presta serviços, boas oportunidades e respostas da comunidade em um só lugar.</p>
      </header>

      <div className="bv-descoberta-busca">
        <Icone nome="search" />
        <Input
          aria-label="Buscar na descoberta"
          placeholder="Busque serviço, produto ou bairro"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        {busca !== "" ? (
          <Button variant="ghost" size="icon" aria-label="Limpar busca" onClick={() => setBusca("")}>
            <Icone nome="close" />
          </Button>
        ) : null}
      </div>

      <nav className="bv-descoberta-categorias" aria-label="Filtrar descoberta">
        {CATEGORIAS.map((opcao) => (
          <button
            key={opcao}
            type="button"
            className={opcao === categoria ? "bv-descoberta-categoria ativa" : "bv-descoberta-categoria"}
            aria-pressed={opcao === categoria}
            onClick={() => setCategoria(opcao)}
          >
            {opcao}
          </button>
        ))}
      </nav>

      <div className="bv-descoberta-titulos">
        <div>
          <span>FEITO PARA A SUA CIDADE</span>
          <h2>{categoria === "Tudo" ? "Vale conhecer" : categoria}</h2>
        </div>
        <p role="status" aria-live="polite">
          {itens.length} {itens.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="bv-descoberta-vazio">
          <Icone nome="search_off" />
          <h3>Nada encontrado nesta prévia</h3>
          <p>Tente outro bairro, categoria ou palavra-chave.</p>
          <Button variant="outline" onClick={() => { setBusca(""); setCategoria("Tudo") }}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="bv-descoberta-grade">
          {itens.map((item) => (
            <article key={item.id} className="bv-descoberta-card">
              <div className="bv-descoberta-foto">
                <button
                  type="button"
                  className="bv-descoberta-abrir"
                  aria-label={"Ver detalhes de " + item.titulo}
                  onClick={(evento) => {
                    origem.current = evento.currentTarget
                    mudarDetalhe(item)
                  }}
                >
                  <img
                    src={assetUrl(item.imagem)}
                    alt=""
                    loading="lazy"
                    style={{ viewTransitionName: aberto?.id === item.id ? "none" : "bv-lab-imagem-" + item.id }}
                  />
                </button>
                <span className="bv-descoberta-selo">{item.destaque ? "Divulgação · exemplo" : item.grupo}</span>
                <button
                  type="button"
                  className="bv-descoberta-salvar"
                  aria-label={(salvos.has(item.id) ? "Remover dos salvos: " : "Salvar: ") + item.titulo}
                  aria-pressed={salvos.has(item.id)}
                  onClick={() => alternarSalvo(item.id)}
                >
                  <Icone nome="bookmark" preenchido={salvos.has(item.id)} />
                </button>
              </div>
              <button
                type="button"
                className="bv-descoberta-card-info"
                onClick={(evento) => {
                  origem.current = evento.currentTarget
                  mudarDetalhe(item)
                }}
              >
                <strong>{item.titulo}</strong>
                <span>{item.subtitulo}</span>
                <small><Icone nome="location_on" /> {item.bairro}, Manaus</small>
                {item.preco ? <b className="bv-descoberta-preco">{item.preco}</b> : null}
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="bv-descoberta-comunidade">
        <div className="bv-descoberta-comunidade-icone"><Icone nome="forum" /></div>
        <div>
          <span>QUEM MORA AQUI SABE</span>
          <h2>Uma pergunta pode ajudar muita gente.</h2>
          <p>Encontre recomendações e conversas que continuam úteis para quem chega depois.</p>
          <Button variant="outline" onClick={() => void navegacao.irPara("comunidade")}>
            Explorar Comunidade <Icone nome="arrow_forward" />
          </Button>
        </div>
      </div>

      <div className="bv-descoberta-prestador">
        <div>
          <span>PARA QUEM PRESTA SERVIÇOS</span>
          <h2>Seu trabalho merece ser encontrado.</h2>
          <p>Descubra como os negócios podem aparecer na vitrine local do Bivaque.</p>
        </div>
        <Button onClick={() => void navegacao.irPara("negocios")}>
          Conhecer Negócios <Icone nome="arrow_forward" />
        </Button>
      </div>

      <Sheet
        open={aberto !== null}
        onOpenChange={(valor) => { if (!valor) mudarDetalhe(null) }}
      >
        <SheetContent
          side="bottom"
          className="bv-descoberta-detalhe"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault()
            origem.current?.focus()
          }}
        >
          <SheetHeader className="bv-descoberta-detalhe-header">
            <SheetTitle>{aberto?.titulo ?? "Detalhes"}</SheetTitle>
            <SheetDescription>{aberto?.subtitulo} · {aberto?.bairro}, Manaus</SheetDescription>
          </SheetHeader>
          {aberto ? (
            <div className="bv-descoberta-detalhe-corpo">
              <img
                src={assetUrl(aberto.imagem)}
                alt={aberto.titulo}
                className="bv-descoberta-detalhe-imagem"
                style={{ viewTransitionName: "bv-lab-imagem-" + aberto.id }}
              />
              <span className="bv-descoberta-detalhe-tipo">{aberto.grupo} · exemplo fictício</span>
              <p>{aberto.descricao}</p>
              {aberto.preco ? <strong className="bv-descoberta-detalhe-preco">{aberto.preco}</strong> : null}
              {mensagemEnviada ? (
                <p className="bv-descoberta-confirmacao" role="status">
                  Pedido simulado. Nenhuma mensagem foi enviada e nenhum dado foi salvo.
                </p>
              ) : (
                <div className="bv-descoberta-formulario">
                  <label htmlFor="bv-descoberta-mensagem">Experimente escrever uma mensagem</label>
                  <textarea
                    id="bv-descoberta-mensagem"
                    rows={3}
                    value={rascunho}
                    onChange={(evento) => setRascunho(evento.target.value)}
                    placeholder="Olá! Gostaria de saber mais..."
                    maxLength={300}
                  />
                  <Button
                    className="bv-descoberta-enviar"
                    disabled={rascunho.trim().length === 0}
                    onClick={() => setMensagemEnviada(true)}
                  >
                    Simular pedido <Icone nome="arrow_forward" />
                  </Button>
                  <small>Nesta prévia, nada é enviado a pessoas ou empresas.</small>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  )
}
