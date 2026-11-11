"use client";
import { useMemo, useState } from "react";
import { Bell, CalendarDays, Compass, Heart, House, MapPin, MessageCircle, Plus, Search, SlidersHorizontal, UserRound, Wrench, X, Check, ArrowRight } from "lucide-react";
import CarouselCards, { type ExperienceItem } from "@/components/ui/carousel-cards";
import { categories, events, homes, initialPosts, services, type Category, type Post } from "@/data";
import "./style.css";

const icons = { todos: Compass, moradias: House, servicos: Wrench, eventos: CalendarDays };
export default function TelaA() {
  const [category, setCategory] = useState<Category>("todos");
  const [search, setSearch] = useState("");
  const [posts,setPosts] = useState<Post[]>(initialPosts);
  const [compose,setCompose] = useState(false);
  const [draft,setDraft] = useState("");
  const [selected,setSelected] = useState<ExperienceItem | null>(null);
  const [filterOpen,setFilterOpen] = useState(false);
  const [notice,setNotice] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return [
      {id:"moradias",title:"Moradias para conhecer",items:homes},
      {id:"servicos",title:"Serviços indicados pela comunidade",items:services},
      {id:"eventos",title:"Encontros por perto",items:events},
    ].filter(s => category==="todos" || category===s.id).map(s=>({...s, items:s.items.filter(item=>[item.title,item.location,item.date].join(" ").toLocaleLowerCase("pt-BR").includes(q))})).filter(s=>s.items.length);
  }, [category,search]);
  const postVisible = posts.filter(p=> category==="todos" && [p.title,p.body,p.place].join(" ").toLowerCase().includes(search.toLowerCase()));
  function publish(){
    if(draft.trim().length<8){setNotice("Descreva sua pergunta com pelo menos 8 caracteres.");return;}
    setPosts(current=>[{id:Date.now(),author:"Você",time:"agora",place:"Manaus",type:"Pergunta",title:draft.trim(),body:"Publicação demonstrativa, não enviada.",comments:0,likes:0},...current]);
    setDraft("");setCompose(false);setCategory("todos");setSearch("");setNotice("Pergunta publicada na demonstração.");
  }
  return <div className="ab-a">
    <header className="a-header"><div className="a-top"><a href="/a" className="a-wordmark">bivaque<span className="a-dot">.</span></a><div className="a-topactions"><span className="a-city"><MapPin size={15}/> Manaus</span><button aria-label="Notificações" onClick={()=>setNotice("Sem novas notificações.")}><Bell size={20}/></button><button className="a-profile" aria-label="Perfil" onClick={()=>setNotice("Perfil demonstrativo")}>JF</button></div></div>
      <div className="a-search"><Search size={20}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar na comunidade" placeholder="Encontre moradias, serviços, pessoas..." /><button className="a-filters" aria-label="Mais filtros" aria-expanded={filterOpen} onClick={()=>setFilterOpen(!filterOpen)}><SlidersHorizontal size={18}/></button></div>
      {filterOpen && <div className="a-filterbox">Mostrando resultados demonstrativos em Manaus. <button onClick={()=>{setSearch("");setCategory("todos");setFilterOpen(false)}}>Limpar filtros</button></div>}
      <nav className="a-categories" aria-label="Categorias">{categories.map(c=>{const Icon=icons[c.id];return <button key={c.id} aria-pressed={category===c.id} className={category===c.id?"a-selected":""} onClick={()=>setCategory(c.id)}><Icon size={22} strokeWidth={1.8}/><span>{c.label}</span></button>})}</nav>
    </header>
    <main className="a-main" id="conteudo">
      <div className="a-intro"><div><p className="a-intro-kicker">Perto de você</p><h1>Descubra Manaus com quem já conhece.</h1></div><button className="a-outline" onClick={()=>setCompose(true)}><Plus size={17}/> Perguntar</button></div>
      {filtered.length ? filtered.map(section=><section key={section.id} className="a-section">
        <div className="a-section-head"><h2>{section.title}</h2><button onClick={()=>setNotice("Exibindo todas as opções de "+section.title.toLowerCase())}>Ver tudo <ArrowRight size={16}/></button></div>
        <CarouselCards sections={[{title:"",items:section.items}]} onSelect={setSelected}/>
      </section>) : <div className="a-empty"><Search size={27}/><h2>Nenhum resultado encontrado</h2><p>Tente outro termo ou escolha uma categoria diferente.</p><button onClick={()=>{setSearch("");setCategory("todos")}}>Limpar busca</button></div>}
      {postVisible.length>0 && <section className="a-discussions"><div className="a-section-head"><h2>Conversas da comunidade</h2><button onClick={()=>setCompose(true)}>Fazer pergunta <ArrowRight size={16}/></button></div>{postVisible.slice(0,3).map(post=><article className="a-post" key={post.id}><div className="a-avatar">{post.author.slice(0,1)}</div><div><div className="a-post-meta">{post.author} · {post.place} · {post.time}</div><h3>{post.title}</h3><p>{post.body}</p><div className="a-post-foot"><MessageCircle size={14}/> {post.comments} respostas</div></div></article>)}</section>}
      <div className="a-disclaimer">Conteúdo e valores ilustrativos para avaliação de interface.</div>
    </main>
    <nav className="a-bottom" aria-label="Navegação principal"><button className="active" onClick={()=>{setCategory("todos");setSearch("")}}><Compass size={22}/>Explorar</button><button onClick={()=>setNotice("Favoritos salvos nesta sessão.")}><Heart size={22}/>Salvos</button><button onClick={()=>setCompose(true)}><Plus size={23}/>Publicar</button><button onClick={()=>setNotice("Mensagens demonstrativas")}><MessageCircle size={22}/>Conversas</button><button onClick={()=>setNotice("Perfil demonstrativo")}><UserRound size={22}/>Você</button></nav>
    {notice && <div className="a-toast" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Fechar"><X size={17}/></button></div>}
    {selected && <div className="a-overlay" onClick={()=>setSelected(null)}><article className="a-modal" onClick={e=>e.stopPropagation()}><button className="a-close" onClick={()=>setSelected(null)} aria-label="Fechar"><X/></button><img src={selected.image} alt=""/><div className="a-modalbody"><h2>{selected.title}</h2><p>{selected.location}</p><p>Informação de demonstração. Para uma publicação real, seriam exibidos os dados de contato e as condições.</p><button onClick={()=>{setNotice("Interesse registrado nesta demonstração");setSelected(null)}}><Check size={17}/> Tenho interesse</button></div></article></div>}
    {compose && <div className="a-overlay" onClick={()=>setCompose(false)}><div className="a-modal a-composer" onClick={e=>e.stopPropagation()}><button className="a-close" onClick={()=>setCompose(false)} aria-label="Fechar"><X/></button><h2>Faça uma pergunta à comunidade</h2><p>Quem conhece a cidade pode ajudar.</p><textarea value={draft} onChange={e=>setDraft(e.target.value)} aria-label="Texto da pergunta" placeholder="O que você gostaria de saber?"/><button onClick={publish}>Publicar pergunta <ArrowRight size={17}/></button></div></div>}
  </div>;
}