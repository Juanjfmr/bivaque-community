"use client";
import * as React from "react";
import {Button} from "@/components/ui/button";
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Alert,AlertDescription,AlertTitle} from "@/components/ui/alert";
import {CheckCircle2,ArrowRight} from "lucide-react";
export type SupportTicket={id:string,kind:string,text:string,date:string};
export function SupportPage({route,tickets,onTicket,onNav}:{route:"contato"|"chamados";tickets:SupportTicket[];onTicket:(t:SupportTicket)=>void;onNav:(s:string)=>void}){
 const [kind,setKind]=React.useState("Conta"),[text,setText]=React.useState(""),[sent,setSent]=React.useState(false);
 return <div className="mx-auto max-w-2xl space-y-6">
  <header className="border-b pb-5"><h1 className="font-serif text-3xl">{route==="contato"?"Fale com a gente":"Meus chamados"}</h1><p className="mt-2 text-sm text-muted-foreground">Laboratório demonstrativo: não há equipe de atendimento vinculada, nem mensagem real enviada.</p></header>
  {route==="contato"?(sent?<div className="space-y-4"><Alert><CheckCircle2/><AlertTitle>Solicitação de teste registrada</AlertTitle><AlertDescription>Ela permanece somente neste navegador.</AlertDescription></Alert><Button onClick={()=>onNav("chamados")}>Ver meus chamados <ArrowRight/></Button></div>:
   <Card><CardHeader><CardTitle>Conte sua dúvida de teste</CardTitle><CardDescription>Não digite dados pessoais ou militares.</CardDescription></CardHeader><CardContent>
     <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(text.trim().length<10)return;onTicket({id:"t-"+Date.now(),kind,text:text.trim(),date:"Agora"});setText("");setSent(true)}}>
       <div className="space-y-2"><Label htmlFor="ticket-kind">Assunto</Label><Select value={kind} onValueChange={setKind}><SelectTrigger id="ticket-kind" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{["Conta","Comunidade","Anúncios","Segurança","Outro"].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div>
       <div className="space-y-2"><Label htmlFor="ticket-text">Descrição fictícia</Label><Textarea id="ticket-text" required minLength={10} maxLength={1000} rows={5} value={text} onChange={e=>setText(e.target.value)}/></div>
       <Button type="submit" disabled={text.trim().length<10}>Registrar chamado de teste</Button>
     </form>
   </CardContent></Card>):tickets.length?<div className="space-y-3">{tickets.map(t=><Card key={t.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{t.kind}</CardTitle><Badge variant="outline">Aberto no teste</Badge></div><CardDescription>{t.date}</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm">{t.text}</p></CardContent></Card>)}</div>:<Alert><CheckCircle2/><AlertTitle>Nenhum chamado</AlertTitle><AlertDescription>Use Fale com a gente para criar um registro local de teste.</AlertDescription></Alert>}
  <div className="flex gap-2"><Button variant="outline" onClick={()=>onNav(route==="contato"?"chamados":"contato")}>{route==="contato"?"Meus chamados":"Criar chamado"} <ArrowRight/></Button><Button variant="ghost" onClick={()=>onNav("ajuda")}>Ajuda</Button></div>
 </div>;
}
