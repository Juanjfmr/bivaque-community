/**
 * Bivaque R72 unified search: deterministic, city-scoped, no network.
 * Reference: prototypes/bivaque-html/src/features/search/views.js
 * Private groups are never returned unless already joined.
 */
const STOPWORDS = new Set(["de","da","do","das","dos","em","no","na","para","com","um","uma","por","perto","que","pra"]);
const SYNONYMS = {
 dentista:["odonto","odontopediatra","odontopediatria"],pediatra:["pediatria"],escola:["colegio","escolas"],
 mecanico:["mecanica","oficina"],eletricista:["eletrica"],diarista:["faxina","limpeza"],
 mudanca:["transportadora","frete","mudanças","mudanca"],berco:["berço"],
 imovel:["apartamento","casa","imóveis"],saude:["odontopediatria","pediatra","clinica"],
 pets:["veterinario","veterinaria"],climatizacao:["ar condicionado","split"],
 carro:["mecanica","oficina","despachante"],casa:["eletrica","limpeza","reparos"],aula:["aulas","reforco"]
};
export const norm = value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export const queryTerms = q=>norm(q).split(/[^a-z0-9]+/).filter(x=>x.length>1&&!STOPWORDS.has(x));
export function matchesSearch(query,text){
 const terms=queryTerms(query);if(!terms.length)return true;
 const hay=norm(text);
 return terms.every(t=>hay.includes(t)||(SYNONYMS[t]||[]).some(s=>hay.includes(norm(s))));
}
const textOf=(...x)=>x.flat(Infinity).filter(v=>v!==undefined&&v!==null).join(" ");
export function unifiedResults({city,query,items=[],questions=[],groups=[],events=[],posts=[],replies={},joined=[]}){
 const foundItems=items.filter(v=>v.city===city&&matchesSearch(query,textOf(v.title,v.description,v.meta,v.badge)));
 const biz=foundItems.filter(v=>v.kind==="servicos");
 const announcements=foundItems.filter(v=>v.kind==="imoveis"||v.kind==="desapegos");
 const askMatches=[...questions.filter(v=>v.city===city),...posts.filter(p=>p.kind==="Pergunta"&&(p.city===city||!p.city)).map(p=>({id:p.id,title:p.title,author:"Você",category:"Pergunta",city,date:"Agora",answers:[],description:p.detail}))].flatMap(q=>{
   const answerTexts=[...(q.answers||[]).map(a=>({author:a.author,text:a.text,date:a.date})),...(replies[q.id]||[]).map(text=>({author:"Você",text,date:"Agora"}))];
   if(!matchesSearch(query,textOf(q.title,q.category,q.description,answerTexts.map(x=>x.text))))return[];
   const viaAnswer=!matchesSearch(query,textOf(q.title,q.category,q.description));
   const answer=viaAnswer?answerTexts.find(a=>matchesSearch(query,a.text)):null;
   return [{...q,answerCount:answerTexts.length,viaAnswer,snippet:answer?{author:answer.author,text:answer.text.slice(0,165)}:null}];
 });
 const groupMatches=groups.filter(g=>g.city===city&&(g.open||joined.includes(g.id))&&matchesSearch(query,textOf(g.name,g.description,g.open?g.posts?.map(p=>p.text):joined.includes(g.id)?g.posts?.map(p=>p.text):[])));
 const eventMatches=events.filter(e=>e.city===city&&matchesSearch(query,textOf(e.title,e.description,e.place,e.category)));
 return {items:announcements,biz,asks:askMatches,groups:groupMatches,events:eventMatches};
}
export const GROUP_DEFS=[
 {key:"items",title:"Anúncios",noun:"anúncios",cap:4},
 {key:"biz",title:"Negócios",noun:"negócios",cap:4},
 {key:"asks",title:"Indicações e respostas",noun:"indicações",cap:5},
 {key:"groups",title:"Grupos",noun:"grupos",cap:5},
 {key:"events",title:"Encontros",noun:"encontros",cap:5}
];
export function totalResults(results,tab="all"){
 return GROUP_DEFS.filter(x=>tab==="all"||tab===x.key).reduce((sum,x)=>sum+results[x.key].length,0);
}
export function suggestions(q,universe,max=3){
 const typed=norm(q);
 if(typed.length<2)return[];
 const seen=new Set();
 return universe.filter(w=>{
   const n=norm(w);if(!n||n===typed||seen.has(n))return false;seen.add(n);
   return n.startsWith(typed)||n.split(/\s+/).some(word=>word.startsWith(typed));
 }).slice(0,max);
}
