"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Check, LayoutGrid, PanelsTopLeft, Images, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gallery6 } from "@/components/block-lab/shadcnblocks-gallery6"
import { Services4 } from "@/components/block-lab/shadcnblocks-services4"
import { Pattern as ReuiCard8 } from "@/components/block-lab/reui-card8"
import { HOUSING, PROVIDERS } from "@/components/modules/fixtures"

const sources = {
  gallery: "https://github.com/shadcnblocks/shadcn-ui-blocks/blob/master/src/block/gallery6.tsx",
  services: "https://github.com/shadcnblocks/shadcn-ui-blocks/blob/master/src/block/services4.tsx",
  card: "https://github.com/keenthemes/reui/blob/main/public/r/styles/base-nova/c-card-8.json",
}

const housing = HOUSING.slice(0, 4).map((item) => ({
  id: item.id,
  title: item.title,
  summary: item.hood + " · " + item.bedrooms + " quartos · " + item.area + " m² · " + item.priceLabel,
  url: "/imoveis",
  image: item.image,
}))

function BivaquePhotoCard() {
  const home = HOUSING[0]
  return (
    <Card className="group/card relative h-96 w-full max-w-xs overflow-hidden border-0 p-0!">
      <img
        src={home.image}
        alt={home.title}
        width={1000}
        height={800}
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/card:scale-110"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/75 to-transparent transition-opacity duration-500 group-hover/card:from-black/85" />
      <div className="relative flex h-full flex-col justify-end p-6">
        <div className="mb-2 text-xs font-medium text-white/85">Moradia · {home.hood}</div>
        <h3 className="text-xl font-bold leading-snug text-white">{home.title}</h3>
        <p className="mt-2 text-sm text-white/90">
          {home.bedrooms} quartos · {home.area} m² · {home.priceLabel}
        </p>
      </div>
    </Card>
  )
}

function BivaqueServices() {
  const providers = PROVIDERS.slice(0, 4)
  return (
    <section className="mx-auto max-w-6xl py-8">
      <div className="mb-8 space-y-2">
        <h2 className="font-serif text-3xl font-semibold tracking-tight">Serviços de Brasília</h2>
        <p className="text-muted-foreground text-sm">
          Fichas demonstrativas, sem prestadores ou indicações reais.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {providers.map((service) => (
          <div key={service.id} className="border-border space-y-5 rounded-lg border bg-card p-6 transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                <img src={service.image} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-muted-foreground text-sm">{service.category} · {service.hood}</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
            <div className="flex flex-wrap gap-2">
              {service.services.map((item) => (
                <Badge variant="outline" key={item}>{item}</Badge>
              ))}
            </div>
            <Link href="/servicos" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
              Explorar serviços
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

const notes = {
  gallery: {
    title: "Gallery 6 — Shadcnblocks",
    about: "Carrossel com arraste, setas, responsividade e imagens em destaque.",
    change: "Mesma implementação importada da fonte original; na aba Bivaque recebe apenas props com imóveis fictícios do laboratório.",
    path: "components/block-lab/shadcnblocks-gallery6.tsx",
  },
  services: {
    title: "Services 4 — Shadcnblocks",
    about: "Grade de serviços com títulos, descrição e lista de especialidades.",
    change: "A aba Original executa o código oficial. A aba Bivaque é uma adaptação separada da mesma composição, com fichas fictícias.",
    path: "components/block-lab/shadcnblocks-services4.tsx",
  },
  card: {
    title: "Card 8 — ReUI",
    about: "Card fotográfico com gradiente e zoom discreto no hover.",
    change: "A aba Original executa o código do registry ReUI sem modificação; a aba Bivaque é um derivado declarado e separado.",
    path: "components/block-lab/reui-card8.tsx",
  },
}

export default function LaboratorioBlocos() {
  const [current, setCurrent] = useState<"gallery" | "services" | "card">("gallery")
  const [mode, setMode] = useState<"original" | "bivaque">("bivaque")
  const meta = notes[current]
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-8">
          <Link href="/inicio" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Voltar ao Bivaque
          </Link>
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Laboratório de blocos reais</div>
          <Badge variant="outline">Experimental · dados fictícios</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-7 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[.17em] text-muted-foreground">Bivaque / comparação de bibliotecas</p>
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Teste blocos reais, não imitações.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Escolha um bloco e alterne entre seu código original e a composição para o Bivaque. Os arquivos de terceiros estão
            versionados separadamente, sem alterar a R72. Este laboratório não faz operações reais.
          </p>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <Button variant={current === "gallery" ? "default" : "outline"} onClick={() => setCurrent("gallery")}><Images className="size-4" /> Gallery 6</Button>
            <Button variant={current === "services" ? "default" : "outline"} onClick={() => setCurrent("services")}><LayoutGrid className="size-4" /> Services 4</Button>
            <Button variant={current === "card" ? "default" : "outline"} onClick={() => setCurrent("card")}><PanelsTopLeft className="size-4" /> Card 8</Button>
          </div>
          <Tabs value={mode} onValueChange={v => setMode(v as "original" | "bivaque")}>
            <TabsList className="h-11">
              <TabsTrigger value="original" className="min-h-9 px-4">Original</TabsTrigger>
              <TabsTrigger value="bivaque" className="min-h-9 px-4">No Bivaque</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_250px]">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.about}</p>
          </div>
          <a href={sources[current]} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-start gap-2 text-sm font-medium underline underline-offset-4 sm:justify-end">
            Ver código-fonte real <ExternalLink className="size-4" />
          </a>
        </div>

        <div className="mt-5 min-h-[440px] min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          {current === "gallery" ? (
            <div className="[&_section]:py-8 [&_.container]:px-5 md:[&_.container]:px-10">
              {mode === "original" ? <Gallery6 /> : <Gallery6 heading="Moradia para sua próxima etapa" demoUrl="/imoveis" items={housing} />}
            </div>
          ) : current === "services" ? (
            <div className="px-4 [&_section]:py-8 [&_.container]:mx-auto [&_.container]:max-w-6xl [&_.container]:px-2 md:px-8">
              {mode === "original" ? <Services4 /> : <BivaqueServices />}
            </div>
          ) : (
            <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 px-4 py-10">
              {mode === "original" ? <ReuiCard8 /> : <BivaquePhotoCard />}
              <p className="text-center text-xs text-muted-foreground">Passe o cursor na imagem para testar a transição.</p>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold">O que mudou de verdade?</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{meta.change}</p>
              <code className="mt-3 inline-block break-all rounded bg-muted px-2 py-1 text-xs">{meta.path}</code>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="size-4 shrink-0" />
            Fontes atribuídas e componentes React reais. Sem backend, cadastro ou publicação.
          </div>
        </div>
      </div>
    </main>
  )
}
