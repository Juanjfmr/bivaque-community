"use client";
import Link from "next/link";
import Image from "next/image";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,ArrowUpRight,Bell,Bookmark,BriefcaseBusiness,Building2,CalendarDays,Check,CheckCheck,ChevronDown,ChevronRight,ClipboardList,Compass,Heart,HelpCircle,Home,House,MapPin,MapPinned,Menu,MessageCircle,MessagesSquare,MoreHorizontal,Plus,Search,Send,Settings2,ShieldCheck,SlidersHorizontal,Store,SunMoon,Users,UserRound,ShoppingBag,HandHeart,Filter,X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar,AvatarFallback} from "@/components/ui/avatar";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Progress} from "@/components/ui/progress";
import {Checkbox} from "@/components/ui/checkbox";
import {Separator} from "@/components/ui/separator";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {Sheet,SheetTrigger,SheetContent,SheetClose} from "@/components/ui/sheet";
import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from "@/components/ui/tooltip";
import {Dialog,DialogContent} from "@/components/ui/dialog";

type Listing={id:string,title:string,kind:"desapego"|"imovel",category:string,price:string,hood:string,image?:string,desc:string};
type Business={id:string,name:string,category:string,hood:string,rec:number,image?:string,description:string};
type Question={id:string,title:string,detail:string,answers:number,tag:string,author:string};
const listings:Listing[]=[
 {
  "id": "i1",
  "title": "Sofá retrátil seminovo",
  "kind": "desapego",
  "category": "Casa",
  "price": "R$ 800",
  "hood": "Ponta Negra",
  "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",
  "desc": "Três lugares, tecido suede cinza, retrátil e reclinável. Dois anos de uso, sem manchas. Retirada no prédio."
 },
 {
  "id": "i2",
  "title": "Apartamento 3 quartos",
  "kind": "imovel",
  "category": "Aluguel",
  "price": "R$ 3.200/mês",
  "hood": "Ponta Negra",
  "image": "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d",
  "desc": "98 m², 2 vagas, área de lazer completa. Condomínio de R$ 720. Disponível a partir de dezembro."
 },
 {
  "id": "i3",
  "title": "Berço com colchão",
  "kind": "desapego",
  "category": "Infantil",
  "price": "R$ 450",
  "hood": "Flores",
  "image": "https://images.unsplash.com/photo-1774578342155-8d7e44a18bfd",
  "desc": "Berço americano de madeira com colchão novo. Desmontado para facilitar o transporte."
 },
 {
  "id": "i4",
  "title": "Geladeira duplex 400 L",
  "kind": "desapego",
  "category": "Casa",
  "price": "R$ 1.500",
  "hood": "Dom Pedro",
  "image": "https://images.unsplash.com/photo-1721613877687-c9099b698faa",
  "desc": "Frost free, inox, funcionando perfeitamente. Vendo por causa da transferência."
 },
 {
  "id": "i5",
  "title": "Apartamento 2 quartos",
  "kind": "imovel",
  "category": "Aluguel",
  "price": "R$ 2.400/mês",
  "hood": "Flores",
  "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
  "desc": "70 m², varanda, uma vaga. Perto de mercado e farmácia. Condomínio de R$ 480."
 },
 {
  "id": "i6",
  "title": "Mesa de jantar 6 lugares",
  "kind": "desapego",
  "category": "Casa",
  "price": "R$ 600",
  "hood": "Adrianópolis",
  "image": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
  "desc": "Tampo de vidro e seis cadeiras estofadas. Pequeno risco num dos pés, sem afetar o uso."
 }
];
const businesses:Business[]=[
 {
  "id": "b4",
  "name": "Bolos da Cláudia",
  "category": "Comida",
  "hood": "Dom Pedro",
  "rec": 12,
  "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
  "description": "Bolo de aniversário · Docinhos · Kit festa"
 },
 {
  "id": "b9",
  "name": "Sorriso Kids Odontopediatria",
  "category": "Saúde",
  "hood": "Planalto",
  "rec": 9,
  "image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5",
  "description": "Consulta infantil · Ortodontia · Atendimento pelo plano"
 },
 {
  "id": "b5",
  "name": "Prof. Sérgio, matemática",
  "category": "Aulas",
  "hood": "Planalto",
  "rec": 8,
  "image": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
  "description": "Reforço escolar · Preparatório EsPCEx e EEAR · Aulas on-line"
 },
 {
  "id": "b8",
  "name": "Clínica Vet 24h Turismo",
  "category": "Pets",
  "hood": "Ponta Negra",
  "rec": 7,
  "image": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b",
  "description": "Pronto-atendimento 24h · Vacinas · Banho e tosa"
 },
 {
  "id": "b7",
  "name": "Oficina do Seu Raimundo",
  "category": "Mecânica",
  "hood": "Djalma Batista",
  "rec": 6,
  "image": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3",
  "description": "Revisão · Freios e suspensão · Troca de óleo"
 },
 {
  "id": "b2",
  "name": "Mudanças Rio Negro",
  "category": "Mudança",
  "hood": "Toda Manaus",
  "rec": 5,
  "image": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7",
  "description": "Mudança em Manaus · Mudança interestadual · Embalagem e montagem · Guarda-móveis"
 },
 {
  "id": "b6",
  "name": "Jorge Eletricista",
  "category": "Elétrica",
  "hood": "Flores",
  "rec": 4,
  "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780",
  "description": "Chuveiro e tomadas · Quadro de luz · Ventilador de teto"
 },
 {
  "id": "b1",
  "name": "Amazon Climatização",
  "category": "Climatização",
  "hood": "Planalto",
  "rec": 3,
  "image": "https://images.unsplash.com/photo-1581092921461-eab62e97a780",
  "description": "Limpeza de split · Instalação de split · Recarga de gás · Contrato para condomínio"
 },
 {
  "id": "b3",
  "name": "Frio Norte Refrigeração",
  "category": "Refrigeração",
  "hood": "Flores",
  "rec": 2,
  "image": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1",
  "description": "Conserto de geladeira · Freezer e frigobar · Máquina de lavar"
 }
];
const questions:Question[]=[
 {
  "id": "a1",
  "title": "Pediatra que atenda pelo plano da Força perto do Parque 10?",
  "detail": "chegou há 3 dias. Saúde, Parque 10",
  "answers": 0,
  "tag": "Saúde, Parque 10",
  "author": "Carla R."
 },
 {
  "id": "a6",
  "title": "Diarista de confiança que atenda no Planalto?",
  "detail": "chegou semana passada. Casa, Planalto",
  "answers": 0,
  "tag": "Casa, Planalto",
  "author": "Jéssica L."
 },
 {
  "id": "a7",
  "title": "Academia que abra às 5h perto do Dom Pedro?",
  "detail": "chega em dezembro. Esporte, Dom Pedro",
  "answers": 0,
  "tag": "Esporte, Dom Pedro",
  "author": "Diego F."
 },
 {
  "id": "a8",
  "title": "Pet shop com banho e tosa que busque em casa na Ponta Negra?",
  "detail": "chegou há 2 semanas. Pets, Ponta Negra",
  "answers": 0,
  "tag": "Pets, Ponta Negra",
  "author": "Bruna S."
 },
 {
  "id": "a2",
  "title": "Escola com vaga no 3º ano perto do Planalto?",
  "detail": "chega em novembro. Educação, Planalto",
  "answers": 1,
  "tag": "Educação, Planalto",
  "author": "Marcos T."
 },
 {
  "id": "a3",
  "title": "Mecânico de confiança para Hilux na Zona Centro-Sul",
  "detail": "mora no Adrianópolis. Carro, Centro-Sul",
  "answers": 2,
  "tag": "Carro, Centro-Sul",
  "author": "Renato A."
 }
];
const steps=["Conhecer bairros e distâncias","Pesquisar moradia","Organizar a mudança","Encontrar serviços essenciais","Conhecer a comunidade"];
const groups=[
 {
  "id": "k2",
  "name": "Vizinhos do Planalto e do Dom Pedro",
  "initials": "Vd",
  "count": "212 membros",
  "desc": "Indicações, achados e avisos do bairro."
 },
 {
  "id": "k3",
  "name": "Famílias com crianças pequenas",
  "initials": "Fc",
  "count": "540 membros",
  "desc": "Pediatras, escolas, festas e trocas de roupa infantil."
 },
 {
  "id": "k4",
  "name": "Pedal e corrida na orla",
  "initials": "Pe",
  "count": "96 membros",
  "desc": "Treinos em grupo aos fins de semana, com saída do calçadão da Ponta Negra."
 }
];
const places=["Manaus","Brasília","Rio de Janeiro","Natal","São Paulo","Belém","Recife","Porto Alegre","Campo Grande"];
const navPrimary=[["inicio","Início",Home],["comunidade","Comunidade",Users],["conversas","Conversas",MessagesSquare],["voce","Você",UserRound]] as const;
const navExplore=[["negocios","Negócios",Store],["desapegos","Desapegos",ShoppingBag],["imoveis","Imóveis",Building2],["guia","Guia de chegada",Compass],["agenda","Agenda",CalendarDays],["pedidos","Serviços",HandHeart]] as const;
const intentItems=[["imoveis","Encontrar imóvel",House],["negocios","Buscar serviço",BriefcaseBusiness],["desapegos","Comprar e vender",ShoppingBag],["comunidade","Pedir indicação",HandHeart]] as const;
const titles:Record<string,string>={inicio:"Início",comunidade:"Comunidade",conversas:"Conversas",conversa:"Conversa",voce:"Você",negocios:"Negócios",desapegos:"Desapegos",imoveis:"Imóveis",guia:"Guia de chegada",agenda:"Agenda",pedidos:"Pedidos de serviço",salvos:"Salvos",busca:"Busca",anuncio:"Anúncio",negocio:"Negócio",pergunta:"Pergunta",grupo:"Grupo",publicacao:"Publicação",evento:"Encontro","meus-anuncios":"Meus anúncios",minhas:"Minhas publicações",ajuda:"Ajuda",contato:"Contato",chamados:"Chamados",ocultados:"Ocultados",bloqueados:"Bloqueados",privacidade:"Privacidade",conduta:"Código de conduta",entrar:"Entrar","apagar-conta":"Excluir conta",catalogo:"Explorar",dono:"Meu negócio",pedido:"Pedido"};
function initials(s:string){return s.split(" ").map(v=>v[0]).slice(0,2).join("").toUpperCase();}
const creationActions=[{id:"pergunta",title:"Pedir indicação",description:"Pergunte a quem conhece",Icon:HandHeart},{id:"desapego",title:"Anunciar desapego",description:"Venda ou doe com confiança",Icon:ShoppingBag},{id:"imovel",title:"Anunciar imóvel",description:"Aluguel ou venda",Icon:House},{id:"negocio",title:"Cadastrar negócio",description:"Ofereça seus serviços",Icon:Store},{id:"pedido",title:"Pedir serviço",description:"Receba propostas",Icon:BriefcaseBusiness},{id:"evento",title:"Criar encontro",description:"Reúna a comunidade",Icon:CalendarDays}];

export function Screen({slug}:{slug:string[]}){
 const router=useRouter(),screen=slug[0]||"inicio",detail=slug[1]||"";
 const [city,setCity]=useState("Manaus"),[theme,setTheme]=useState("auto"),[saved,setSaved]=useState<string[]>([]),[complete,setComplete]=useState<number[]>([]),[query,setQuery]=useState(""),[filter,setFilter]=useState("Todos"),[sort,setSort]=useState("recentes"),[dialog,setDialog]=useState(""),[draft,setDraft]=useState(""),[toast,setToast]=useState(""),[replies,setReplies]=useState<Record<string,string[]>>({}),[rsvps,setRsvps]=useState<string[]>([]),[searchOpen,setSearchOpen]=useState(false),[mobileMenu,setMobileMenu]=useState(false),[cityPickerOpen,setCityPickerOpen]=useState(false),[navHidden,setNavHidden]=useState(false),[lastViewed,setLastViewed]=useState<{kind:"listing"|"business",id:string,city:string}|null>(null);
 useEffect(()=>{try{setCity(localStorage.getItem("bv.city")||"Manaus");setTheme(localStorage.getItem("bv.theme")||"auto");setSaved(JSON.parse(localStorage.getItem("bv.saved")||"[]"));setComplete(JSON.parse(localStorage.getItem("bv.complete")||"[]"));setReplies(JSON.parse(localStorage.getItem("bv.replies")||"{}"));setRsvps(JSON.parse(localStorage.getItem("bv.rsvps")||"[]"));setLastViewed(JSON.parse(localStorage.getItem("bv.last")||"null"));}catch{}},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme==="auto"?"":theme;try{localStorage.setItem("bv.theme",theme)}catch{}},[theme]);
 useEffect(()=>{try{localStorage.setItem("bv.city",city);localStorage.setItem("bv.saved",JSON.stringify(saved));localStorage.setItem("bv.complete",JSON.stringify(complete));localStorage.setItem("bv.replies",JSON.stringify(replies));localStorage.setItem("bv.rsvps",JSON.stringify(rsvps));if(lastViewed)localStorage.setItem("bv.last",JSON.stringify(lastViewed));}catch{}},[city,saved,complete,replies,rsvps,lastViewed]);
 useEffect(()=>{let oldY=0;const onScroll=()=>{const y=window.scrollY;if(window.innerWidth<720){if(y>oldY+6&&y>140)setNavHidden(true);else if(y<oldY-6||y<60)setNavHidden(false);}oldY=y;};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);
 useEffect(()=>{const handle=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(true);}};document.addEventListener("keydown",handle);return()=>document.removeEventListener("keydown",handle);},[]);
 const inform=(s:string)=>setToast(s);
 const search=()=>{setSearchOpen(false);router.push("/busca/"+encodeURIComponent(query.trim()||"todos"));};
 const toggleSave=(id:string)=>{setSaved(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);inform(saved.includes(id)?"Removido dos salvos":"Salvo para consultar depois");};
 const openCreate=(type:string)=>{setDialog(type);setDraft("");};
 const section=(name:string,to:string,sub?:string)=><div className="section-title"><div><h2>{name}</h2>{sub&&<p className="small muted mb-0">{sub}</p>}</div><Button variant="ghost" size="sm" asChild><Link href={to}>Ver todos<ArrowRight size={15}/></Link></Button></div>;
 const media=(img:string|undefined,kind:"imovel"|"desapego"|"negocio")=>img?<Image src={img} alt={"Imagem ilustrativa de "+kind} width={700} height={430} className="photo" />:<div className={"faux-photo faux-"+kind}>{kind==="imovel"?<House size={42}/>:kind==="negocio"?<BriefcaseBusiness size={42}/>:<ShoppingBag size={42}/>}<span>Imagem ilustrativa</span></div>;
 const listingCard=(item:Listing)=><Card className="market-card" key={item.id}><div className="market-visual"><Link href={"/anuncio/"+item.id} aria-label={"Ver "+item.title} onClick={()=>setLastViewed({kind:"listing",id:item.id,city})}>{media(item.image,item.kind)}</Link><Badge className="market-category" variant="default">{item.category}</Badge><Button size="icon" variant="secondary" className="save-icon" aria-label={saved.includes(item.id)?"Remover dos salvos":"Salvar anúncio"} onClick={()=>toggleSave(item.id)}><Heart size={18} fill={saved.includes(item.id)?"currentColor":"none"}/></Button></div><div className="market-copy"><Link href={"/anuncio/"+item.id}><h3>{item.title}</h3></Link><p className="muted small"><MapPin size={13}/> {item.hood} · {city}</p><div className="market-foot"><strong>{item.price}</strong><Link href={"/anuncio/"+item.id} aria-label={"Detalhes de "+item.title}><ArrowUpRight size={17}/></Link></div></div></Card>;
 const businessCard=(item:Business)=><Card className="business-card" key={item.id}><Link href={"/negocio/"+item.id} className="business-visual" onClick={()=>setLastViewed({kind:"business",id:item.id,city})}>{media(item.image,"negocio")}</Link><div className="market-copy"><Badge variant="outline">{item.category}</Badge><Link href={"/negocio/"+item.id}><h3 className="mt-3">{item.name}</h3></Link><p className="small muted"><MapPin size={13}/> {item.hood} · {city}</p><div className="market-foot"><span className="recommend"><Heart size={14}/>{item.rec} indicações</span><Button variant="ghost" size="sm" asChild><Link href={"/negocio/"+item.id}>Conhecer<ArrowRight size={14}/></Link></Button></div></div></Card>;
 const questionRows=(items=questions)=><Card className="question-list"><div className="question-heading"><span>Conversas da comunidade</span><Badge variant="outline">{items.length} tópicos</Badge></div>{items.map(q=><Link href={"/pergunta/"+q.id} className="question-row" key={q.id}><Avatar className="size-10"><AvatarFallback>{initials(q.author)}</AvatarFallback></Avatar><div className="grow min-w-0"><div className="question-tag">{q.tag} · {q.author}</div><strong>{q.title}</strong><span className="question-help">{q.answers+(replies[q.id]?.length||0)} respostas · Compartilhe sua experiência</span></div><ChevronRight size={17} className="shrink-0 text-[var(--muted)]"/></Link>)}</Card>;
 const guide=<Card className="guide-panel"><div className="p-5"><div className="flex items-center gap-3 mb-3"><span className="square-icon"><Compass size={19}/></span><div><h3 className="mb-1">Sua chegada a {city}</h3><p className="small muted mb-0">{complete.length} de {steps.length} etapas concluídas</p></div></div><Progress value={complete.length/steps.length*100} aria-label="Progresso do plano de chegada" className="mb-4"/>{steps.map((s,i)=><label key={s} className={"task "+(complete.includes(i)?"done":"")}><Checkbox checked={complete.includes(i)} onCheckedChange={()=>setComplete(a=>a.includes(i)?a.filter(x=>x!==i):[...a,i])}/><span>{s}</span></label>)}<Button className="w-full mt-4" variant="outline" asChild><Link href="/guia">Abrir guia completo<ArrowRight size={16}/></Link></Button></div></Card>;
 const groupCards=<Card className="group-panel"><div className="panel-heading"><div><h2>Seus grupos</h2><p className="small muted mb-0">Pessoas e assuntos próximos</p></div><Button variant="ghost" size="sm" asChild><Link href="/grupo/1">Abrir<ArrowRight size={15}/></Link></Button></div>{groups.map(g=><Link href={"/grupo/"+g.id} key={g.id} className="group-row"><Avatar className="size-10"><AvatarFallback>{g.initials}</AvatarFallback></Avatar><span className="grow min-w-0"><strong>{g.name}</strong><small>{g.count}</small></span><ChevronRight size={17} className="text-[var(--muted)]"/></Link>)}</Card>;

 
 const homeHire=<button className="r72-hire" onClick={()=>openCreate("pedido")}><BriefcaseBusiness size={23}/><span className="grow"><strong>Precisa contratar?</strong><small>Descreva o que precisa e receba propostas.</small></span><ChevronRight size={19}/></button>;
 const homeGroup=<Card className="r72-side-card r72-group-card"><div className="r72-side-title"><h2>Nos seus grupos</h2><Button variant="ghost" size="sm" asChild><Link href="/grupo/1">Ver grupos<ChevronRight size={15}/></Link></Button></div><div>{groups.slice(0,2).map(g=><Link className="r72-group-row" href={"/grupo/"+g.id} key={g.id}><Avatar className="size-10"><AvatarFallback>{g.initials}</AvatarFallback></Avatar><span className="grow"><strong>{g.name}</strong><small>{g.count} · {g.desc}</small></span><ChevronRight size={17}/></Link>)}</div></Card>;
 const homeEvent=<Card className="r72-side-card r72-event-card"><div className="r72-side-title"><h2>Próximo encontro</h2><Button variant="ghost" size="sm" asChild><Link href="/agenda">Agenda<ChevronRight size={15}/></Link></Button></div><div className="r72-event-content"><Link href="/agenda" className="r72-date"><small>OUT</small><strong>24</strong></Link><div className="grow"><Link href="/agenda"><strong>Despedida de quem sai em dezembro</strong></Link><small>Sex · 19h30 · {city}</small><Button variant="outline" size="sm" onClick={()=>{setRsvps(a=>a.includes("encontro")?a.filter(v=>v!=="encontro"):[...a,"encontro"]);inform("Presença demonstrativa atualizada.");}}>{rsvps.includes("encontro")?<Check size={15}/>:null}{rsvps.includes("encontro")?"Confirmado":"Vou"}</Button></div></div></Card>;
 const homeArrival=<Card className="r72-arrival"><Compass size={24}/><span className="grow"><strong>Chegando a {city}?</strong><small>Conheça bairros, serviços e orientações para sua mudança.</small><Button size="sm" variant="ghost" asChild><Link href="/guia">Ver guia de chegada<ChevronRight size={14}/></Link></Button></span></Card>;
 const homeSections=<>
 <section className="r72-section r72-service-section">{section("Serviços recomendados","/negocios","Indicados pela comunidade de "+city)}<div className="r72-home-row">{[...businesses].sort((a,b)=>b.rec-a.rec).slice(0,4).map(businessCard)}</div></section>
 <section className="r72-section r72-item-section">{section("Oportunidades perto de você","/desapegos")}<div className="r72-home-row">{listings.slice(0,4).map(listingCard)}</div></section>
 <div className="r72-mobile-side">{homeGroup}{homeEvent}{homeArrival}</div>
 <section className="r72-business-cta"><Store size={21}/><span className="grow"><strong>Tem um negócio?</strong><small>Crie sua página e receba pedidos da comunidade.</small></span><Button variant="ghost" size="sm" onClick={()=>openCreate("negocio")}>Criar página<ChevronRight size={15}/></Button></section>
 <section className="r72-section r72-question-section">{section("A comunidade procura","/comunidade")}{questionRows(questions.slice(0,2))}</section>
 <section className="r72-section r72-guide-section">{section("Guia de "+city,"/guia")}<Button variant="outline" className="r72-guide-link" asChild><Link href="/guia"><Compass size={19}/><span className="grow"><strong>Organize moradia, mudança e serviços</strong><small>Um roteiro prático para se estabelecer na cidade.</small></span><ChevronRight size={18}/></Link></Button></section>
 </>;
 const home=<div className="r72-home"><div className="main-grid"><div className="r72-home-main"><div className="page-head r72-home-heading"><div><h1><span className="r72-home-title-start">O que você precisa em </span><button className="r72-city-link" aria-label={"Trocar cidade: "+city} onClick={()=>setCityPickerOpen(true)}>{city}<ChevronDown size={20}/></button><span className="r72-desktop-question">?</span></h1><p className="r72-home-subtitle">Serviços e oportunidades entre militares e famílias.</p></div></div><div className="r72-home-top"><button className="r72-search" id="home-search" onClick={()=>setSearchOpen(true)}><Search size={22}/><span className="r72-search-desktop">Busque serviços, produtos, imóveis ou indicações</span><span className="r72-search-mobile">Busque <strong>“diarista de confiança”</strong></span><kbd>Ctrl K</kbd></button><nav className="r72-intents" aria-label="Áreas">{[["negocios","Negócios",Store],["desapegos","Desapegos",ShoppingBag],["imoveis","Imóveis",Building2],["comunidade","Indicações",HandHeart]].map(([id,label,Icon])=><Link className="r72-intent" href={"/"+id} key={id as string}><span className="r72-intent-icon"><Icon size={23}/></span><span>{label as string}</span></Link>)}</nav></div><div className="r72-home-alerts">{homeHire}</div>{lastViewed?.city===city&&<button className="r72-resume" onClick={()=>router.push((lastViewed.kind==="listing"?"/anuncio/":"/negocio/")+lastViewed.id)}><ClipboardList size={20}/><span className="grow"><strong>Continue de onde parou</strong><small>{lastViewed.kind==="listing"?listings.find(x=>x.id===lastViewed.id)?.title:businesses.find(x=>x.id===lastViewed.id)?.name}</small></span><ChevronRight size={18}/></button>}{homeSections}</div><aside className="r72-home-side">{homeGroup}{homeEvent}{homeArrival}</aside></div></div>;

 const catalog=(kind:"desapego"|"imovel")=>{const categories=kind==="imovel"?["Todos","Aluguel","Venda"]:["Todos","Casa","Infantil","Esporte"];const found=listings.filter(v=>v.kind===kind&&(filter==="Todos"||v.category===filter)); const ordered=sort==="preco"?[...found].sort((a,b)=>Number(a.price.replace(/\D/g,""))-Number(b.price.replace(/\D/g,""))):found;return <><div className="page-head"><div><div className="eyebrow">EXPLORAR EM {city.toUpperCase()}</div><h1>{kind==="imovel"?"Imóveis":"Desapegos"}</h1><p className="muted">Encontre oportunidades compartilhadas pela comunidade.</p></div><Button onClick={()=>openCreate(kind)}><Plus size={17}/>Anunciar</Button></div><div className="catalog-toolbar"><Tabs defaultValue="Todos" key={kind} value={filter} onValueChange={setFilter}><TabsList className="category-tabs">{categories.map(c=><TabsTrigger value={c} key={c}>{c}</TabsTrigger>)}</TabsList></Tabs><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><SlidersHorizontal size={17}/>Ordenar<ChevronDown size={15}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar anúncios</DropdownMenuLabel><DropdownMenuItem onSelect={()=>setSort("recentes")}>{sort==="recentes"&&<Check size={16}/>}Mais recentes</DropdownMenuItem><DropdownMenuItem onSelect={()=>setSort("preco")}>{sort==="preco"&&<Check size={16}/>}Menor preço</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><p className="small muted mb-4">{ordered.length} publicações demonstrativas</p><div className="cards catalog-cards">{ordered.map(listingCard)}</div>{!ordered.length&&<Card className="empty">Nenhum anúncio nesta categoria. <Button variant="ghost" onClick={()=>setFilter("Todos")}>Ver todos</Button></Card>}</>};
 const businessPage=<><div className="page-head"><div><div className="eyebrow">REDE DE CONFIANÇA</div><h1>Negócios e serviços</h1><p className="muted">Profissionais e negócios recomendados em {city}.</p></div><Button onClick={()=>openCreate("negocio")}><Plus size={16}/>Cadastrar negócio</Button></div><div className="catalog-toolbar"><Badge variant="outline"><Heart size={14}/> Recomendações da comunidade</Badge><Button variant="outline" onClick={()=>setSearchOpen(true)}><Search size={16}/>Buscar negócios</Button></div><div className="cards catalog-cards">{businesses.map(businessCard)}</div></>;
 const community=<><div className="page-head"><div><div className="eyebrow">A EXPERIÊNCIA DE QUEM JÁ VIVEU</div><h1>Comunidade</h1><p className="muted">Pergunte, compartilhe e encontre apoio em {city}.</p></div><Button onClick={()=>openCreate("pergunta")}><Plus size={16}/>Perguntar</Button></div><Tabs defaultValue={screen==="grupo"?"grupos":"perguntas"}><TabsList className="mb-2"><TabsTrigger value="perguntas">Perguntas</TabsTrigger><TabsTrigger value="grupos">Grupos</TabsTrigger><TabsTrigger value="encontros">Encontros</TabsTrigger></TabsList><TabsContent value="perguntas"><div className="max-w-3xl"><div className="section-title"><h2>O que a comunidade está perguntando</h2><Badge variant="outline">{questions.length} tópicos</Badge></div>{questionRows()}</div></TabsContent><TabsContent value="grupos"><div className="max-w-2xl">{groupCards}</div></TabsContent><TabsContent value="encontros"><div className="max-w-2xl"><Card className="p-5"><h2>Encontros e experiências</h2><p className="muted">Conheça pessoas e fortaleça vínculos fora da tela.</p><Button asChild><Link href="/agenda">Ver agenda<ArrowRight size={16}/></Link></Button></Card></div></TabsContent></Tabs></>;
 const q=questions.find(v=>v.id===detail)||questions[0];
 const questionPage=<><Button asChild variant="ghost"><Link href="/comunidade"><ArrowLeft size={17}/>Voltar à comunidade</Link></Button><Card className="max-w-3xl mt-4 p-6"><div className="flex items-center gap-3 mb-4"><Avatar><AvatarFallback>{initials(q.author)}</AvatarFallback></Avatar><span><strong className="block text-sm">{q.author}</strong><span className="small muted">Comunidade de {city}</span></span><Badge variant="outline" className="ml-auto">{q.tag}</Badge></div><h1 className="text-[26px]! mb-3">{q.title}</h1><p>{q.detail}</p><Separator className="my-5"/><div className="section-title"><h2>Respostas</h2><Badge variant="outline">{q.answers+(replies[q.id]?.length||0)}</Badge></div><div className="reply"><Avatar><AvatarFallback>MC</AvatarFallback></Avatar><p>Compartilhe sua experiência para ajudar quem está passando por isso.</p></div>{(replies[q.id]||[]).map((v,i)=><div className="reply" key={i}><Avatar><AvatarFallback>EU</AvatarFallback></Avatar><p>{v}</p></div>)}<form className="form-row mt-5" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;setReplies(a=>({...a,[q.id]:[...(a[q.id]||[]),draft.trim()]}));setDraft("");inform("Resposta salva nesta demonstração.");}}><Textarea aria-label="Sua resposta" placeholder="Tem uma indicação ou experiência para compartilhar?" rows={3} value={draft} onChange={e=>setDraft(e.target.value)}/><div className="flex justify-end"><Button type="submit"><Send size={16}/>Responder</Button></div></form></Card></>;
 const listing=listings.find(v=>v.id===detail)||listings[0],business=businesses.find(v=>v.id===detail)||businesses[0];
 const detailPage=screen==="anuncio"?<><Button asChild variant="ghost"><Link href={listing.kind==="imovel"?"/imoveis":"/desapegos"}><ArrowLeft size={16}/>Voltar aos anúncios</Link></Button><div className="page-head mt-5"><div><Badge variant="outline">{listing.category}</Badge><h1 className="mt-2">{listing.title}</h1><p className="muted"><MapPin size={15}/> {listing.hood} · {city}</p></div><span className="detail-price">{listing.price}</span></div><Card className="max-w-4xl"><div className="detail-visual">{media(listing.image,listing.kind)}</div><div className="p-6"><h2>Sobre este anúncio</h2><p>{listing.desc}</p><Separator className="my-5"/><div className="flex flex-wrap gap-3"><Button onClick={()=>openCreate("contato")}>Entrar em contato<MessageCircle size={16}/></Button><Button variant="outline" onClick={()=>toggleSave(listing.id)}><Heart size={16} fill={saved.includes(listing.id)?"currentColor":"none"}/>{saved.includes(listing.id)?"Salvo":"Salvar"}</Button></div></div></Card></>:<><Button asChild variant="ghost"><Link href="/negocios"><ArrowLeft size={16}/>Voltar aos negócios</Link></Button><div className="page-head mt-5"><div><Badge variant="outline">{business.category}</Badge><h1 className="mt-3">{business.name}</h1><p className="muted"><MapPin size={15}/> {business.hood} · {city}</p></div></div><Card className="max-w-3xl p-6"><Badge><Heart size={15}/>{business.rec} indicações da comunidade</Badge><h2 className="mt-5">Sobre o serviço</h2><p>{business.description}</p><p className="small muted">Verifique as referências antes de contratar.</p><Button onClick={()=>openCreate("contato")}>Entrar em contato<ArrowRight size={16}/></Button></Card></>;
 const profile=<><div className="page-head"><div><div className="eyebrow">SEU ESPAÇO</div><h1>Você no Bivaque</h1><p className="muted">Suas atividades, preferências e serviços.</p></div></div><Card className="max-w-2xl p-5 mb-5"><div className="flex items-center gap-4"><Avatar className="size-14"><AvatarFallback>EU</AvatarFallback></Avatar><div><strong>Conta demonstrativa</strong><p className="small muted mb-0">{city} · Demonstração sem acesso a dados reais</p></div><Badge variant="outline" className="ml-auto">Modo teste</Badge></div></Card><Card className="max-w-2xl divide-y divide-[var(--stroke)]">{[["salvos","Itens salvos",Bookmark],["guia","Meu plano de chegada",ClipboardList],["pedidos","Pedidos de serviço",HandHeart],["conversas","Conversas",MessagesSquare],["ajuda","Ajuda e suporte",HelpCircle]].map(([to,label,Icon])=><Link href={"/"+to} className="profile-row" key={to as string}><Icon size={20}/><span className="grow">{label as string}</span><ChevronRight size={17}/></Link>)}</Card><div className="mt-6"><h2>Aparência</h2><div className="flex gap-2 mt-3">{[["auto","Sistema"],["light","Claro"],["dark","Escuro"]].map(([id,label])=><Button key={id} variant={theme===id?"secondary":"outline"} onClick={()=>setTheme(id)}>{label}</Button>)}</div></div></>;
 const terms=decodeURIComponent(detail==="todos"?"":detail),matches=[...businesses,...listings].filter(item=>(("name" in item?item.name:item.title)+" "+item.category+" "+item.hood).toLowerCase().includes((query||terms).trim().toLowerCase()));
 const searchPage=<><div className="page-head"><div><h1>Buscar no Bivaque</h1><p className="muted">Explore negócios, anúncios e indicações em {city}.</p></div></div><form className="search-form" onSubmit={e=>{e.preventDefault();search();}}><Input aria-label="Pesquisar" value={query||terms} placeholder="O que você procura?" onChange={e=>setQuery(e.target.value)}/><Button type="submit"><Search size={17}/>Buscar</Button></form><p className="small muted mt-5 mb-3">{matches.length} resultados demonstrativos</p><div className="cards catalog-cards">{matches.map(item=>"name" in item?businessCard(item):listingCard(item))}</div>{!matches.length&&<Card className="empty">Nenhum resultado nesta demonstração. Tente outra expressão.</Card>}</>;
 const agenda=<><div className="page-head"><div><div className="eyebrow">ENCONTROS</div><h1>Agenda em {city}</h1><p className="muted">Pessoas que transformam uma cidade em comunidade.</p></div><Button onClick={()=>openCreate("evento")}><Plus size={16}/>Criar encontro</Button></div><Card className="max-w-3xl event-detail"><Image src="/landing/encontro.webp" alt="Pessoas em um encontro" width={900} height={380} className="w-full max-h-72 object-cover"/><div className="p-6"><Badge variant="outline"><CalendarDays size={14}/> Evento da comunidade</Badge><h2 className="text-xl mt-3">Encontro da comunidade</h2><p className="muted">Exemplo ilustrativo de um encontro local.</p><Button onClick={()=>{setRsvps(a=>a.includes("encontro")?a.filter(v=>v!=="encontro"):[...a,"encontro"]);inform("Presença demonstrativa atualizada.");}}>{rsvps.includes("encontro")?<CheckCheck size={16}/>:<CalendarDays size={16}/>} {rsvps.includes("encontro")?"Presença confirmada":"Confirmar presença"}</Button></div></Card></>;
 const inbox=<><div className="page-head"><div><h1>Conversas</h1><p className="muted">Acompanhe os contatos feitos no Bivaque.</p></div></div><Card className="max-w-3xl p-3"><Link href="/conversa/1" className="conversation-row"><Avatar><AvatarFallback>AM</AvatarFallback></Avatar><span className="grow"><strong>Contato sobre um desapego</strong><small>Conversa ilustrativa · Clique para abrir</small></span><ChevronRight size={18}/></Link>{screen==="conversa"&&<><Separator className="my-3"/><p className="text-sm p-4">Olá! Gostaria de saber mais sobre o anúncio.</p><form className="search-form" onSubmit={e=>{e.preventDefault();if(!draft.trim())return;inform("Mensagem registrada nesta demonstração.");setDraft("");}}><Input aria-label="Mensagem" placeholder="Escreva sua mensagem" value={draft} onChange={e=>setDraft(e.target.value)}/><Button type="submit"><Send size={16}/>Enviar</Button></form></>}</Card></>;
 const reserved=<><div className="page-head"><div><div className="eyebrow">BIVAQUE</div><h1>{titles[screen]||"Bivaque"}</h1><p className="muted">Área de demonstração · veja os caminhos disponíveis.</p></div></div><Card className="max-w-2xl p-6"><div className="square-icon mb-4"><Compass size={25}/></div><h2>Explore a comunidade</h2><p className="muted">Este fluxo depende da próxima etapa de integração. Enquanto isso, você pode navegar pelo protótipo visual sem acessar contas ou dados reais.</p><div className="flex flex-wrap gap-3"><Button asChild><Link href="/inicio">Ir para o início<ArrowRight size={16}/></Link></Button><Button variant="outline" asChild><Link href="/comunidade">Explorar comunidade</Link></Button></div></Card></>;
 let content=home;
 if(screen==="desapegos"||screen==="imoveis")content=catalog(screen==="imoveis"?"imovel":"desapego");
 else if(screen==="negocios"||screen==="catalogo")content=businessPage;
 else if(screen==="comunidade"||screen==="grupo")content=community;
 else if(screen==="pergunta"||screen==="publicacao")content=questionPage;
 else if(screen==="anuncio"||screen==="negocio")content=detailPage;
 else if(screen==="voce")content=profile;
 else if(screen==="busca")content=searchPage;
 else if(screen==="guia")content=<><div className="page-head"><div><div className="eyebrow">MOVIMENTAÇÃO</div><h1>Guia de {city}</h1><p className="muted">Planeje sua chegada ou saída, etapa por etapa.</p></div></div><div className="max-w-xl">{guide}</div></>;
 else if(screen==="agenda"||screen==="evento")content=agenda;
 else if(screen==="conversas"||screen==="conversa")content=inbox;
 else if(screen==="salvos")content=<><div className="page-head"><div><h1>Seus salvos</h1><p className="muted">Oportunidades para consultar depois.</p></div></div><div className="cards catalog-cards">{listings.filter(x=>saved.includes(x.id)).map(listingCard)}</div>{saved.length===0&&<Card className="empty">Você ainda não salvou anúncios. <Button asChild variant="outline"><Link href="/desapegos">Explorar desapegos</Link></Button></Card>}</>;
 else if(screen==="pedidos"||screen==="pedido")content=<><div className="page-head"><div><h1>Pedidos de serviço</h1><p className="muted">Encontre ajuda para suas necessidades.</p></div><Button onClick={()=>openCreate("pedido")}><Plus size={16}/>Criar pedido</Button></div><Card className="max-w-2xl p-6"><h2>Descreva o que precisa</h2><p className="muted">Na versão completa você poderá comparar propostas de prestadores.</p><Button onClick={()=>openCreate("pedido")}>Fazer um pedido<ArrowRight size={16}/></Button></Card></>;
 else if(screen!=="inicio")content=reserved;
 const navigate=(to:string)=>{setMobileMenu(false);router.push(to);};

 const rootPage=["inicio","comunidade","conversas","voce"].includes(screen);
 const rootTab=screen==="anuncio"||screen==="negocio"?"inicio":screen==="pergunta"||screen==="grupo"||screen==="publicacao"?"comunidade":screen==="conversa"?"conversas":screen==="guia"||screen==="salvos"?"voce":rootPage?screen:"inicio";
 const topTitle=rootPage?(screen==="inicio"?"Bivaque":titles[screen]):titles[screen]||"Bivaque";
 const railNav=<><Link href="/inicio" className="r72-rail-logo" aria-label="Bivaque: Início"><Image src="/brand/bivaque-symbol.svg" alt="" width={41} height={41}/></Link><Button className="r72-rail-create" aria-label="Criar publicação" onClick={()=>openCreate("criar")}><Plus size={28}/></Button>{navPrimary.map(([id,label,Icon])=><Link key={id} href={"/"+id} className={"r72-rail-link "+(rootTab===id?"active":"")} aria-current={rootTab===id?"page":undefined}><span className="r72-rail-icon">{id==="voce"?<span className="r72-user-avatar">EU</span>:<Icon size={24}/>}</span><span>{label}</span></Link>)}<div className="r72-rail-tools"><Button size="icon" variant="ghost" onClick={()=>navigate("/voce")} aria-label="Preferências"><Settings2 size={22}/></Button><Button size="icon" variant="ghost" onClick={()=>navigate("/ajuda")} aria-label="Ajuda"><HelpCircle size={22}/></Button></div></>;
 const mobileNav=<>{navPrimary.slice(0,2).map(([id,label,Icon])=><Link key={id} href={"/"+id} aria-current={rootTab===id?"page":undefined} className={"r72-mobile-tab "+(rootTab===id?"active":"")}><span className="r72-mobile-icon"><Icon size={23}/></span><span>{label}</span></Link>)}<button className="r72-mobile-create-label" onClick={()=>openCreate("criar")} aria-label="Criar publicação"><span>Criar</span></button>{navPrimary.slice(2).map(([id,label,Icon])=><Link key={id} href={"/"+id} aria-current={rootTab===id?"page":undefined} className={"r72-mobile-tab "+(rootTab===id?"active":"")}><span className="r72-mobile-icon">{id==="voce"?<span className="r72-user-avatar">EU</span>:<Icon size={23}/>}</span><span>{label}</span></Link>)}</>;
 return <TooltipProvider delayDuration={200}><div className="shell r72-shell"><aside className="r72-rail" aria-label="Navegação">{railNav}</aside><main className="r72-work"><header className="r72-topbar"><div className="r72-topbar-inside"><div className="r72-topbar-main">{rootPage?<Link href="/inicio" className="r72-topbar-logo"><Image src="/brand/bivaque-symbol.svg" alt="" width={32} height={32}/><strong>{topTitle}</strong></Link>:<><Button size="icon" variant="ghost" aria-label="Voltar" onClick={()=>router.back()}><ArrowLeft size={21}/></Button><strong className="r72-topbar-page">{topTitle}</strong></>}</div><div className="r72-topbar-actions"><DropdownMenu><DropdownMenuTrigger asChild><Button className="r72-header-city" variant="ghost">{city}<ChevronDown size={16}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Cidade consultada</DropdownMenuLabel>{places.map(c=><DropdownMenuItem key={c} onSelect={()=>setCity(c)}>{c===city?<Check size={15}/>:null}{c}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>{screen==="inicio"?<Button variant="ghost" size="icon" aria-label="Avisos" onClick={()=>inform("Nenhum novo aviso na demonstração.")}><Bell size={23}/></Button>:<Button variant="ghost" size="icon" aria-label="Pesquisar" onClick={()=>setSearchOpen(true)}><Search size={23}/></Button>}</div></div></header><div className="page r72-page">{content}</div></main><nav className={"r72-bottom "+(!rootPage?"r72-detail-nav":"")+(navHidden?" minimized":"")} aria-label="Navegação principal">{mobileNav}</nav>{rootPage&&<Button size="icon" className={"r72-floating-create "+(navHidden?"compact":"")} aria-label="Criar publicação" onClick={()=>openCreate("criar")}><Plus size={30}/></Button>}
 
 <Dialog open={cityPickerOpen} onOpenChange={setCityPickerOpen}><DialogContent title="Trocar de cidade"><div className="r72-city-list">{places.map(p=><button key={p} onClick={()=>{setCity(p);setCityPickerOpen(false);}} className={p===city?"active":""}>{p}{p===city?<Check size={17}/>:null}</button>)}</div></DialogContent></Dialog>
 <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent title="Buscar no Bivaque"><form onSubmit={e=>{e.preventDefault();search();}} className="search-dialog-form"><div className="relative"><Search size={18} className="search-field-icon"/><Input className="pl-11" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Imóvel, mudança, escola, serviço..."/></div><Button type="submit" className="w-full">Buscar em {city}<ArrowRight size={16}/></Button></form><Separator className="my-5"/><p className="small muted mb-3">BUSCAS FREQUENTES</p><div className="flex flex-wrap gap-2">{["Moradia","Mudança","Escolas","Manutenção"].map(v=><Button key={v} variant="outline" size="sm" onClick={()=>{setQuery(v);setSearchOpen(false);router.push("/busca/"+encodeURIComponent(v));}}>{v}</Button>)}</div></DialogContent></Dialog>
 <Dialog open={Boolean(dialog)} onOpenChange={o=>{if(!o)setDialog("");}}><DialogContent title={dialog==="criar"?"O que você quer fazer?":dialog==="contato"?"Entrar em contato":"Criar no Bivaque"}>{dialog==="criar"?<div className="create-grid">{creationActions.map(({id,title,description,Icon})=><button key={id} className="create-action" onClick={()=>openCreate(id)}><span className="square-icon"><Icon size={20}/></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={16}/></button>)}</div>:<form onSubmit={e=>{e.preventDefault();if(!draft.trim())return;inform("Registrado apenas nesta demonstração. Nada foi enviado ao Bivaque real.");setDialog("");setDraft("");}} className="form-row"><label className="text-sm font-semibold" htmlFor="content">Descrição</label><Textarea id="content" autoFocus rows={5} required value={draft} onChange={e=>setDraft(e.target.value)} placeholder={dialog==="contato"?"Escreva sua mensagem para o anunciante":"Descreva o que você quer compartilhar ou precisa encontrar"}/><p className="small muted">Demonstração: seus dados não serão publicados nem enviados a terceiros.</p><Button type="submit" className="w-full">Salvar demonstração<ArrowRight size={16}/></Button></form>}</DialogContent></Dialog>
 {toast&&<div role="status" className="toast"><Check size={16}/><span>{toast}</span><button onClick={()=>setToast("")} aria-label="Fechar aviso"><X size={16}/></button></div>}</div></TooltipProvider>;
}
