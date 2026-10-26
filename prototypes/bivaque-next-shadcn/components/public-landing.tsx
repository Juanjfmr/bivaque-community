"use client";
import * as React from "react";
import Link from "next/link";
import {ArrowRight,Menu,Check,ShieldCheck,Users,House,BriefcaseBusiness,MessagesSquare,Compass,MapPin} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from "@/components/ui/accordion";
import {Sheet,SheetClose,SheetContent,SheetTitle,SheetTrigger} from "@/components/ui/sheet";
import {Badge} from "@/components/ui/badge";

const base=process.env.NEXT_PUBLIC_BASE_PATH||"";
const features=[
  {title:"Indicações",desc:"Pergunte e escolha com base no que funcionou para quem mora perto.",icon:MessagesSquare},
  {title:"Serviços e negócios",desc:"Profissionais e comércios que outras famílias já contrataram e recomendam.",icon:BriefcaseBusiness},
  {title:"Imóveis e desapegos",desc:"Aluguel, venda e o que sobrou da mudança, entre famílias militares.",icon:House},
  {title:"Grupos e eventos",desc:"Quem corre, quem tem filhos da mesma idade, quem quer só um café.",icon:Users},
];
const faqs=[
  ["Quem pode participar?","Militares da Marinha, do Exército e da Aeronáutica, da ativa ou veteranos, pensionistas e as famílias de todos eles."],
  ["É gratuito?","Sim. O acesso e as funcionalidades comunitárias previstas são gratuitos na fase de lançamento. Não há contratação nem pagamento nesta demonstração."],
  ["Como familiares participam?","A experiência aprovada prevê convite de quem tem vínculo militar verificado. Esta prévia não emite convites reais."],
  ["Como funciona a confirmação pelo CPF?","A experiência de referência prevê uma conferência efêmera, sem armazenar CPF. Esta prévia não solicita CPF, não consulta fontes oficiais e não verifica vínculos."],
  ["O Bivaque é ligado às Forças Armadas?","É uma comunidade independente, feita pela família militar."],
  ["Posso escolher qualquer cidade?","O produto é nacional. Os anúncios e os perfis atuais desta demonstração são fictícios e têm cobertura limitada, que não deve ser confundida com disponibilidade real."],
];
function Go({children}:{children:React.ReactNode}){return <Button asChild className="min-h-11 bg-bivaque-brasa text-bivaque-brasa-foreground hover:bg-bivaque-brasa-hover"><Link href="/acesso/">{children}<ArrowRight className="size-4"/></Link></Button>}
const anchors=[["#exemplo","Como funciona"],["#recursos","O que tem"],["#mudanca","Mudança de cidade"],["#perguntas","Perguntas"]];
export default function PublicLanding(){
 return <div className="min-h-screen bg-background text-foreground">
   <a href="#principal" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-background focus:p-3">Pular para o conteúdo</a>
   <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
     <div className="mx-auto flex h-[72px] max-w-[1260px] items-center gap-4 px-4 sm:px-8">
       <Link href="/" aria-label="Bivaque, página inicial" className="flex min-h-11 items-center gap-2">
         <img src={base+"/brand/bivaque-symbol.svg"} alt="" className="size-8 dark:hidden"/>
         <img src={base+"/brand/bivaque-symbol-white.svg"} alt="" className="hidden size-8 dark:block"/>
         <strong className="text-lg tracking-tight">Bivaque</strong>
       </Link>
       <nav aria-label="Seções" className="ml-auto hidden items-center gap-5 text-sm lg:flex">{anchors.map(([href,label])=><a className="rounded-md p-2 hover:text-bivaque-city focus-visible:outline-2" href={href} key={href}>{label}</a>)}</nav>
       <Button variant="ghost" asChild className="ml-auto hidden sm:inline-flex lg:ml-0"><Link href="/inicio/">Ver demonstração</Link></Button>
       <div className="hidden sm:block"><Go>Explorar entrada</Go></div>
       <Sheet><SheetTrigger asChild><Button aria-label="Abrir menu" variant="ghost" size="icon" className="ml-auto lg:hidden"><Menu/></Button></SheetTrigger>
         <SheetContent side="right" className="w-[min(90vw,340px)] overflow-y-auto p-5"><SheetTitle className="mb-6">Bivaque</SheetTitle>
           <nav className="flex flex-col gap-1" aria-label="Seções mobile">{anchors.map(([href,label])=><SheetClose asChild key={href}><a className="rounded-lg px-3 py-4 text-sm hover:bg-secondary" href={href}>{label}</a></SheetClose>)}
             <SheetClose asChild><Link className="rounded-lg px-3 py-4 text-sm" href="/inicio/">Ver demonstração</Link></SheetClose>
             <SheetClose asChild><Link className="rounded-lg px-3 py-4 text-sm" href="/acesso/">Simular entrada</Link></SheetClose>
           </nav>
         </SheetContent>
       </Sheet>
     </div>
   </header>
   <main id="principal">
     <section className="relative isolate min-h-[590px] overflow-hidden bg-[#171e20] text-white">
       <img alt="Famílias reunidas ao ar livre, imagem ilustrativa" src={base+"/landing/hero.webp"} className="absolute inset-0 -z-20 size-full object-cover object-center"/>
       <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#171e20]/95 via-[#171e20]/75 to-[#171e20]/20"/>
       <div className="mx-auto flex min-h-[590px] max-w-[1260px] flex-col justify-center gap-5 px-5 py-20 sm:px-8">
         <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#f2f0eb]">Marinha, Exército e Aeronáutica</p>
         <h1 className="max-w-[720px] font-serif text-[clamp(2.8rem,6vw,5.6rem)] leading-[1.05] tracking-tight">Juntos somos mais fortes.</h1>
         <p className="max-w-[600px] text-[15px] leading-relaxed text-[#f2f0eb] sm:text-lg">A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias.</p>
         <div><Go>Explorar entrada</Go></div>
         <p className="text-xs text-[#f2f0eb]">Esta é uma prévia com dados fictícios. Nenhuma conta ou verificação real é criada.</p>
       </div>
     </section>
     <section id="exemplo" className="mx-auto grid max-w-[1260px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr]">
       <div><p className="text-xs font-semibold uppercase tracking-widest text-bivaque-city">Como funciona</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">Uma pergunta, várias famílias respondendo</h2><p className="mt-4 leading-relaxed text-muted-foreground">Quem já passou por isso indica. A indicação que funcionou fica guardada para quem chegar depois.</p></div>
       <div className="space-y-4 rounded-xl border bg-card p-5 sm:p-7">
         <div className="flex flex-wrap justify-between gap-2 border-b pb-4"><Badge variant="secondary">Casa</Badge><p className="text-xs text-muted-foreground">Manaus · Adrianópolis · Conversa ilustrativa</p></div>
         {[["Marina A.","Alguém indica um eletricista de confiança aqui no bairro?"],["Paulo S.","O Sérgio, que refez a fiação aqui de casa. Pontual e cobra o combinado."],["Renata T.","Peça o orçamento por escrito. Comigo foi tranquilo."]].map(([name,message],i)=><div className="flex gap-3" key={name}><div aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{name.split(" ").map(x=>x[0]).join("")}</div><div><b className="text-sm">{name}</b><p className="mt-1 text-sm leading-relaxed">{message}</p>{i===1&&<p className="mt-1 text-xs text-muted-foreground">Marcada como útil</p>}</div></div>)}
         <p className="border-t pt-4 text-xs text-muted-foreground"><Check className="mr-1 inline size-4"/> Resolvida · Marina marcou a indicação que funcionou</p>
       </div>
     </section>
     <section id="recursos" className="bg-secondary/45"><div className="mx-auto grid max-w-[1260px] items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2">
       <div><p className="text-xs font-semibold uppercase tracking-widest text-bivaque-city">O que tem</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">O que a gente resolve junto, na sua cidade</h2><p className="mt-3 text-sm text-muted-foreground">Cada cidade constrói sua comunidade, feita de quem já passou por lá.</p><div className="mt-7 space-y-5">{features.map(x=><div className="flex gap-4" key={x.title}><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card"><x.icon className="size-5"/></span><div><h3 className="font-semibold">{x.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{x.desc}</p></div></div>)}</div></div>
       <figure className="overflow-hidden rounded-xl border bg-card"><img alt="Exemplo visual da comunidade Bivaque" src={base+"/landing/comunidade.webp"} className="w-full object-cover"/><figcaption className="px-4 py-3 text-xs text-muted-foreground">Imagem de apresentação, não dados reais da comunidade.</figcaption></figure>
     </div></section>
     <section id="mudanca" className="mx-auto grid max-w-[1260px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
       <figure className="overflow-hidden rounded-xl border bg-card"><img src={base+"/landing/encontro.webp"} className="w-full object-cover" alt="Pessoas reunidas, imagem ilustrativa"/><figcaption className="px-4 py-3 text-xs text-muted-foreground">Comunidade militar em movimento.</figcaption></figure>
       <div><p className="text-xs font-semibold uppercase tracking-widest text-bivaque-city">Mudança de cidade</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">Transferido? Chegue sabendo.</h2><p className="mt-4 leading-relaxed text-muted-foreground">Um plano para quem vai chegar ou sair, montado com o que a comunidade da cidade já sabe.</p><div className="mt-6 space-y-3">{["Moradia: bairros e imóveis indicados","Escola das crianças","Saúde e plano","A mudança, na ordem"].map(t=><p className="flex items-center gap-3 text-sm" key={t}><Check className="size-4 shrink-0"/>{t}</p>)}</div><Button asChild variant="outline" className="mt-6"><Link href="/movimentacao/">Explorar plano de mudança <ArrowRight/></Link></Button></div>
     </section>
     <section className="bg-secondary/45 py-16"><div className="mx-auto max-w-[1260px] px-5 sm:px-8"><h2 className="font-serif text-3xl">Três passos para entrar</h2><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["01","Crie sua conta","Com e-mail e senha ou com o Google no produto real."],["02","Confirme seu vínculo","Etapa oficial que esta demonstração não executa."],["03","Escolha sua cidade","Onde você mora ou para onde vai, em qualquer cidade do Brasil."]].map(([n,h,p])=><div className="rounded-xl border bg-card p-5" key={n}><span className="text-xs font-semibold text-bivaque-city">{n}</span><h3 className="mt-3 text-lg font-semibold">{h}</h3><p className="mt-2 text-sm text-muted-foreground">{p}</p></div>)}</div></div></section>
     <section id="perguntas" className="mx-auto grid max-w-[1260px] gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[.65fr_1fr]"><div><p className="text-xs font-semibold uppercase tracking-widest text-bivaque-city">Perguntas</p><h2 className="mt-4 font-serif text-3xl">Perguntas frequentes</h2><p className="mt-3 text-sm text-muted-foreground">Outra dúvida? <Link href="/ajuda/" className="font-semibold underline underline-offset-4">Consulte a Ajuda</Link>.</p></div><Accordion type="single" collapsible defaultValue="3">{faqs.map(([question,answer],i)=><AccordionItem value={String(i)} key={question}><AccordionTrigger className="text-left">{question}</AccordionTrigger><AccordionContent><p className="text-sm leading-relaxed text-muted-foreground">{answer}</p></AccordionContent></AccordionItem>)}</Accordion></section>
     <section className="bg-[#253033] px-5 py-16 text-center text-white"><h2 className="font-serif text-3xl sm:text-4xl">Entre na comunidade da sua cidade.</h2><p className="mt-3 text-white/80">Juntos somos mais fortes.</p><div className="mt-6"><Go>Explorar entrada</Go></div></section>
   </main>
   <footer className="border-t"><div className="mx-auto flex max-w-[1260px] flex-wrap items-center gap-4 px-5 py-7 text-xs text-muted-foreground sm:px-8"><div className="mr-auto flex items-center gap-2"><ShieldCheck className="size-4"/>Bivaque · Comunidade independente da família militar</div>{[["Ajuda","/ajuda/"],["Privacidade","/privacidade/"],["Código de conduta","/conduta/"],["Ver demonstração","/inicio/"]].map(([t,href])=><Link className="underline-offset-4 hover:underline" key={href} href={href}>{t}</Link>)}<span>© 2026 Bivaque</span></div></footer>
 </div>;
}
