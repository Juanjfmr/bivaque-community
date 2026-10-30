import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spotlight } from "./components/ui/spotlight";
import { FlipWords } from "./components/ui/flip-words";
import { BentoGrid } from "./components/ui/bento-grid";
import { GlowingEffect } from "./components/ui/glowing-effect";
import { PlaceholdersAndVanishInput } from "./components/ui/placeholders-and-vanish-input";
import { Button as MovingBorderButton } from "./components/ui/moving-border";
import { HoverBorderGradient } from "./components/ui/hover-border-gradient";
import { CardContainer, CardBody, CardItem } from "./components/ui/3d-card-effect";
import { InfiniteMovingCards } from "./components/ui/infinite-moving-cards";
import { BackgroundGradient } from "./components/ui/background-gradient";
import { HeroHighlight, Highlight } from "./components/ui/hero-highlight";
import { TextGenerateEffect } from "./components/ui/text-generate-effect";
import { FocusCards } from "./components/ui/focus-cards";
import { AnimatedTestimonials } from "./components/ui/animated-testimonials";
import { DirectionAwareHover } from "./components/ui/direction-aware-hover";
import { LayoutGrid } from "./components/ui/layout-grid";
import { Timeline } from "./components/ui/timeline";
import { TracingBeam } from "./components/ui/tracing-beam";

import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger } from "./components/ui/animated-modal";
import { FloatingDock } from "./components/ui/floating-dock";
const Lab = lazy(() => import("./Lab"));
const WorldMapLazy = lazy(() => import("./WorldMapLazy"));

type Page = "inicio"|"comunidade"|"mercado"|"chegada"|"voce"|"lab";
type Listing = { id:string; kind:"Imóveis"|"Desapegos"|"Negócios"; name:string; location:string; info:string; price:string; image:string; accent?:string };
const raw = "https://raw.githubusercontent.com/Juanjfmr/bivaque-community/main/apps/web/public/landing/";
const IMG = {
  arrival:raw+"hero-bivaque-arrival.webp", community:raw+"hero-bivaque-community.webp",
  gather:raw+"friends-gathering.jpg", sunset:raw+"transfer-sunset.jpg",
  event:raw+"v8/encontro.webp", hero:raw+"v8/hero.webp",
  interior:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1000&q=80",
  home:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=80",
  bike:"https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1000&q=80",
  workspace:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&q=80",
};
const LISTINGS:Listing[]=[
 {id:"imovel1",kind:"Imóveis",name:"Apartamento em Ponta Negra",location:"Manaus · Ponta Negra",info:"2 quartos · 1 vaga · imagem ilustrativa",price:"R$ 3.200/mês",image:IMG.home},
 {id:"imovel2",kind:"Imóveis",name:"Apartamento próximo ao centro",location:"Manaus · Centro",info:"3 quartos · 2 vagas · imagem ilustrativa",price:"R$ 2.750/mês",image:IMG.interior},
 {id:"negocio1",kind:"Negócios",name:"Reformas e pequenos reparos",location:"Manaus · Atendimento local",info:"Página de prestador demonstrativa",price:"Solicitar orçamento",image:IMG.workspace},
 {id:"desapego1",kind:"Desapegos",name:"Bicicleta de passeio",location:"Manaus · Parque Dez",info:"Conservada · retirada combinada",price:"R$ 850",image:IMG.bike},
 {id:"negocio2",kind:"Negócios",name:"Fotografia de famílias",location:"Manaus · Toda a cidade",info:"Ensaios e eventos · demonstração",price:"Consultar valores",image:IMG.gather},
 {id:"desapego2",kind:"Desapegos",name:"Móveis para apartamento",location:"Manaus · Adrianópolis",info:"Conjunto de sala · exemplo",price:"R$ 1.200",image:IMG.interior},
];
const GROUPS=[
 {id:"familias",title:"Famílias em Manaus",sub:"Trocas locais e rotina",src:IMG.community,people:"Comunidade local"},
 {id:"chegando",title:"Chegando à cidade",sub:"Dicas sobre mudança e instalação",src:IMG.arrival,people:"Acolhimento"},
 {id:"encontros",title:"Encontros e amizades",sub:"Programe atividades em grupo",src:IMG.gather,people:"Convivência"},
];
const NAV:{key:Page;name:string;icon:string}[]=[
 {key:"inicio",name:"Início",icon:"home"},
 {key:"comunidade",name:"Comunidade",icon:"users"},
 {key:"mercado",name:"Mercado",icon:"store"},
 {key:"chegada",name:"Chegada",icon:"compass"},
 {key:"voce",name:"Você",icon:"user"},
 {key:"lab",name:"Laboratório",icon:"spark"}
];
const voices=[
 {quote:"Acabei de chegar à cidade. O primeiro passo foi conversar com outras famílias sobre escolas e bairros.",name:"História fictícia 01",designation:"Exemplo visual · comunidade",src:IMG.community},
 {quote:"Foi mais simples encontrar alguém para pequenos reparos a partir de uma indicação de confiança.",name:"História fictícia 02",designation:"Exemplo visual · serviços",src:IMG.gather},
 {quote:"O guia local ajudou a montar uma lista prática para a mudança sem precisar começar do zero.",name:"História fictícia 03",designation:"Exemplo visual · chegada",src:IMG.arrival}
];
const advice=[
 {quote:"Qual escola infantil vocês recomendam na região da Ponta Negra?",name:"Pergunta da comunidade",title:"Família · Manaus"},
 {quote:"Alguém conhece serviço de montagem de móveis para uma mudança?",name:"Pedido de indicação",title:"Serviços · Manaus"},
 {quote:"Qual é o melhor horário para conhecer o parque no fim de semana?",name:"Dica local",title:"Lazer · Manaus"},
 {quote:"O que não pode faltar nos primeiros dias em uma cidade nova?",name:"Troca de experiências",title:"Mudança · Brasil"}
];
function Icon({name,size=20}: {name:string;size?:number}) {
 const shapes:Record<string,ReactNode>={
  home:<><path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
  store:<><path d="M4 9 6 4h12l2 5-2 3-3-1-3 1-3-1-3 1-2-3Z"/><path d="M6 13v8h12v-8M10 21v-6h4v6"/></>,
  compass:<><circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-4 1 2-5 4-1Z"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  spark:<><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  pin:<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
  arrow:<path d="M5 12h14m-7-7 7 7-7 7"/>,
  plus:<path d="M12 4v16M4 12h16"/>,
  heart:<path d="M20.7 8.6c0 5.1-8.7 10.9-8.7 10.9S3.3 13.7 3.3 8.6a4.8 4.8 0 0 1 8.7-2.5 4.8 4.8 0 0 1 8.7 2.5Z"/>,
  check:<path d="m5 12 4 4L19 6"/>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></>,
  building:<><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 8h2m4 0h2M8 12h2m4 0h2M10 21v-5h4v5"/></>,
  bag:<><path d="M3 8h18v13H3zM8 8V6a4 4 0 0 1 8 0v2"/></>,
  chat:<path d="M21 11a8 8 0 0 1-8 8c-2 0-3-.5-4-1l-5 2 1-5a8 8 0 1 1 16-4Z"/>,
  menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  shield:<><path d="M12 2 20 6v6c0 6-5 9-8 10-3-1-8-4-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  sliders:<path d="M4 7h16M4 17h16M9 4v6M15 14v6"/>,
  exit:<path d="M9 3H4v18h5m3-14 5 5-5 5m-7-5h12"/>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]||shapes.arrow}</svg>;
}
function Eyebrow({children,light=false}:{children:ReactNode;light?:boolean}){return <span className={"eyebrow "+(light?"eyebrow-light":"")}>{children}</span>}
function Head({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){return <div className="section-head"><div>{eyebrow&&<Eyebrow>{eyebrow}</Eyebrow>}<h2 className="section-title">{title}</h2>{description&&<p className="section-desc">{description}</p>}</div>{action}</div>}
function Pill({children,onClick,active=false}:{children:ReactNode;onClick:()=>void;active?:boolean}){return <button className={"pill "+(active?"pill-active":"")} onClick={onClick}>{children}</button>}
function ResultCard({item,saved,onSave,onOpen}:{item:Listing;saved:boolean;onSave:()=>void;onOpen:()=>void}){
 return <div className="result-card relative">
  <GlowingEffect proximity={68} spread={26} borderWidth={1} glow disabled={false}/>
  <div className="relative">
   <button onClick={onOpen} className="w-full text-left"><img src={item.image} alt="" loading="lazy" className="h-[156px] w-full rounded-[15px] object-cover sm:h-[175px]"/><div className="mt-4 flex items-start justify-between gap-2"><div><Eyebrow>{item.kind}</Eyebrow><h3 className="mt-1.5 text-[16px] font-extrabold tracking-tight">{item.name}</h3></div></div></button>
   <button aria-label={saved?"Remover dos salvos":"Salvar anúncio"} onClick={onSave} className={"absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-lg "+(saved?"bg-[#B84A3A] text-white":"bg-white/95 text-[#253033]")}><Icon name={saved?"check":"heart"} size={17}/></button>
   <p className="mt-1.5 text-[12px] text-[#72807c]">{item.location}</p>
   <div className="mt-3 flex items-center justify-between gap-1 border-t border-[#253033]/10 pt-3"><b className="text-[13px]">{item.price}</b><button className="text-xs font-bold text-[#B84A3A]" onClick={onOpen}>Ver detalhes ↗</button></div>
  </div>
 </div>;
}
function DemoTag({children}:{children:ReactNode}){return <div className="demo-note"><Icon name="shield" size={15}/>{children}</div>}
export default function App(){
 const [page,setPage]=useState<Page>(()=>{const h=window.location.hash.slice(1);return NAV.some(n=>n.key===h)?h as Page:"inicio"});
 const [city,setCity]=useState("Manaus");const [cityOpen,setCityOpen]=useState(false);
 const [sub,setSub]=useState("Feed");const [marketSub,setMarketSub]=useState("Todos");
 const [searchText,setSearchText]=useState("");const [search,setSearch]=useState("");
 const [saved,setSaved]=useState<string[]>(()=>{try{return JSON.parse(sessionStorage.getItem("bivaque-stress-saved")||"[]")}catch{return []}});
 const [joined,setJoined]=useState<string[]>([]);
 const [posts,setPosts]=useState<string[]>([]);
 const [draft,setDraft]=useState("");const [detail,setDetail]=useState<Listing|null>(null);
 const [toast,setToast]=useState("");const [showEffects,setShowEffects]=useState(true);
 const [booked,setBooked]=useState(false);
 useEffect(()=>{const h=()=>{const s=location.hash.slice(1);if(NAV.some(n=>n.key===s))setPage(s as Page)};window.addEventListener("hashchange",h);return()=>window.removeEventListener("hashchange",h)},[]);
 useEffect(()=>{sessionStorage.setItem("bivaque-stress-saved",JSON.stringify(saved))},[saved]);
 function go(p:Page){setPage(p);location.hash=p;window.scrollTo({top:0,behavior:"smooth"})}
 function save(id:string){setSaved(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 function sharePost(){if(!draft.trim())return;setPosts(v=>[draft.trim(),...v]);setDraft("");setSub("Feed");go("comunidade");setToast("Publicação adicionada somente ao protótipo.")}
 function doSearch(){setSearch(searchText.trim());setMarketSub("Todos");go("mercado")}
 const marketItems=useMemo(()=>LISTINGS.filter(x=>(marketSub==="Todos"||x.kind===marketSub)&&(!search||[x.name,x.info,x.location,x.kind].join(" ").toLowerCase().includes(search.toLowerCase()))),[marketSub,search]);
 const mobileNav=NAV.filter(x=>x.key!=="lab");
 const discoverGrid=LISTINGS.slice(0,4).map((item,i)=>({id:i+1,content:<div className="p-5 text-white"><Eyebrow light>{item.kind}</Eyebrow><h3 className="mt-2 font-serif text-2xl">{item.name}</h3><p className="mt-2 text-sm">{item.location}</p><button onClick={()=>setDetail(item)} className="mt-3 rounded-full bg-[#E07A5A] px-4 py-2 text-xs font-bold text-[#253033]">Explorar anúncio</button></div>,className:i===0?"md:col-span-2":"",thumbnail:item.image}));
 const timeline=[
  {title:"Planejar",content:<div><b className="text-lg">Antes da mudança</b><p className="mt-2 text-sm leading-7 text-[#6b7772]">Compare regiões da cidade, busque moradias próximas à sua organização e conheça o custo de vida.</p><button className="text-link" onClick={()=>go("mercado")}>Explorar imóveis →</button></div>},
  {title:"Chegar",content:<div><b className="text-lg">Primeiros dias</b><p className="mt-2 text-sm leading-7 text-[#6b7772]">Encontre serviços, escolas e orientações compartilhadas pela rede.</p><button className="text-link" onClick={()=>go("comunidade")}>Perguntar à comunidade →</button></div>},
  {title:"Pertencer",content:<div><b className="text-lg">Criar vínculos</b><p className="mt-2 text-sm leading-7 text-[#6b7772]">Participe de grupos, encontros e compartilhe suas próprias experiências.</p><button className="text-link" onClick={()=>{setSub("Grupos");go("comunidade")}}>Encontrar grupos →</button></div>}
 ];
 const topNav=(n:{key:Page;name:string;icon:string})=><button key={n.key} onClick={()=>go(n.key)} className={"topnav-item "+(page===n.key?"topnav-current":"")}><Icon name={n.icon} size={16}/><span>{n.name}</span></button>;
 return <div className={"app-shell "+(!showEffects?"effects-off":"")}>
  <div className="top-rule"><span/></div>
  <header className="header"><div className="header-inner">
   <button aria-label="Ir para o início" onClick={()=>go("inicio")} className="brand-link"><img src="/logo.svg" alt="Bivaque" width="153" height="38"/></button>
   <nav className="topnav" aria-label="Navegação principal">{NAV.map(topNav)}</nav>
   <div className="header-actions">
    <button className="city-button" onClick={()=>setCityOpen(v=>!v)} aria-expanded={cityOpen}><Icon name="pin" size={16}/><b>{city}</b><span className="text-[#8d9794]">⌄</span></button>
    <button onClick={()=>go("lab")} className="icon-outline lab-top" title="Laboratório de componentes"><Icon name="spark" size={18}/></button>
    <button onClick={()=>go("voce")} className="avatar">JF</button>
   </div>
   {cityOpen&&<div className="city-pop"><span className="text-xs font-bold text-[#6d7772]">Cidade do protótipo</span>{["Manaus","Brasília","Rio de Janeiro"].map(c=><button key={c} onClick={()=>{setCity(c);setCityOpen(false);setToast("A cidade mudou no cabeçalho; os anúncios continuam como dados demonstrativos de Manaus.")}}><Icon name="pin" size={15}/>{c}{city===c?" ✓":""}</button>)}</div>}
  </div></header>
  <main className="main">
  {page==="inicio"&&<div className="space-y-14">
   <section className="hero-main">
    {showEffects&&<Spotlight className="-top-44 -left-20 md:left-80 md:-top-36" fill="#E07A5A"/>}
    <div className="hero-text"><div className="hero-kicker"><span className="orange-dot"/> A REDE QUE ACOMPANHA A VIDA MILITAR</div>
     <h1 className="hero-title">A vida muda de cidade.<br/><span className="block text-[#E7A28B]">Sua rede vai junto.</span></h1>
     <p className="hero-description">Pessoas, serviços, oportunidades e caminhos para viver melhor em qualquer etapa da sua jornada.</p>
     <div className="hero-wordline"><span>Um lugar para</span><FlipWords words={["pertencer.","descobrir.","encontrar.","compartilhar."]} className="text-[#E7A28B]"/></div>
     <div className="hero-actions"><MovingBorderButton onClick={()=>go("comunidade")} borderRadius="999px" containerClassName="!h-12 !w-[185px]" borderClassName="!bg-[radial-gradient(#E07A5A_40%,transparent_65%)]" className="!bg-[#B84A3A] !border-none !text-white !text-[13px] !font-bold">Entrar na comunidade ↗</MovingBorderButton><button className="hero-link" onClick={()=>go("chegada")}>Conhecer minha cidade <Icon name="arrow" size={16}/></button></div>
    </div>
    <div className="hero-art"><img src={IMG.arrival} alt="Imagem ilustrativa de chegada" loading="eager"/><span className="hero-photo-caption">Pessoas e lugares. Uma rede em movimento.</span><div className="hero-decor"><div className="hero-decor-top">SUA CIDADE, SUA REDE</div><strong>{city}</strong><span>AM · BRASIL</span></div></div>
   </section>
   <section className="search-block"><div className="search-label"><div><Eyebrow>Descoberta</Eyebrow><h2>O que você precisa <i>hoje?</i></h2></div><span className="search-icon"><Icon name="search" size={20}/></span></div><PlaceholdersAndVanishInput placeholders={["Indicação de diarista em Manaus","Apartamento perto do quartel","Eventos neste fim de semana","Grupo para famílias recém-chegadas"]} onChange={e=>setSearchText(e.target.value)} onSubmit={doSearch}/><p className="search-hint">Pesquise dentro de imóveis, negócios e desapegos demonstrativos.</p></section>
   <section><Head eyebrow="NAVEGUE PELO QUE IMPORTA" title="Sua vida, em um só lugar" description="Seis caminhos para encontrar o que você procura na cidade."/>
    <BentoGrid className="!grid-cols-2 md:!grid-cols-3 !auto-rows-auto gap-3 sm:gap-4">
    {[
      {name:"Comunidade",detail:"Encontre sua rede",key:"comunidade",icon:"users",tone:"graphite"},
      {name:"Negócios",detail:"Profissionais e serviços",key:"Negócios",icon:"store",tone:"white"},
      {name:"Imóveis",detail:"Moradia do seu jeito",key:"Imóveis",icon:"building",tone:"white"},
      {name:"Desapegos",detail:"Compre e anuncie",key:"Desapegos",icon:"bag",tone:"white"},
      {name:"Eventos",detail:"Encontre pessoas",key:"Eventos",icon:"calendar",tone:"white"},
      {name:"Guia da cidade",detail:"Chegue com confiança",key:"chegada",icon:"compass",tone:"paper"},
    ].map((v,i)=><button key={v.name} className={"intent-card intent-"+v.tone} onClick={()=>{if(v.key==="comunidade"||v.key==="chegada")go(v.key);else if(v.key==="Eventos"){setSub("Eventos");go("comunidade")}else{setMarketSub(v.key);setSearch("");go("mercado")}}}><GlowingEffect glow proximity={50} spread={29} disabled={false}/><div className="intent-icon"><Icon name={v.icon} size={25}/></div><div><h3>{v.name}</h3><p>{v.detail}</p></div><span className="intent-arrow"><Icon name="arrow" size={16}/></span></button>)}
    </BentoGrid>
   </section>
   <section className="home-community"><div className="home-community-head"><div><Eyebrow light>VIVER EM REDE</Eyebrow><h2 className="font-serif">O que vale a pena saber,<br/><em>alguém já viveu.</em></h2><p>Conhecimento compartilhado por quem conhece a sua realidade.</p><HoverBorderGradient as="button" onClick={()=>go("comunidade")} containerClassName="!mt-5 !rounded-full" className="!rounded-full !bg-[#F2F0EB] !text-[#253033] !px-5 !py-3 !font-bold !text-sm">Explorar a comunidade <span className="ml-2">↗</span></HoverBorderGradient></div><img src={IMG.community} alt="Ilustração fotográfica de convivência" className="community-pic"/></div><div className="community-rail">{showEffects?<InfiniteMovingCards items={advice} direction="left" speed="slow" className="!max-w-none"/>:<div className="px-4 py-5 text-sm text-white/65">Perguntas locais, indicações e trocas de experiências da comunidade.</div>}</div></section>
   <section><Head eyebrow="ACHADOS DA CIDADE" title="Oportunidades perto de você" description="Explore exemplos de anúncios e serviços que podem fazer parte do Mercado." action={<button className="text-link" onClick={()=>{setMarketSub("Todos");go("mercado")}}>Ver mercado <Icon name="arrow" size={16}/></button>}/><div className="listing-grid">{LISTINGS.slice(0,3).map(item=><ResultCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={()=>save(item.id)} onOpen={()=>setDetail(item)}/>)}</div></section>
   <section className="home-bottom-grid"><div><Head eyebrow="VIVER A CIDADE" title="A próxima conexão pode começar aqui"/><div className="event-banner"><div className="event-banner-img"><img src={IMG.event} alt="Imagem ilustrativa de encontro" loading="lazy"/></div><div className="event-banner-body"><span className="small-tag">AGENDA · EXEMPLO</span><h3>Encontro da comunidade em Manaus</h3><p>Converse, faça amizades e conheça novas histórias.</p><button className="text-link" onClick={()=>{setSub("Eventos");go("comunidade")}}>Ver agenda <Icon name="arrow" size={15}/></button></div></div></div><div><Head eyebrow="SUA PRÓXIMA ETAPA" title="Sua chegada, mais leve"/><BackgroundGradient className="arrival-card" containerClassName="!rounded-[24px]"><div className="arrival-top"><Icon name="compass" size={25}/><span>GUIA DA CIDADE</span></div><h3>Prepare sua vida em uma nova cidade.</h3><p>Moradia, bairros, serviços e conexões em um roteiro útil.</p><button onClick={()=>go("chegada")} className="arrival-button">Começar a explorar <Icon name="arrow" size={17}/></button></BackgroundGradient></div></section>
   <div className="px-2"><DemoTag>Conteúdo e valores demonstrativos. Este teste explora recursos reais da Aceternity UI, sem conexão ao banco de dados.</DemoTag></div>
  </div>}
  {page==="comunidade"&&<div className="page-stack">
   <HeroHighlight containerClassName="community-hero !h-auto !min-h-[270px] !rounded-[28px] !bg-[#e8e9e3] !justify-start" className="w-full px-6 py-10 md:px-12"><Eyebrow>VÍNCULOS REAIS · HISTÓRIAS COMPARTILHADAS</Eyebrow><h1 className="page-title">Gente que entende <Highlight className="text-[#253033]">a sua jornada.</Highlight></h1><p className="mt-3 max-w-xl text-sm leading-7 text-[#60706c]">Encontre sua comunidade local, faça perguntas, compartilhe experiências e participe de encontros.</p></HeroHighlight>
   <div className="subnav">{["Feed","Grupos","Eventos","Perguntas"].map(s=><Pill key={s} active={s===sub} onClick={()=>setSub(s)}>{s}</Pill>)}</div>
   {sub==="Feed"&&<div className="feed-layout">
     <div className="space-y-4"><Modal><ModalTrigger className="w-full !rounded-[22px] !bg-white !p-4 !text-left !shadow-sm"><div className="flex items-center gap-3"><div className="avatar">JF</div><div className="flex-1 rounded-full bg-[#F2F0EB] px-5 py-3 text-xs text-[#87908e]">Compartilhe uma experiência ou pergunte...</div><span className="text-[#B84A3A]"><Icon name="plus"/></span></div></ModalTrigger><ModalBody className="!min-h-0 !w-[min(92vw,530px)] !max-w-[530px] !rounded-[22px]"><ModalContent className="!p-6"><Eyebrow>NOVA PUBLICAÇÃO</Eyebrow><h3 className="mt-2 font-serif text-2xl">Compartilhe com sua rede</h3><form id="post-form" className="mt-5" onSubmit={e=>{e.preventDefault();sharePost()}}><textarea className="form-textarea" placeholder="O que gostaria de compartilhar?" value={draft} onChange={e=>setDraft(e.target.value)} required rows={5}/><button className="solid-button mt-4 w-full" type="submit">Publicar no protótipo</button></form></ModalContent><ModalFooter className="!bg-[#F2F0EB] !text-xs !text-[#73807a]">Demonstração local · sem publicação pública.</ModalFooter></ModalBody></Modal>
      {posts.map((p,i)=><div className="feed-card" key={i}><div className="flex items-center gap-3"><div className="avatar">JF</div><div><b className="text-sm">Seu perfil demonstrativo</b><p className="text-xs text-[#76807b]">Agora · Manaus</p></div></div><p className="mt-4 text-sm leading-7">{p}</p><DemoTag>Esta publicação está visível apenas nesta sessão.</DemoTag></div>)}
      <div className="feed-card"><div className="flex items-center gap-3"><div className="avatar avatar-muted">CM</div><div><b className="text-sm">Conversa da comunidade</b><p className="text-xs text-[#76807b]">Exemplo de publicação · Manaus</p></div></div><h3 className="mt-5 font-serif text-[22px]">Dicas para quem está chegando à cidade</h3><p className="mt-3 text-sm leading-7 text-[#687571]">Quais bairros equilibram deslocamento, escola e qualidade de vida? Compartilhe o que aprendeu com sua própria experiência.</p><div className="mt-5 flex gap-4 border-t border-[#253033]/10 pt-4"><button onClick={()=>setToast("Reação registrada na demonstração.")} className="subtle-action"><Icon name="heart" size={18}/> Gostei</button><button onClick={()=>setSub("Perguntas")} className="subtle-action"><Icon name="chat" size={18}/> Responder</button></div></div>
      <div className="feed-card"><img src={IMG.gather} alt="" loading="lazy" className="h-[200px] w-full rounded-[16px] object-cover"/><Eyebrow>VIDA EM COMUNIDADE</Eyebrow><h3 className="mt-3 font-serif text-2xl">Encontros criam novas histórias.</h3><p className="mt-3 text-sm leading-7 text-[#687571]">Descubra eventos e interesses em comum na sua cidade.</p><button onClick={()=>setSub("Eventos")} className="text-link mt-4">Explorar encontros <Icon name="arrow" size={16}/></button></div>
     </div>
     <aside className="space-y-4"><div className="feed-side"><Eyebrow>EM MOVIMENTO</Eyebrow><div className="mt-3 font-serif text-2xl">A vida militar conecta histórias por todo o Brasil.</div><img src={IMG.arrival} alt="" className="mt-5 h-32 w-full rounded-xl object-cover"/><button onClick={()=>go("chegada")} className="text-link mt-4">Conhecer o guia →</button></div><div className="feed-side"><Eyebrow>PERGUNTAS</Eyebrow>{advice.slice(0,3).map((x,i)=><button key={i} onClick={()=>setSub("Perguntas")} className="border-b border-[#253033]/10 py-3 text-left text-sm font-semibold leading-6 last:border-0">{x.quote}</button>)}</div></aside>
   </div>}
   {sub==="Grupos"&&<div className="space-y-9"><Head eyebrow="PESSOAS E INTERESSES" title="Comunidades que aproximam" description="Passe o cursor nos grupos para experimentar o componente Focus Cards."/><FocusCards cards={GROUPS.map(x=>({title:x.title,src:x.src}))}/><div className="group-grid">{GROUPS.map(g=><div className="group-card" key={g.id}><div className="flex items-center gap-2"><span className="rounded-full bg-[#F2F0EB] p-2 text-[#B84A3A]"><Icon name="users" size={20}/></span><b>{g.title}</b></div><p className="mt-3 text-sm text-[#73807c]">{g.sub}</p><button className={joined.includes(g.id)?"outline-button mt-4":"solid-button mt-4"} onClick={()=>{setJoined(v=>v.includes(g.id)?v.filter(x=>x!==g.id):[...v,g.id]);setToast(joined.includes(g.id)?"Saída simulada do grupo.":"Participação simulada no grupo.")}}>{joined.includes(g.id)?"Participando ✓":"Participar do grupo"}</button></div>)}</div></div>}
   {sub==="Eventos"&&<div><Head eyebrow="AGENDA DA COMUNIDADE" title="Encontros que fazem sentido" description="Atividades demonstrativas organizadas por interesse e cidade."/><div className="event-banner"><img src={IMG.event} alt="" className="h-[230px] w-full object-cover md:h-[270px]"/><div className="event-banner-body"><Eyebrow>EVENTO DE DEMONSTRAÇÃO</Eyebrow><h3 className="mt-2 font-serif text-[26px]">Manhã em família na Ponta Negra</h3><p>Um espaço para conhecer pessoas e compartilhar dicas sobre Manaus.</p><button className="solid-button mt-5" onClick={()=>{setBooked(v=>!v);setToast(booked?"Interesse removido.":"Interesse registrado na simulação.")}}>{booked?"Tenho interesse ✓":"Marcar interesse"}</button></div></div><Head eyebrow="MAIS CONEXÕES" title="Ideias para o próximo encontro"/><div className="group-grid"><div className="group-card"><Icon name="calendar" size={26}/><h3 className="mt-3 font-bold">Caminhada de fim de semana</h3><p className="mt-2 text-sm text-[#6e7975]">Um convite para conhecer a cidade em grupo.</p></div><div className="group-card"><Icon name="users" size={26}/><h3 className="mt-3 font-bold">Café de boas-vindas</h3><p className="mt-2 text-sm text-[#6e7975]">Apresentação de famílias recém-chegadas.</p></div></div></div>}
   {sub==="Perguntas"&&<div className="space-y-4"><Head eyebrow="EXPERIÊNCIAS COMPARTILHADAS" title="Uma dúvida pode ajudar muita gente"/><div className="min-h-[90px]"><TextGenerateEffect words="Quem já passou por uma situação semelhante pode ter a orientação que faltava para seu próximo passo." className="!text-[#253033] !font-serif !text-xl md:!text-2xl"/></div>{advice.map((x,i)=><div className="question-card" key={i}><span className="text-xs font-bold text-[#B84A3A]">{x.title}</span><h3 className="mt-2 font-bold">{x.quote}</h3><div className="mt-4 flex gap-2"><button onClick={()=>setToast("A resposta é apenas demonstrativa; não há backend.")} className="outline-button">Responder</button><button onClick={()=>setToast("Pergunta copiada como exemplo? No protótipo, o compartilhamento está desativado.")} className="ghost-button">Compartilhar</button></div></div>)}</div>}
   <section className="testimony-wrap"><Head eyebrow="NARRATIVAS DE EXEMPLO" title="A rede se constrói na prática" description="Depoimentos fictícios criados exclusivamente para testar a transição e composição do componente."/><AnimatedTestimonials testimonials={voices} className="!max-w-[920px] !py-10"/></section>
  </div>}
  {page==="mercado"&&<div className="page-stack"><div className="market-hero"><div><Eyebrow light>DESCOBRIR · CONTRATAR · ENCONTRAR</Eyebrow><h1 className="page-title text-[#F2F0EB]">Boas oportunidades<br/><span className="text-[#E7A28B]">nascem perto.</span></h1><p className="mt-4 text-sm leading-7 text-white/75">Encontre imóveis, desapegos e negócios da comunidade.</p></div><img src={IMG.workspace} alt="" className="market-hero-image"/></div>
   <div className="market-controls"><div className="subnav !mb-0">{["Todos","Imóveis","Desapegos","Negócios"].map(s=><Pill key={s} active={marketSub===s} onClick={()=>{setMarketSub(s);setSearch("")}}>{s}</Pill>)}</div><div className="market-input"><Icon name="search" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar anúncios, cidades e serviços" aria-label="Filtrar anúncios"/></div></div>
   <Head eyebrow="CATÁLOGO DEMONSTRATIVO" title={marketSub==="Todos"?"Explore o que a comunidade oferece":marketSub} description={marketItems.length+" oportunidades ilustrativas. Fotos e preços apenas de exemplo."}/>
   {marketItems.length>0?<div className="listing-grid">{marketItems.map(item=><ResultCard key={item.id} item={item} saved={saved.includes(item.id)} onSave={()=>save(item.id)} onOpen={()=>setDetail(item)}/>)}</div>:<div className="empty"><h3>Nenhum anúncio encontrado</h3><p>Tente buscar por apartamento, bicicleta ou serviço.</p><button className="solid-button mt-3" onClick={()=>{setSearch("");setMarketSub("Todos")}}>Ver tudo</button></div>}
   <div className="market-editorial"><div><Eyebrow light>EXPERIÊNCIA IMERSIVA</Eyebrow><h2 className="font-serif text-[28px] md:text-[37px]">Explore em outra perspectiva.</h2><p>Um teste da grade expansível Layout Grid, com cartões que se abrem por cima da composição.</p></div></div>
   <div className="rounded-[28px] border border-[#253033]/10 bg-white"><div className="min-h-[420px]"><LayoutGrid cards={discoverGrid}/></div></div>
   <section className="market-bottom"><Head eyebrow="DESTAQUE INTERATIVO" title="Um anúncio, duas dimensões"/><div className="grid gap-6 md:grid-cols-2 md:items-center"><CardContainer containerClassName="!py-0 !block" className="!w-full"><CardBody className="!h-auto !w-full rounded-[24px] bg-white p-5 shadow-lg"><CardItem translateZ={45} className="text-xs font-extrabold uppercase tracking-widest text-[#B84A3A]">DESTAQUE · IMÓVEIS</CardItem><CardItem translateZ={75} className="mt-3 font-serif text-2xl">Moradia para a próxima etapa.</CardItem><CardItem translateZ={100} className="mt-4 w-full"><img className="h-[230px] w-full rounded-[17px] object-cover" alt="Apartamento ilustrativo" src={IMG.home}/></CardItem><CardItem translateZ={45} className="mt-4"><button className="solid-button" onClick={()=>setDetail(LISTINGS[0])}>Explorar anúncio</button></CardItem></CardBody></CardContainer><div><Eyebrow>3D CARD EFFECT</Eyebrow><h3 className="mt-3 font-serif text-3xl">Mais profundidade sem deixar de ser Bivaque.</h3><p className="mt-3 max-w-sm text-sm leading-7 text-[#6e7975]">Teste o movimento tridimensional no desktop. No celular, a estrutura permanece legível e clicável.</p><HoverBorderGradient as="button" onClick={()=>{setMarketSub("Imóveis");window.scrollTo({top:0,behavior:"smooth"})}} containerClassName="mt-5" className="!bg-[#253033] !text-white !rounded-full !py-3 !px-5">Explorar imóveis <span className="ml-2">↗</span></HoverBorderGradient></div></div></section>
   <section><Head eyebrow="OUTRA ABORDAGEM" title="A direção muda a descoberta" description="Direcionamento por hover em imagens da coleção."/><div className="grid gap-4 sm:grid-cols-3">{LISTINGS.slice(0,3).map(x=><button key={x.id} onClick={()=>setDetail(x)} aria-label={"Abrir "+x.name} className="overflow-hidden rounded-[18px] text-left"><DirectionAwareHover className="!h-[260px] !w-full !rounded-[18px]" imageUrl={x.image}><p className="font-bold">{x.name}</p><span className="text-xs">{x.price}</span></DirectionAwareHover><div className="mt-2 text-sm font-bold">{x.name} ↗</div></button>)}</div></section>
  </div>}
  {page==="chegada"&&<div className="page-stack">
   <div className="arrival-hero"><div className="arrival-hero-copy"><Eyebrow light>MOVIMENTAÇÃO · GUIA DA CIDADE</Eyebrow><h1 className="page-title text-white">Mudar de cidade.<br/><span className="text-[#E7A28B]">Continuar em casa.</span></h1><p className="mt-4 max-w-lg text-sm leading-7 text-white/70">Planeje sua chegada com orientações de quem já conhece o lugar.</p><button onClick={()=>go("mercado")} className="mt-6 rounded-full bg-[#E07A5A] px-5 py-3 text-sm font-bold text-[#253033]">Buscar moradia <Icon name="arrow" size={16}/></button></div><img alt="" src={IMG.sunset}/></div>
   <section><Head eyebrow="REDE EM MOVIMENTO" title="Conexões que atravessam cidades" description="Representação visual ilustrativa de trajetórias, não é um mapa de unidades militares."/><div className="world-map"><Suspense fallback={<div className="empty">Preparando visualização de conexões…</div>}><WorldMapLazy lineColor="#B84A3A" dots={[{start:{lat:-3.119,lng:-60.0217},end:{lat:-15.794,lng:-47.882}},{start:{lat:-15.794,lng:-47.882},end:{lat:-22.9068,lng:-43.1729}},{start:{lat:-23.5505,lng:-46.6333},end:{lat:-3.119,lng:-60.0217}},{start:{lat:-22.9068,lng:-43.1729},end:{lat:-23.5505,lng:-46.6333}}]}/></Suspense></div></section>
   <section><Head eyebrow="SEU ROTEIRO" title="Da chegada ao pertencimento" description="Experimente a Timeline e a Tracing Beam durante a rolagem."/><TracingBeam className="!px-0"><div className="arrival-steps"><div className="step-visual"><div className="step-counter">01</div><h3>Planejar antes de ir</h3><p>Procure opções de moradia, compare regiões, organize os serviços essenciais e converse com quem conhece a cidade.</p><button onClick={()=>{setMarketSub("Imóveis");go("mercado")}} className="text-link mt-4">Ver imóveis <Icon name="arrow" size={16}/></button></div><div className="step-visual"><div className="step-counter">02</div><h3>Conhecer o local</h3><p>Encontre escolas, serviços, rotinas e informações úteis compartilhadas pela comunidade.</p><button onClick={()=>{setSub("Perguntas");go("comunidade")}} className="text-link mt-4">Fazer perguntas <Icon name="arrow" size={16}/></button></div><div className="step-visual"><div className="step-counter">03</div><h3>Construir vínculos</h3><p>Participe de grupos e encontros para criar novas conexões na cidade.</p><button onClick={()=>{setSub("Grupos");go("comunidade")}} className="text-link mt-4">Ver grupos <Icon name="arrow" size={16}/></button></div></div></TracingBeam></section>
   <section className="timeline-container"><Timeline data={timeline}/></section>
  </div>}
  {page==="voce"&&<div className="page-stack"><div className="profile-head"><div className="profile-avatar">JF</div><div><Eyebrow>SEU ESPAÇO</Eyebrow><h1 className="page-title !mt-1">A sua jornada.</h1><p className="text-sm text-[#71807b]">Perfil de demonstração · {city}</p></div></div><div className="profile-grid"><div className="profile-surface"><div className="flex items-center gap-3"><Icon name="heart"/><h2 className="font-serif text-2xl">Seus salvos</h2></div><p className="mt-2 text-sm text-[#7a8580]">Guarde o que faz sentido para consultar depois.</p>{saved.length?<div className="mt-5 space-y-3">{LISTINGS.filter(x=>saved.includes(x.id)).map(x=><button className="saved-item" onClick={()=>setDetail(x)} key={x.id}><img src={x.image} alt=""/><span><b>{x.name}</b><small>{x.kind} · {x.price}</small></span><Icon name="arrow" size={17}/></button>)}</div>:<div className="empty-mini"><Icon name="heart" size={30}/><p>Nenhum anúncio salvo ainda.</p><button onClick={()=>go("mercado")} className="text-link mt-2">Descobrir anúncios →</button></div>}</div><div className="profile-surface"><div className="flex items-center gap-3"><Icon name="users"/><h2 className="font-serif text-2xl">Seus grupos</h2></div><p className="mt-2 text-sm text-[#7a8580]">Continue participando de conversas importantes.</p><div className="mt-5 space-y-3">{joined.length?GROUPS.filter(g=>joined.includes(g.id)).map(g=><button key={g.id} onClick={()=>{setSub("Grupos");go("comunidade")}} className="saved-item"><img src={g.src} alt=""/><span><b>{g.title}</b><small>{g.sub}</small></span><Icon name="arrow" size={17}/></button>):<div className="empty-mini"><Icon name="users" size={30}/><p>Você ainda não entrou em nenhum grupo.</p><button onClick={()=>{setSub("Grupos");go("comunidade")}} className="text-link mt-2">Explorar grupos →</button></div>}</div></div></div><div className="profile-lab"><div><Eyebrow light>EXPLORE A NOVA BIBLIOTECA</Eyebrow><h2 className="mt-2 font-serif text-3xl text-white">Quer ver a Aceternity no limite?</h2><p className="mt-3 max-w-md text-sm leading-7 text-white/70">Abra o laboratório com animações complexas, componentes imersivos e variações de contraste.</p><button onClick={()=>go("lab")} className="mt-5 rounded-full bg-[#E07A5A] px-5 py-3 text-sm font-bold text-[#253033]">Abrir laboratório ↗</button></div><Icon name="spark" size={76}/></div></div>}
  {page==="lab"&&<Suspense fallback={<div className="empty">Carregando laboratório visual…</div>}><Lab effects={showEffects} onEffectsChange={setShowEffects} onGo={go}/></Suspense>}
  </main>
  <footer className="site-footer"><div><img alt="Bivaque" src="/logo.svg" width="120"/><p>Uma rede para acompanhar a vida militar.</p></div><div><span>ACETERNITY UI · STRESS TEST</span><span>Interações fictícias · Sem backend</span></div></footer>
  <nav className="mobile-nav" aria-label="Navegação mobile">{mobileNav.map(x=><button aria-current={page===x.key?"page":undefined} className={page===x.key?"is-active":""} key={x.key} onClick={()=>go(x.key)}><Icon name={x.icon} size={22}/><span>{x.name}</span></button>)}</nav>
  <div className="dock-slot"><FloatingDock desktopClassName="!bg-[#253033] !shadow-[0_15px_55px_#25303350]" mobileClassName="!hidden" items={NAV.map(n=>({title:n.name,icon:<span className="text-[#B84A3A]"><Icon name={n.icon} size={22}/></span>,href:"#"+n.key}))}/></div>
  <AnimatePresence>{detail&&<motion.div className="detail-backdrop" onClick={()=>setDetail(null)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div role="dialog" aria-modal="true" aria-label={detail.name} className="detail-sheet" onClick={e=>e.stopPropagation()} initial={{opacity:0,y:30,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:24,scale:.96}}><img src={detail.image} alt="" className="h-52 w-full object-cover"/><div className="p-6"><Eyebrow>{detail.kind}</Eyebrow><h2 className="mt-2 font-serif text-[26px]">{detail.name}</h2><p className="mt-3 text-sm text-[#73817c]">{detail.info} · {detail.location}</p><p className="mt-4 font-extrabold">{detail.price}</p><DemoTag>Item e valores fictícios para testes de interface.</DemoTag><div className="mt-5 flex gap-3"><button onClick={()=>save(detail.id)} className="solid-button flex-1">{saved.includes(detail.id)?"Remover dos salvos":"Salvar anúncio"}</button><button className="outline-button" onClick={()=>setDetail(null)}>Fechar</button></div></div></motion.div></motion.div>}</AnimatePresence>
  {toast&&<div role="status" className="toast" onClick={()=>setToast("")}>{toast}<button className="ml-4 font-bold text-[#efb19f]">Fechar ×</button></div>}
 </div>
}
