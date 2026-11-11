"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Bell, Bookmark, CalendarDays, Check, ChevronDown, Compass, Heart, MessageCircle, MoreHorizontal, Plus, Search, Send, Share2, ShoppingBag, SlidersHorizontal, UserRound, X } from "lucide-react";
import CarouselCards, {type ExperienceItem} from "@/components/ui/carousel-cards";
import {homes,initialPosts,photos,services,type Post} from "@/data";
import "./style.css";
type FeedMode = "recentes" | "perguntas" | "indicacoes" | "encontros";
export default function TelaB(){
 const [tab,setTab]=useState<FeedMode>("recentes");
 const [query,setQuery]=useState("");
 const [posts,setPosts]=useState<Post[]>(initialPosts);
 const [draft,setDraft]=useState("");
 const [composer,setComposer]=useState(false);
 const [saved,setSaved]=useState<number[]>([]);
 const [liked,setLiked]=useState<number[]>([]);
 const [selected,setSelected]=useState<ExperienceItem|null>(null);
 const [notice,setNotice]=useState("");
 const visiblePosts=useMemo(()=>posts.filter(p=>{
  const matchesTab=tab==="recentes" || (tab==="perguntas"?p.type==="Pergunta":tab==="indicacoes"?p.type==="Indicação":p.type==="Encontro");
  return matchesTab&&[p.title,p.body,p.place,p.author].join(" ").toLowerCase().includes(query.toLowerCase());
 }),[posts,tab,query]);
 const targetRail=useMemo(()=>[...homes,...services].filter(p=>[p.title,p.location].join(" ").toLowerCase().includes(query.toLowerCase())),[query]);
 function publish(){
  if(draft.trim().length<8){setNotice("Escreva pelo menos 8 caracteres para publicar.");return}
  setPosts(existing=>[{id:Date.now(),author:"Você",time:"agora",place:"Manaus",type:"Pergunta",title:draft.trim(),body:"Pergunta demonstrativa, não enviada.",comments:0,likes:0},...existing]);
  setDraft("");setTab("recentes");setQuery("");setComposer(false);setNotice("Publicação adicionada à demonstração.");
 }
 return <div className="ab-b">
   <header className="b-header"><div className="b-topline">
      <div className="b-place"><span className="b-locationdot"/><div><span className="b-placemeta">Comunidade local</span><button onClick={()=>setNotice("Região selecionada: Manaus")}><b>Manaus</b><ChevronDown size={16}/></button></div></div>
      <div className="b-toptools"><button aria-label="Buscar" onClick={()=>document.getElementById("b-query")?.focus()}><Search size={20}/></button><button aria-label="Notificações" onClick={()=>setNotice("Nenhuma notificação nova")}><Bell size={20}/></button><button className="b-user" aria-label="Perfil" onClick={()=>setNotice("Perfil demonstrativo")}>JF</button></div>
   </div></header>
   <div className="b-layout">
     <main className="b-main" id="conteudo">
       <div className="b-greeting"><h1>Bom dia, Manaus.</h1><p>Pergunte, indique e encontre pessoas da sua comunidade.</p></div>
       <div className="b-ask"><div className="b-asktop"><span className="b-askavatar">J</span><button onClick={()=>setComposer(true)}>O que você precisa saber ou compartilhar?</button></div><div className="b-quickactions"><button onClick={()=>setComposer(true)}><MessageCircle size={17}/> Perguntar</button><button onClick={()=>{setComposer(true);setNotice("Compartilhe uma recomendação à comunidade.")}}><Check size={17}/> Indicar</button><button onClick={()=>setNotice("Escolha um encontro no painel abaixo")}><CalendarDays size={17}/> Encontro</button></div></div>
       <div className="b-feedheader"><h2>Da comunidade</h2><span className="b-feedcontext">Atualizações locais</span></div>
       <div className="b-segmented">{([["recentes","Recentes"],["perguntas","Perguntas"],["indicacoes","Indicações"],["encontros","Encontros"]] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} className={tab===id?"selected":""} onClick={()=>setTab(id)}>{label}</button>)}</div>
       <div className="b-search"><Search size={16}/><input id="b-query" aria-label="Buscar conteúdo local" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nesta comunidade..."/><SlidersHorizontal size={15}/></div>
       {visiblePosts.length ? <div className="b-feed">{visiblePosts.map((p,index)=><article className="b-story" key={p.id}>
          <div className="b-author"><span className="b-photoavatar">{p.author.slice(0,1)}</span><div className="b-authorinfo"><b>{p.author}</b><small>{p.place} · {p.time}</small></div><button aria-label="Mais opções" onClick={()=>setNotice("Opções de publicação demonstrativa")}><MoreHorizontal size={20}/></button></div>
          <h3>{p.title}</h3><p>{p.body}</p>
          {index===0 && tab==="recentes" && p.id===1 && <img className="b-story-photo" src={photos.service} alt="Profissional trabalhando em instalação elétrica" />}
          <div className="b-story-actions">
            <button aria-pressed={liked.includes(p.id)} onClick={()=>setLiked(xs=>xs.includes(p.id)?xs.filter(x=>x!==p.id):[...xs,p.id])}><Heart size={17} className={liked.includes(p.id)?"fill-current":""}/>{p.likes+(liked.includes(p.id)?1:0)}</button>
            <button onClick={()=>setNotice("Comentários demonstrativos: "+p.comments)}><MessageCircle size={17}/>{p.comments} respostas</button>
            <button aria-pressed={saved.includes(p.id)} onClick={()=>setSaved(xs=>xs.includes(p.id)?xs.filter(x=>x!==p.id):[...xs,p.id])}><Bookmark size={17} className={saved.includes(p.id)?"fill-current":""}/>Salvar</button>
            <button aria-label="Compartilhar" onClick={()=>setNotice("Compartilhamento demonstrativo")}><Share2 size={17}/></button>
          </div>
       </article>)}</div>:<div className="b-empty"><h3>Nenhuma conversa encontrada</h3><p>Altere o filtro ou faça a primeira pergunta.</p><button onClick={()=>{setTab("recentes");setQuery("")}}>Ver todas as conversas</button></div>}
       <section className="b-mobile-rail"><div className="b-railtitle"><h2>Descubra perto de você</h2><span>Moradias e serviços</span></div>{targetRail.length?<CarouselCards sections={[{title:"Recomendações",items:targetRail}]} onSelect={setSelected}/>:<p className="b-nomatch">Nenhuma recomendação corresponde à busca.</p>}</section>
     </main>
     <aside className="b-aside"><div className="b-aside-top"><h2>Seu entorno, suas possibilidades.</h2><p>Moradias e serviços recomendados, reunidos em um só lugar.</p></div>
       {targetRail.length>0 && <CarouselCards sections={[{title:"Para conhecer",items:targetRail}]} onSelect={setSelected}/>}
       <div className="b-event"><img src={photos.run} alt="Pessoas correndo ao ar livre"/><div><b>Corrida da comunidade</b><p>Sábado · 6h · Ponta Negra</p><button onClick={()=>setNotice("Interesse registrado para a corrida.")}>Tenho interesse <ArrowRight size={14}/></button></div></div>
     </aside>
   </div>
   <nav className="b-bottom" aria-label="Navegação principal"><button className="selected" onClick={()=>{setTab("recentes");setQuery("")}}><Compass size={21}/>Início</button><button onClick={()=>document.getElementById("b-query")?.focus()}><Search size={21}/>Buscar</button><button className="b-primary-add" onClick={()=>setComposer(true)} aria-label="Criar publicação"><Plus size={24}/></button><button onClick={()=>setNotice("Mercado demonstrativo")}><ShoppingBag size={21}/>Mercado</button><button onClick={()=>setNotice("Perfil demonstrativo")}><UserRound size={21}/>Você</button></nav>
   {notice && <div className="b-toast" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Fechar"><X size={17}/></button></div>}
   {selected && <div className="b-overlay" onClick={()=>setSelected(null)}><div className="b-detail" onClick={e=>e.stopPropagation()}><button className="b-close" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={21}/></button><img src={selected.image} alt=""/><div><h2>{selected.title}</h2><p>{selected.location}</p><p>Dados apenas ilustrativos.</p><button onClick={()=>{setSelected(null);setNotice("Interesse registrado.")}}>Tenho interesse</button></div></div></div>}
   {composer && <div className="b-overlay" onClick={()=>setComposer(false)}><div className="b-detail b-compose" onClick={e=>e.stopPropagation()}><button className="b-close" onClick={()=>setComposer(false)} aria-label="Fechar"><X size={21}/></button><h2>Publicar na comunidade</h2><p>Uma pergunta clara facilita receber boas respostas.</p><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Escreva aqui sua pergunta ou indicação..." aria-label="Texto da publicação"/><button onClick={publish}><Send size={17}/> Publicar</button></div></div>}
 </div>
}