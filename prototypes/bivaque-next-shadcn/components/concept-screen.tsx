"use client";
import {useEffect,useMemo,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {ModuleWorkspace} from "./modules/workspace";
import {Home,Users,MessageCircle,UserRound,Building2,BriefcaseBusiness,Tags,Store,MapPinned,ClipboardList,ChevronDown,ChevronRight,ArrowRight,Search,Bell,Plus,Heart,Bookmark,MapPin,ShieldCheck,Star,CalendarDays,Sun,Clock,SlidersHorizontal,Check,X,Menu,Send,AlignLeft,Settings2,Compass,Wifi,Command,ArrowLeft,House,GraduationCap,FileText,LifeBuoy,MoreHorizontal,Mail,Eye,CheckCircle2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar,AvatarFallback,AvatarImage} from "@/components/ui/avatar";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Separator} from "@/components/ui/separator";
import {Sheet,SheetTrigger,SheetContent} from "@/components/ui/sheet";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {Dialog,DialogContent} from "@/components/ui/dialog";
import {Checkbox} from "@/components/ui/checkbox";
import {Progress} from "@/components/ui/progress";
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from "@/components/ui/tooltip";
import "./concept.css";

type Service={id:string,name:string,sub:string,price:string,hood:string,rating:string,reviews:number,image:string,badge?:string};
type Listing={id:string,name:string,hood:string,price:string,details:string,image:string,tag:string,kind:"Imóveis"|"Desapegos"};
type Page="Início"|"Comunidade"|"Conversas"|"Você"|"Imóveis"|"Serviços"|"Desapegos"|"Grupos"|"Guia da Cidade"|"Pedidos"|"Movimentação"|"Vilas"|"Clube"|"Agenda"|"Negócios"|"Salvos"|"Busca"|"Talentos"|"Caronas";
const routeSlugs:Record<Page,string>={"Início":"inicio","Comunidade":"comunidade","Conversas":"conversas","Você":"voce","Imóveis":"imoveis","Serviços":"servicos","Desapegos":"desapegos","Grupos":"grupos","Guia da Cidade":"guia","Pedidos":"pedidos","Movimentação":"movimentacao","Vilas":"vilas","Clube":"clube","Agenda":"agenda","Negócios":"negocios","Salvos":"salvos","Busca":"busca","Talentos":"talentos","Caronas":"caronas"};
type ToastState={title:string,message:string};
const image=(id:string,w=650)=>"https://images.unsplash.com/"+id+"?auto=format&fit=crop&w="+w+"&q=80";
const services:Service[]=[
{id:"s1",name:"Oficina Militar Motors",sub:"Manutenção especializada",price:"Orçamento",hood:"Brasília - DF",rating:"4,9",reviews:124,image:image("photo-1486262715619-67b85e0b08d3"),badge:"Ficha demonstrativa"},
{id:"s2",name:"Psicóloga Camila Ribeiro",sub:"Atendimento online e presencial",price:"Agendar",hood:"Brasília - DF",rating:"5,0",reviews:48,image:image("photo-1600607687939-ce8a6c25118c"),badge:"Perfil demonstrativo"},
{id:"s3",name:"CrossFit Bivaque",sub:"Condicionamento físico",price:"Conhecer",hood:"Brasília - DF",rating:"4,8",reviews:73,image:image("photo-1534438327276-14e5300c3a48")},
{id:"s4",name:"Almeida & Castro",sub:"Assessoria jurídica",price:"Consultar",hood:"Brasília - DF",rating:"4,9",reviews:56,image:image("photo-1589829545856-d10d557cf95f")}
];
const listings:Listing[]=[
{id:"p1",name:"Apartamento 3 quartos",hood:"Asa Norte · Brasília/DF",price:"R$ 3.500",details:"3 quartos  ·  2 banheiros  ·  120 m²",image:image("photo-1600607687920-4e2a09cf159d",900),tag:"Destaque",kind:"Imóveis"},
{id:"p2",name:"Casa em condomínio",hood:"Jardim Botânico · Brasília/DF",price:"R$ 6.800",details:"4 quartos  ·  4 banheiros  ·  250 m²",image:image("photo-1600596542815-ffad4c1539a9",900),tag:"Novo",kind:"Imóveis"},
{id:"p3",name:"Kitnet mobiliada",hood:"Asa Sul · Brasília/DF",price:"R$ 2.100",details:"1 quarto  ·  1 banheiro  ·  35 m²",image:image("photo-1600566753190-17f0baa2a6c3",900),tag:"Boa localização",kind:"Imóveis"},
{id:"p4",name:"Sofá retrátil cinza",hood:"Sudoeste · Brasília/DF",price:"R$ 800",details:"Bom estado  ·  Retirada local",image:image("photo-1555041469-a586c61ea9bc"),tag:"Em transferência",kind:"Desapegos"},
{id:"p5",name:"Mesa de jantar com 6 lugares",hood:"Águas Claras · Brasília/DF",price:"R$ 650",details:"Seminova  ·  Entrega a combinar",image:image("photo-1617806118233-18e1de247200"),tag:"Novo",kind:"Desapegos"},
{id:"p6",name:"Berço com colchão",hood:"Asa Norte · Brasília/DF",price:"R$ 420",details:"Usado  ·  Retirada local",image:image("photo-1491013516836-7db643ee125a"),tag:"Infantil",kind:"Desapegos"}
];
const groups=[{name:"Oficiais do Exército - DF",count:"320 membros",news:"2 novas publicações",initials:"OE"},{name:"Veteranos Brasília",count:"1,1 mil membros",news:"5 novas publicações",initials:"VB"},{name:"Famílias Militares",count:"680 membros",news:"1 nova publicação",initials:"FM"}];
const categories=["Todos","Casas","Apartamentos","Para temporada","Até R$ 2 mil","R$ 2–5 mil","R$ 5 mil+"];
const cities=["Brasília - DF","Manaus - AM","Rio de Janeiro - RJ","Natal - RN","Belém - PA","Recife - PE"];
const nav: {label:Page,Icon:typeof Home}[]=[
{label:"Início",Icon:Home},{label:"Comunidade",Icon:Users},{label:"Conversas",Icon:MessageCircle},{label:"Você",Icon:UserRound},
{label:"Imóveis",Icon:Building2},{label:"Serviços",Icon:BriefcaseBusiness},{label:"Desapegos",Icon:Tags},{label:"Grupos",Icon:Users},{label:"Guia da Cidade",Icon:MapPinned},{label:"Movimentação",Icon:Compass},{label:"Pedidos",Icon:ClipboardList},{label:"Agenda",Icon:CalendarDays},{label:"Vilas",Icon:Building2},{label:"Clube",Icon:Heart},{label:"Talentos",Icon:UserRound},{label:"Caronas",Icon:Car},{label:"Salvos",Icon:Bookmark}
];
function Brand({small=false}:{small?:boolean}){return <span className={"concept-brand "+(small?"compact":"")}><svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 4 42 23l-5 5-15-14L7 28l-5-5L22 4Z" fill="currentColor"/><path d="M22 18 38 33l-5 5-11-10L11 38l-5-5 16-15Z" fill="currentColor"/></svg><strong>Bivaque</strong></span>;}
function Photo({src,alt}:{src:string,alt:string}){return <img className="concept-photo" src={src} alt={alt} loading="lazy"/>;}
export default function ConceptScreen(){
 const router=useRouter();const pathname=usePathname();
 const [page,setPage]=useState<Page>("Início");
 const [city,setCity]=useState("Brasília - DF");
 const [tab,setTab]=useState("Imóveis");
 const [category,setCategory]=useState("Todos");
 const [saved,setSaved]=useState<string[]>([]);
 const [dialog,setDialog]=useState<"create"|"contact"|"search"|"listing"|"service"|null>(null);
 const [selected,setSelected]=useState<string>("");
 const [query,setQuery]=useState("");
 const [toast,setToast]=useState<ToastState|null>(null);
 const [mobileSheet,setMobileSheet]=useState(false);
 const [filterSheet,setFilterSheet]=useState(false);
 const [attending,setAttending]=useState(false);
 const [guideSteps,setGuideSteps]=useState<string[]>([]);
 const [draft,setDraft]=useState("");
 const [posted,setPosted]=useState<string[]>([]);
 const [notifications,setNotifications]=useState(3);
 const [sort,setSort]=useState("Relevância");
 const [viewMode,setViewMode]=useState<"Todos"|"Salvos">("Todos");
 useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem("bivaque-conceito-salvos")||"[]"));}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("bivaque-conceito-salvos",JSON.stringify(saved));}catch{}},[saved]);
 useEffect(()=>{const keys=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setDialog("search")}};document.addEventListener("keydown",keys);return()=>document.removeEventListener("keydown",keys)},[]);
 const notify=(title:string,message:string)=>setToast({title,message});
 const switchPage=(next:Page)=>{setPage(next);setMobileSheet(false);setViewMode("Todos");router.push("/"+routeSlugs[next]);window.scrollTo({top:0,behavior:"smooth"})};
 useEffect(()=>{const segment=pathname.split("/").filter(Boolean)[0]||"inicio";const matched=(Object.keys(routeSlugs) as Page[]).find(x=>routeSlugs[x]===segment);if(matched)setPage(matched);},[pathname]);
 const [pendingComposer,setPendingComposer]=useState(false);
 const createAction=()=>{if(page==="Início"){setPendingComposer(true);switchPage("Comunidade");return;}document.dispatchEvent(new Event("bivaque:compose"));};
 useEffect(()=>{if(pendingComposer&&page!=="Início"){document.dispatchEvent(new Event("bivaque:compose"));setPendingComposer(false)}},[page,pendingComposer]);
 const save=(id:string)=>{setSaved(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);notify(saved.includes(id)?"Removido dos favoritos":"Salvo nos favoritos",saved.includes(id)?"Você pode salvar novamente quando quiser.":"Este item foi adicionado à sua lista pessoal.");};
 const launch=(mode:"listing"|"service",id:string)=>{setSelected(id);setDialog(mode)};
 const filtered=useMemo(()=>{
 const all=tab==="Desapegos"?listings.filter(x=>x.kind==="Desapegos"):tab==="Serviços"?[]:listings.filter(x=>x.kind==="Imóveis");
 return all.filter(x=>(viewMode!=="Salvos"||saved.includes(x.id))&&(category==="Todos"||category==="Casas"&&x.name.includes("Casa")||category==="Apartamentos"&&x.name.includes("Apartamento")||category==="R$ 2–5 mil"&&/R\$ [2345]\./.test(x.price)||category==="Até R$ 2 mil"&&x.price.includes("800")||category==="R$ 5 mil+"&&x.price.includes("6.800")||category==="Para temporada"&&x.name.includes("Kitnet"))&&(!query||x.name.toLowerCase().includes(query.toLowerCase())||x.hood.toLowerCase().includes(query.toLowerCase())));
 },[tab,category,query,saved,viewMode]);
 const listingCard=(v:Listing,featured=false)=><Card className={"concept-listing "+(featured?"featured":"")} key={v.id}>
  <div className="concept-cover" onClick={()=>launch("listing",v.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")launch("listing",v.id)}}>
   <Photo src={v.image} alt={v.name}/><span className={"concept-image-tag "+(v.tag==="Novo"?"new":"")}>{v.tag}</span>
   <button aria-label={saved.includes(v.id)?"Remover dos favoritos":"Salvar anúncio"} className="concept-heart" onClick={e=>{e.stopPropagation();save(v.id)}}><Heart size={16} fill={saved.includes(v.id)?"currentColor":"none"}/></button>
  </div>
  <button className="concept-card-body" onClick={()=>launch("listing",v.id)}>
   <strong>{v.name}</strong><small><MapPin size={12}/>{v.hood}</small><b>{v.price}<em>{v.kind==="Imóveis"?" / mês":""}</em></b><span className="concept-card-facts">{v.details}</span>
  </button></Card>;
 const serviceCard=(v:Service,compact=false)=><Card className={"concept-service "+(compact?"compact":"")} key={v.id}>
 <div className="concept-cover" role="button" tabIndex={0} onClick={()=>launch("service",v.id)} onKeyDown={e=>{if(e.key==="Enter")launch("service",v.id)}}>
 <Photo src={v.image} alt={v.name}/>{v.badge&&<span className="concept-service-tag"><ShieldCheck size={12}/>{v.badge}</span>}
 <button className="concept-heart" aria-label={saved.includes(v.id)?"Remover dos favoritos":"Salvar serviço"} onClick={e=>{e.stopPropagation();save(v.id)}}><Heart size={16} fill={saved.includes(v.id)?"currentColor":"none"}/></button></div>
 <button className="concept-card-body" onClick={()=>launch("service",v.id)}><strong>{v.name}</strong><small>{v.sub}</small><span className="concept-location"><MapPin size={12}/>{v.hood}</span><span className="concept-rating"><Star size={13} fill="currentColor"/><b>{v.rating}</b><span>({v.reviews})</span></span></button>
 </Card>;
 const title=<><span>O que você precisa</span><span>em {city.split(" - ")[0]}?</span></>;
 const sectionTitle=(t:string,action:()=>void)=><div className="concept-section-title"><div><h2>{t}</h2></div><button onClick={action}>Ver todos <ArrowRight size={15}/></button></div>;
 const side=<aside className="concept-right">
  <Card className="concept-side-card"><div className="concept-side-title"><h3>Nos seus grupos</h3><button onClick={()=>switchPage("Grupos")}>Ver todos</button></div>{groups.map(g=><button className="concept-group-row" key={g.name} onClick={()=>{switchPage("Grupos");notify("Grupo selecionado",g.name)}}><Avatar className="concept-group-avatar"><AvatarFallback>{g.initials}</AvatarFallback></Avatar><span><strong>{g.name}</strong><small>{g.count}</small><i>{g.news}</i></span><ChevronRight size={16}/></button>)}</Card>
  <Card className="concept-side-card"><div className="concept-side-title"><h3>Próximo encontro</h3><button onClick={()=>switchPage("Comunidade")}>Ver todos</button></div><div className="concept-event"><div className="concept-date"><small>SÁB</small><b>24</b><small>MAI</small></div><div className="concept-event-info"><strong>Confraternização Bivaque Brasília</strong><small><MapPin size={12}/> Parque da Cidade - DF</small><small><Clock size={12}/> 14:00 - 18:00</small><span className="concept-avatars"><span>JC</span><span>LR</span><span>AM</span><span>+42 confirmados</span></span></div></div><Button className="concept-attend" onClick={()=>{setAttending(a=>!a);notify(attending?"Presença cancelada":"Presença confirmada","Esta é uma ação demonstrativa.");}}>{attending?<><Check size={16}/> Presença confirmada</>:"Quero participar"}</Button></Card>
  <Card className="concept-side-card"><div className="concept-side-title"><h3>Guia de chegada</h3><button onClick={()=>switchPage("Guia da Cidade")}>Ver todos</button></div>{[{Icon:House,title:"Morando em Brasília",hint:"Bairros, escolas, saúde e mais"},{Icon:FileText,title:"Documentação militar",hint:"Links e orientações úteis"},{Icon:Users,title:"Rede de apoio",hint:"Serviços confiáveis da comunidade"}].map(({Icon,title,hint})=><button className="concept-guide-row" key={title} onClick={()=>switchPage("Guia da Cidade")}><span><Icon size={19}/></span><div><strong>{title}</strong><small>{hint}</small></div></button>)}</Card>
 </aside>;
 const explore=(list:Page[])=>list.map(label=>{const Icon=nav.find(n=>n.label===label)?.Icon||Compass;return <button className={"concept-nav-link "+(page===label?"active":"")} key={label} onClick={()=>switchPage(label)}><Icon size={19}/><span>{label}</span>{label==="Conversas"&&notifications>0&&<b className="concept-count">{notifications}</b>}</button>});
 const sidebar=<aside className="concept-sidebar"><div className="concept-sidebar-brand"><Brand/></div><div className="concept-nav-main">{explore(["Início","Comunidade","Conversas","Você"])}</div><Separator className="concept-nav-separator"/><span className="concept-nav-caption">Explorar</span><div className="concept-nav-explore">{explore(["Imóveis","Serviços","Desapegos","Grupos","Movimentação","Guia da Cidade","Vilas","Clube","Agenda","Pedidos","Talentos","Caronas"])}</div><div className="concept-sidebar-promo"><span>Força que conecta<br/>gera oportunidades.</span><small>A rede acompanha a vida militar.</small></div></aside>;
 const mobileShortcuts=[{name:"Negócios",Icon:BriefcaseBusiness,target:"Serviços" as Page},{name:"Desapegos",Icon:Tags,target:"Desapegos" as Page},{name:"Imóveis",Icon:House,target:"Imóveis" as Page},{name:"Indicações",Icon:Star,target:"Comunidade" as Page}];
 const home=<div className="concept-grid"><div className="concept-center"><div className="concept-demo-note"><ShieldCheck size={15}/> Exploração visual com perfis, anúncios e avaliações fictícios. Não é um serviço ativo.</div><div className="concept-hero">
   <div className="concept-hero-image"/><div className="concept-hero-overlay"/>
   <div className="concept-hero-content"><h1>{title}</h1><p>Conexões reais para a vida militar dentro e fora do quartel.</p><button className="concept-hero-search" onClick={()=>setDialog("search")}><Search size={18}/><span>Buscar imóveis, serviços, desapegos, pessoas...</span><b><Search size={15}/>Buscar</b></button></div>
   <div className="concept-shortcuts">{mobileShortcuts.map(({name,Icon,target})=><button key={name} onClick={()=>switchPage(target)}><Icon size={18}/><span>{name}</span></button>)}</div>
  </div>
  <section className="concept-services-block">{sectionTitle("Serviços recomendados",()=>switchPage("Serviços"))}<p className="concept-section-sub">Profissionais e empresas da nossa comunidade.</p><div className="concept-services-grid">{(city.startsWith("Brasília")?services:[]).map(v=>serviceCard(v))}</div>{!city.startsWith("Brasília")&&<p className="concept-city-empty">Esta cidade ainda não possui fichas fictícias nesta demonstração. Explore os módulos e seus filtros.</p>}</section>
  <section className="concept-market-block"><Tabs value={tab} onValueChange={v=>{setTab(v);setCategory("Todos")}}><div className="concept-market-controls"><TabsList className="concept-main-tabs"><TabsTrigger value="Imóveis"><House size={15}/> Imóveis</TabsTrigger><TabsTrigger value="Desapegos"><Tags size={15}/> Desapegos</TabsTrigger><TabsTrigger value="Serviços"><BriefcaseBusiness size={15}/> Serviços</TabsTrigger><TabsTrigger value="Pedidos"><ClipboardList size={15}/> Pedidos</TabsTrigger></TabsList><button className="concept-save-toggle" onClick={()=>setViewMode(x=>x==="Todos"?"Salvos":"Todos")}><Bookmark size={15} fill={viewMode==="Salvos"?"currentColor":"none"}/>{viewMode==="Salvos"?"Ver todos":"Salvos"}</button></div>
  <TabsContent value="Imóveis"><div className="concept-filters"><div className="concept-filter-scroll">{categories.map(c=><Button className={category===c?"selected":""} key={c} variant="outline" size="sm" onClick={()=>setCategory(c)}>{c}</Button>)}</div><Button className="concept-filter-button" size="sm" variant="outline" onClick={()=>setFilterSheet(true)}><SlidersHorizontal size={16}/> Filtros</Button></div><div className="concept-listing-grid">{(city.startsWith("Brasília")?filtered:[]).map(v=>listingCard(v))}</div>{filtered.length===0&&<p className="concept-no-result">Nenhum imóvel corresponde aos filtros. <button onClick={()=>{setCategory("Todos");setViewMode("Todos")}}>Limpar filtros</button></p>}</TabsContent>
  <TabsContent value="Desapegos"><div className="concept-filters"><span className="concept-tab-hint">Itens disponíveis na comunidade</span><Button size="sm" variant="outline" onClick={()=>setFilterSheet(true)}><SlidersHorizontal size={16}/> Filtros</Button></div><div className="concept-listing-grid">{(city.startsWith("Brasília")?filtered:[]).map(v=>listingCard(v))}</div>{!filtered.length&&<p className="concept-no-result">Nenhum item salvo nesta seleção.</p>}</TabsContent>
  <TabsContent value="Serviços"><div className="concept-listing-grid concept-tab-services">{services.map(v=>serviceCard(v))}</div></TabsContent>
  <TabsContent value="Pedidos"><div className="concept-request"><ClipboardList size={28}/><h3>Precisa contratar um serviço?</h3><p>Descreva sua necessidade para receber propostas da comunidade.</p><Button onClick={()=>switchPage("Pedidos")}><Plus size={16}/> Criar pedido</Button></div></TabsContent></Tabs></section>
  <section className="concept-hub"><div className="concept-section-title"><h2>Mais no Bivaque</h2><button onClick={()=>switchPage("Movimentação")}>Explorar módulos <ArrowRight size={15}/></button></div><div className="concept-hub-grid">{([{label:"Movimentação",Icon:Compass,desc:"Sua chegada ou saída"},{label:"Vilas",Icon:Building2,desc:"Comunidade privada"},{label:"Clube",Icon:Heart,desc:"Benefícios e parceiros"},{label:"Agenda",Icon:CalendarDays,desc:"Encontros e eventos"},{label:"Grupos",Icon:Users,desc:"Pessoas com interesses"},{label:"Pedidos",Icon:ClipboardList,desc:"Compare propostas"},{label:"Talentos",Icon:UserRound,desc:"Conhecimentos e habilidades"},{label:"Caronas",Icon:Car,desc:"Compartilhe trajetos"}] as const).map(({label,Icon,desc})=><button key={label} onClick={()=>switchPage(label)}><Icon size={22}/><strong>{label}</strong><small>{desc}</small><ArrowRight size={14}/></button>)}</div></section>
  </div>{side}</div>;
 const subPage=<ModuleWorkspace page={page} city={city} searchQuery={query} saved={saved} onSave={save} onNavigate={next=>switchPage(next as Page)} onNotify={notify}/>;

 const selectedListing=listings.find(x=>x.id===selected);
 const selectedService=services.find(x=>x.id===selected);
 return <TooltipProvider><div className="concept">
  {sidebar}
  <div className="concept-work"><header className="concept-topbar">
   <div className="concept-topbar-left"><button className="concept-mobile-menu" aria-label="Abrir menu" onClick={()=>setMobileSheet(true)}><Menu size={22}/></button><div className="concept-mobile-brand"><Brand/></div>
   <DropdownMenu><DropdownMenuTrigger asChild><Button className="concept-city-select" variant="outline"><MapPin size={16}/>{city}<ChevronDown size={14}/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel>Escolher cidade</DropdownMenuLabel>{cities.map(c=><DropdownMenuItem key={c} onSelect={()=>{setCity(c);notify("Cidade alterada",c)}}>{c===city&&<Check size={15}/>} {c}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
   <button className="concept-top-search" onClick={()=>setDialog("search")}><Search size={17}/><span>Buscar imóveis, serviços, pessoas, grupos...</span><kbd>⌘ K</kbd></button>
   <div className="concept-topbar-actions"><Tooltip><TooltipTrigger asChild><button className="concept-icon-btn" aria-label="Avisos" onClick={()=>{setNotifications(0);notify("Seus avisos","Nenhuma pendência importante nesta demonstração.")}}><Bell size={20}/>{notifications>0&&<i/>}</button></TooltipTrigger><TooltipContent>Avisos</TooltipContent></Tooltip>
   <DropdownMenu><DropdownMenuTrigger className="concept-user-menu"><Avatar><AvatarFallback>CO</AvatarFallback></Avatar><span>Cap. Oliveira</span><ChevronDown size={14}/></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Conta demonstrativa</DropdownMenuLabel><DropdownMenuItem onSelect={()=>switchPage("Você")}>Meu perfil</DropdownMenuItem><DropdownMenuItem onSelect={()=>switchPage("Conversas")}>Conversas</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>notify("Modo de teste","Nenhuma informação real é enviada.")}>Informações da prévia</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
   <Button className="concept-publish" onClick={createAction}><Plus size={17}/> Publicar</Button></div>
  </header>
  <div className="concept-content">{page==="Início"?home:subPage}</div>
  </div>
  <nav className="concept-bottom-nav" aria-label="Navegação mobile">
  {([{label:"Início",Icon:Home},{label:"Comunidade",Icon:Users}] as const).map(({label,Icon})=><button className={page===label?"active":""} key={label} onClick={()=>switchPage(label)}><Icon size={19}/><span>{label}</span></button>)}
  <button className="concept-mobile-plus" aria-label="Criar" onClick={createAction}><Plus size={25}/></button>
  {([{label:"Conversas",Icon:MessageCircle},{label:"Você",Icon:UserRound}] as const).map(({label,Icon})=><button className={page===label?"active":""} key={label} onClick={()=>switchPage(label)}><Icon size={19}/><span>{label}</span>{label==="Conversas"&&notifications>0&&<i>{notifications}</i>}</button>)}
  </nav>
  <Sheet open={mobileSheet} onOpenChange={setMobileSheet}><SheetContent side="left" title="Bivaque" className="concept-menu-sheet"><div className="concept-sheet-nav">{nav.map(({label,Icon})=><button key={label} onClick={()=>switchPage(label)}><Icon size={19}/>{label}</button>)}</div></SheetContent></Sheet>
  <Sheet open={filterSheet} onOpenChange={setFilterSheet}><SheetContent side="right" title="Filtros de imóveis" className="concept-filter-sheet"><div><h3>Categoria</h3>{categories.map(c=><button className={category===c?"active":""} key={c} onClick={()=>setCategory(c)}>{c}</button>)}<Separator className="my-5"/><h3>Ordenação</h3>{["Relevância","Mais recentes","Menor preço"].map(s=><button key={s} className={sort===s?"active":""} onClick={()=>setSort(s)}>{s}</button>)}</div><Button onClick={()=>setFilterSheet(false)} className="concept-sheet-apply">Aplicar filtros</Button></SheetContent></Sheet>
  <Dialog open={dialog==="search"} onOpenChange={v=>!v&&setDialog(null)}><DialogContent title="Buscar no Bivaque"><form className="concept-form" onSubmit={e=>{e.preventDefault();setDialog(null);switchPage("Busca")}}><label htmlFor="concept-search">O que você procura?</label><Input autoFocus id="concept-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Apartamento, escola, mudança..."/><Button type="submit"><Search size={17}/> Buscar</Button><div className="concept-search-suggestions">{["Apartamento","Mudança","Serviços","Escolas"].map(v=><button type="button" key={v} onClick={()=>{setQuery(v==="Serviços"?"":v);setDialog(null);switchPage(v==="Serviços"?"Serviços":"Busca")}}>{v}</button>)}</div></form></DialogContent></Dialog>
  <Dialog open={dialog==="create"||dialog==="contact"} onOpenChange={v=>!v&&setDialog(null)}><DialogContent title={dialog==="contact"?"Entrar em contato":"Criar uma publicação"}><form className="concept-form" onSubmit={e=>{e.preventDefault();if(draft.trim()){setPosted(a=>[draft.trim(),...a]);setDialog(null);setDraft("");notify("Sua publicação foi registrada","Prévia local: nada foi enviado à comunidade real.")}}}><label htmlFor="concept-draft">Descreva o que precisa</label><Textarea autoFocus id="concept-draft" required rows={4} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Conte à comunidade o que você procura ou quer anunciar."/><small>Esta experiência não publica dados nem entra em contato com terceiros.</small><Button type="submit"><Send size={16}/> Salvar nesta demonstração</Button></form></DialogContent></Dialog>
  <Dialog open={dialog==="listing"||dialog==="service"} onOpenChange={v=>!v&&setDialog(null)}><DialogContent title="Detalhes"><div className="concept-detail-dialog">{selectedListing&&dialog==="listing"?<><Photo src={selectedListing.image} alt={selectedListing.name}/><h2>{selectedListing.name}</h2><strong>{selectedListing.price}{selectedListing.kind==="Imóveis"?"/mês":""}</strong><p><MapPin size={15}/> {selectedListing.hood}</p><small>{selectedListing.details}</small></>:selectedService&&<><Photo src={selectedService.image} alt={selectedService.name}/><h2>{selectedService.name}</h2><p>{selectedService.sub}</p><span><Star size={15} fill="currentColor"/>{selectedService.rating} · {selectedService.reviews} avaliações demonstrativas</span></>}<Button onClick={()=>{setDraft("");setDialog("contact")}}><MessageCircle size={16}/> Entrar em contato</Button><Button variant="outline" onClick={()=>save(selected)}><Bookmark size={16}/> {saved.includes(selected)?"Remover dos salvos":"Salvar"}</Button></div></DialogContent></Dialog>
  {toast&&<div role="status" className="concept-toast"><span><CheckCircle2 size={21}/></span><div><strong>{toast.title}</strong><small>{toast.message}</small></div><button onClick={()=>setToast(null)} aria-label="Fechar aviso"><X size={16}/></button></div>}
 </div></TooltipProvider>;
}
