"use client";
import * as React from "react";
import {HOUSING} from "@/components/modules/fixtures";
import {Card,CardContent,CardHeader,CardTitle,CardDescription,CardFooter} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Table,TableHeader,TableHead,TableBody,TableCell,TableRow} from "@/components/ui/table";
import {ArrowRight,Trash2,Bell,Building2} from "lucide-react";
export type SearchAlert={id:string;kind:string;city:string;query:string;created:string};
const money=(x:number)=>x.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
export function HousingCompare({saved,onNavigate,onRemove}:{saved:string[];onNavigate:(route:string)=>void;onRemove:(id:string)=>void}){
 const homes=HOUSING.filter(x=>saved.includes(x.id)).slice(0,3);
 return <div className="space-y-5"><header className="border-b pb-5"><h1 className="font-serif text-3xl">Comparar imóveis salvos</h1><p className="mt-2 text-sm text-muted-foreground">Compare até três moradias de demonstração. Não são anúncios, coordenadas nem custos reais.</p></header>
 {homes.length<2?<Card><CardHeader><CardTitle>Salve pelo menos dois imóveis</CardTitle><CardDescription>Abra Imóveis e selecione o ícone de coração em duas ou mais fichas.</CardDescription></CardHeader><CardFooter><Button onClick={()=>onNavigate("imoveis")}>Explorar imóveis <ArrowRight/></Button></CardFooter></Card>:
 <div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead className="min-w-[130px]">Critério</TableHead>{homes.map(h=><TableHead key={h.id} className="min-w-[185px] whitespace-normal"><button className="text-left text-sm font-semibold underline-offset-2 hover:underline" onClick={()=>onNavigate("anuncio/"+h.id)}>{h.title}</button></TableHead>)}</TableRow></TableHeader><TableBody>{[
 ["Preço anunciado",(h:(typeof homes)[number])=>h.priceLabel],
 ["Condomínio",(h:(typeof homes)[number])=>h.condo?money(h.condo):"Não informado"],
 ["Total mensal",(h:(typeof homes)[number])=>h.type==="Aluguel"?money(h.price+(h.condo||0)):"Venda"],
 ["Localidade",(h:(typeof homes)[number])=>h.hood],
 ["Área",(h:(typeof homes)[number])=>h.area+" m²"],
 ["Quartos",(h:(typeof homes)[number])=>String(h.bedrooms)],
 ["Vagas",(h:(typeof homes)[number])=>String(h.parking)],
 ["Pets",(h:(typeof homes)[number])=>h.pets?"Aceita":"A consultar"],
 ["Mobiliado",(h:(typeof homes)[number])=>h.furnished?"Sim":"Não"],
 ["OM declarada",(h:(typeof homes)[number])=>h.om]
 ].map(([name,fn])=><TableRow key={name as string}><TableCell className="font-semibold">{name as string}</TableCell>{homes.map(h=><TableCell key={h.id} className="text-xs">{(fn as (home:typeof h)=>string)(h)}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
 <div className="flex flex-wrap gap-2">{homes.map(h=><Button variant="outline" size="sm" key={h.id} onClick={()=>onRemove(h.id)}><Trash2 className="size-4"/> Remover {h.hood}</Button>)}</div>
 <Badge variant="outline">Sem distância até OM homologada</Badge></div>
}
export function SearchAlertsPage({alerts,onDelete,onNavigate}:{alerts:SearchAlert[];onDelete:(id:string)=>void;onNavigate:(route:string)=>void}){
 return <div className="space-y-5"><header className="border-b pb-5"><h1 className="font-serif text-3xl">Buscas salvas</h1><p className="mt-2 text-sm text-muted-foreground">São lembretes de filtros no navegador. Não enviam e-mail, push nem vigiam anúncios reais.</p></header>
 {alerts.length?<div className="grid gap-3 sm:grid-cols-2">{alerts.map(a=><Card key={a.id}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4"/>{a.kind==="imoveis"?"Imóveis":a.kind==="desapegos"?"Desapegos":"Serviços"} · {a.city}</CardTitle><CardDescription>{a.query||"Todos os resultados da cidade"} · Criado {a.created}</CardDescription></CardHeader><CardFooter><Button variant="outline" size="sm" onClick={()=>onNavigate(a.kind)}>Abrir categoria <ArrowRight/></Button><Button variant="ghost" size="sm" onClick={()=>onDelete(a.id)}>Excluir alerta</Button></CardFooter></Card>)}</div>:<Card><CardHeader><Building2 className="size-6"/><CardTitle>Nenhuma busca salva</CardTitle><CardDescription>Nos módulos Imóveis ou Desapegos, selecione Salvar busca para guardar seus critérios demonstrativos.</CardDescription></CardHeader><CardFooter><Button onClick={()=>onNavigate("imoveis")}>Explorar imóveis <ArrowRight/></Button></CardFooter></Card>}
 </div>
}
