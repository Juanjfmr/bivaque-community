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

  const createMenuActions=()=>[
    ["Pergunta","Pedir uma indicação",MessageCircle],["Desapego","Anunciar um item",ShoppingBag],["Imóvel","Anunciar moradia",Building2],["Negócio","Cadastrar serviço",BriefcaseBusiness],["Pedido","Pedir propostas",ClipboardList],["Grupo","Reunir a comunidade",Users],["Encontro","Organizar um encontro",CalendarDays],
  ].map(([kind,subtitle,Icon])=><DropdownMenuItem key={kind as string} className="min-h-[52px] cursor-pointer gap-3 rounded-lg px-3 py-2" onSelect={()=>openCreate(kind as string)}><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">{React.createElement(Icon as typeof Plus,{className:"size-[19px]"})}</span><span className="min-w-0"><strong className="block text-[13px] font-medium">{kind as string}</strong><span className="block text-[11px] text-muted-foreground">{subtitle as string}</span></span></DropdownMenuItem>);
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
    const providers=PROVIDERS.filter(x=>x.city===city);
    const questions=QUESTIONS.filter(x=>x.city===city&&!resolved.includes(x.id)).slice(0,3);
    const intents=[{label:"Imóveis",detail:"Encontre seu lugar",slug:"imoveis",icon:Building2},{label:"Serviços",detail:"Resolva o dia a dia",slug:"servicos",icon:BriefcaseBusiness},{label:"Desapegos",detail:"De pessoa para pessoa",slug:"desapegos",icon:ShoppingBag},{label:"Comunidade",detail:"Pergunte e indique",slug:"comunidade",icon:MessageCircle}];
    return <div className="space-y-9 sm:space-y-11">
      <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground"><span className="size-1.5 rounded-full bg-bivaque-brasa"/>{city} <span className="text-border">/</span> Exploração local <span className="ml-auto text-[10px] font-normal">Dados ilustrativos</span></div>
      <section className="grid items-end gap-5 border-b border-border/80 pb-7 md:grid-cols-[1fr_270px] md:gap-10">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-bivaque-city">A rede que acompanha a vida militar</p>
          <h1 className="max-w-[690px] font-serif text-[clamp(2rem,4.2vw,3.35rem)] font-medium leading-[1.1] tracking-[-.045em]">A vida muda de cidade. <span className="text-muted-foreground">Sua rede acompanha.</span></h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">Encontre moradia, boas indicações e pessoas que conhecem o caminho em {city}.</p>
        </div>
        <Button variant="outline" className="h-12 justify-start rounded-xl bg-card px-4 text-[13px] text-muted-foreground shadow-none md:mb-1" onClick={()=>setSearchOpen(true)}><Search className="size-[18px]"/> Buscar no Bivaque <span className="ml-auto hidden text-[10px] text-muted-foreground/70 sm:inline">Ctrl K</span></Button>
      </section>
      <section className="space-y-4" aria-label="O que você precisa">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{intents.map(({label,detail,slug:to,icon:Icon})=><button key={to} onClick={()=>navigate(to)} className="group flex min-h-[88px] items-start gap-3 rounded-xl border border-border/75 bg-card/75 p-3.5 text-left transition-colors hover:border-sidebar-ring hover:bg-card sm:min-h-[98px] sm:p-4"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Icon className="size-[17px] stroke-[1.65]"/></span><span className="min-w-0 space-y-1"><strong className="block text-[13px] font-semibold leading-tight">{label}</strong><small className="block text-[11px] leading-snug text-muted-foreground">{detail}</small></span></button>)}</div>
      </section>
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3"><div className="space-y-1"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-bivaque-city">Moradia</p><h2 className="font-serif text-[25px] font-medium leading-tight tracking-[-.025em] sm:text-[29px]">Encontre um lugar para chamar de seu</h2></div><Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={()=>navigate("imoveis")}>Ver imóveis <ArrowRight className="size-3.5"/></Button></div>
        {homes.length?<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{homes.map(v=><article key={v.id} className="group min-w-0"><button className="relative block w-full overflow-hidden rounded-xl bg-muted text-left" onClick={()=>{setDetail(v);setDetailOpen(true)}}><AspectRatio ratio={1.52}><img src={v.image} alt={v.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"/></AspectRatio><span className="absolute bottom-3 left-3 rounded-md bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-card-foreground">{v.badge}</span></button><div className="flex items-start justify-between gap-2 pt-3"><div className="min-w-0"><h3 className="line-clamp-1 text-[13px] font-semibold leading-snug">{v.title}</h3><p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{v.meta}</p><p className="mt-2 text-[15px] font-semibold tracking-tight">{v.price}</p></div><Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" aria-label={saved.includes(v.id)?"Remover dos salvos":"Salvar imóvel"} onClick={()=>toggle(v.id,saved,setSaved)}><Heart className={"size-[17px] "+(saved.includes(v.id)?"fill-current":"")}/></Button></div></article>)}</div>:<p className="py-6 text-sm text-muted-foreground">Não há imóveis ilustrativos cadastrados para esta cidade.</p>}
      </section>
      <div className="grid items-start gap-9 border-t border-border/80 pt-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(290px,.85fr)] lg:gap-11">
        <section className="min-w-0 space-y-5">
          <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-bivaque-city">Troca de experiências</p><h2 className="mt-1 font-serif text-[25px] font-medium tracking-[-.025em]">A comunidade responde</h2></div><Button variant="ghost" size="sm" className="text-xs" onClick={()=>navigate("comunidade")}>Ver conversas <ArrowRight className="size-3.5"/></Button></div>
          {questions.length?<div className="divide-y divide-border/70">{questions.map(q=><button key={q.id} onClick={()=>navigate("comunidade")} className="flex w-full items-start gap-3 py-[17px] text-left first:pt-0 hover:text-bivaque-city"><Avatar className="mt-1 size-9"><AvatarFallback className="text-[11px]">{initials(q.author)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">{q.author} · {q.category}</span><strong className="mt-1 block text-[14px] font-medium leading-[1.4]">{q.title}</strong><span className="mt-1.5 block text-[11px] text-muted-foreground">{q.answers.length+(replies[q.id]?.length||0)} respostas</span></span><ChevronRight className="mt-5 size-4 shrink-0 text-muted-foreground"/></button>)}</div>:<p className="text-sm text-muted-foreground">Ainda não há perguntas ilustrativas nesta cidade.</p>}
          <Button size="sm" variant="outline" className="shadow-none" onClick={()=>openCreate("Pergunta")}><MessageCircle className="size-4"/> Fazer uma pergunta</Button>
        </section>
        <section className="min-w-0 space-y-4">
          <div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-bivaque-city">Na sua cidade</p><h2 className="mt-1 font-serif text-[25px] font-medium tracking-[-.025em]">Quem pode ajudar</h2></div><Button variant="ghost" size="sm" className="text-xs" onClick={()=>navigate("servicos")}>Ver todos <ArrowRight className="size-3.5"/></Button></div>
          {providers.length?<div className="divide-y divide-border/70">{providers.slice(0,4).map(p=><button key={p.id} className="flex w-full items-center gap-3 py-3 text-left first:pt-0" onClick={()=>{setDetail(allItems.find(x=>x.id===p.id)||null);setDetailOpen(true)}}><img src={p.image} alt="" className="size-[58px] shrink-0 rounded-lg object-cover"/><span className="min-w-0 flex-1"><strong className="block truncate text-[13px] font-semibold">{p.name}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{p.category} · {p.hood}</span><span className="mt-1 block text-[10px] text-muted-foreground">{p.recommendations} indicações ilustrativas</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground"/></button>)}</div>:<p className="text-sm text-muted-foreground">Sem prestadores de exemplo em {city}.</p>}
          <button onClick={()=>navigate("movimentacao")} className="flex w-full items-center gap-3 rounded-lg bg-secondary/70 px-4 py-3.5 text-left hover:bg-secondary"><Compass className="size-5 text-bivaque-city"/><span className="flex-1"><strong className="block text-[12px] font-semibold">Chegando a uma nova cidade?</strong><span className="text-[11px] text-muted-foreground">Veja o guia de movimentação</span></span><ArrowRight className="size-4 text-muted-foreground"/></button>
        </section>
      </div>
    </div>;
  }
  function marketplace(){
    const isHousing=slug==="imoveis", isProvider=slug==="servicos"||slug==="negocios";
    const label=isHousing?"Imóveis":isProvider?"Negócios e serviços":slug==="desapegos"?"Desapegos":"Seus salvos";
    const categories=["Todos",...new Set(isHousing?HOUSING.map(x=>x.type):isProvider?PROVIDERS.map(x=>x.category):CLASSIFIEDS.map(x=>x.category))];
    return <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/75 pb-5">
        <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-bivaque-city">{isHousing?"Moradia":isProvider?"Negócios locais":"Entre pessoas da comunidade"}</p><h1 className="font-serif text-[clamp(2rem,3.5vw,2.8rem)] font-medium leading-tight tracking-[-.045em]">{label}</h1><p className="text-[12px] text-muted-foreground">{isHousing?"Encontre seu próximo lugar em "+city+".":isProvider?"Profissionais e serviços na comunidade em "+city+".":"Compartilhados por quem vive a mesma rotina."}</p></div>
        {slug!=="salvos"&&<Button className={createButtonClass+" shadow-none"} size="sm" onClick={()=>openCreate(isHousing?"Imóvel":isProvider?"Negócio":"Desapego")}><Plus className="size-4"/>Anunciar</Button>}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[190px] flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder={isHousing?"Bairro, endereço ou imóvel":isProvider?"Serviço ou especialidade":"O que você procura?"} className="h-10 rounded-lg bg-card pl-9 text-[13px] shadow-none"/></div>
          {isHousing&&<Button variant="outline" size="sm" className="h-10 rounded-lg bg-card shadow-none" onClick={openFilters}><SlidersHorizontal className="size-4"/>Filtros {(maxPrice!=="Sem limite"||minBeds!=="Qualquer"||om!=="Todas")&&<span className="size-1.5 rounded-full bg-bivaque-brasa"/>}</Button>}
        </div>
        <div className="w-full overflow-x-auto pb-1"><ToggleGroup variant="outline" type="single" value={category} onValueChange={v=>setCategory(v||"Todos")} className="justify-start gap-2 whitespace-nowrap">{categories.map(x=><ToggleGroupItem key={x} value={x} className="h-8 shrink-0 rounded-full border-border/80 px-3 text-[11px] shadow-none data-[state=on]:bg-foreground data-[state=on]:text-background">{x}</ToggleGroupItem>)}</ToggleGroup></div>
      </div>
      <div className="flex items-center justify-between border-b border-border/70 pb-3"><span className="text-[11px] text-muted-foreground">{ordered.length} resultados ilustrativos em {city}</span><Select value={sort} onValueChange={setSort}><SelectTrigger className="h-8 w-[145px] border-none bg-transparent px-1 text-[11px] shadow-none"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Mais recentes">Mais recentes</SelectItem><SelectItem value="Menor preço">Menor preço</SelectItem></SelectContent></Select></div>
      {ordered.length===0?<div className="py-14 text-center"><p className="font-serif text-xl">Nenhum resultado nesta seleção</p><p className="mt-2 text-[12px] text-muted-foreground">Experimente outro filtro ou localidade.</p><Button variant="outline" size="sm" className="mt-4" onClick={()=>{setQuery("");setCategory("Todos");setMaxPrice("Sem limite");setMinBeds("Qualquer");setOm("Todas")}}>Limpar filtros</Button></div>:
        isProvider?<div className="divide-y divide-border/75">{ordered.map(v=><article key={v.id} className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 py-5 first:pt-0 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:gap-5">
          <button onClick={()=>{setDetail(v);setDetailOpen(true)}} aria-label={"Abrir ficha de "+v.title} className="overflow-hidden rounded-lg bg-muted"><AspectRatio ratio={1.16}><img src={v.image} alt="" className="size-full object-cover transition-transform duration-500 hover:scale-[1.04]"/></AspectRatio></button>
          <div className="min-w-0 space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-bivaque-city">{v.badge}</p><button className="text-left hover:underline" onClick={()=>{setDetail(v);setDetailOpen(true)}}><h2 className="text-[16px] font-semibold leading-tight tracking-tight sm:text-[18px]">{v.title}</h2></button><p className="text-[11px] text-muted-foreground">{v.meta}</p><p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{v.description}</p><button className="text-[11px] font-semibold text-foreground underline-offset-2 hover:underline sm:hidden" onClick={()=>{setDetail(v);setDetailOpen(true)}}>Ver ficha <ArrowRight className="inline size-3"/></button></div>
          <div className="hidden items-center sm:flex"><Button size="sm" variant="outline" className="rounded-lg shadow-none" onClick={()=>{setDetail(v);setDetailOpen(true)}}>Ver ficha <ArrowRight className="size-3.5"/></Button></div>
        </article>)}</div>:
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{ordered.map(v=><article key={v.id} className="group min-w-0"><button className="relative block w-full overflow-hidden rounded-xl bg-muted text-left" onClick={()=>{setDetail(v);setDetailOpen(true)}}><AspectRatio ratio={1.38}><img src={v.image} alt={v.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"/></AspectRatio><span className="absolute bottom-3 left-3 rounded-md bg-card/95 px-2.5 py-1 text-[11px] font-medium text-card-foreground">{v.badge}</span></button><div className="flex items-start justify-between gap-2 pt-3"><div className="min-w-0"><button className="line-clamp-1 text-left text-[14px] font-semibold hover:underline" onClick={()=>{setDetail(v);setDetailOpen(true)}}>{v.title}</button><p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{v.meta}</p><p className="mt-2 text-[15px] font-semibold">{v.price}</p></div><Button aria-label={saved.includes(v.id)?"Remover favorito":"Salvar"} size="icon" variant="ghost" className="shrink-0" onClick={()=>toggle(v.id,saved,setSaved)}><Heart className={"size-[18px] "+(saved.includes(v.id)?"fill-current":"")}/></Button></div></article>)}</div>}
      {isHousing&&<p className="border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">Organizações militares e dados dos imóveis são apenas exemplos. As distâncias não foram homologadas.</p>}
    </div>;
  }
  function community(){
    const existing=QUESTIONS.filter(q=>q.city===city).map(q=>({id:q.id,title:q.title,category:q.category,author:q.author,date:q.date,allReplies:[...q.answers.map(x=>({author:x.author,text:x.text,date:x.date})),...(replies[q.id]||[]).map(x=>({author:"Você",text:x,date:"Agora"}))]}));
    const mine=posts.filter(p=>p.kind==="Pergunta").map(p=>({id:p.id,title:p.title,category:"Pergunta",author:"Você",date:"Agora",allReplies:(replies[p.id]||[]).map(x=>({author:"Você",text:x,date:"Agora"}))}));
    const all=[...mine,...existing].filter(q=>(category==="Todos"||category==="Para ajudar")&&!resolved.includes(q.id)&&q.author!=="Você"||category==="Resolvidas"&&resolved.includes(q.id)||category==="Minhas"&&q.author==="Você");
    const orderedQuestions=[...all].sort((a,b)=>a.allReplies.length-b.allReplies.length);
    const countSolved=existing.filter(q=>resolved.includes(q.id)).length;
    return <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/75 pb-5">
        <div className="space-y-2"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-bivaque-city">Experiências que ficam</p><h1 className="font-serif text-[clamp(2rem,3.5vw,2.8rem)] font-medium leading-tight tracking-[-.045em]">Comunidade</h1><p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">Quando alguém compartilha o que aprendeu, outra família começa com mais segurança.</p></div>
        <Button className={createButtonClass+" shadow-none"} size="sm" onClick={()=>openCreate(tab==="Grupos"?"Grupo":"Pergunta")}><Plus className="size-4"/>{tab==="Grupos"?"Criar grupo":"Perguntar"}</Button>
      </div>
      <Tabs value={tab} onValueChange={v=>{setTab(v);setCategory("Todos")}} className="space-y-4">
        <TabsList className="h-10 w-full justify-start rounded-none border-b border-border bg-transparent p-0 sm:w-auto"><TabsTrigger className="h-10 rounded-none border-0 bg-transparent px-4 text-[12px] shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="Indicações">Indicações</TabsTrigger><TabsTrigger className="h-10 rounded-none border-0 bg-transparent px-4 text-[12px] shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="Grupos">Grupos</TabsTrigger><TabsTrigger className="h-10 rounded-none border-0 bg-transparent px-4 text-[12px] shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none" value="Negócios">Negócios</TabsTrigger></TabsList>
        <TabsContent value="Indicações" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <p className="text-[11px] text-muted-foreground">{countSolved} perguntas respondidas e marcadas como resolvidas nesta demonstração.</p>
            <div className="max-w-full overflow-x-auto"><ToggleGroup type="single" variant="outline" value={category==="Todos"?"Para ajudar":category} onValueChange={v=>setCategory(v||"Para ajudar")} className="justify-start gap-1 whitespace-nowrap">{["Para ajudar","Resolvidas","Minhas"].map(v=><ToggleGroupItem key={v} value={v} className="h-8 shrink-0 rounded-full border-border/75 px-3 text-[11px] data-[state=on]:bg-foreground data-[state=on]:text-background">{v}</ToggleGroupItem>)}</ToggleGroup></div>
          </div>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_270px]">
            <div className="min-w-0 divide-y divide-border/70 border-t border-border/70">
              {orderedQuestions.length?orderedQuestions.map(q=><article key={q.id} className="space-y-3 py-5 first:pt-5">
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5 size-9 shrink-0"><AvatarFallback className="text-[11px]">{initials(q.author)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{q.author}</span><span>·</span><span>{q.date}</span><span className="ml-auto text-bivaque-city">{q.category}</span></div>
                    <h2 className="mt-2 text-[15px] font-semibold leading-snug tracking-[-.012em] sm:text-[17px]">{q.title}</h2>
                    <p className="mt-2 text-[11px] text-muted-foreground">{q.allReplies.length} respostas {resolved.includes(q.id)?"· Resolvida":""}</p>
                    <Accordion type="single" collapsible className="mt-2"><AccordionItem value="answers" className="border-0"><AccordionTrigger className="w-fit py-1.5 text-[12px] font-semibold hover:text-bivaque-city hover:no-underline">{q.allReplies.length?"Ler respostas":"Ainda sem respostas"}</AccordionTrigger><AccordionContent className="pt-2"><div className="space-y-4 border-l-2 border-border pl-4">{q.allReplies.length?q.allReplies.map((r,i)=><div key={i} className="space-y-1.5"><div className="flex items-center justify-between gap-2"><strong className="text-[12px]">{r.author}</strong><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={()=>setOrigin({question:q.title,author:r.author,text:r.text})}><ExternalLink className="size-3"/> Origem</Button></div><p className="text-[12px] leading-relaxed text-muted-foreground">{r.text}</p></div>):<p className="text-[12px] text-muted-foreground">Você pode ser a primeira pessoa a ajudar.</p>}</div></AccordionContent></AccordionItem></Accordion>
                    <div className="mt-2 flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" className="h-8 rounded-lg text-[11px] shadow-none" onClick={()=>{setReplyTo(q.id);setReplyDraft("")}}><MessageCircle className="size-3.5"/> Responder</Button><Button size="sm" variant="ghost" className="h-8 px-1 text-[11px] text-muted-foreground" onClick={()=>toggle(q.id,followed,setFollowed)}><Bell className="size-3.5"/>{followed.includes(q.id)?"Seguindo":"Acompanhar"}</Button>{q.author==="Você"&&<Button size="sm" variant="ghost" className="h-8 px-1 text-[11px]" onClick={()=>toggle(q.id,resolved,setResolved)}><Check className="size-3.5"/>{resolved.includes(q.id)?"Reabrir":"Resolvida"}</Button>}</div>
                  </div>
                </div>
              </article>):<div className="py-14"><p className="font-serif text-xl">Sem perguntas nesta seleção</p><p className="mt-2 text-[12px] text-muted-foreground">Explore outra categoria ou pergunte à comunidade.</p></div>}
            </div>
            <aside className="hidden space-y-5 xl:block">
              <div className="rounded-xl bg-secondary/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-bivaque-city">Compartilhe o que sabe</p><h3 className="mt-2 font-serif text-xl leading-tight">Sua experiência pode ajudar alguém.</h3><p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">Um bairro, uma escola, uma mudança. Respostas úteis ficam acessíveis para quem chegar depois.</p><Button variant="outline" className="mt-4 w-full bg-card shadow-none" size="sm" onClick={()=>openCreate("Pergunta")}><Plus className="size-4"/> Nova pergunta</Button></div>
              <div className="space-y-3 border-t pt-4"><p className="text-[12px] font-semibold">Explore também</p>{[{label:"Grupos locais",to:"grupos",icon:Users},{label:"Guia da cidade",to:"guia",icon:MapPinned},{label:"Serviços",to:"servicos",icon:BriefcaseBusiness}].map(v=><button className="flex w-full items-center gap-3 py-2 text-left text-[12px] hover:text-bivaque-city" onClick={()=>navigate(v.to)} key={v.to}><v.icon className="size-4"/><span className="flex-1">{v.label}</span><ChevronRight className="size-3.5"/></button>)}</div>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="Grupos">{groupPage()}</TabsContent>
        <TabsContent value="Negócios"><div className="divide-y divide-border/70">{PROVIDERS.filter(x=>x.city===city).map(p=><button key={p.id} className="flex w-full items-center gap-4 py-4 text-left" onClick={()=>{setDetail(allItems.find(x=>x.id===p.id)||null);setDetailOpen(true)}}><img src={p.image} alt="" className="size-16 rounded-lg object-cover"/><span className="flex-1"><strong className="text-[13px] font-semibold">{p.name}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{p.category} · {p.hood}</span></span><ArrowRight className="size-4"/></button>)}</div></TabsContent>
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
  return <TooltipProvider><SidebarProvider style={{"--sidebar-width":"6rem"} as React.CSSProperties}>
    <Sidebar collapsible="none" className="hidden min-[720px]:flex">
      <SidebarHeader className="items-center gap-2 px-1 pt-5 pb-3">
        <button onClick={()=>navigate("inicio")} aria-label="Bivaque — início" className="flex h-[44px] w-full items-center justify-center">
          <img src={brandAssetBase+"/brand/bivaque-symbol-white.svg"} className="size-10" alt="Bivaque"/>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button className={createButtonClass+" mt-2 size-14 rounded-[18px] shadow-sm"} size="icon" aria-label="Criar no Bivaque"><Plus className="size-6"/></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={12} className="w-[265px] space-y-1 p-2"><DropdownMenuLabel className="text-xs">O que deseja criar?</DropdownMenuLabel>{createMenuActions()}</DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent className="pt-1">
        <SidebarGroup className="px-1">
          <SidebarMenu className="gap-1">
            {routes.filter(x=>["inicio","comunidade","conversas","voce"].includes(x.slug)).map(x=><SidebarMenuItem key={x.slug}>
              <SidebarMenuButton isActive={slug===x.slug} tooltip={x.label} onClick={()=>navigate(x.slug)} className="h-[69px] w-full flex-col justify-center gap-1 rounded-xl px-1 py-1 text-[11px] text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold">
                <x.icon className="!size-[24px] stroke-[1.9]"/><span>{x.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="items-center gap-2 px-1 pb-4">
        <DropdownMenu><DropdownMenuTrigger asChild><Button aria-label="Mais espaços" variant="ghost" size="icon" className="size-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><Menu/></Button></DropdownMenuTrigger><DropdownMenuContent side="right" align="end" className="w-56">
          {routes.filter(x=>["imoveis","servicos","desapegos","grupos","movimentacao","guia","pedidos","agenda","vilas","clube","salvos"].includes(x.slug)).map(x=><DropdownMenuItem key={x.slug} onSelect={()=>navigate(x.slug)}><x.icon className="size-4"/>{x.label}</DropdownMenuItem>)}
        </DropdownMenuContent></DropdownMenu>
        <Button aria-label="Preferências" size="icon" variant="ghost" onClick={()=>navigate("voce")} className="size-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"><Settings/></Button>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <header className="flex h-[64px] shrink-0 items-center gap-2 border-b border-border/75 bg-background px-3 sm:px-5 xl:px-8">
        <button aria-label="Bivaque — voltar ao início" onClick={()=>navigate("inicio")} className="flex min-h-11 items-center gap-2">
          <img src={brandAssetBase+"/brand/bivaque-symbol.svg"} className="size-8 dark:hidden" alt="Bivaque"/>
          <img src={brandAssetBase+"/brand/bivaque-symbol-white.svg"} className="hidden size-8 dark:block" alt=""/>
          <span className="hidden text-[18px] font-semibold min-[420px]:block">{slug==="inicio"?"Bivaque":page.label}</span>
        </button>
        <span className="min-w-0 flex-1"/>
        <Button variant="ghost" size="icon" className="size-11" onClick={()=>setSearchOpen(true)} aria-label="Pesquisar"><Search className="size-[22px]"/></Button>
        <Select value={city} onValueChange={setCity}><SelectTrigger aria-label="Selecionar cidade" className="h-10 w-[112px] rounded-lg border-border/70 bg-card px-2 text-[12px] shadow-none min-[420px]:w-[145px]"><SelectValue/></SelectTrigger><SelectContent>{CITIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="hidden size-11 min-[720px]:inline-flex" aria-label="Aparência"><SunMoon/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Aparência</DropdownMenuLabel><DropdownMenuItem onSelect={()=>setTheme("system")}><Monitor/>Automática</DropdownMenuItem><DropdownMenuItem onSelect={()=>setTheme("light")}><Sun/>Clara</DropdownMenuItem><DropdownMenuItem onSelect={()=>setTheme("dark")}><Moon/>Escura</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </header>
      <main className="mx-auto w-full max-w-[1210px] space-y-6 px-4 pb-28 pt-5 sm:px-6 sm:pb-14 sm:pt-7 xl:px-9">{pageContent}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] min-[720px]:hidden" aria-label="Navegação principal mobile">
        <div className="mx-auto grid h-[76px] max-w-[540px] grid-cols-4 items-center">
          {routes.filter(x=>["inicio","comunidade","conversas","voce"].includes(x.slug)).map(x=><button key={x.slug} onClick={()=>navigate(x.slug)} aria-current={slug===x.slug?"page":undefined} className={"flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] "+(slug===x.slug?"font-semibold text-foreground":"text-muted-foreground")}>
            <span className={"flex h-8 w-14 items-center justify-center rounded-[10px] "+(slug===x.slug?"bg-secondary":"")}><x.icon className="size-[23px] stroke-[1.9]"/></span>{x.label}
          </button>)}
        </div>
      </nav>
      <div className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-4 z-50 min-[720px]:hidden">
        <DropdownMenu><DropdownMenuTrigger asChild><Button className={createButtonClass+" h-14 min-w-14 gap-2 rounded-[18px] px-4 shadow-lg"} aria-label="Abrir menu Criar"><Plus className="size-6"/><span className="font-semibold">Criar</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={14} className="w-[min(300px,calc(100vw-32px))] space-y-1 rounded-[18px] border-border bg-popover p-2 shadow-lg"><DropdownMenuLabel className="px-3 text-xs">O que deseja criar?</DropdownMenuLabel>{createMenuActions()}</DropdownMenuContent>
        </DropdownMenu>
      </div>
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
