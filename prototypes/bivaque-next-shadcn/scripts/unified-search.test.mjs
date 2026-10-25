import { test } from "node:test";
import assert from "node:assert/strict";
import {unifiedResults,totalResults,norm,matchesSearch,suggestions} from "../lib/unified-search.mjs";
const b={id:"a",city:"Brasília",kind:"desapegos",title:"Berço infantil",description:"Retirada em Asa Sul",meta:"Asa Sul"};
const m={id:"m",city:"Manaus",kind:"desapegos",title:"Berço Manaus",description:"",meta:"Centro"};
const svc={id:"s",city:"Brasília",kind:"servicos",title:"Oficina Mecânica",description:"Conserto de carros",meta:"Guará"};
const q={id:"q",city:"Brasília",title:"Indicação de escola",author:"R.",category:"Educação",answers:[{author:"A.",text:"A escola Arco-Íris foi excelente para as crianças.",date:"Agora"}]};
const restricted={id:"g2",city:"Brasília",name:"Grupo restrito",description:"Informação reservada",open:false,posts:[{text:"Mensagem privada"}]};
const open={id:"g1",city:"Brasília",name:"Famílias da Asa Sul",description:"Comunidade local",open:true,posts:[]};
const e={id:"e",city:"Brasília",title:"Encontro de famílias",place:"Parque da Cidade",description:"Reunião local"};
const input={city:"Brasília",items:[b,m,svc],questions:[q],groups:[restricted,open],events:[e],joined:[],replies:{}};
test("accent folding & R72 synonym matching",()=>{
 assert.equal(norm("Mecânico"),"mecanico");
 assert.equal(matchesSearch("berco","Berço infantil"),true);
 assert.equal(matchesSearch("mecanico","Oficina de mecânica"),true);
 assert.equal(matchesSearch("mudanca","Frete de móveis"),true);
});
test("never leak other city's listings or private groups",()=>{
 const r=unifiedResults({...input,query:""});
 assert.equal(r.items.length,1);
 assert.equal(r.biz.length,1);
 assert.deepEqual(r.groups.map(x=>x.id),["g1"]);
 assert.equal(totalResults(r),5);
 const restrictedHit=unifiedResults({...input,query:"restrito"});
 assert.equal(restrictedHit.groups.length,0);
 const joined=unifiedResults({...input,query:"restrito",joined:["g2"]});
 assert.equal(joined.groups.length,1);
});
test("find question by response and provide snippet and author",()=>{
 const hit=unifiedResults({...input,query:"arco iris"});
 assert.equal(hit.asks.length,1);
 assert.equal(hit.asks[0].viaAnswer,true);
 assert.equal(hit.asks[0].snippet.author,"A.");
});
test("scope counts and local replies are searchable",()=>{
 let r=unifiedResults({...input,query:"parque"});
 assert.equal(totalResults(r),1); assert.equal(totalResults(r,"events"),1);
 r=unifiedResults({...input,query:"documentação",replies:{q:["Documentação pessoal e carteirinha escolar"]}});
 assert.equal(r.asks[0].snippet.author,"Você");
});
test("suggestions are normalized without duplicating typed term",()=>{
 assert.deepEqual(suggestions("mud",["mudança","MUDANÇA","mudar","casa"],3),["mudança","mudar"]);
});
