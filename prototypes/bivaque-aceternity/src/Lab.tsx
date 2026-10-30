import { useState } from "react";
import { LampContainer } from "./components/ui/lamp";
import { Meteors } from "./components/ui/meteors";
import { Boxes } from "./components/ui/background-boxes";
import { BackgroundBeams } from "./components/ui/background-beams";
import { BackgroundBeamsWithCollision } from "./components/ui/background-beams-with-collision";
import { BackgroundCells } from "./components/ui/background-ripple-effect";
import { TextRevealCard, TextRevealCardTitle, TextRevealCardDescription } from "./components/ui/text-reveal-card";
import { Carousel } from "./components/ui/carousel";
import { GlowingEffect } from "./components/ui/glowing-effect";
import { HeroHighlight, Highlight } from "./components/ui/hero-highlight";
import { Spotlight } from "./components/ui/spotlight";
import { HoverBorderGradient } from "./components/ui/hover-border-gradient";

const PHOTOS=[
 "https://raw.githubusercontent.com/Juanjfmr/bivaque-community/main/apps/web/public/landing/hero-bivaque-arrival.webp",
 "https://raw.githubusercontent.com/Juanjfmr/bivaque-community/main/apps/web/public/landing/hero-bivaque-community.webp",
 "https://raw.githubusercontent.com/Juanjfmr/bivaque-community/main/apps/web/public/landing/v8/encontro.webp",
 "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=80"
];
const CAT=[
 {id:"impacto",label:"Impacto",caption:"Luz, partículas e cenografia"},
 {id:"interacao",label:"Interação",caption:"Mouse, toque e componentes reagentes"},
 {id:"carrosseis",label:"Composição",caption:"Slides, profundidade e layout"},
];
const inventory=[
 ["Spotlight","Início · luz do hero"],["Flip Words","Início · mensagem em movimento"],["Moving Border","Início · chamada principal"],
 ["Placeholders And Vanish Input","Início · busca"],["Bento Grid","Início · atalhos"],["Glowing Effect","Início, Mercado e Lab"],
 ["Infinite Moving Cards","Início · perguntas"],["Background Gradient","Início · guia"],["Hover Border Gradient","Início e Mercado"],
 ["3D Card Effect","Mercado · anúncio"],["Hero Highlight","Comunidade · capa"],["Text Generate Effect","Comunidade · perguntas"],
 ["Focus Cards","Comunidade · grupos"],["Animated Testimonials","Comunidade · histórias ilustrativas"],
 ["Layout Grid","Mercado · seleção expandida"],["Direction Aware Hover","Mercado · catálogo"],["Timeline","Chegada · etapas"],
 ["Tracing Beam","Chegada · linha de rolagem"],["World Map","Chegada · deslocamentos demonstrativos"],
 ["Floating Dock","Desktop · navegação"],["Animated Modal","Comunidade · criação de publicação"],
 ["Lamp","Lab · cenário"],["Meteors","Lab · partículas"],["Background Boxes","Lab · grade"],
 ["Background Beams","Lab · animação"],["Background Beams With Collision","Lab · colisões"],
 ["Background Ripple Effect","Lab · toque"],["Text Reveal Card","Lab · revelar mensagem"],
 ["Carousel","Lab · carrossel"]
];
export default function Lab({effects,onEffectsChange,onGo}:{effects:boolean;onEffectsChange:(v:boolean)=>void;onGo:(v:"inicio"|"comunidade"|"mercado"|"chegada"|"voce"|"lab")=>void}){
 const [category,setCategory]=useState("impacto");
 const [width,setWidth]=useState(375);
 const [showInventory,setShowInventory]=useState(false);
 return <div className="lab-page">
  <section className="lab-heading">
   <div className="lab-heading-text"><span className="eyebrow eyebrow-light">BIVAQUE DESIGN EXPERIMENT · 2026</span><h1>Laboratório<br/><em>Aceternity.</em></h1><p>Esta tela força componentes visuais avançados a conviver com a identidade oficial do Bivaque. Alguns efeitos são intencionalmente mais intensos do que seriam no produto final.</p>
    <div className="mt-6 flex flex-wrap items-center gap-3"><button className="lab-primary" onClick={()=>setShowInventory(v=>!v)}>{showInventory?"Fechar inventário":"Ver inventário completo"} ↗</button><button onClick={()=>onGo("inicio")} className="lab-secondary">Voltar ao Bivaque</button></div></div>
   <div className="lab-orbit"><span className="lab-orbit-ring"/><div className="lab-orbit-core"><img src="/logo.svg" alt="Bivaque" width="160"/></div><div className="lab-orbit-label">29 COMPONENTES EM TESTE</div></div>
  </section>
  <div className="lab-dashboard"><div><small>COMPONENTES UTILIZADOS</small><strong>29</strong><span>6 da versão inicial + 23 novos</span></div><div><small>JORNADAS TESTADAS</small><strong>05</strong><span>Início, Comunidade, Mercado, Chegada, Você</span></div><div><small>ESTADO VISUAL</small><strong>{effects?"ON":"OFF"}</strong><span>Controle de efeitos de alto impacto</span></div></div>
  <div className="lab-settings"><div><h2>Exigência gráfica</h2><p>Desative os efeitos mais pesados para comparar hierarquia, legibilidade e desempenho percebido.</p></div><button aria-pressed={effects} onClick={()=>onEffectsChange(!effects)} className={"lab-toggle "+(effects?"is-on":"")}><span/>{effects?"Efeitos ativos":"Efeitos reduzidos"}</button></div>
  {showInventory&&<section className="lab-inventory"><div className="flex justify-between gap-4"><div><span className="eyebrow">CATÁLOGO VALIDADO</span><h2 className="section-title">Componentes realmente utilizados</h2></div><button onClick={()=>setShowInventory(false)} className="text-link">Fechar ×</button></div><div className="inventory-grid">{inventory.map(([name,where],i)=><div className="inventory-item" key={name}><span className="inventory-num">{String(i+1).padStart(2,"0")}</span><div><b>{name}</b><small>{where}</small></div><span className="inventory-dot"/></div>)}</div></section>}
  <div className="lab-tabs">{CAT.map(c=><button onClick={()=>setCategory(c.id)} key={c.id} className={category===c.id?"selected":""}><b>{c.label}</b><span>{c.caption}</span></button>)}</div>
  {category==="impacto"&&<section className="lab-grid">
   <div className="lab-panel lab-panel-large"><div className="lab-panel-head"><span>01 · LAMP</span><b>Iluminação editorial</b></div><div className="lamp-stage">{effects?<LampContainer><h3 className="relative z-30 mt-8 text-center font-serif text-3xl text-white md:text-5xl">A rede ilumina <br/><span className="text-[#eab39f]">o próximo caminho.</span></h3></LampContainer>:<div className="lab-static-stage"><h3>Uma rede para caminhar junto.</h3></div>}</div></div>
   <div className="lab-panel"><div className="lab-panel-head"><span>02 · METEORS</span><b>Partículas no contexto</b></div><div className="meteors-stage">{effects&&<Meteors number={18}/>}<span className="eyebrow eyebrow-light">UM CONVITE À DESCOBERTA</span><h3 className="mt-4 font-serif text-3xl">Todo lugar tem uma história.</h3><p className="mt-3 text-sm text-white/60">Componentes de ambientação, usados com moderação.</p></div></div>
   <div className="lab-panel"><div className="lab-panel-head"><span>03 · BACKGROUND BEAMS</span><b>Linhas de energia</b></div><div className="beams-stage"><h3 className="relative z-10 font-serif text-3xl text-white">Conexões que permanecem.</h3>{effects&&<BackgroundBeams/>}</div></div>
   <div className="lab-panel lab-panel-large"><div className="lab-panel-head"><span>04 · COLLISION</span><b>Explosão de linhas no espaço</b></div><div className="collision-stage">{effects?<BackgroundBeamsWithCollision className="!h-[260px] !min-h-[260px] !bg-[#253033]"><h3 className="relative z-20 font-serif text-center text-3xl text-white">Ideias em movimento.</h3></BackgroundBeamsWithCollision>:<h3 className="font-serif text-3xl">Ideias em movimento.</h3>}</div></div>
  </section>}
  {category==="interacao"&&<section className="lab-grid">
   <div className="lab-panel lab-panel-large"><div className="lab-panel-head"><span>05 · BACKGROUND BOXES</span><b>Grid responsivo ao mouse</b></div><div className="boxes-stage">{effects&&<Boxes className="!opacity-70"/>}<div className="relative z-20 text-center"><h3 className="font-serif text-4xl text-white">Mova o cursor.</h3><p className="mt-3 text-sm text-white/70">Experimente a luz nas células.</p></div></div></div>
   <div className="lab-panel"><div className="lab-panel-head"><span>06 · BACKGROUND RIPPLE</span><b>Ondas a cada interação</b></div><div className="ripple-stage">{effects?<BackgroundCells className="!h-[270px] !min-h-0 !bg-[#253033]"><h3 className="relative z-20 font-serif text-center text-3xl text-white">Toque e explore.</h3></BackgroundCells>:<h3 className="font-serif text-3xl">Toque e explore.</h3>}</div></div>
   <div className="lab-panel"><div className="lab-panel-head"><span>07 · GLOWING EFFECT</span><b>Proximidade de borda</b></div><div className="glow-stage"><div className="relative rounded-[23px] border border-[#253033]/10 bg-[#F2F0EB] p-8"><GlowingEffect borderWidth={2} glow disabled={!effects} spread={40} proximity={90}/><h3 className="font-serif text-2xl">Atenção ao detalhe.</h3><p className="mt-2 text-sm text-[#67716f]">A borda acompanha a posição do cursor.</p></div></div></div>
   <div className="lab-panel lab-panel-large"><div className="lab-panel-head"><span>08 · TEXT REVEAL</span><b>Mensagem oculta pelo movimento</b></div><div className="reveal-stage"><TextRevealCard className="!w-full !max-w-[560px] !bg-[#253033]" text="Todo lugar é novo." revealText="A rede continua."><TextRevealCardTitle>Um gesto muda a perspectiva.</TextRevealCardTitle><TextRevealCardDescription>Arraste o dedo ou o cursor para revelar uma segunda mensagem.</TextRevealCardDescription></TextRevealCard></div></div>
  </section>}
  {category==="carrosseis"&&<section className="lab-grid">
   <div className="lab-panel lab-panel-full"><div className="lab-panel-head"><span>09 · CAROUSEL</span><b>Profundidade e perspectiva</b></div><div className="carousel-stage">{effects?<Carousel slides={[{title:"A cidade",button:"Conhecer o guia",src:PHOTOS[0]},{title:"A comunidade",button:"Compartilhar",src:PHOTOS[1]},{title:"Os encontros",button:"Explorar",src:PHOTOS[2]},{title:"Seu lugar",button:"Encontrar",src:PHOTOS[3]}]}/>:<div className="lab-static-stage"><h3>Carrossel pausado com efeitos reduzidos.</h3></div>}</div></div>
   <div className="lab-panel lab-panel-full"><div className="lab-panel-head"><span>10 · HERO HIGHLIGHT + SPOTLIGHT</span><b>Composição de texto e luz</b></div><div className="relative overflow-hidden rounded-[17px]">{effects&&<Spotlight fill="#B84A3A" className="!z-10 -top-28 left-10"/>}<HeroHighlight containerClassName="!h-[280px] !bg-[#F2F0EB]" className="relative z-20 p-5 text-center"><h3 className="font-serif text-[28px] md:text-4xl">A tecnologia deve <Highlight>servir ao pertencimento.</Highlight></h3></HeroHighlight></div></div>
  </section>}
  <section className="lab-responsive"><div><span className="eyebrow">TESTE DE RESPONSIVIDADE</span><h2 className="section-title">320, 375 e 430 px</h2><p className="mt-2 max-w-xl text-sm text-[#71807b]">Ajuste a largura da amostra abaixo. Para avaliar as telas reais, use a visualização responsiva do navegador nas demais páginas.</p></div><div className="lab-widths">{[320,375,430].map(w=><button className={w===width?"active":""} onClick={()=>setWidth(w)} key={w}>{w}px</button>)}</div></section>
  <div className="lab-phone-area"><div className="lab-phone" style={{width:Math.min(width,430)+"px"}}><div className="lab-phone-bar"><span>9:41</span><span>●●●</span></div><div className="p-5"><img alt="Bivaque" width="122" src="/logo.svg"/><div className="mt-9"><span className="eyebrow">MANAUS · SUA REDE</span><h3 className="mt-2 font-serif text-[30px] leading-tight">O que você precisa em Manaus?</h3><div className="mt-5 rounded-full border border-[#253033]/15 bg-white p-3.5 text-xs text-[#8c9590]">Buscar serviços, grupos e imóveis…</div><div className="mt-6 grid grid-cols-2 gap-3">{["Comunidade","Negócios","Imóveis","Desapegos"].map((x,i)=><div key={x} className={"rounded-[17px] p-4 text-sm font-bold "+(i===0?"bg-[#253033] text-white":"bg-white")}>{x}<p className={"mt-3 text-[10px] font-normal "+(i===0?"text-white/70":"text-[#7a8580]")}>Explorar →</p></div>)}</div><div className="mt-6 rounded-[16px] bg-[#B84A3A] p-4 text-white"><b>Próximo passo</b><p className="mt-2 text-xs text-white/80">Descubra sua nova comunidade.</p></div></div></div></div></div>
  <section className="lab-conclusion"><div><span className="eyebrow eyebrow-light">CRITÉRIO DO TESTE</span><h2 className="mt-3 font-serif text-3xl">Mais efeitos não significam automaticamente melhor produto.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Este protótipo compara liberdade visual, clareza da interface e estabilidade dos componentes no mobile. Algumas experiências são apropriadas para páginas institucionais; outras, apenas para momentos pontuais de descoberta.</p></div><HoverBorderGradient as="button" onClick={()=>onGo("inicio")} containerClassName="!rounded-full" className="!bg-[#F2F0EB] !text-[#253033] !px-5 !py-3 !rounded-full !font-bold">Voltar ao produto ↗</HoverBorderGradient></section>
 </div>;
}
