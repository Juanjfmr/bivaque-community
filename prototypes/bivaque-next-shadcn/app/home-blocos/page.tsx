"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Heart, Home, House, Info, MapPin, Menu, MessageSquareText, Moon, Plus, Search, ShoppingBag, Sun, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlobalSearch, type SearchResult } from "@/components/home-blocks/blocks-global-search-bivaque"
import { BivaqueProductList, type BivaqueListing } from "@/components/home-blocks/studio-product-list-bivaque"
import { Timeline, TimelineItem, TimelineHeader, TimelineIndicator, TimelineSeparator, TimelineDate, TimelineTitle, TimelineContent } from "@/components/home-blocks/reui-timeline"
import { HOUSING, CLASSIFIEDS, PROVIDERS, QUESTIONS, GROUPS, EVENTS } from "@/components/modules/fixtures"

const base=process.env.NEXT_PUBLIC_BASE_PATH||""
const nav=[
  {label:"Imóveis",caption:"Encontre um lugar",icon:House,path:"/imoveis"},
  {label:"Desapegos",caption:"Compre e venda",icon:ShoppingBag,path:"/desapegos"},
  {label:"Serviços",caption:"Gente de confiança",icon:BriefcaseBusiness,path:"/servicos"},
  {label:"Perguntas",caption:"Ajude e descubra",icon:MessageSquareText,path:"/comunidade"},
] as const
const sourceLinks=[
  {name:"Global Search · Blocks.so",url:"https://github.com/ephraimduncan/blocks/blob/main/content/components/command-menu/command-menu-04.tsx"},
  {name:"Product List 01 · Shadcn Studio",url:"https://github.com/shadcnstudio/shadcn-studio/blob/main/src/components/shadcn-studio/blocks/product-list-01/product-list-01.tsx"},
  {name:"Card 09 · Shadcn Studio",url:"https://shadcnstudio.com/components/card"},
  {name:"Timeline · ReUI",url:"https://github.com/keenthemes/reui/blob/main/registry-reui/bases/radix/reui/timeline.tsx"},
]
const makeListings=():BivaqueListing[]=>[
  ...HOUSING.map(x=>({id:x.id,image:x.image,title:x.title,location:x.hood+" · "+x.city,price:x.priceLabel,kind:"Imóvel" as const,meta:x.bedrooms+" quartos · "+x.area+" m²"})),
  ...CLASSIFIEDS.map(x=>({id:x.id,image:x.image,title:x.title,location:x.hood+" · "+x.city,price:new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(x.price),kind:"Desapego" as const,meta:x.category+" · "+x.condition}))
]
const catalog=makeListings()
const searchItems:SearchResult[]=[
 ...QUESTIONS.map(q=>({id:"q-"+q.id,kind:"chat" as const,title:q.title,snippet:"Pergunta em "+q.category+" · "+q.city,date:q.date})),
 ...HOUSING.map(h=>({id:"h-"+h.id,kind:"image" as const,title:h.title,snippet:h.priceLabel+" · "+h.hood,date:"Anúncio",thumbnail:"linear-gradient(135deg,#abb8af,#ebede6)"})),
 ...CLASSIFIEDS.map(d=>({id:"d-"+d.id,kind:"document" as const,title:d.title,snippet:d.category+" · "+d.hood,date:"Anúncio"})),
 ...PROVIDERS.map(p=>({id:"s-"+p.id,kind:"project" as const,title:p.name,snippet:p.category+" · "+p.hood,date:"Serviço"}))
]
const activity=[
 {id:"a1",title:"Nova conversa no grupo",detail:"Famílias militares em Brasília",date:"Hoje",icon:Users},
 {id:"a2",title:"Pergunta aguardando ajuda",detail:"Pediatra na Asa Norte",date:"Hoje",icon:CircleHelp},
 {id:"a3",title:"Dica de movimentação",detail:"Checklist de mudança disponível",date:"Ontem",icon:BookOpen},
]
type Overlay=
 | {type:"listing",item:BivaqueListing}
 | {type:"question",id:string}
 | {type:"create"}
 | {type:"saved"}
 | {type:"about"}
 | null

export default function HomeBlocos(){
 const router=useRouter()
 const [city,setCity]=useState("Brasília")
 const [searchOpen,setSearchOpen]=useState(false)
 const [overlay,setOverlay]=useState<Overlay>(null)
 const [saved,setSaved]=useState<Set<string>>(new Set())
 const [filter,setFilter]=useState<"Todos"|"Imóveis"|"Desapegos">("Todos")
 const [answered,setAnswered]=useState<Record<string,string>>({})
 const [answerText,setAnswerText]=useState("")
 const [created,setCreated]=useState<{title:string,detail:string}|null>(null)
 const [creationType,setCreationType]=useState("Pergunta")
 const [draftTitle,setDraftTitle]=useState("")
 const [draftDetail,setDraftDetail]=useState("")
 const [night,setNight]=useState(false)
 const [lastViewed,setLastViewed]=useState<string|null>(null)
 const filtered=useMemo(()=>catalog.filter(x=>x.location.endsWith(city) && (filter==="Todos"||(filter==="Imóveis"?x.kind==="Imóvel":x.kind==="Desapego"))),[city,filter])
 const visible=filtered.slice(0,6)
 const asked=QUESTIONS.filter(q=>q.city===city).slice(0,3)
 const companies=PROVIDERS.filter(x=>x.city===city).slice(0,3)
 const event=EVENTS.find(x=>x.city===city)
 const navigate=(path:string)=>router.push(path)
 const toggle=(id:string)=>setSaved(old=>{const s=new Set(old);if(s.has(id))s.delete(id);else s.add(id);return s})
 const openListing=(item:BivaqueListing)=>{setOverlay({type:"listing",item});setLastViewed(item.id)}
 const openQuestion=(id:string)=>{setAnswerText(answered[id]||"");setOverlay({type:"question",id})}
 const chosenQuestion=overlay?.type==="question"?QUESTIONS.find(q=>q.id===overlay.id):null
 const onSearchSelect=(result:SearchResult)=>{setSearchOpen(false);const map={chat:"/comunidade",image:"/imoveis",document:"/desapegos",project:"/servicos"};navigate(map[result.kind])}
 useEffect(()=>{function key(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(true)}if(e.key==="/"&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();setSearchOpen(true)}}document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key)},[])
 const logo=base+"/brand/bivaque-logo-horizontal.svg"
 return <div className={night?"dark min-h-screen bg-background text-foreground":"min-h-screen bg-background text-foreground"}>
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-[66px] flex-col items-center bg-[#253033] py-5 text-[#F2F0EB] md:flex">
    <Link href="/inicio" className="flex size-10 items-center justify-center rounded-lg border border-white/20 text-xl font-bold" aria-label="Bivaque — Início">B</Link>
    <div className="mt-10 flex w-full flex-col items-center gap-4">
      <button title="Início" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="flex size-10 items-center justify-center rounded-xl bg-white/15"><Home className="size-5"/></button>
      <button title="Buscar" onClick={()=>setSearchOpen(true)} className="flex size-10 items-center justify-center rounded-xl hover:bg-white/15"><Search className="size-5"/></button>
      <button title="Comunidade" onClick={()=>navigate("/comunidade")} className="flex size-10 items-center justify-center rounded-xl hover:bg-white/15"><Users className="size-5"/></button>
      <button title="Guia da cidade" onClick={()=>navigate("/guia")} className="flex size-10 items-center justify-center rounded-xl hover:bg-white/15"><Compass className="size-5"/></button>
    </div>
    <div className="mt-auto flex flex-col gap-4"><button onClick={()=>setOverlay({type:"about"})} title="Sobre este experimento" className="rounded-lg p-2 hover:bg-white/15"><Info className="size-5"/></button><button onClick={()=>setOverlay({type:"create"})} className="flex size-10 items-center justify-center rounded-xl bg-[#B84A3A]" title="Criar demonstração"><Plus className="size-5"/></button></div>
  </aside>
  <div className="md:pl-[66px]">
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1390px] items-center justify-between gap-5 px-4 sm:px-7 lg:px-10">
        <div className="flex items-center gap-7">
          <Link href="/inicio" className="flex items-center" aria-label="Bivaque — protótipo"><img src={logo} alt="Bivaque" className="h-[34px] w-[142px] object-contain object-left dark:brightness-0 dark:invert"/></Link>
          <span className="hidden border-l border-border pl-5 text-xs font-medium uppercase tracking-[.16em] text-muted-foreground lg:inline">Experimento de Home</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <select aria-label="Selecionar cidade" value={city} onChange={e=>{setCity(e.target.value);setFilter("Todos")}} className="h-11 max-w-28 cursor-pointer appearance-none rounded-lg border-0 bg-transparent px-1 text-sm font-medium outline-ring sm:max-w-40"><option>Brasília</option><option>Manaus</option><option>Rio de Janeiro</option></select>
          <button onClick={()=>setSearchOpen(true)} aria-label="Abrir busca" className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"><Search className="size-[18px]"/></button>
          <button onClick={()=>setOverlay({type:"saved"})} aria-label={"Salvos: "+saved.size} className="relative flex size-10 items-center justify-center rounded-lg hover:bg-muted"><Heart className="size-[18px]"/>{saved.size>0&&<span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#B84A3A] text-[9px] text-white">{saved.size}</span>}</button>
          <button onClick={()=>setNight(v=>!v)} aria-label={night?"Ativar tema claro":"Ativar tema escuro"} className="hidden size-10 items-center justify-center rounded-lg hover:bg-muted sm:flex">{night?<Sun className="size-[18px]"/>:<Moon className="size-[18px]"/>}</button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1390px] px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-14">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[.17em] text-[#9E3B2C] dark:text-[#E07A5A]">Uma rede que acompanha a vida militar</p>
        <button onClick={()=>setOverlay({type:"about"})} className="text-[11px] text-muted-foreground underline decoration-transparent underline-offset-4 hover:decoration-current">Código e origem dos blocos</button>
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0">
          <div className="mb-5">
            <h1 className="max-w-2xl font-serif text-[30px] font-semibold leading-[1.16] tracking-[-.035em] sm:text-[38px]">O que você precisa em <span className="text-[#9E3B2C] dark:text-[#E07A5A]">{city}</span>?</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">Encontre moradia, serviços, oportunidades e a experiência de quem já conhece o caminho.</p>
            <button onClick={()=>setSearchOpen(true)} className="mt-5 flex h-[55px] w-full items-center gap-3 rounded-xl border bg-card px-4 text-left shadow-[0_2px_12px_rgba(20,30,32,.04)] transition-colors hover:border-foreground/40">
              <Search className="size-5 text-muted-foreground"/><span className="flex-1 truncate text-sm text-muted-foreground">Buscar imóveis, produtos, serviços ou respostas</span><kbd className="hidden rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline">Ctrl K</kbd><ArrowRight className="size-4 text-muted-foreground"/>
            </button>
          </div>
          <nav aria-label="Explorar o Bivaque" className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {nav.map(({label,caption,icon:Icon,path})=><Card key={label} className="gap-0 rounded-xl border-border bg-card py-0 shadow-none transition-colors hover:border-[#78979B] hover:bg-accent/30">
              <CardHeader className="px-3 pb-1 pt-3.5"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Icon className="size-[18px] stroke-[1.7]"/></div></CardHeader>
              <CardContent className="px-3 pb-3.5"><button onClick={()=>navigate(path)} className="flex w-full items-end justify-between gap-1 text-left"><span><span className="block text-[13px] font-semibold">{label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{caption}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground"/></button></CardContent>
            </Card>)}
          </nav>
          <div className="mb-7 flex min-h-[62px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><Compass className="size-[18px]"/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold">Continuar de onde parou</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lastViewed?catalog.find(x=>x.id===lastViewed)?.title:"Seu histórico aparecerá quando você abrir um anúncio."}</p>
            </div>
            {lastViewed?<button className="flex min-h-10 items-center gap-1 text-[12px] font-semibold" onClick={()=>{const v=catalog.find(x=>x.id===lastViewed);if(v)openListing(v)}}>Retomar <ArrowRight className="size-4"/></button>:<button className="flex min-h-10 items-center gap-1 text-[12px] font-semibold" onClick={()=>navigate("/guia")}>Ver guia <ArrowRight className="size-4"/></button>}
          </div>
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-serif text-[24px] font-semibold leading-tight">A comunidade procura</h2><p className="mt-1 text-[11px] text-muted-foreground">Dúvidas que sua experiência pode ajudar a resolver.</p></div><button onClick={()=>navigate("/comunidade")} className="flex shrink-0 items-center gap-1 text-[12px] font-medium">Ver todas <ArrowRight className="size-4"/></button></div>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {asked.length?asked.map((q,i)=><div key={q.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold">{q.author.slice(0,1)}</span>
                <button className="min-w-0 flex-1 text-left" onClick={()=>openQuestion(q.id)}><span className="block line-clamp-2 text-[13px] font-semibold leading-5">{q.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{q.category} · {answered[q.id]?"Resposta salva neste teste":q.answers.length?"Com respostas":"Sem resposta"}</span></button>
                <button className="hidden min-h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-muted sm:flex" onClick={()=>openQuestion(q.id)}>Responder <ArrowRight className="size-3.5"/></button>
                <ChevronRight className="size-4 text-muted-foreground sm:hidden"/>
              </div>):<div className="p-7 text-sm text-muted-foreground">Sem perguntas demonstrativas em {city}.</div>}
            </div>
          </section>
          <section className="mb-9">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-serif text-[24px] font-semibold leading-tight">Oportunidades perto de você</h2><p className="mt-1 text-[11px] text-muted-foreground">Anúncios fictícios em {city} para testar o componente real.</p></div><button onClick={()=>navigate("/desapegos")} className="flex items-center gap-1 text-[12px] font-medium">Explorar catálogos <ArrowRight className="size-4"/></button></div>
            <div role="tablist" aria-label="Tipo de anúncio" className="mb-3 flex gap-2">
             {(["Todos","Imóveis","Desapegos"] as const).map(v=><button role="tab" aria-selected={filter===v} key={v} className={"min-h-9 rounded-full border px-3.5 text-xs font-medium "+(filter===v?"border-foreground bg-foreground text-background":"border-border bg-card hover:bg-muted")} onClick={()=>setFilter(v)}>{v}</button>)}
            </div>
            <BivaqueProductList products={visible} saved={saved} onToggleSaved={toggle} onOpen={openListing}/>
          </section>
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-2"><div><h2 className="font-serif text-[24px] font-semibold leading-tight">Serviços da comunidade</h2><p className="mt-1 text-[11px] text-muted-foreground">Perfis demonstrativos, sem verificação ou recomendação real.</p></div><button className="flex items-center gap-1 text-xs font-medium" onClick={()=>navigate("/servicos")}>Ver serviços <ArrowRight className="size-4"/></button></div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {companies.length?companies.map(p=><button key={p.id} onClick={()=>navigate("/servicos")} className="flex min-h-[82px] items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted sm:flex-col sm:items-start">
                <img className="size-12 shrink-0 rounded-lg object-cover sm:size-14" src={p.image} alt=""/>
                <div className="min-w-0"><strong className="line-clamp-1 block text-[12px]">{p.name}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{p.category}</span></div>
              </button>):<p className="text-sm text-muted-foreground">Sem perfis ilustrativos nesta cidade.</p>}
            </div>
          </section>
        </div>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-[88px]">
          <Card className="gap-0 rounded-xl py-0 shadow-none">
            <CardHeader className="border-b px-4 py-4"><div className="flex items-center justify-between"><CardTitle className="text-[15px]">Acontece na comunidade</CardTitle><Bell className="size-4 text-muted-foreground"/></div></CardHeader>
            <CardContent className="px-5 py-5"><Timeline defaultValue={3} className="w-full">
              {activity.map((v,i)=><TimelineItem step={i+1} key={v.id} className="!ms-6 !pb-5 last:!pb-0">
                <TimelineHeader><TimelineSeparator className="!-left-6"/><TimelineIndicator className="!-left-6 flex size-6 items-center justify-center border-none bg-secondary text-foreground"><v.icon className="size-3.5"/></TimelineIndicator><TimelineTitle className="text-[12px]">{v.title}</TimelineTitle><TimelineDate className="mt-1 text-[10px]">{v.date}</TimelineDate></TimelineHeader>
                <TimelineContent className="text-[11px] leading-relaxed">{v.detail}</TimelineContent>
              </TimelineItem>)}
            </Timeline><button onClick={()=>navigate("/grupos")} className="mt-4 flex min-h-10 items-center gap-1 text-[12px] font-semibold">Explorar grupos <ArrowRight className="size-4"/></button></CardContent>
          </Card>
          {event&&<Card className="gap-2 rounded-xl p-4 shadow-none"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#9E3B2C] dark:text-[#E07A5A]">Próximo encontro</span><CalendarDays className="size-4 text-muted-foreground"/></div><h3 className="font-serif text-[20px] font-semibold">{event.title}</h3><p className="text-[12px] text-muted-foreground">{event.when} · {city}</p><button onClick={()=>navigate("/agenda")} className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border bg-card text-[12px] font-semibold hover:bg-muted">Ver agenda <ArrowRight className="size-4"/></button></Card>}
          <Card className="gap-2 rounded-xl border-[#253033] bg-[#253033] p-5 text-[#F2F0EB] shadow-none"><span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#E8E5DE]">Conheça sua próxima cidade</span><h3 className="font-serif text-[23px] font-semibold leading-snug">Chegar com informação faz diferença.</h3><p className="text-[12px] leading-5 text-[#E8E5DE]">Moradia, rotina e serviços para quem está chegando ou mudando de destino.</p><button onClick={()=>navigate("/movimentacao")} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg bg-[#F2F0EB] text-[12px] font-semibold text-[#253033]">Organizar movimentação <ArrowUpRight className="size-4"/></button></Card>
        </aside>
      </div>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-[11px] text-muted-foreground"><span>Bivaque · Home experimental · Componentes de código aberto</span><button onClick={()=>setOverlay({type:"about"})} className="underline underline-offset-2">Bibliotecas, arquivos e licenças</button></footer>
    </main>
  </div>
  <nav className="fixed inset-x-0 bottom-0 z-30 flex min-h-[72px] items-start justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-5px_20px_rgba(30,40,40,.07)] md:hidden" aria-label="Menu inferior">
    {[{label:"Início",icon:Home,act:()=>window.scrollTo({top:0,behavior:"smooth"})},{label:"Imóveis",icon:House,act:()=>navigate("/imoveis")},{label:"Criar",icon:Plus,act:()=>setOverlay({type:"create"})},{label:"Comunidade",icon:Users,act:()=>navigate("/comunidade")},{label:"Você",icon:Heart,act:()=>setOverlay({type:"saved"})}].map(x=><button key={x.label} onClick={x.act} className="flex min-w-14 flex-col items-center gap-1 text-[10px] font-medium"><span className={"flex size-9 items-center justify-center rounded-xl "+(x.label==="Criar"?"bg-[#B84A3A] text-white":"text-foreground")}><x.icon className="size-[19px]"/></span>{x.label}</button>)}
  </nav>
  <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} onSelect={onSearchSelect} lastOpened={searchItems.slice(0,2)} recent={searchItems.slice(2,5)} results={searchItems}/>
  <Dialog open={!!overlay} onOpenChange={open=>{if(!open)setOverlay(null)}}><DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
    {overlay?.type==="listing"&&<><DialogHeader><DialogTitle className="font-serif text-[24px]">{overlay.item.title}</DialogTitle><DialogDescription>{overlay.item.location} · Dados demonstrativos</DialogDescription></DialogHeader><img src={overlay.item.image} alt="" className="max-h-64 w-full rounded-lg object-cover"/><p className="text-xl font-semibold">{overlay.item.price}</p><p className="text-sm text-muted-foreground">{overlay.item.meta}. Esta é uma ficha fictícia para testar a navegação.</p><div className="flex flex-wrap gap-2"><Button onClick={()=>toggle(overlay.item.id)} variant="outline"><Heart className={saved.has(overlay.item.id)?"fill-[#B84A3A] stroke-[#B84A3A]":"stroke-current"}/>{saved.has(overlay.item.id)?"Remover dos salvos":"Salvar anúncio"}</Button><Button onClick={()=>navigate(overlay.item.kind==="Imóvel"?"/imoveis":"/desapegos")}>Abrir catálogo <ArrowRight/></Button></div></>}
    {overlay?.type==="question"&&chosenQuestion&&<><DialogHeader><DialogTitle className="font-serif text-[22px]">{chosenQuestion.title}</DialogTitle><DialogDescription>{chosenQuestion.category} · {chosenQuestion.city} · Pergunta fictícia</DialogDescription></DialogHeader><div className="space-y-2 text-sm">{chosenQuestion.answers.map((a,i)=><div key={i} className="rounded-lg bg-muted p-3"><strong>{a.author}</strong><p className="mt-1">{a.text}</p></div>)}{answered[chosenQuestion.id]&&<div className="rounded-lg bg-muted p-3"><strong>Sua resposta nesta demonstração</strong><p className="mt-1">{answered[chosenQuestion.id]}</p></div>}</div><label htmlFor="home-answer" className="text-xs font-semibold">Sua orientação</label><textarea id="home-answer" rows={4} value={answerText} onChange={e=>setAnswerText(e.target.value)} placeholder="Compartilhe sua experiência..." className="w-full resize-y rounded-lg border bg-card p-3 text-sm outline-ring"/><Button disabled={!answerText.trim()} onClick={()=>{setAnswered({...answered,[chosenQuestion.id]:answerText.trim()});setOverlay(null)}}>Salvar resposta neste teste <Check className="size-4"/></Button><p className="text-[11px] text-muted-foreground">A resposta permanece somente nesta sessão de demonstração.</p></>}
    {overlay?.type==="saved"&&<><DialogHeader><DialogTitle>Seus salvos</DialogTitle><DialogDescription>Anúncios marcados durante este teste.</DialogDescription></DialogHeader>{!saved.size?<p className="py-5 text-sm text-muted-foreground">Você ainda não salvou anúncios.</p>:catalog.filter(v=>saved.has(v.id)).map(v=><button key={v.id} onClick={()=>openListing(v)} className="flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-muted"><img src={v.image} className="size-14 rounded-md object-cover" alt=""/><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{v.title}</strong><small>{v.price}</small></span><ChevronRight className="size-4"/></button>)}</>}
    {overlay?.type==="create"&&<><DialogHeader><DialogTitle>Fazer uma publicação</DialogTitle><DialogDescription>Formulário local para experimentar o fluxo. Não é uma publicação real.</DialogDescription></DialogHeader><label htmlFor="home-kind" className="text-xs font-semibold">Tipo</label><select id="home-kind" value={creationType} onChange={e=>setCreationType(e.target.value)} className="min-h-11 rounded-lg border bg-card px-3 text-sm"><option>Pergunta</option><option>Desapego</option><option>Imóvel</option><option>Serviço</option></select><label htmlFor="home-title" className="text-xs font-semibold">Título</label><input id="home-title" value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Ex.: Busco indicação de escola" className="min-h-11 rounded-lg border bg-card px-3 text-sm"/><label htmlFor="home-detail" className="text-xs font-semibold">Descrição</label><textarea id="home-detail" rows={3} value={draftDetail} onChange={e=>setDraftDetail(e.target.value)} className="rounded-lg border bg-card p-3 text-sm"/><Button disabled={!draftTitle.trim()} onClick={()=>{setCreated({title:creationType+" — "+draftTitle.trim(),detail:draftDetail.trim()});setOverlay(null);setDraftTitle("");setDraftDetail("")}}>Adicionar ao modo de teste <Plus className="size-4"/></Button></>}
    {overlay?.type==="about"&&<><DialogHeader><DialogTitle>Componentes e origem do código</DialogTitle><DialogDescription>Não é uma interface inspirada apenas em capturas de tela. O código-fonte dos blocos foi copiado e adaptado onde necessário.</DialogDescription></DialogHeader><div className="space-y-3">{sourceLinks.map(link=><a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-sm hover:bg-muted"><span>{link.name}</span><ArrowUpRight className="size-4"/></a>)}</div><p className="text-xs leading-relaxed text-muted-foreground">A busca conserva o filtro, o diálogo e a renderização de resultados do Blocks.so; o catálogo parte de Product List 01 do Shadcn Studio, com preço e favoritos adaptados; a timeline importa diretamente o componente ReUI. Para navegação usei os primitives de Card do Shadcn Studio, não o Card Nav premium. Conteúdo e respostas são fictícios.</p><Link href="/laboratorio-blocos" className="text-sm underline underline-offset-4">Ver laboratório anterior</Link></>}
  </DialogContent></Dialog>
  {created&&<div role="status" className="fixed bottom-24 right-4 z-40 max-w-sm rounded-xl border bg-card p-4 shadow-xl md:bottom-6"><div className="flex items-center justify-between gap-3"><strong className="text-sm">Criado somente nesta prévia</strong><button aria-label="Dispensar aviso" onClick={()=>setCreated(null)}><X className="size-4"/></button></div><p className="mt-2 text-xs">{created.title}</p><p className="mt-1 text-xs text-muted-foreground">{created.detail}</p></div>}
 </div>
}
