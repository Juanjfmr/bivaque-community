"use client"

import * as React from "react"
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, ChevronRight, Compass,
  Home, MapPin, MessageCircle, Plus, Search, ShieldCheck, Store, Users, Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Adaptacao do padrao visual do Web3Bento para o Bivaque.
// Conteudo de demonstracao: nenhuma informacao vem do Supabase.
export type BivaqueCategory = "Todos" | "Serviços" | "Moradia" | "Comunidade"

export interface BivaqueBentoItem {
  id: string
  category: Exclude<BivaqueCategory, "Todos">
  title: string
  detail: string
  destination: string
}
export interface Web3BentoProps {
  city?: string
  items?: BivaqueBentoItem[]
  className?: string
}
const DEMO: BivaqueBentoItem[] = [
  { id: "1", category: "Serviços", title: "Encontre um eletricista indicado", detail: "Recomendações de quem conhece a guarnição.", destination: "/comunidade" },
  { id: "2", category: "Moradia", title: "Conheça a região antes de mudar", detail: "Bairros, imóveis e referências locais.", destination: "/minhas" },
  { id: "3", category: "Comunidade", title: "Qual bairro escolher?", detail: "Pergunte a quem já viveu essa mudança.", destination: "/comunidade" },
  { id: "4", category: "Serviços", title: "Serviços para sua mudança", detail: "Indicações locais compartilhadas pela comunidade.", destination: "/comunidade" },
]
const categories: BivaqueCategory[] = ["Todos", "Serviços", "Moradia", "Comunidade"]
const shortcuts = [
  { id: "perguntar", title: "Perguntar", detail: "Compartilhe uma dúvida com a comunidade.", href: "/comunidade", bg: "var(--secondary-container)", ink: "var(--on-secondary-container)" },
  { id: "indicar", title: "Indicar alguém", detail: "Recomende uma pessoa ou serviço de confiança.", href: "/comunidade", bg: "var(--primary-container)", ink: "var(--on-primary-container)" },
  { id: "explorar", title: "Explorar anúncios", detail: "Encontre oportunidades perto de você.", href: "/minhas", bg: "var(--tertiary-container)", ink: "var(--on-tertiary-container)" },
]
const tile = "relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-(--border) bg-(--card) p-4 text-(--card-foreground) sm:p-5"
function IconFor({ category }: { category: BivaqueCategory }) {
  if (category === "Serviços") return <Wrench aria-hidden="true" className="size-5" />
  if (category === "Moradia") return <Home aria-hidden="true" className="size-5" />
  return <Users aria-hidden="true" className="size-5" />
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-[13px]! font-semibold! tracking-normal! text-(--muted-foreground)">{children}</h2>
}
export function Web3Bento({ city = "Sua guarnição", items = DEMO, className = "" }: Web3BentoProps) {
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<BivaqueCategory>("Todos")
  const [order, setOrder] = React.useState(shortcuts.map((s) => s.id))
  const [saved, setSaved] = React.useState(false)
  const [conversations, setConversations] = React.useState<"Perguntas" | "Indicações">("Perguntas")
  const front = shortcuts.find((s) => s.id === order[order.length - 1])!
  const visible = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR")
    return items.filter((item) =>
      (category === "Todos" || item.category === category) &&
      (!q || [item.title, item.detail, item.category].join(" ").toLocaleLowerCase("pt-BR").includes(q)),
    )
  }, [items, category, query])
  const topics = conversations === "Perguntas"
    ? [
        ["Mudança de cidade", "Como escolher um bairro para a família?"],
        ["Vida na guarnição", "Onde encontrar referências de escolas e serviços?"],
      ]
    : [
        ["Um bom contato", "Compartilhe um telefone ou perfil de quem recomenda."],
        ["Serviços locais", "Descubra indicações feitas na sua comunidade."],
      ]

  return (
    <div className={"mx-auto w-full max-w-[1120px] pb-5 " + className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pt-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-(--muted-foreground)">
          <span className="size-2 rounded-full bg-(--brasa)" aria-hidden="true" />
          Bivaque · experimento bento
        </span>
        <a href="/inicio" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium hover:underline">
          Voltar ao Início <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <section className={tile + " min-h-[320px] justify-between bg-(--surface-low) sm:col-span-2"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--secondary-container) px-3 py-1.5 text-xs font-medium text-(--on-secondary-container)">
              <MapPin aria-hidden="true" className="size-4" /> {city}
            </span>
            <span className="text-[11px] text-(--muted-foreground)">Prévia com dados demonstrativos</span>
          </div>
          <div className="py-7">
            <h1 className="max-w-[620px] text-[clamp(29px,4vw,42px)]! leading-[1.14]! tracking-[-0.035em]!">
              A rede que acompanha a vida militar.
            </h1>
            <p className="mt-3 max-w-[500px] text-sm leading-relaxed text-(--muted-foreground)">
              Encontre pessoas, indicações, moradia e oportunidades onde estiver.
            </p>
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-(--border) bg-(--card) px-4 focus-within:ring-2 focus-within:ring-(--ring)">
            <Search aria-hidden="true" className="size-5 shrink-0 text-(--muted-foreground)" />
            <span className="sr-only">Pesquisar no Bivaque</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="O que você precisa encontrar?"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--muted-foreground)"
            />
          </label>
        </section>

        <section className={tile + " min-h-[320px]"}>
          <SectionHeading>Ações rápidas</SectionHeading>
          <div className="relative min-h-[215px] flex-1">
            {order.map((id, index) => {
              const item = shortcuts.find((s) => s.id === id)!
              const isFront = index === order.length - 1
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={isFront ? item.title + ", selecionado" : "Selecionar " + item.title}
                  aria-pressed={isFront}
                  onClick={() => setOrder((current) => [...current.filter((x) => x !== id), id])}
                  className="absolute inset-x-1 mx-auto w-[94%] rounded-[18px] p-4 text-left shadow-lg transition-transform duration-500 motion-reduce:transition-none focus-visible:ring-2"
                  style={{
                    top: 14 + 40 * index,
                    zIndex: index + 1,
                    background: item.bg,
                    color: item.ink,
                    minHeight: 133,
                    transform: "scale(" + (1 - (order.length - 1 - index) * 0.035) + ")",
                  }}
                >
                  <span className="block text-[10px] font-bold tracking-[0.12em] opacity-70">BIVAQUE</span>
                  <span className="mt-2 block text-[19px] font-semibold">{item.title}</span>
                  <span className="mt-1 block text-xs leading-snug opacity-80">{item.detail}</span>
                </button>
              )
            })}
          </div>
          <a
            href={front.href}
            className="relative z-10 mt-2 flex min-h-11 items-center justify-between rounded-xl bg-(--foreground) px-4 text-[13px] font-semibold text-(--background)"
          >
            Abrir {front.title.toLowerCase()} <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </section>

        <section className={tile + " min-h-[320px]"}>
          <SectionHeading>Confiança entre pessoas</SectionHeading>
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <span className="grid size-14 place-items-center rounded-2xl bg-(--secondary-container) text-(--on-secondary-container)">
                <ShieldCheck aria-hidden="true" className="size-7" />
              </span>
              <h3 className="mt-4 text-[21px]! font-semibold! leading-tight!">Indicação com contexto</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-(--muted-foreground)">
                Descubra por que alguém recomenda um prestador. A identificação é separada da opinião.
              </p>
            </div>
            <a href="/comunidade" className="mt-5 flex min-h-11 items-center justify-between text-sm font-semibold">
              Conhecer a comunidade <ChevronRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </section>

        <section className={tile + " min-h-[342px] sm:col-span-2"}>
          <SectionHeading>Descubra no Bivaque</SectionHeading>
          <div role="group" aria-label="Categorias" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
                className={"min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium " +
                  (category === name
                    ? "border-(--foreground) bg-(--foreground) text-(--background)"
                    : "border-(--border) bg-(--card) text-(--muted-foreground)")}
              >
                {name}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center rounded-xl bg-(--surface-low) p-5">
              <Search className="size-5" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Nenhum exemplo encontrado.</p>
              <p className="mt-1 text-xs text-(--muted-foreground)">Tente outro termo ou selecione Todas as categorias.</p>
              <button type="button" onClick={() => { setQuery(""); setCategory("Todos") }} className="mt-3 min-h-10 text-left text-sm font-semibold underline">
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid flex-1 content-start gap-2 sm:grid-cols-2">
              {visible.slice(0, 4).map((item) => (
                <a key={item.id} href={item.destination} className="group flex items-start gap-3 rounded-2xl border border-(--border) p-3 hover:bg-(--surface-low)">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--secondary-container) text-(--on-secondary-container)">
                    <IconFor category={item.category} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-(--muted-foreground)">{item.category}</span>
                    <span className="mt-1 block text-sm font-semibold leading-snug">{item.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-(--muted-foreground)">{item.detail}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="relative flex min-h-[342px] min-w-0 flex-col rounded-[22px] bg-(--brasa) p-5 text-(--brasa-foreground)">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Participe da rede</span> <Plus aria-hidden="true" className="size-5" />
          </div>
          <div className="my-auto py-8">
            <h2 className="text-[clamp(30px,3.5vw,43px)]! font-semibold! leading-[1.07]! tracking-[-0.04em]!">
              Uma boa indicação muda muita coisa.
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed">Compartilhe um contato útil sem preencher formulários longos.</p>
          </div>
          <Button asChild className="h-12! rounded-2xl! bg-(--foreground)! text-(--background)!">
            <a href="/comunidade">Compartilhar uma indicação <ArrowRight aria-hidden="true" className="size-4" /></a>
          </Button>
        </section>

        <section className={tile + " min-h-[342px]"}>
          <SectionHeading>Moradia e cidade</SectionHeading>
          <div className="relative h-[145px] overflow-hidden rounded-xl bg-(--surface-high)">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=75)" }}
              role="img"
              aria-label="Imagem ilustrativa de casa, não é anúncio"
            />
            <button
              type="button"
              aria-label={saved ? "Remover referência salva" : "Salvar referência"}
              aria-pressed={saved}
              onClick={() => setSaved((value) => !value)}
              className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-(--card) text-(--foreground)"
            >
              {saved ? <Check aria-hidden="true" className="size-5" /> : <Bookmark aria-hidden="true" className="size-5" />}
            </button>
          </div>
          <h3 className="mt-4 text-[17px]! font-semibold!">Conheça antes de mudar</h3>
          <p className="mt-2 text-xs leading-relaxed text-(--muted-foreground)">
            Explore a região com referências locais. Imagem ilustrativa.
          </p>
          <a href="/minhas" className="mt-auto flex min-h-11 items-center justify-between text-sm font-semibold">
            Explorar opções <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </section>

        <section className={tile + " sm:col-span-2"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px]! font-semibold! text-(--muted-foreground)">Conversas que ajudam</h2>
            <div role="group" aria-label="Tipos de conversa" className="flex rounded-full bg-(--muted) p-0.5">
              {(["Perguntas", "Indicações"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setConversations(name)}
                  aria-pressed={conversations === name}
                  className={"min-h-8 rounded-full px-3 text-[11px] font-semibold " +
                    (conversations === name ? "bg-(--foreground) text-(--background)" : "text-(--muted-foreground)")}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {topics.map(([label, description]) => (
              <a key={label} href="/comunidade" className="flex min-h-[138px] flex-col justify-between rounded-2xl bg-(--surface-low) p-4">
                <span className="flex items-center gap-2 text-xs text-(--muted-foreground)">
                  <MessageCircle aria-hidden="true" className="size-4" /> {label}
                </span>
                <strong className="mt-3 text-sm leading-snug">{description}</strong>
                <ArrowUpRight aria-hidden="true" className="mt-2 size-4 self-end" />
              </a>
            ))}
          </div>
        </section>

        <section className={tile + " sm:col-span-2"}>
          <SectionHeading>Seu próximo caminho</SectionHeading>
          {[
            [Compass, "Guia de cidade", "Entenda melhor a nova guarnição.", "/inicio"],
            [Store, "Negócios", "Serviços e oportunidades locais.", "/minhas"],
            [MessageCircle, "Grupos", "Converse sobre assuntos em comum.", "/comunidade"],
          ].map(([Icon, name, detail, href]) => (
            <a key={String(name)} href={String(href)} className="flex min-h-[75px] items-center gap-3 rounded-xl px-2 hover:bg-(--surface-low)">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--secondary-container) text-(--on-secondary-container)">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{name}</strong>
                <span className="block text-xs text-(--muted-foreground)">{detail}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ))}
        </section>
      </div>
      <p className="mt-4 text-center text-[11px] text-(--muted-foreground)">
        Conceito independente. Exemplos e fotografia ilustrativos; sem dados ao vivo.
      </p>
    </div>
  )
}
export default Web3Bento
