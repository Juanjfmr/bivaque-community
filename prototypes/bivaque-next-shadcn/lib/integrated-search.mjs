/** R72-inspired, fully local demo search. Privacy: caller supplies only visible, city-scoped entities. */
const SYNONYMS={
  pediatra:"pediatria",escola:"colegio escolas educacao",colegio:"escola",
  mecanico:"mecanica oficina",eletricista:"eletrica reparos manutencao",
  diarista:"faxina limpeza",mudanca:"mudancas transporte frete",
  berco:"infantil",imovel:"apartamento casa kitnet",saude:"psicologia atendimento",
  carro:"automoveis oficina",casa:"imoveis moradia eletrica reparos",
  atleta:"esporte treino",psicologo:"psicologia psicologa"
};
export function normalize(text=""){return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
export function queryWords(query){
  return normalize(query).split(/[^a-z0-9]+/).filter(t=>t.length>1&&!["de","da","do","das","dos","em","no","na","para","com","um","uma","por","perto","pelo","pela"].includes(t));
}
export function isMatch(query,text){
  const words=queryWords(query),content=normalize(text);
  if(!words.length)return false;
  return words.every(word=>content.includes(word)||(SYNONYMS[word]||"").split(" ").some(s=>s&&content.includes(s)));
}
export function buildSearchSections({query,city,items=[],providers=[],questions=[],groups=[],events=[]}){
  const q=query.trim();
  const sections={items:[],biz:[],asks:[],groups:[],events:[]};
  if(!queryWords(q).length)return sections;
  for(const item of items){
    if(item.city!==city||item.kind==="servicos")continue;
    if(isMatch(q,[item.title,item.meta,item.description,item.badge].join(" ")))
      sections.items.push({id:item.id,title:item.title,meta:item.meta||"",type:item.kind,price:item.price||"",image:item.image||""});
  }
  for(const b of providers){
    if(b.city!==city)continue;
    if(isMatch(q,[b.name,b.category,b.description,b.hood,...b.services].join(" ")))
      sections.biz.push({id:b.id,title:b.name,meta:b.category+" · "+b.hood,image:b.image||"",type:"negocio"});
  }
  for(const ask of questions){
    if(ask.city!==city)continue;
    const direct=isMatch(q,[ask.title,ask.category,ask.author].join(" "));
    const answer=ask.answers.find(a=>isMatch(q,a.text));
    if(direct||answer){
      const snippet=!direct&&answer?answer.author+": "+answer.text.slice(0,140):"";
      sections.asks.push({id:ask.id,title:ask.title,meta:ask.category+" · "+ask.author,snippet,type:"pergunta"});
    }
  }
  for(const group of groups){
    if(group.city!==city||!group.open)continue;
    if(isMatch(q,[group.name,group.description,...group.posts.map(p=>p.text)].join(" ")))
      sections.groups.push({id:group.id,title:group.name,meta:group.members+" participantes (ilustrativo)",type:"grupo"});
  }
  for(const event of events){
    if(event.city!==city)continue;
    if(isMatch(q,[event.title,event.category,event.place,event.description].join(" ")))
      sections.events.push({id:event.id,title:event.title,meta:event.when+" · "+event.place,type:"evento"});
  }
  return sections;
}
export function countSearchResults(sections){return Object.values(sections).reduce((n,list)=>n+list.length,0);}
