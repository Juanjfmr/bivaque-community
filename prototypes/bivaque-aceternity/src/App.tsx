import { useEffect, useMemo, useState } from "react";
import { BentoGrid } from "./components/ui/bento-grid";
import { BackgroundGradient } from "./components/ui/background-gradient";
import { GlowingEffect } from "./components/ui/glowing-effect";
import { FloatingDock } from "./components/ui/floating-dock";
import { PlaceholdersAndVanishInput } from "./components/ui/placeholders-and-vanish-input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger } from "./components/ui/animated-modal";

type Section = "inicio" | "comunidade" | "mercado" | "voce";
type Entry = { id: string; title: string; type: string; detail: string; tag: string; image?: string; button?: string };
const root = "https://raw.githubusercontent.com/Juanjfmr/bivaque-community/main/apps/web/public/landing/";
const photos = {
  community: root + "hero-bivaque-community.webp",
  arrival: root + "hero-bivaque-arrival.webp",
  friends: root + "friends-gathering.jpg",
  sunset: root + "transfer-sunset.jpg",
  event: root + "v8/encontro.webp"
};
const entries: Entry[] = [
  { id:"moradia", type:"Imóveis",title:"Apartamento perto da Ponta Negra",detail:"2 quartos · Manaus · Exemplo demonstrativo",tag:"Moradia",image:photos.arrival,button:"Salvar imóvel"},
  { id:"bici",type:"Desapegos",title:"Bicicleta urbana em ótimo estado",detail:"Parque Dez · R$ 850 · Exemplo",tag:"Desapegos",button:"Salvar anúncio"},
  { id:"negocio",type:"Negócios",title:"Marcenaria sob medida",detail:"Atendimento em Manaus · Página demonstrativa",tag:"Prestador",image:photos.friends,button:"Salvar negócio"},
  { id:"grupo",type:"Grupos",title:"Famílias em Manaus",detail:"Trocas locais, dicas e apoio na chegada",tag:"Comunidade",image:photos.community,button:"Participar"},
  { id:"evento",type:"Eventos",title:"Encontro da comunidade",detail:"Sábado · Parque da Ponta Negra · Exemplo",tag:"Agenda",image:photos.event,button:"Tenho interesse"},
  { id:"guia",type:"Guia",title:"Primeiros passos em Manaus",detail:"Bairros, escolas, serviços e deslocamento",tag:"Chegada",image:photos.sunset,button:"Explorar guia"}
];
const nav: {key: Section; label: string; icon: string}[] = [
  {key:"inicio",label:"Início",icon:"home"},
  {key:"comunidade",label:"Comunidade",icon:"users"},
  {key:"mercado",label:"Mercado",icon:"store"},
  {key:"voce",label:"Você",icon:"user"}
];
function Icon({name,className="size-5"}:{name:string;className?:string}) {
  const paths:Record<string,React.ReactNode> = {
    home:<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
    users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
    store:<><path d="M3 9 5 3h14l2 6-2 3-3-1-4 1-4-1-3 1-2-3Z"/><path d="M5 12v9h14v-9M9 21v-7h6v7"/></>,
    user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    chevron:<path d="m9 18 6-6-6-6"/>,
    search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    plus:<path d="M12 4v16M4 12h16"/>,
    pin:<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    heart:<path d="M20.8 8.6c0 5.1-8.8 10.9-8.8 10.9S3.2 13.7 3.2 8.6a4.8 4.8 0 0 1 8.8-2.5 4.8 4.8 0 0 1 8.8 2.5Z"/>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></>,
    briefcase:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4h6v3M3 13h18"/></>,
    building:<><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 8h2m4 0h2M8 12h2m4 0h2M10 21v-5h4v5"/></>,
    question:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a3 3 0 1 1 5 2c-1 1-2.5 1.5-2.5 3M12 17h.01"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    arrow:<path d="M5 12h14m-7-7 7 7-7 7"/>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}
function Card({entry,saved,onSave,onAction}:{entry:Entry;saved:boolean;onSave:()=>void;onAction:()=>void}) {
  return <article className="relative rounded-[23px] border border-[#253033]/10 bg-white p-3 transition-transform hover:-translate-y-0.5">
    <GlowingEffect proximity={50} spread={28} glow disabled={false} borderWidth={1}/>
    <div className="relative flex items-start gap-3">
      {entry.image ? <img src={entry.image} alt="" className="h-[100px] w-[105px] shrink-0 rounded-2xl object-cover"/> :
        <div className="mini-art flex h-[100px] w-[105px] shrink-0 items-center justify-center rounded-2xl"><Icon name="store" className="size-9"/></div>}
      <div className="min-w-0 flex-1">
        <span className="eyebrow">{entry.tag}</span>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug">{entry.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6d7776]">{entry.detail}</p>
        <button onClick={onAction} className="mt-2 flex items-center gap-1 text-xs font-bold text-[#B84A3A]">Ver detalhes <Icon name="chevron" className="size-3"/></button>
      </div>
      <button title={saved?"Remover dos salvos":"Salvar"} aria-label={saved?"Remover dos salvos":"Salvar"} onClick={onSave} className={"rounded-full p-1.5 " +(saved?"bg-[#B84A3A]/10 text-[#B84A3A]":"text-[#77827d]")}><Icon name={saved?"check":"heart"} className="size-[18px]"/></button>
    </div>
  </article>;
}
function SectionTitle({title,subtitle,action}:{title:string;subtitle?:string;action?:()=>void}) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-[21px] font-extrabold tracking-tight">{title}</h2>{subtitle&&<p className="mt-1 text-xs text-[#6e7774]">{subtitle}</p>}</div>{action&&<button onClick={action} className="shrink-0 text-sm font-semibold text-[#B84A3A]">Ver tudo <span aria-hidden="true">→</span></button>}</div>;
}
export default function App(){
  const [active,setActive]=useState<Section>(()=>{const h=location.hash.substring(1);return nav.some(n=>n.key===h)?h as Section:"inicio";});
  const [sub,setSub]=useState("Publicações");
  const [marketSub,setMarketSub]=useState("Todos");
  const [query,setQuery]=useState("");
  const [search,setSearch]=useState("");
  const [saved,setSaved]=useState<string[]>([]);
  const [joined,setJoined]=useState(false);
  const [notice,setNotice]=useState("");
  const [selected,setSelected]=useState<Entry|null>(null);
  const [published,setPublished]=useState<string[]>([]);
  const [draft,setDraft]=useState("");
  useEffect(()=>{const onHash=()=>{const hash=location.hash.substring(1);if(nav.some(n=>n.key===hash))setActive(hash as Section);};window.addEventListener("hashchange",onHash);return()=>window.removeEventListener("hashchange",onHash)},[]);
  function go(s:Section){setActive(s);location.hash=s;window.scrollTo({top:0,behavior:"smooth"})}
  const toggleSave=(id:string)=>setSaved(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
  function act(item:Entry){setSelected(item)}
  const results=useMemo(()=>entries.filter(e=>(e.title+" "+e.type+" "+e.detail).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))),[search]);
  const displayMarket=search?results:entries.filter(e=>["Imóveis","Desapegos","Negócios"].includes(e.type)&&(marketSub==="Todos"||marketSub===e.type));
  return <div className="min-h-screen">
    <div className="top-line"></div>
    <header className="sticky top-0 z-30 border-b border-[#253033]/10 bg-[#F2F0EB]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1200px] items-center justify-between gap-3 px-4 md:px-8">
        <button onClick={()=>go("inicio")} aria-label="Ir para o início"><img src="/logo.svg" className="w-[149px] sm:w-[177px]" alt="Bivaque"/></button>
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="flex items-center gap-1 rounded-full border border-[#253033]/10 bg-white px-3 py-2 text-xs font-semibold" onClick={()=>setNotice("Manaus selecionada. Troca de cidade não conectada neste protótipo.")}><Icon name="pin" className="size-4 text-[#B84A3A]"/> Manaus <Icon name="chevron" className="size-3 rotate-90"/></button>
          <button aria-label="Notificações" className="relative flex size-9 items-center justify-center rounded-full border border-[#253033]/10 bg-white" onClick={()=>setNotice("Você está em dia. Sem novas notificações no protótipo.")}><Icon name="bell" className="size-4"/><span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#B84A3A]"/></button>
          <div className="avatar">JF</div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1150px] px-4 pb-36 pt-7 md:px-8">
      <div className="mb-5 flex items-center gap-2"><span className="tag">CONCEITO INTERATIVO</span><span className="text-xs text-[#7c8580]">Aceternity UI · dados demonstrativos</span></div>
      {active==="inicio"&&<>
        <div className="hero relative overflow-hidden rounded-[28px]">
          <img src={photos.community} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"/>
          <div className="absolute inset-0 bg-gradient-to-r from-[#253033] via-[#253033]/95 to-[#253033]/30"/>
          <div className="relative z-10 max-w-[600px] px-6 py-10 text-[#F2F0EB] md:px-11 md:py-14">
            <span className="text-xs font-bold tracking-[.18em] text-[#e89c7e]">BEM-VINDO AO BIVAQUE</span>
            <h1 className="mt-4 font-serif text-[34px] leading-[1.13] tracking-[-.03em] sm:text-[50px]">Uma comunidade que acompanha a sua jornada.</h1>
            <p className="mt-4 max-w-[415px] text-sm leading-6 text-white/75">Encontre pessoas, serviços e oportunidades para viver melhor em cada cidade.</p>
            <button onClick={()=>go("comunidade")} className="mt-6 flex items-center gap-2 rounded-full bg-[#E07A5A] px-5 py-3 text-sm font-bold text-[#171E20]">Explorar comunidade <Icon name="arrow" className="size-4"/></button>
          </div>
        </div>
        <div className="relative z-10 -mt-5 mx-3 rounded-[24px] bg-[#F2F0EB] px-3 pt-4 pb-3 shadow-[0_6px_22px_#25303312] sm:mx-7 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon name="search" className="size-4 text-[#B84A3A]"/> O que você precisa encontrar?</div>
          <PlaceholdersAndVanishInput placeholders={["Diarista de confiança em Manaus","Apartamento perto do quartel","Grupos para famílias","Eventos da comunidade"]} onChange={e=>setQuery(e.target.value)} onSubmit={()=>{setSearch(query.trim());go("mercado")}}/>
        </div>
        <section className="mt-9">
          <SectionTitle title="Explore por necessidade" subtitle="Acesse rapidamente as áreas mais procuradas"/>
          <BentoGrid className="!grid-cols-2 !auto-rows-[130px] gap-3 md:!grid-cols-4">
            {([{name:"Imóveis",icon:"building",sub:"Encontre seu próximo lar",key:"Imóveis"},{name:"Negócios",icon:"briefcase",sub:"Profissionais indicados",key:"Negócios"},{name:"Desapegos",icon:"store",sub:"Boas oportunidades",key:"Desapegos"},{name:"Indicações",icon:"users",sub:"Pergunte à rede",key:"Publicações"}] as const).map(x=><button key={x.name} onClick={()=>{if(x.key==="Publicações"){setSub("Perguntas");go("comunidade")}else{setMarketSub(x.key);setSearch("");go("mercado")}}} className="relative overflow-hidden rounded-[20px] border border-[#253033]/10 bg-white p-4 text-left transition-transform hover:-translate-y-1">
              <GlowingEffect proximity={45} spread={28} borderWidth={1} glow disabled={false}/>
              <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[#F2F0EB] text-[#B84A3A]"><Icon name={x.icon} className="size-5"/></span>
              <b className="block text-sm">{x.name}</b><span className="mt-1 block text-[11px] leading-4 text-[#7c8580]">{x.sub}</span>
            </button>)}
          </BentoGrid>
        </section>
        <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_330px]">
          <div>
            <SectionTitle title="Perto de você" subtitle="Destaques para quem está em Manaus" action={()=>go("mercado")}/>
            <div className="grid gap-3">{entries.slice(0,3).map(e=><Card key={e.id} entry={e} saved={saved.includes(e.id)} onSave={()=>toggleSave(e.id)} onAction={()=>act(e)}/>)}</div>
          </div>
          <div className="space-y-4">
            <SectionTitle title="Vida em comunidade" subtitle="Pessoas e encontros para descobrir"/>
            <BackgroundGradient className="rounded-[22px] bg-[#253033] p-5 text-white" containerClassName="rounded-[24px]">
              <span className="text-xs font-semibold tracking-widest text-[#f4ad91]">SEU LUGAR NA REDE</span>
              <h3 className="mt-3 font-serif text-[28px] leading-tight">A experiência de alguém pode ser o seu próximo atalho.</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">Compartilhe uma dica, faça uma pergunta ou participe de um grupo.</p>
              <button onClick={()=>go("comunidade")} className="mt-5 flex items-center gap-2 rounded-full bg-[#F2F0EB] px-4 py-2.5 text-xs font-bold text-[#253033]">Entrar na comunidade <Icon name="arrow" className="size-4"/></button>
            </BackgroundGradient>
            <Card entry={entries[4]} saved={saved.includes("evento")} onSave={()=>toggleSave("evento")} onAction={()=>act(entries[4])}/>
          </div>
        </div>
        <section className="mt-9"><SectionTitle title="Chegando à cidade?" subtitle="Um guia feito para facilitar sua adaptação"/><button onClick={()=>act(entries[5])} className="guide-card flex w-full items-center justify-between overflow-hidden rounded-[24px] px-6 py-8 text-left text-white"><div><span className="text-xs font-bold tracking-widest text-[#F4C6B0]">GUIA DE MANAUS</span><h3 className="mt-2 font-serif text-2xl">Sua chegada mais tranquila</h3><p className="mt-2 text-xs text-white/75">Moradia · Educação · Serviços · Bairros</p></div><Icon name="arrow" className="size-8 shrink-0"/></button></section>
      </>}
      {active==="comunidade"&&<>
        <div className="section-intro"><span className="eyebrow">CONECTE-SE</span><h1 className="heading">Comunidade</h1><p>Converse, compartilhe experiências e participe da vida local.</p></div>
        <div className="tab-row">{["Publicações","Grupos","Eventos","Perguntas"].map(x=><button key={x} onClick={()=>setSub(x)} className={sub===x?"active":""}>{x}</button>)}</div>
        {sub==="Publicações"&&<div className="space-y-4"><div className="note-card"><b>Compartilhe algo com Manaus</b><p>Recomendações, dicas e experiências ajudam toda a comunidade.</p><button onClick={()=>setNotice("Use o botão Criar, na navegação inferior, para publicar.")} className="text-sm font-bold text-[#B84A3A]">Fazer publicação →</button></div>{published.map((p,i)=><div key={i} className="content-card"><span className="eyebrow">PUBLICAÇÃO DEMONSTRATIVA</span><p className="mt-3">{p}</p></div>)}<div className="content-card"><span className="eyebrow">COMUNIDADE · MANAUS</span><h3 className="mt-2 font-bold">Dicas de mudança para quem está chegando</h3><p className="mt-2 text-sm leading-6 text-[#67736f]">Quais bairros equilibram deslocamento, escolas e tranquilidade? Deixe sua experiência para ajudar quem está chegando.</p><button onClick={()=>setSub("Perguntas")} className="mt-4 text-sm font-bold text-[#B84A3A]">Ver respostas →</button></div></div>}
        {sub==="Grupos"&&<div className="space-y-4"><Card entry={entries[3]} saved={saved.includes("grupo")} onSave={()=>toggleSave("grupo")} onAction={()=>act(entries[3])}/><div className="note-card"><b>Famílias em Manaus</b><p>Troque dicas sobre bairros, serviços e rotina. Participação demonstrativa neste protótipo.</p><button onClick={()=>setJoined(x=>!x)} className="solid-btn">{joined?"Participando ✓":"Participar do grupo"}</button></div></div>}
        {sub==="Eventos"&&<div className="space-y-4"><Card entry={entries[4]} saved={saved.includes("evento")} onSave={()=>toggleSave("evento")} onAction={()=>act(entries[4])}/></div>}
        {sub==="Perguntas"&&<div className="space-y-3"><div className="content-card"><span className="eyebrow">DÚVIDAS DA COMUNIDADE</span><h3 className="mt-2 font-bold">Indicação de escola infantil em Manaus?</h3><p className="mt-2 text-sm text-[#68746f]">Busco experiências de famílias que já moram na cidade.</p><button onClick={()=>setNotice("Área de respostas demonstrativa. Sem envio real.")} className="mt-4 text-sm font-bold text-[#B84A3A]">Responder →</button></div><div className="content-card"><h3 className="font-bold">Onde encontrar ajuda para uma mudança?</h3><p className="mt-2 text-sm text-[#68746f]">Dicas sobre transportadoras, regiões e planejamento.</p></div></div>}
      </>}
      {active==="mercado"&&<>
        <div className="section-intro"><span className="eyebrow">ENCONTRE POR AQUI</span><h1 className="heading">Mercado</h1><p>Imóveis, desapegos e negócios reunidos em um só lugar.</p></div>
        <div className="tab-row">{["Todos","Desapegos","Imóveis","Negócios"].map(x=><button key={x} onClick={()=>{setMarketSub(x);setSearch("")}} className={marketSub===x&&!search?"active":""}>{x}</button>)}</div>
        {search&&<div className="mb-5 flex items-center justify-between gap-4 text-sm"><span>Resultados para <b>“{search}”</b></span><button onClick={()=>{setSearch("");setQuery("")}} className="font-bold text-[#B84A3A]">Limpar</button></div>}
        <div className="grid gap-4 md:grid-cols-2">{displayMarket.map(e=><Card key={e.id} entry={e} saved={saved.includes(e.id)} onSave={()=>toggleSave(e.id)} onAction={()=>act(e)}/>)}</div>
        {displayMarket.length===0&&<div className="note-card"><h3 className="font-bold">Nenhum resultado neste exemplo</h3><p>Tente pesquisar por imóvel, bicicleta, Manaus ou negócios.</p><button className="solid-btn" onClick={()=>{setSearch("");setMarketSub("Todos")}}>Ver todos</button></div>}
      </>}
      {active==="voce"&&<>
        <div className="section-intro"><span className="eyebrow">SUA JORNADA</span><h1 className="heading">Você</h1><p>Seu perfil, suas comunidades e o que deseja acompanhar.</p></div>
        <div className="content-card flex items-center gap-4"><div className="avatar avatar-large">JF</div><div><h3 className="font-bold">Perfil demonstrativo</h3><p className="mt-1 text-xs text-[#68736f]">Manaus · AM</p><span className="eyebrow">BIVAQUE</span></div></div>
        <section className="mt-7"><SectionTitle title="Salvos" subtitle="Guarde o que quiser consultar depois"/><div className="grid gap-3 md:grid-cols-2">{entries.filter(e=>saved.includes(e.id)).map(e=><Card key={e.id} entry={e} saved onSave={()=>toggleSave(e.id)} onAction={()=>act(e)}/>)}</div>{saved.length===0&&<div className="note-card">Nenhum item salvo. Use o coração nos cartões para adicioná-los.</div>}</section>
        <section className="mt-7"><SectionTitle title="Minhas comunidades"/><div className="note-card"><h3 className="font-bold">Famílias em Manaus</h3><p>{joined?"Você marcou participação no grupo.":"Conheça um grupo local para troca de experiências."}</p><button className="text-sm font-bold text-[#B84A3A]" onClick={()=>{setSub("Grupos");go("comunidade")}}>Abrir grupos →</button></div></section>
      </>}
    </main>
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-end gap-2">
        <FloatingDock desktopClassName="!bg-[#253033] shadow-2xl" mobileClassName="mb-1 rounded-full border border-[#253033]/10 bg-white p-2 shadow-xl" items={nav.map(n=>({title:n.label,href:"#"+n.key,icon:<Icon name={n.icon} className="size-full text-[#B84A3A]"/>}))}/>
        <Modal>
          <ModalTrigger className="flex size-[58px] items-center justify-center rounded-full bg-[#B84A3A] text-white shadow-xl" ><Icon name="plus" className="size-6"/></ModalTrigger>
          <ModalBody className="!min-h-0 !w-[min(92vw,500px)] !max-w-[500px] !rounded-[24px]">
            <ModalContent className="!p-6"><span className="eyebrow">PARTICIPAR DA REDE</span><h2 className="mt-2 font-serif text-3xl">O que deseja compartilhar?</h2><p className="mt-3 text-sm text-[#66716d]">Conte uma experiência ou faça uma pergunta. Publicação somente demonstrativa.</p>
              <form className="mt-5" onSubmit={e=>{e.preventDefault();if(draft.trim()){setPublished(v=>[draft.trim(),...v]);setDraft("");setSub("Publicações");go("comunidade");setNotice("Publicação adicionada à demonstração. Nenhum dado foi enviado.")}}}>
                <textarea value={draft} onChange={e=>setDraft(e.target.value)} required rows={5} placeholder="Escreva aqui..." className="w-full resize-none rounded-2xl border border-[#253033]/15 bg-[#F2F0EB] p-4 text-sm outline-none focus:border-[#B84A3A]"/>
                <button type="submit" className="solid-btn mt-4 w-full">Publicar no protótipo</button>
              </form>
            </ModalContent><ModalFooter className="!justify-start !bg-[#F2F0EB] text-xs text-[#68736f]">Simulação local, sem conta ou backend.</ModalFooter>
          </ModalBody>
        </Modal>
      </div>
    </div>
    {notice&&<div role="status" className="fixed bottom-28 left-1/2 z-[100] w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl bg-[#253033] px-5 py-4 text-sm text-white shadow-xl" onClick={()=>setNotice("")}>{notice}<button className="ml-2 font-bold text-[#f1a48e]">Fechar</button></div>}
    {selected&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#171E20]/65 p-4" onClick={()=>setSelected(null)}><div role="dialog" aria-modal="true" aria-label={selected.title} className="w-full max-w-[440px] overflow-hidden rounded-3xl bg-[#F2F0EB] shadow-2xl" onClick={e=>e.stopPropagation()}>
      {selected.image&&<img src={selected.image} alt="" className="h-[180px] w-full object-cover"/>}
      <div className="p-6"><span className="eyebrow">{selected.type}</span><h2 className="mt-2 font-serif text-2xl">{selected.title}</h2><p className="mt-2 text-sm text-[#64706a]">{selected.detail}</p><p className="mt-4 text-xs text-[#7c8580]">Este é um item fictício criado para testar a interface.</p><div className="mt-5 flex gap-2"><button onClick={()=>toggleSave(selected.id)} className="solid-btn flex-1">{saved.includes(selected.id)?"Remover dos salvos":"Salvar item"}</button><button onClick={()=>setSelected(null)} className="rounded-xl border border-[#253033]/20 px-4 text-sm">Fechar</button></div></div>
    </div></div>}
  </div>;
}
