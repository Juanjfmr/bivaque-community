"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home, Search, Building2, ShoppingBag, BriefcaseBusiness, Users, MessageCircle,
  ClipboardList, MapPinned, Compass, CalendarDays, Ticket, Car, UserRound,
  Bookmark, Plus, ChevronRight, Check, Bell, Filter, Settings, Shield,
  MapPin, Heart, ArrowRight, Send, CircleHelp, Clock, ListChecks,
  LogOut, CircleCheck, Eye, ExternalLink, Star, SlidersHorizontal, Menu,
  SunMoon, Sun, Moon, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger, SidebarSeparator } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Item, ItemGroup, ItemContent, ItemDescription, ItemTitle, ItemMedia, ItemActions, ItemSeparator } from "@/components/ui/item";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Combobox, ComboboxContent, ComboboxInput, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui/combobox";
import { HOUSING, CLASSIFIEDS, PROVIDERS, QUESTIONS, GROUPS, EVENTS, REQUESTS, BENEFITS, VILLAS, ARRIVAL_STEPS, BRASILIA_GUIDE, TALENTS, RIDES } from "@/components/modules/fixtures";

type Item = { city: string; id: string; title: string; description: string; meta: string; image?: string; price?: string; badge?: string; kind: string };
type Chat = { id: string; name: string; context: string; messages: { self: boolean; body: string }[] };
type Post = { id: string; title: string; detail: string; kind: string };
const routes = [
  { label: "Início", slug: "inicio", icon: Home, group: "principal" },
  { label: "Comunidade", slug: "comunidade", icon: Users, group: "principal" },
  { label: "Conversas", slug: "conversas", icon: MessageCircle, group: "principal" },
  { label: "Você", slug: "voce", icon: UserRound, group: "principal" },
  { label: "Imóveis", slug: "imoveis", icon: Building2, group: "explorar" },
  { label: "Desapegos", slug: "desapegos", icon: ShoppingBag, group: "explorar" },
  { label: "Serviços", slug: "servicos", icon: BriefcaseBusiness, group: "explorar" },
  { label: "Grupos", slug: "grupos", icon: Users, group: "explorar" },
  { label: "Movimentação", slug: "movimentacao", icon: Compass, group: "explorar" },
  { label: "Guia da Cidade", slug: "guia", icon: MapPinned, group: "explorar" },
  { label: "Pedidos", slug: "pedidos", icon: ClipboardList, group: "explorar" },
  { label: "Agenda", slug: "agenda", icon: CalendarDays, group: "explorar" },
  { label: "Vilas", slug: "vilas", icon: Shield, group: "explorar" },
  { label: "Clube", slug: "clube", icon: Ticket, group: "explorar" },
  { label: "Talentos", slug: "talentos", icon: UserRound, group: "futuro" },
  { label: "Caronas", slug: "caronas", icon: Car, group: "futuro" },
  { label: "Busca", slug: "busca", icon: Search, group: "oculto" },
  { label: "Salvos", slug: "salvos", icon: Bookmark, group: "oculto" },
  { label: "Negócios", slug: "negocios", icon: BriefcaseBusiness, group: "oculto" },
] as const;
const money = (n: number) => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const INITIAL_CITY = "Brasília";
const CITIES = ["Brasília","Manaus","Rio de Janeiro","Recife","Natal","Belém"];
const allItems: Item[] = [
  ...HOUSING.map(v=>({id:v.id,city:v.city,title:v.title,description:v.description,meta:v.hood+" · "+v.bedrooms+" quartos · "+v.area+" m²",image:v.image,price:v.priceLabel,badge:v.type,kind:"imoveis"})),
  ...CLASSIFIEDS.map(v=>({id:v.id,city:v.city,title:v.title,description:v.description,meta:v.hood+" · "+v.condition,image:v.image,price:money(v.price),badge:v.category,kind:"desapegos"})),
  ...PROVIDERS.map(v=>({id:v.id,city:v.city,title:v.name,description:v.description,meta:v.hood+" · "+v.category,image:v.image,badge:v.category,kind:"servicos"})),
];
const options=["Pergunta","Imóvel","Desapego","Negócio","Pedido","Grupo","Encontro","Talento","Carona"];
const store="bivaque-library-only-v1";
const brandAssetBase=process.env.NEXT_PUBLIC_BASE_PATH || "";
const createButtonClass="bg-bivaque-brasa text-bivaque-brasa-foreground hover:bg-bivaque-brasa-hover border-transparent";
const readStore=()=>{if(typeof window==="undefined")return null;try{return JSON.parse(localStorage.getItem(store)||"null")}catch{return null}};
const initials=(name:string)=>name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

export default function LibraryApp(){
  const {setTheme}=useTheme();
  const router=useRouter();const path=usePathname();
  const slug=path.split("/").filter(Boolean).pop()||"inicio";
  const page=routes.find(v=>v.slug===slug)||routes[0];
  const [city,setCity]=React.useState(INITIAL_CITY);
  const [query,setQuery]=React.useState("");
  const [category,setCategory]=React.useState("Todos");
  const [sort,setSort]=React.useState("Mais recentes");
  const [saved,setSaved]=React.useState<string[]>([]);
  const [joined,setJoined]=React.useState<string[]>(["g1"]);
  const [going,setGoing]=React.useState<string[]>([]);
  const [steps,setSteps]=React.useState<string[]>([]);
  const [likes,setLikes]=React.useState<string[]>([]);
  const [followed,setFollowed]=React.useState<string[]>([]);
  const [resolved,setResolved]=React.useState<string[]>(QUESTIONS.filter(q=>q.resolved).map(q=>q.id));
  const [posts,setPosts]=React.useState<Post[]>([]);
  const [replies,setReplies]=React.useState<Record<string,string[]>>({});
  const [chats,setChats]=React.useState<Chat[]>([{id:"demo1",name:"Famílias militares",context:"Demonstração",messages:[{self:false,body:"Bem-vindo à prévia do Bivaque. Esta conversa é fictícia."}]}]);
  const [chatId,setChatId]=React.useState("demo1");
  const [message,setMessage]=React.useState("");
  const [detail,setDetail]=React.useState<Item|null>(null);
  const [detailOpen,setDetailOpen]=React.useState(false);
  const [filtersOpen,setFiltersOpen]=React.useState(false);
  const [mobileFiltersOpen,setMobileFiltersOpen]=React.useState(false);
  const [draftPrice,setDraftPrice]=React.useState("Sem limite");
  const [draftBeds,setDraftBeds]=React.useState("Qualquer");
  const [draftOm,setDraftOm]=React.useState("Todas");
  const [replyTo,setReplyTo]=React.useState<string|null>(null);
  const [replyDraft,setReplyDraft]=React.useState("");
  const [origin,setOrigin]=React.useState<{question:string,author:string,text:string}|null>(null);
  const [endorsed,setEndorsed]=React.useState<string[]>([]);
  const [composeOpen,setComposeOpen]=React.useState(false);
  const [composeType,setComposeType]=React.useState("Pergunta");
  const [title,setTitle]=React.useState("");const [description,setDescription]=React.useState("");
  const [searchOpen,setSearchOpen]=React.useState(false);
  const [maxPrice,setMaxPrice]=React.useState("Sem limite");
  const [minBeds,setMinBeds]=React.useState("Qualquer");
  const [om,setOm]=React.useState("Todas");
  const [villaAccess,setVillaAccess]=React.useState(false);
  const [villa,setVilla]=React.useState("v1");
  const [tab,setTab]=React.useState("Indicações");
  const [loaded,setLoaded]=React.useState(false);
  React.useEffect(()=>{const v=readStore();if(v){setCity(v.city||INITIAL_CITY);setSaved(v.saved||[]);setJoined(v.joined||["g1"]);setGoing(v.going||[]);setSteps(v.steps||[]);setLikes(v.likes||[]);setFollowed(v.followed||[]);setResolved(v.resolved||[]);setPosts(v.posts||[]);setReplies(v.replies||{});setChats(v.chats||[]);setEndorsed(v.endorsed||[])}setLoaded(true)},[]);
  React.useEffect(()=>{if(loaded)localStorage.setItem(store,JSON.stringify({city,saved,joined,going,steps,likes,followed,resolved,posts,replies,chats,endorsed}))},[loaded,city,saved,joined,going,steps,likes,followed,resolved,posts,replies,chats,endorsed]);
  React.useEffect(()=>{if(slug!=="busca")setQuery("");setCategory("Todos");setTab("Indicações")},[slug]);
  React.useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setSearchOpen(true)}};document.addEventListener("keydown",fn);return()=>document.removeEventListener("keydown",fn)},[]);
  function navigate(to:string){router.push("/"+to);window.scrollTo({top:0,behavior:"smooth"})}
  function toggle(id:string,arr:string[],setter:React.Dispatch<React.SetStateAction<string[]>>){setter(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
  function openCreate(v="Pergunta"){setComposeType(v);setTitle("");setDescription("");setComposeOpen(true)}
  function submitCreate(e:React.FormEvent){e.preventDefault();if(!title.trim()||!description.trim()){toast.error("Preencha título e descrição");return;}setPosts(a=>[{id:"local-"+Date.now(),title:title.trim(),detail:description.trim(),kind:composeType},...a]);setComposeOpen(false);toast.success("Salvo nesta demonstração. Nenhum dado foi publicado.")}
  function contact(name:string,context:string){const old=chats.find(c=>c.name===name&&c.context===context);if(old){setChatId(old.id)}else{const id="c"+Date.now();setChats(a=>[{id,name,context,messages:[{self:true,body:"Olá! Tenho interesse em "+context+"."}]},...a]);setChatId(id)}setDetailOpen(false);navigate("conversas")}
  function openFilters(){setDraftPrice(maxPrice);setDraftBeds(minBeds);setDraftOm(om);if(typeof window!=="undefined"&&window.matchMedia("(max-width: 639px)").matches)setMobileFiltersOpen(true);else setFiltersOpen(true)}
  function applyFilters(){setMaxPrice(draftPrice);setMinBeds(draftBeds);setOm(draftOm);setFiltersOpen(false);setMobileFiltersOpen(false)}
  function submitReply(e:React.FormEvent){e.preventDefault();if(!replyTo||!replyDraft.trim())return;setReplies(r=>({...r,[replyTo]:[...(r[replyTo]||[]),replyDraft.trim()]}));setReplyTo(null);setReplyDraft("");toast.success("Resposta registrada localmente")}
  function send(e:React.FormEvent){e.preventDefault();if(!message.trim())return;setChats(a=>a.map(c=>c.id===chatId?{...c,messages:[...c.messages,{self:true,body:message.trim()}]}:c));setMessage("");toast.info("Mensagem registrada localmente")}
  const allSaved=allItems.filter(x=>saved.includes(x.id));
  const filtered=allItems.filter(x=>x.city===city&&(slug==="busca"||slug==="inicio"||slug==="salvos"?true:x.kind===(slug==="negocios"?"servicos":slug))&&(slug!=="salvos"||saved.includes(x.id))&&(category==="Todos"||category===x.badge)&&(!query||(x.title+" "+x.meta+" "+x.description).toLowerCase().includes(query.toLowerCase()))&&
    (!maxPrice||maxPrice==="Sem limite"||x.kind!=="imoveis"||HOUSING.find(h=>h.id===x.id)!.price<=Number(maxPrice))&&
    (minBeds==="Qualquer"||x.kind!=="imoveis"||HOUSING.find(h=>h.id===x.id)!.bedrooms>=Number(minBeds))&&
    (om==="Todas"||x.kind!=="imoveis"||HOUSING.find(h=>h.id===x.id)!.om===om));
  const ordered=[...filtered].sort((a,b)=>sort==="Menor preço"?Number((HOUSING.find(h=>h.id===a.id)||CLASSIFIEDS.find(h=>h.id===a.id))?.price||0)-Number((HOUSING.find(h=>h.id===b.id)||CLASSIFIEDS.find(h=>h.id===b.id))?.price||0):0);
  function card(v:Item){
    return <Card key={v.id} className="overflow-hidden">
      {v.image?<button type="button" onClick={()=>{setDetail(v);setDetailOpen(true)}} className="w-full text-left"><AspectRatio ratio={16/9}><img src={v.image} alt={v.title} loading="lazy" className="size-full object-cover"/></AspectRatio></button>:null}
      <CardHeader><div className="flex items-start justify-between gap-2"><Badge variant="secondary">{v.badge||v.kind}</Badge><Button size="icon" variant="ghost" aria-label={saved.includes(v.id)?"Remover favorito":"Salvar favorito"} onClick={()=>toggle(v.id,saved,setSaved)}><Heart className={saved.includes(v.id)?"fill-current":""}/></Button></div><CardTitle className="text-base">{v.title}</CardTitle><CardDescription>{v.meta}</CardDescription></CardHeader>
      <CardContent>{v.price?<p className="text-lg font-semibold">{v.price}</p>:<p className="text-sm text-muted-foreground">{v.description}</p>}</CardContent>
      <CardFooter><Button variant="outline" className="w-full" onClick={()=>{setDetail(v);setDetailOpen(true)}}>Ver detalhes <ArrowRight/></Button></CardFooter>
    </Card>;
  }
  const pageTitle=page.label;
  const isMarketplace=["imoveis","desapegos","servicos","negocios","salvos"].includes(slug);
  const showItems=(items:Item[])=>items.length?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(card)}</div>:<Alert><CircleHelp/><AlertTitle>Nenhum resultado</AlertTitle><AlertDescription>Altere os filtros ou selecione outra cidade.</AlertDescription></Alert>;
  const createButton=<Button className={createButtonClass} onClick={()=>openCreate(slug==="imoveis"?"Imóvel":slug==="desapegos"?"Desapego":slug==="servicos"?"Negócio":slug==="pedidos"?"Pedido":slug==="grupos"?"Grupo":slug==="agenda"?"Encontro":"Pergunta")}><Plus/>Criar</Button>;
  function notice(){return <Alert><Shield/><AlertTitle>Prévia demonstrativa</AlertTitle><AlertDescription>Todos os perfis, avaliações, imóveis, propostas, preços e eventos são fictícios. Nenhuma ação envia informações para terceiros.</AlertDescription></Alert>}
  const header=<div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-1"><h1 className="font-serif text-3xl font-semibold tracking-tight">{pageTitle}</h1><p className="text-sm text-muted-foreground">{slug==="inicio"?"A rede que acompanha a vida militar.":slug==="movimentacao"?"Planeje sua chegada e compartilhe experiências.":slug==="comunidade"?"O conhecimento da comunidade fica acessível a quem chegar depois.":"Explore possibilidades da comunidade militar em "+city+"."}</p></div>{slug!=="voce"&&slug!=="conversas"&&slug!=="salvos"&&slug!=="busca"&&createButton}</div>;
  function homePage(){
    const homes=allItems.filter(x=>x.kind==="imoveis"&&x.city===city).slice(0,3);
    const providers=PROVIDERS.filter(x=>x.city===city).sort((a,b)=>b.recommendations-a.recommendations);
    const qs=QUESTIONS.filter(x=>x.city===city).filter(x=>!resolved.includes(x.id)).slice(0,3);
    const shortcuts=[["Imóveis",Building2,"imoveis"],["Serviços",BriefcaseBusiness,"servicos"],["Desapegos",ShoppingBag,"desapegos"],["Indicações",MessageCircle,"comunidade"]] as const;
    return <div className="space-y-7">
      <Alert><Shield/><AlertTitle>Exploração com dados fictícios</AlertTitle><AlertDescription>Você está testando os componentes e jornadas do Bivaque. Não há perfis, avaliações ou anúncios reais.</AlertDescription></Alert>
      <Card className="overflow-hidden">
        <div className="relative isolate min-h-64 overflow-hidden bg-muted sm:min-h-72">
          <img className="absolute inset-0 size-full object-cover" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1300&q=85" alt="" aria-hidden="true"/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25"/>
          <div className="relative z-10 max-w-xl space-y-4 p-6 text-white sm:p-9">
            <Badge variant="secondary" className="w-fit">BIVAQUE · COMUNIDADE MILITAR</Badge>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">O que você precisa em {city}?</h1>
            <p className="max-w-md text-sm leading-relaxed text-white/85">Moradia, serviços, pessoas e experiências úteis em cada nova etapa da vida militar.</p>
            <Button variant="secondary" className="w-full justify-start text-foreground sm:max-w-md" onClick={()=>setSearchOpen(true)}><Search/>Buscar no Bivaque<span className="ml-auto text-xs text-muted-foreground">Ctrl K</span></Button>
          </div>
        </div>
        <CardContent className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          {shortcuts.map(([name,Icon,to])=><Button key={name} variant="outline" className="h-12 justify-start gap-2" onClick={()=>navigate(to)}><Icon/>{name}</Button>)}
        </CardContent>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(275px,1fr)]">
        <div className="min-w-0 space-y-7">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2"><div><h2 className="font-serif text-xl font-semibold tracking-tight">Serviços da comunidade</h2><p className="text-sm text-muted-foreground">Indicações orgânicas, sem classificação por estrelas.</p></div><Button variant="ghost" size="sm" onClick={()=>navigate("servicos")}>Ver todos <ArrowRight/></Button></div>
            {providers.length?<ItemGroup className="rounded-xl border bg-card p-2">{providers.slice(0,4).map(p=><Item key={p.id} variant="default" size="sm"><ItemMedia variant="image"><img alt="" src={p.image} className="size-14 rounded-md object-cover"/></ItemMedia><ItemContent><ItemTitle>{p.name}</ItemTitle><ItemDescription>{p.category} · {p.hood} · {p.recommendations} indicações fictícias</ItemDescription></ItemContent><ItemActions><Button variant="outline" size="sm" onClick={()=>{setDetail(allItems.find(x=>x.id===p.id)||null);setDetailOpen(true)}}>Ver ficha <ChevronRight/></Button></ItemActions></Item>)}</ItemGroup>:<Alert><CircleHelp/><AlertTitle>Sem serviços demonstrativos nesta cidade</AlertTitle></Alert>}
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between"><div><h2 className="font-serif text-xl font-semibold tracking-tight">Imóveis da comunidade</h2><p className="text-sm text-muted-foreground">Anúncios ilustrativos para explorar.</p></div><Button variant="ghost" size="sm" onClick={()=>navigate("imoveis")}>Ver todos <ArrowRight/></Button></div>
            {homes.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{homes.map(card)}</div>:<Alert><CircleHelp/><AlertTitle>Sem imóveis demonstrativos em {city}</AlertTitle></Alert>}
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2"><h2 className="font-serif text-xl font-semibold tracking-tight">Continue explorando</h2><Button variant="ghost" size="sm" onClick={()=>navigate("movimentacao")}>Movimentação <ArrowRight/></Button></div>
            <div className="grid gap-3 sm:grid-cols-2">{routes.filter(x=>["movimentacao","guia","pedidos","vilas","clube","agenda"].includes(x.slug)).map(x=><Item variant="outline" key={x.slug} className="cursor-pointer" onClick={()=>navigate(x.slug)}><ItemMedia variant="icon"><x.icon/></ItemMedia><ItemContent><ItemTitle>{x.label}</ItemTitle><ItemDescription>{x.slug==="movimentacao"?"Organize sua transferência":x.slug==="guia"?"Conheça a próxima cidade":x.slug==="pedidos"?"Solicite e compare orçamentos":x.slug==="vilas"?"Convivência e administração":"Conecte-se com a comunidade"}</ItemDescription></ItemContent><ItemActions><ChevronRight className="size-4 text-muted-foreground"/></ItemActions></Item>)}</div>
          </section>
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Perguntas que precisam de ajuda</CardTitle><CardDescription>Conhecimento compartilhado da comunidade.</CardDescription></CardHeader>
            <CardContent>{qs.length?<ItemGroup>{qs.map((q,i)=><React.Fragment key={q.id}><Item size="sm" className="px-0"><ItemMedia><Avatar><AvatarFallback>{initials(q.author)}</AvatarFallback></Avatar></ItemMedia><ItemContent><ItemTitle className="line-clamp-2">{q.title}</ItemTitle><ItemDescription>{q.answers.length+(replies[q.id]?.length||0)} respostas · {q.category}</ItemDescription></ItemContent><ItemActions><Button variant="ghost" size="icon" aria-label="Ver pergunta" onClick={()=>{navigate("comunidade");setTab("Indicações")}}><ChevronRight/></Button></ItemActions></Item>{i<qs.length-1&&<ItemSeparator/>}</React.Fragment>)}</ItemGroup>:<p className="text-sm text-muted-foreground">Nenhuma pergunta em aberto nos dados de {city}.</p>}</CardContent>
            <CardFooter><Button variant="outline" className="w-full" onClick={()=>navigate("comunidade")}>Abrir Comunidade</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Seus grupos</CardTitle><CardDescription>Compartilhe o que importa.</CardDescription></CardHeader>
            <CardContent><ItemGroup>{GROUPS.filter(x=>x.city===city).slice(0,3).map(g=><Item key={g.id} size="sm" className="px-0"><ItemMedia><Avatar><AvatarFallback>{initials(g.name)}</AvatarFallback></Avatar></ItemMedia><ItemContent><ItemTitle>{g.name}</ItemTitle><ItemDescription>{g.members} integrantes</ItemDescription></ItemContent><ItemActions><Button size="icon" variant="ghost" aria-label="Abrir grupos" onClick={()=>navigate("grupos")}><ChevronRight/></Button></ItemActions></Item>)}</ItemGroup></CardContent>
            <CardFooter><Button className="w-full" variant="outline" onClick={()=>navigate("grupos")}>Ver grupos</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Próximos encontros</CardTitle></CardHeader>
            <CardContent><ItemGroup>{EVENTS.filter(x=>x.city===city).slice(0,2).map(e=><Item key={e.id} size="sm" className="px-0"><ItemMedia variant="icon"><CalendarDays/></ItemMedia><ItemContent><ItemTitle>{e.title}</ItemTitle><ItemDescription>{e.when} · {e.place}</ItemDescription></ItemContent></Item>)}</ItemGroup></CardContent>
            <CardFooter><Button variant="outline" className="w-full" onClick={()=>navigate("agenda")}>Abrir agenda</Button></CardFooter>
          </Card>
        </aside>
      </div>
    </div>;
  }
  function marketplace(){
    const isHousing=slug==="imoveis";const isProvider=["servicos","negocios"].includes(slug);
    const opts=["Todos",...new Set(isHousing?HOUSING.map(x=>x.type):isProvider?PROVIDERS.map(x=>x.category):CLASSIFIEDS.map(x=>x.category))];
    const data=ordered;
    return <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><Badge variant="outline">{isHousing?"MORADIA":isProvider?"SERVIÇOS":"COMUNIDADE"}</Badge><h1 className="text-3xl font-bold tracking-tight">{isHousing?"Imóveis":isProvider?"Negócios e serviços":slug==="desapegos"?"Desapegos":"Itens salvos"}</h1><p className="text-sm text-muted-foreground">{isHousing?"Encontre imóveis e filtre por organização militar.":isProvider?"Descubra quem pode ajudar. Recomendações não são verificações.":"Anúncios compartilhados pela comunidade."}</p></div>{slug!=="salvos"&&<Button className={createButtonClass} onClick={()=>openCreate(isHousing?"Imóvel":isProvider?"Negócio":"Desapego")}><Plus/>Anunciar</Button>}</div>
      {notice()}
      {isProvider&&<Alert><BriefcaseBusiness/><AlertTitle>Precisa contratar?</AlertTitle><AlertDescription><span>Publique sua necessidade e compare propostas antes de decidir.</span><Button className="mt-2" variant="outline" size="sm" onClick={()=>navigate("pedidos")}>Criar pedido <ArrowRight/></Button></AlertDescription></Alert>}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder={isHousing?"Bairro, imóvel ou OM...":"Buscar serviço, item ou bairro..."} className="pl-9"/></div>
          <Button variant="outline" onClick={openFilters}><SlidersHorizontal/>Filtros{maxPrice!=="Sem limite"||minBeds!=="Qualquer"||om!=="Todas"?<Badge variant="secondary">Ativos</Badge>:null}</Button>
        </div>
        <div className="w-full overflow-x-auto pb-1"><ToggleGroup type="single" variant="outline" value={category} onValueChange={v=>setCategory(v||"Todos")} className="justify-start whitespace-nowrap">{opts.map(x=><ToggleGroupItem key={x} value={x} className="shrink-0 px-4">{x}</ToggleGroupItem>)}</ToggleGroup></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{data.length}</strong> resultados em {city}</p>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Mais recentes">Mais recentes</SelectItem><SelectItem value="Menor preço">Menor preço</SelectItem></SelectContent></Select>
      </div>
      {isProvider?data.length?<ItemGroup className="rounded-xl border bg-card p-2">{data.map((v,i)=><React.Fragment key={v.id}><Item size="default" className="items-start sm:items-center">
          <ItemMedia variant="image"><img className="size-20 rounded-lg object-cover sm:size-24" src={v.image} alt="" loading="lazy"/></ItemMedia>
          <ItemContent><ItemTitle className="text-base">{v.title}</ItemTitle><ItemDescription>{v.meta}</ItemDescription><ItemDescription className="line-clamp-2">{v.description}</ItemDescription><div className="flex gap-2 pt-1"><Badge variant="outline">{v.badge}</Badge><Badge variant="secondary">Ficha de demonstração</Badge></div></ItemContent>
          <ItemActions><Button variant="outline" onClick={()=>{setDetail(v);setDetailOpen(true)}}>Ver ficha <ArrowRight/></Button></ItemActions>
        </Item>{i<data.length-1&&<ItemSeparator/>}</React.Fragment>)}</ItemGroup>:<Alert><CircleHelp/><AlertTitle>Nenhum serviço nesta seleção</AlertTitle></Alert>:showItems(data)}
      {isHousing&&<Alert><MapPinned/><AlertTitle>Busque por organização militar</AlertTitle><AlertDescription>A OM restringe a lista pelos vínculos demonstrativos cadastrados. Distâncias e coordenadas não foram homologadas.</AlertDescription></Alert>}
    </div>;
  }
  function community(){
    const existing=QUESTIONS.filter(q=>q.city===city).map(q=>({id:q.id,title:q.title,category:q.category,author:q.author,date:q.date,allReplies:[...q.answers.map(x=>({author:x.author,text:x.text,date:x.date})),...(replies[q.id]||[]).map(x=>({author:"Você",text:x,date:"Agora"}))]}));
    const mine=posts.filter(p=>p.kind==="Pergunta").map(p=>({id:p.id,title:p.title,category:"Pergunta",author:"Você",date:"Agora",allReplies:(replies[p.id]||[]).map(x=>({author:"Você",text:x,date:"Agora"}))}));
    const all=[...mine,...existing].filter(q=>(category==="Todos"||category==="Para ajudar")&&!resolved.includes(q.id)&&q.author!=="Você"||category==="Resolvidas"&&resolved.includes(q.id)||category==="Minhas"&&q.author==="Você");
    const orderedQuestions=[...all].sort((a,b)=>a.allReplies.length-b.allReplies.length);
    return <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><Badge variant="outline">MEMÓRIA COLETIVA</Badge><h1 className="font-serif text-3xl font-semibold tracking-tight">Comunidade</h1><p className="text-sm text-muted-foreground">O que a comunidade sabe fica disponível para quem chegar depois.</p></div><Button className={createButtonClass} onClick={()=>openCreate(tab==="Grupos"?"Grupo":"Pergunta")}><Plus/>{tab==="Grupos"?"Criar grupo":"Perguntar"}</Button></div>
      {notice()}
      <Tabs value={tab} onValueChange={v=>{setTab(v);setCategory("Todos")}} className="space-y-4">
        <TabsList className="w-full justify-start sm:w-auto"><TabsTrigger value="Indicações">Indicações</TabsTrigger><TabsTrigger value="Grupos">Grupos</TabsTrigger><TabsTrigger value="Negócios">Negócios</TabsTrigger></TabsList>
        <TabsContent value="Indicações" className="space-y-4">
          <Alert><CircleCheck/><AlertTitle>{QUESTIONS.filter(q=>q.city===city&&resolved.includes(q.id)).length} indicações resolvidas</AlertTitle><AlertDescription>Busque uma resposta antes de perguntar. As perguntas sem respostas aparecem primeiro.</AlertDescription></Alert>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ToggleGroup type="single" variant="outline" value={category==="Todos"?"Para ajudar":category} onValueChange={v=>setCategory(v||"Para ajudar")} className="justify-start"><ToggleGroupItem value="Para ajudar">Para ajudar</ToggleGroupItem><ToggleGroupItem value="Resolvidas">Resolvidas</ToggleGroupItem><ToggleGroupItem value="Minhas">Minhas</ToggleGroupItem></ToggleGroup>
            <Button size="sm" className={createButtonClass} onClick={()=>openCreate("Pergunta")}><Plus/>Perguntar</Button>
          </div>
          {orderedQuestions.length?<ItemGroup className="space-y-3">{orderedQuestions.map(q=><Card key={q.id}><CardContent className="space-y-3 pt-4">
            <Item size="sm" className="px-0"><ItemMedia><Avatar><AvatarFallback>{initials(q.author)}</AvatarFallback></Avatar></ItemMedia><ItemContent><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{q.category}</Badge>{resolved.includes(q.id)&&<Badge variant="secondary">Resolvida</Badge>}</div><ItemTitle className="pt-1 text-base leading-snug">{q.title}</ItemTitle><ItemDescription>{q.author} · {q.date} · {q.allReplies.length} respostas</ItemDescription></ItemContent></Item>
            <Accordion type="single" collapsible><AccordionItem value="respostas" className="border-b-0"><AccordionTrigger className="py-2 text-sm">{q.allReplies.length?"Ver "+q.allReplies.length+" respostas":"Ainda sem respostas"}</AccordionTrigger><AccordionContent><ItemGroup>{q.allReplies.length?q.allReplies.map((r,i)=><Item key={i} className="px-0" size="sm"><ItemMedia><Avatar className="size-8"><AvatarFallback>{initials(r.author)}</AvatarFallback></Avatar></ItemMedia><ItemContent><ItemTitle>{r.author}</ItemTitle><ItemDescription>{r.text}</ItemDescription><ItemDescription>{r.date}</ItemDescription></ItemContent><ItemActions><Button size="icon" variant="ghost" title="Ver origem" aria-label="Ver origem" onClick={()=>setOrigin({question:q.title,author:r.author,text:r.text})}><ExternalLink/></Button></ItemActions></Item>):<p className="text-sm text-muted-foreground">Compartilhe uma experiência para ajudar.</p>}</ItemGroup></AccordionContent></AccordionItem></Accordion>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={()=>{setReplyTo(q.id);setReplyDraft("")}}><MessageCircle/>Responder</Button>
              <Button variant="ghost" size="sm" onClick={()=>toggle(q.id,followed,setFollowed)}><Bell/>{followed.includes(q.id)?"Seguindo":"Seguir"}</Button>
              {q.author==="Você"&&<Button variant="ghost" size="sm" onClick={()=>toggle(q.id,resolved,setResolved)}><Check/>{resolved.includes(q.id)?"Reabrir":"Marcar resolvida"}</Button>}
            </div>
          </CardContent></Card>)}</ItemGroup>:<Alert><CircleHelp/><AlertTitle>Nenhuma pergunta nesta seleção</AlertTitle><AlertDescription>Você pode iniciar uma pergunta ou mudar o filtro.</AlertDescription></Alert>}
        </TabsContent>
        <TabsContent value="Grupos">{groupPage()}</TabsContent>
        <TabsContent value="Negócios"><ItemGroup className="rounded-lg border bg-card p-2">{PROVIDERS.filter(x=>x.city===city).map(p=><Item key={p.id}><ItemMedia variant="image"><img src={p.image} alt="" className="size-16 rounded-md object-cover"/></ItemMedia><ItemContent><ItemTitle>{p.name}</ItemTitle><ItemDescription>{p.category} · {p.hood} · {p.recommendations} indicações fictícias</ItemDescription></ItemContent><ItemActions><Button size="sm" variant="outline" onClick={()=>{setDetail(allItems.find(x=>x.id===p.id)||null);setDetailOpen(true)}}>Ficha <ChevronRight/></Button></ItemActions></Item>)}</ItemGroup></TabsContent>
      </Tabs>
    </div>;
  }
  function groupPage(){return <div className="grid gap-4 md:grid-cols-2">{GROUPS.filter(g=>g.city===city).map(g=><Card key={g.id}><CardHeader><CardTitle>{g.name}</CardTitle><CardDescription>{g.description}</CardDescription></CardHeader><CardContent className="space-y-3"><Badge variant="secondary">{g.members} integrantes</Badge><Accordion type="single" collapsible><AccordionItem value="posts"><AccordionTrigger>Publicações da comunidade</AccordionTrigger><AccordionContent>{joined.includes(g.id)?g.posts.map(p=><p className="py-2" key={p.id}>{p.author}: {p.text}</p>):"Participe de um grupo aberto para ver publicações."}</AccordionContent></AccordionItem></Accordion></CardContent><CardFooter><Button variant={joined.includes(g.id)?"outline":"default"} onClick={()=>{if(!g.open&&!joined.includes(g.id)){toast.info("Grupo restrito: aprovação necessária");return}toggle(g.id,joined,setJoined);toast.success("Participação demonstrativa atualizada")}}>{joined.includes(g.id)?"Sair do grupo":g.open?"Participar":"Solicitar acesso"}</Button></CardFooter></Card>)}</div>}
  function movement(){return <div className="space-y-6">{header}{notice()}<Card><CardHeader><CardTitle>Plano de chegada a {city}</CardTitle><CardDescription>Organize sua transferência passo a passo.</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={steps.length/ARRIVAL_STEPS.length*100}/><p className="text-sm text-muted-foreground">{steps.length} de {ARRIVAL_STEPS.length} concluídas</p>{ARRIVAL_STEPS.map(s=><div className="flex items-start gap-3" key={s.id}><Checkbox id={s.id} checked={steps.includes(s.id)} onCheckedChange={()=>toggle(s.id,steps,setSteps)}/><div><Label htmlFor={s.id}>{s.title}</Label><p className="text-sm text-muted-foreground">{s.detail}</p></div></div>)}</CardContent></Card><div className="grid gap-4 md:grid-cols-3">{[{slug:"imoveis",name:"Pesquisar moradia",icon:Building2},{slug:"pedidos",name:"Orçamento de mudança",icon:ClipboardList},{slug:"grupos",name:"Pessoas da cidade",icon:Users}].map(v=><Card key={v.slug}><CardHeader><v.icon/><CardTitle>{v.name}</CardTitle></CardHeader><CardFooter><Button variant="outline" onClick={()=>navigate(v.slug)}>Abrir <ArrowRight/></Button></CardFooter></Card>)}</div></div>}
  function guide(){return <div className="space-y-5">{header}{notice()}<Accordion type="multiple" className="w-full">{BRASILIA_GUIDE.map((x,i)=><AccordionItem value={x.title} key={i}><AccordionTrigger>{x.title}</AccordionTrigger><AccordionContent><p>{x.body}</p><Button variant="outline" className="mt-3" onClick={()=>navigate(i===0?"imoveis":i===1?"comunidade":"servicos")}>Explorar módulo <ArrowRight/></Button></AccordionContent></AccordionItem>)}</Accordion></div>}
  function requests(){return <div className="space-y-5">{header}{notice()}<Tabs defaultValue="Todos"><TabsList><TabsTrigger value="Todos">Todos</TabsTrigger><TabsTrigger value="Aberto">Abertos</TabsTrigger><TabsTrigger value="Em negociação">Em negociação</TabsTrigger></TabsList>{["Todos","Aberto","Em negociação"].map(t=><TabsContent key={t} value={t}><div className="grid gap-4">{REQUESTS.filter(r=>t==="Todos"||t===r.status).map(r=><Card key={r.id}><CardHeader><Badge className="w-fit" variant="secondary">{r.status}</Badge><CardTitle>{r.title}</CardTitle><CardDescription>{r.hood} · {r.category}</CardDescription></CardHeader><CardContent><p className="text-sm">{r.detail}</p><Accordion type="single" collapsible><AccordionItem value="propostas"><AccordionTrigger>Comparar {r.proposals.length} propostas demonstrativas</AccordionTrigger><AccordionContent><Table><TableHeader><TableRow><TableHead>Prestador</TableHead><TableHead>Valor</TableHead><TableHead>Prazo</TableHead></TableRow></TableHeader><TableBody>{r.proposals.map(x=><TableRow key={x.provider}><TableCell>{x.provider}</TableCell><TableCell>{x.amount}</TableCell><TableCell>{x.timeline}</TableCell></TableRow>)}</TableBody></Table></AccordionContent></AccordionItem></Accordion></CardContent><CardFooter><Button variant="outline" onClick={()=>contact(r.author,r.title)}>Contato <MessageCircle/></Button></CardFooter></Card>)}</div></TabsContent>)}</Tabs></div>}
  function agenda(){return <div className="space-y-5">{header}{notice()}<div className="grid gap-4 md:grid-cols-2">{EVENTS.filter(e=>e.city===city).map(e=><Card key={e.id}><CardHeader><Badge className="w-fit" variant="outline">{e.category}</Badge><CardTitle>{e.title}</CardTitle><CardDescription><Clock className="mr-1 inline size-4"/>{e.when}</CardDescription></CardHeader><CardContent><p>{e.description}</p><p className="mt-2 text-sm text-muted-foreground"><MapPin className="mr-1 inline size-4"/>{e.place}</p></CardContent><CardFooter><Button variant={going.includes(e.id)?"outline":"default"} onClick={()=>toggle(e.id,going,setGoing)}>{going.includes(e.id)?"Presença confirmada":"Vou participar"}</Button></CardFooter></Card>)}</div></div>}
  function villas(){return <div className="space-y-5">{header}{notice()}<Tabs value={villa} onValueChange={v=>{setVilla(v);setVillaAccess(false)}}><TabsList>{VILLAS.map(v=><TabsTrigger key={v.id} value={v.id}>{v.name}</TabsTrigger>)}</TabsList>{VILLAS.map(v=><TabsContent value={v.id} key={v.id}><Card><CardHeader><CardTitle>{v.name}</CardTitle><CardDescription>{v.description}</CardDescription></CardHeader><CardContent className="space-y-4"><Alert><Shield/><AlertTitle>Comunidade restrita</AlertTitle><AlertDescription>O acesso real exige vínculo comprovado e aprovação. Esta prévia não realiza nenhuma verificação.</AlertDescription></Alert>{villaAccess?<Tabs defaultValue="Morador"><TabsList><TabsTrigger value="Morador">Morador</TabsTrigger><TabsTrigger value="Gestão">Gestão simulada</TabsTrigger></TabsList><TabsContent value="Morador"><Card className="mt-3"><CardHeader><CardTitle>Avisos da vila</CardTitle><CardDescription>Comunicados fictícios aos moradores.</CardDescription></CardHeader><CardContent><Button onClick={()=>toast.success("Aviso marcado como lido")}>Marcar aviso lido</Button></CardContent></Card></TabsContent><TabsContent value="Gestão"><Card className="mt-3"><CardHeader><CardTitle>Solicitações administrativas</CardTitle><CardDescription>Área exclusivamente demonstrativa.</CardDescription></CardHeader><CardContent><Button onClick={()=>openCreate("Pedido")}>Criar solicitação</Button></CardContent></Card></TabsContent></Tabs>:<Button onClick={()=>{setVillaAccess(true);toast.info("Modo de demonstração — sem autenticação")}}>Ver ambiente fictício</Button>}</CardContent></Card></TabsContent>)}</Tabs></div>}
  function club(){return <div className="space-y-5">{header}{notice()}<Alert><Ticket/><AlertTitle>Conceito de Clube Bivaque</AlertTitle><AlertDescription>Não há benefícios comerciais, descontos ou elegibilidade ativa.</AlertDescription></Alert><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{BENEFITS.map(b=><Card key={b.id}><CardHeader><Badge className="w-fit" variant="secondary">{b.category}</Badge><CardTitle>{b.partner}</CardTitle><CardDescription>{b.headline}</CardDescription></CardHeader><CardContent>{b.description}</CardContent><CardFooter><Button variant="outline" onClick={()=>{void navigator.clipboard?.writeText(b.code);toast.info("Código fictício copiado — não é válido")}}>Copiar código demonstrativo</Button></CardFooter></Card>)}</div></div>}
  function chatsPage(){const current=chats.find(x=>x.id===chatId);return <div className="space-y-5">{header}{notice()}<div className="grid gap-4 md:grid-cols-[270px_minmax(0,1fr)]"><Card><CardHeader><CardTitle>Conversas</CardTitle></CardHeader><CardContent className="space-y-2">{chats.map(c=><Button className="w-full justify-start" variant={c.id===chatId?"secondary":"ghost"} key={c.id} onClick={()=>setChatId(c.id)}>{c.name}</Button>)}</CardContent></Card><Card><CardHeader><CardTitle>{current?.name||"Selecione uma conversa"}</CardTitle><CardDescription>{current?.context||""}</CardDescription></CardHeader><CardContent><ScrollArea className="h-72"><div className="space-y-3">{current?.messages.map((m,i)=><Card className={m.self?"ml-8":"mr-8"} key={i}><CardContent className="pt-4 text-sm">{m.body}</CardContent></Card>)}</div></ScrollArea></CardContent><CardFooter><form onSubmit={send} className="flex w-full gap-2"><Input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Mensagem local…"/><Button type="submit" disabled={!message.trim()}><Send/></Button></form></CardFooter></Card></div></div>}
  function talents(){return <div className="space-y-5">{header}{notice()}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{TALENTS.filter(t=>t.city===city).map(t=><Card key={t.id}><CardHeader><Avatar><AvatarFallback>{initials(t.name)}</AvatarFallback></Avatar><CardTitle>{t.name}</CardTitle><CardDescription>{t.area}</CardDescription></CardHeader><CardContent><p className="text-sm">{t.description}</p><div className="mt-3 flex flex-wrap gap-2">{t.skills.map(x=><Badge variant="outline" key={x}>{x}</Badge>)}</div></CardContent><CardFooter><Button variant="outline" onClick={()=>contact(t.name,t.area)}>Entrar em contato</Button></CardFooter></Card>)}</div></div>}
  function rides(){return <div className="space-y-5">{header}{notice()}<div className="grid gap-4 sm:grid-cols-2">{RIDES.filter(t=>t.city===city).map(t=><Card key={t.id}><CardHeader><CardTitle>{t.origin} → {t.destination}</CardTitle><CardDescription>{t.when}</CardDescription></CardHeader><CardContent><p>{t.notes}</p><Badge variant="secondary">{t.seats} vagas fictícias</Badge></CardContent><CardFooter><Button variant="outline" onClick={()=>contact(t.driver,t.origin+" – "+t.destination)}>Tenho interesse</Button></CardFooter></Card>)}</div></div>}
  function you(){return <div className="space-y-5">{header}<Card><CardHeader><Avatar><AvatarFallback>CO</AvatarFallback></Avatar><CardTitle>Perfil de demonstração</CardTitle><CardDescription>Sem verificação militar ou autenticação real</CardDescription></CardHeader><CardContent><div className="flex gap-3"><Badge variant="outline">{saved.length} itens salvos</Badge><Badge variant="outline">{joined.length} grupos</Badge><Badge variant="outline">{going.length} eventos</Badge></div></CardContent></Card><Tabs defaultValue="Salvos"><TabsList><TabsTrigger value="Salvos">Salvos</TabsTrigger><TabsTrigger value="Publicações">Publicações</TabsTrigger><TabsTrigger value="Privacidade">Privacidade</TabsTrigger></TabsList><TabsContent value="Salvos">{showItems(allSaved)}</TabsContent><TabsContent value="Publicações"><div className="grid gap-3">{posts.length?posts.map(p=><Card key={p.id}><CardHeader><CardTitle>{p.title}</CardTitle><CardDescription>{p.kind}</CardDescription></CardHeader><CardContent>{p.detail}</CardContent><CardFooter><Button variant="destructive" onClick={()=>setPosts(a=>a.filter(x=>x.id!==p.id))}>Excluir</Button></CardFooter></Card>):<Alert><InfoIcon/><AlertTitle>Nenhuma publicação</AlertTitle><AlertDescription>Use o botão Criar para testar uma publicação.</AlertDescription></Alert>}</div></TabsContent><TabsContent value="Privacidade"><Card><CardHeader><CardTitle>Dados de demonstração</CardTitle><CardDescription>Seus testes são salvos somente neste navegador.</CardDescription></CardHeader><CardFooter><Button variant="outline" onClick={()=>{if(window.confirm("Restaurar dados locais desta prévia?")){localStorage.removeItem(store);window.location.reload()}}}>Restaurar demonstração</Button></CardFooter></Card></TabsContent></Tabs></div>}
  function InfoIcon(){return <CircleHelp/>}
  const pageContent=slug==="inicio"?homePage():isMarketplace?marketplace():slug==="comunidade"?community():slug==="grupos"?<div className="space-y-5">{header}{notice()}{groupPage()}</div>:slug==="movimentacao"?movement():slug==="guia"?guide():slug==="pedidos"?requests():slug==="agenda"?agenda():slug==="vilas"?villas():slug==="clube"?club():slug==="conversas"?chatsPage():slug==="talentos"?talents():slug==="caronas"?rides():slug==="voce"?you():slug==="busca"?<div className="space-y-5">{header}<Input autoFocus placeholder="Pesquisar em todos os módulos…" value={query} onChange={e=>setQuery(e.target.value)}/>{showItems(ordered)}</div>:homePage();

  const oms=["Todas",...new Set(HOUSING.map(h=>h.om))];
  const filterFields=<FieldGroup>
    <Field><FieldLabel>Valor máximo</FieldLabel><Select value={draftPrice} onValueChange={setDraftPrice}><SelectTrigger className="w-full"><SelectValue placeholder="Sem limite"/></SelectTrigger><SelectContent>{["Sem limite","2000","3500","5000","7000"].map(v=><SelectItem value={v} key={v}>{v==="Sem limite"?v:"Até "+money(Number(v))}</SelectItem>)}</SelectContent></Select><FieldDescription>Imóveis publicados nos exemplos do laboratório.</FieldDescription></Field>
    <Field><FieldLabel>Quartos</FieldLabel><Select value={draftBeds} onValueChange={setDraftBeds}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{["Qualquer","1","2","3","4"].map(v=><SelectItem key={v} value={v}>{v==="Qualquer"?v:v+" ou mais"}</SelectItem>)}</SelectContent></Select></Field>
    <Field><FieldLabel>Organização militar de referência</FieldLabel><Combobox items={oms} value={draftOm} onValueChange={v=>setDraftOm(v||"Todas")}><ComboboxInput placeholder="Pesquisar organização militar..."/><ComboboxContent><ComboboxEmpty>Organização não encontrada.</ComboboxEmpty><ComboboxList>{oms.map(v=><ComboboxItem key={v} value={v}>{v}</ComboboxItem>)}</ComboboxList></ComboboxContent></Combobox><FieldDescription>Vínculo ilustrativo. Não representa proximidade ou homologação geográfica.</FieldDescription></Field>
    <Alert><MapPinned/><AlertTitle>Geografia não homologada</AlertTitle><AlertDescription>Os resultados não utilizam distâncias validadas a organizações militares.</AlertDescription></Alert>
  </FieldGroup>;
  return <TooltipProvider><SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader><SidebarMenu><SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" tooltip="Bivaque" className="h-12">
          <a href={brandAssetBase+"/"} onClick={e=>{e.preventDefault();navigate("inicio")}} aria-label="Bivaque — início" className="flex items-center">
            <img src={brandAssetBase+"/brand/bivaque-logo-horizontal-white.svg"} alt="Bivaque" className="h-8 w-36 object-contain object-left group-data-[collapsible=icon]:hidden"/>
            <img src={brandAssetBase+"/brand/bivaque-symbol-white.svg"} alt="" aria-hidden="true" className="hidden size-7 shrink-0 group-data-[collapsible=icon]:block"/>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem></SidebarMenu></SidebarHeader>
      <SidebarContent>
        {["principal","explorar","futuro"].map(group=><SidebarGroup key={group}><SidebarGroupLabel>{group==="principal"?"Navegação":group==="explorar"?"Explorar":"Experimentais"}</SidebarGroupLabel><SidebarMenu>{routes.filter(x=>x.group===group).map(x=><SidebarMenuItem key={x.slug}><SidebarMenuButton asChild isActive={slug===x.slug} tooltip={x.label}><a href={"/bivaque-community/"+x.slug+"/"} onClick={e=>{e.preventDefault();navigate(x.slug)}}><x.icon/><span>{x.label}</span></a></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>)}
      </SidebarContent>
      <SidebarSeparator/>
      <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={()=>navigate("salvos")} tooltip="Salvos"><Bookmark/><span>Salvos</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton onClick={()=>navigate("voce")} tooltip="Configurações"><Settings/><span>Preferências</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
        <SidebarTrigger/><Separator orientation="vertical" className="mr-1 h-5"/>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{page.label}</span>
        <Button variant="outline" size="icon" onClick={()=>setSearchOpen(true)} aria-label="Pesquisar"><Search/></Button>
        <DropdownMenu><DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Aparência" title="Aparência"><SunMoon/></Button>
        </DropdownMenuTrigger><DropdownMenuContent align="end">
          <DropdownMenuLabel>Aparência</DropdownMenuLabel>
          <DropdownMenuItem onSelect={()=>setTheme("system")}><Monitor/> Automática</DropdownMenuItem>
          <DropdownMenuItem onSelect={()=>setTheme("light")}><Sun/> Clara</DropdownMenuItem>
          <DropdownMenuItem onSelect={()=>setTheme("dark")}><Moon/> Escura</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu>
        <Select value={city} onValueChange={setCity}><SelectTrigger className="w-32 sm:w-44"><SelectValue/></SelectTrigger><SelectContent>{CITIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><UserRound/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Conta demonstrativa</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>navigate("voce")}>Perfil</DropdownMenuItem><DropdownMenuItem onSelect={()=>navigate("salvos")}>Salvos</DropdownMenuItem><DropdownMenuItem onSelect={()=>toast.info("Nenhuma conta conectada")}>Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 lg:p-8">{pageContent}</main>
    </SidebarInset>

    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Buscar no Bivaque" description="Pesquisa e navegação nos dados demonstrativos">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Imóveis, serviços, grupos, perguntas..." onKeyDown={e=>{if(e.key==="Enter"&&query.trim()){setSearchOpen(false);navigate("busca")}}}/>
      <CommandList><CommandEmpty>Nenhum resultado. Pressione Enter para procurar em todos os módulos.</CommandEmpty>
        <CommandGroup heading="Módulos">{routes.filter(x=>x.group==="principal"||x.group==="explorar").map(x=><CommandItem key={x.slug} value={x.label} onSelect={()=>{setSearchOpen(false);navigate(x.slug)}}><x.icon/>{x.label}</CommandItem>)}</CommandGroup>
        <CommandSeparator/><CommandGroup heading="Resultados e anúncios">{allItems.filter(x=>x.city===city).slice(0,12).map(x=><CommandItem key={x.id} value={x.title+" "+x.meta} onSelect={()=>{setSearchOpen(false);setDetail(x);setDetailOpen(true)}}><Search/>{x.title}<span className="ml-auto text-xs text-muted-foreground">{x.kind==="imoveis"?"Imóvel":x.kind==="servicos"?"Serviço":"Desapego"}</span></CommandItem>)}</CommandGroup>
      </CommandList>
    </CommandDialog>
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="right" className="overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>Filtros de imóveis</SheetTitle><SheetDescription>Refine os anúncios sem alterar os valores do servidor.</SheetDescription></SheetHeader><div className="space-y-5 px-4 py-5">{filterFields}</div><div className="flex gap-2 border-t p-4"><Button variant="outline" className="flex-1" onClick={()=>setFiltersOpen(false)}>Cancelar</Button><Button className="flex-1" onClick={applyFilters}>Aplicar filtros</Button></div></SheetContent></Sheet>
    <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}><DrawerContent><DrawerHeader><DrawerTitle>Filtros de imóveis</DrawerTitle><DrawerDescription>Escolha os critérios e aplique os filtros.</DrawerDescription></DrawerHeader><div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 pb-4">{filterFields}</div><DrawerFooter><Button onClick={applyFilters}>Aplicar filtros</Button><DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer>

    <Dialog open={composeOpen} onOpenChange={setComposeOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Criar no Bivaque</DialogTitle><DialogDescription>Esta publicação ficará somente neste navegador.</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={submitCreate}><FieldGroup>
        <Field><FieldLabel>Tipo de publicação</FieldLabel><Select value={composeType} onValueChange={setComposeType}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{options.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="post-title">Título</FieldLabel><Input id="post-title" required minLength={3} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)}/></Field>
        <Field><FieldLabel htmlFor="post-desc">Descrição</FieldLabel><Textarea id="post-desc" required minLength={8} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/><FieldDescription>Adicione informações úteis, sem dados pessoais ou militares sigilosos.</FieldDescription></Field>
      </FieldGroup><DialogFooter><Button type="button" variant="outline" onClick={()=>setComposeOpen(false)}>Cancelar</Button><Button type="submit" className={createButtonClass}>Salvar demonstração</Button></DialogFooter></form>
    </DialogContent></Dialog>
    <Dialog open={replyTo!==null} onOpenChange={o=>{if(!o)setReplyTo(null)}}><DialogContent><DialogHeader><DialogTitle>Responder à comunidade</DialogTitle><DialogDescription>Compartilhe uma indicação. Sua resposta ficará apenas neste navegador.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={submitReply}><Field><FieldLabel htmlFor="reply-text">Sua experiência</FieldLabel><Textarea id="reply-text" rows={5} value={replyDraft} required minLength={3} maxLength={2000} onChange={e=>setReplyDraft(e.target.value)} placeholder="Compartilhe o que realmente ajudou..."/><FieldDescription>Respostas não são verificações institucionais.</FieldDescription></Field><DialogFooter><Button type="button" variant="outline" onClick={()=>setReplyTo(null)}>Cancelar</Button><Button type="submit"><Send/>Responder</Button></DialogFooter></form>
    </DialogContent></Dialog>
    <Dialog open={origin!==null} onOpenChange={o=>{if(!o)setOrigin(null)}}><DialogContent><DialogHeader><DialogTitle>Origem da indicação</DialogTitle><DialogDescription>Contribuição de membro, não verificada pelo Bivaque.</DialogDescription></DialogHeader>{origin&&<Item variant="outline"><ItemMedia variant="icon"><MessageCircle/></ItemMedia><ItemContent><ItemTitle>{origin.question}</ItemTitle><ItemDescription>{origin.author}</ItemDescription><p className="mt-3 text-sm leading-relaxed">{origin.text}</p></ItemContent></Item>}<DialogFooter><Button onClick={()=>setOrigin(null)}>Voltar à pergunta</Button></DialogFooter></DialogContent></Dialog>

    <Sheet open={detailOpen} onOpenChange={setDetailOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader>
      <SheetTitle>{detail?.title||"Detalhes"}</SheetTitle><SheetDescription>{detail?.meta||"Informações demonstrativas"}</SheetDescription>
    </SheetHeader>
    {detail&&<div className="space-y-5 px-4 pb-8">
      {detail.image&&<AspectRatio ratio={16/9}><img src={detail.image} alt={detail.title} className="size-full rounded-lg object-cover"/></AspectRatio>}
      {detail.kind==="servicos"?(()=>{
        const provider=PROVIDERS.find(p=>p.id===detail.id);
        if(!provider)return <Alert><CircleHelp/><AlertTitle>Ficha indisponível</AlertTitle></Alert>;
        const relevant=QUESTIONS.filter(q=>q.city===provider.city&&(q.category===provider.category||provider.category==="Mudanças"&&q.category==="Movimentação")).slice(0,3);
        return <div className="space-y-5">
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{provider.category}</Badge><Badge variant="secondary">Exemplo não verificado</Badge></div>
          <Alert><Shield/><AlertTitle>Esta é uma ficha fictícia</AlertTitle><AlertDescription>O responsável, a identidade do negócio e a qualidade do serviço não foram verificados.</AlertDescription></Alert>
          <Tabs defaultValue="sobre"><TabsList className="w-full"><TabsTrigger value="sobre">Sobre</TabsTrigger><TabsTrigger value="servicos">Serviços</TabsTrigger><TabsTrigger value="indicacoes">Indicações</TabsTrigger></TabsList>
            <TabsContent value="sobre" className="space-y-4 pt-3"><p className="text-sm leading-relaxed text-muted-foreground">{provider.description}</p>
              <Item variant="outline"><ItemMedia variant="icon"><MapPin/></ItemMedia><ItemContent><ItemTitle>Onde atende</ItemTitle><ItemDescription>{provider.hood} · {provider.city}</ItemDescription></ItemContent></Item>
              {provider.benefit&&<Alert><Ticket/><AlertTitle>Benefício ilustrativo</AlertTitle><AlertDescription>{provider.benefit} — oferta não comercial.</AlertDescription></Alert>}
            </TabsContent>
            <TabsContent value="servicos" className="pt-3"><ItemGroup>{provider.services.map(s=><Item key={s} variant="outline"><ItemMedia variant="icon"><Check/></ItemMedia><ItemContent><ItemTitle>{s}</ItemTitle><ItemDescription>Converse com o responsável antes de contratar.</ItemDescription></ItemContent></Item>)}</ItemGroup></TabsContent>
            <TabsContent value="indicacoes" className="space-y-4 pt-3">
              <Item variant="outline"><ItemMedia variant="icon"><Users/></ItemMedia><ItemContent><ItemTitle>{provider.recommendations+(endorsed.includes(provider.id)?1:0)} indicações demonstrativas</ItemTitle><ItemDescription>Sem notas inventadas e sem ranking comprado.</ItemDescription></ItemContent></Item>
              {relevant.map(q=><Item key={q.id} variant="outline"><ItemMedia variant="icon"><MessageCircle/></ItemMedia><ItemContent><ItemTitle>{q.title}</ItemTitle><ItemDescription>{q.answers.length} respostas da comunidade</ItemDescription></ItemContent><ItemActions><Button variant="ghost" size="icon" onClick={()=>{setDetailOpen(false);navigate("comunidade")}} aria-label="Abrir pergunta"><ChevronRight/></Button></ItemActions></Item>)}
            </TabsContent>
          </Tabs>
          <div className="grid gap-2 sm:grid-cols-2"><Button className="w-full" onClick={()=>contact(provider.name,provider.services[0]||provider.category)}><MessageCircle/>Pedir orçamento</Button><Button variant="outline" className="w-full" onClick={()=>toggle(provider.id,endorsed,setEndorsed)}><Heart className={endorsed.includes(provider.id)?"fill-current":""}/>{endorsed.includes(provider.id)?"Remover indicação":"Também indico"}</Button></div>
        </div>;
      })():<div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{detail.badge||detail.kind}</Badge>{detail.price&&<strong className="text-lg">{detail.price}</strong>}</div><p className="text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
        {detail.kind==="imoveis"&&(()=>{const h=HOUSING.find(h=>h.id===detail.id);return h?<ItemGroup><Item variant="outline"><ItemMedia variant="icon"><Building2/></ItemMedia><ItemContent><ItemTitle>{h.bedrooms} quartos · {h.area} m² · {h.parking} vagas</ItemTitle><ItemDescription>{h.om} — associação demonstrativa, sem distância validada.</ItemDescription></ItemContent></Item></ItemGroup>:null})()}
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>toggle(detail.id,saved,setSaved)}><Heart className={saved.includes(detail.id)?"fill-current":""}/>{saved.includes(detail.id)?"Remover dos salvos":"Salvar"}</Button><Button onClick={()=>contact(detail.title,detail.kind)}><MessageCircle/>Entrar em contato</Button></div>
      </div>}
    </div>}
    </SheetContent></Sheet>
    <Toaster richColors position="bottom-right"/>
  </SidebarProvider></TooltipProvider>;
}
