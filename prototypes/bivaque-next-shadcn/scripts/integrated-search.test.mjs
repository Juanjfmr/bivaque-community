import {test} from "node:test";import assert from "node:assert/strict";
import {buildSearchSections,countSearchResults,isMatch,queryWords} from "../lib/integrated-search.mjs";
const demo={
 city:"Brasília",
 items:[{id:"h1",city:"Brasília",kind:"imoveis",title:"Apartamento na Asa Norte",description:"Três quartos",meta:"Asa Norte",badge:"Aluguel",price:"R$ 3.500"}, {id:"h2",city:"Manaus",kind:"imoveis",title:"Apartamento em Manaus",description:"",meta:"Centro",badge:"Aluguel"}],
 providers:[{id:"s1",city:"Brasília",name:"Mudanças Planalto",description:"Transporte residencial",category:"Mudanças",hood:"Asa Norte",services:["Mudança"]}],
 questions:[{id:"q1",city:"Brasília",title:"Qual empresa de mudança recomendam?",author:"Carla",category:"Movimentação",answers:[{author:"Pedro",text:"A empresa oferece embalagem e seguro contra danos, confira orçamento."}]}],
 groups:[{id:"g1",city:"Brasília",name:"Famílias em Brasília",description:"Boas escolas",members:11,open:true,posts:[{text:"Indicações de creche"}]},{id:"g2",city:"Brasília",name:"Grupo reservado",description:"Mudança",members:4,open:false,posts:[{text:"informação restrita"}]}],
 events:[{id:"e1",city:"Brasília",title:"Café de boas vindas",category:"Família",place:"Parque da Cidade",when:"24 nov",description:"Encontro"}]
};
test("normalization handles accents, synonyms, stop words",()=>{assert.deepEqual(queryWords("  de MUDANÇA para a casa"),["mudanca","casa"]);assert.equal(isMatch("mecanico","oficina mecanica"),true);assert.equal(isMatch("escola integral","escolas para período integral"),true)});
test("answer-only result preserves source and snippet",()=>{const r=buildSearchSections({...demo,query:"seguro danos"});assert.equal(r.asks.length,1);assert.match(r.asks[0].snippet,/Pedro:.*seguro contra danos/);assert.equal(countSearchResults(r),1)});
test("mixed modules are city scoped and closed groups hidden",()=>{const r=buildSearchSections({...demo,query:"mudança"});assert.equal(r.items.length,0);assert.equal(r.biz.length,1);assert.equal(r.asks.length,1);assert.equal(r.groups.length,0)});
test("suggestion state on blank query is empty, not everything",()=>{assert.equal(countSearchResults(buildSearchSections({...demo,query:"  "})),0)});
test("housing, groups and events match by their own copy",()=>{const r=buildSearchSections({...demo,query:"asa norte"});assert.equal(r.items.length,1);assert.equal(r.biz.length,1);const g=buildSearchSections({...demo,query:"escolas"});assert.deepEqual(g.groups.map(x=>x.id),["g1"]);const e=buildSearchSections({...demo,query:"parque"});assert.equal(e.events.length,1)});
