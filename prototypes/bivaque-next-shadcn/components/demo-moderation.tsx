"use client";

import * as React from "react";
import {ShieldAlert, ClipboardCheck, AlertTriangle, ArrowRight} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";

export type DemoReport={
  id:string;
  target:string;
  title:string;
  city:string;
  reason:string;
  status:"pendente"|"removido"|"dispensado";
  createdAt:string;
  route:string;
};

const labels:Record<DemoReport["status"],string>={pendente:"Pendente",removido:"Conteúdo ocultado na demonstração",dispensado:"Dispensado"};
export function DemoModerationPage({reports,onStatus,onNavigate}:{reports:DemoReport[];onStatus:(id:string,status:DemoReport["status"])=>void;onNavigate:(to:string)=>void}){
  const [filter,setFilter]=React.useState("pendente");
  const visible=reports.filter(r=>filter==="todos"||r.status===filter);
  const pending=reports.filter(r=>r.status==="pendente").length;
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="border-b pb-5"><Badge variant="outline"><ClipboardCheck className="mr-1 size-3"/>Painel do laboratório</Badge><h1 className="mt-3 font-serif text-3xl font-medium">Fila de moderação</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Avalie denúncias locais e experimente as decisões. Nenhuma ação afeta usuários ou publicações reais.</p></header>
    <Alert><ShieldAlert className="size-4"/><AlertTitle>Sem privilégios administrativos reais</AlertTitle><AlertDescription>Esta tela é aberta no modo de teste, sem autenticação ou autorização. O painel real requer políticas de acesso, trilha de auditoria e revisão segura no backend.</AlertDescription></Alert>
    <div className="grid grid-cols-2 gap-3"><Card><CardHeader><CardDescription>Denúncias de teste</CardDescription><CardTitle className="text-3xl">{reports.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Aguardando decisão</CardDescription><CardTitle className="text-3xl">{pending}</CardTitle></CardHeader></Card></div>
    <Tabs value={filter} onValueChange={setFilter}><TabsList className="max-w-full"><TabsTrigger value="pendente">Pendentes</TabsTrigger><TabsTrigger value="todos">Todas</TabsTrigger><TabsTrigger value="removido">Ocultadas</TabsTrigger></TabsList></Tabs>
    <section className="space-y-3" aria-label="Denúncias de demonstração">{visible.length?visible.map(report=><Card key={report.id}>
      <CardHeader><div className="flex flex-wrap items-center gap-2"><Badge variant={report.status==="pendente"?"secondary":"outline"}>{labels[report.status]}</Badge><span className="text-xs text-muted-foreground">{report.city} · {report.createdAt}</span></div><CardTitle className="text-base">{report.title}</CardTitle><CardDescription>{report.reason} · {report.target}</CardDescription></CardHeader>
      <CardContent className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>onNavigate(report.route)}>Ver origem <ArrowRight className="size-4"/></Button>{report.status!=="removido"&&<Button onClick={()=>onStatus(report.id,"removido")}><AlertTriangle className="size-4"/>Ocultar no laboratório</Button>}{report.status!=="dispensado"&&<Button variant="secondary" onClick={()=>onStatus(report.id,"dispensado")}>Dispensar</Button>}{report.status!=="pendente"&&<Button variant="ghost" onClick={()=>onStatus(report.id,"pendente")}>Reabrir</Button>}</CardContent>
    </Card>):<div className="rounded-xl border border-dashed p-6"><h2 className="font-serif text-xl">Fila vazia</h2><p className="mt-2 text-sm text-muted-foreground">Para testar, abra um anúncio, negócio ou pergunta e selecione Denunciar.</p><Button variant="outline" className="mt-4" onClick={()=>onNavigate("comunidade")}>Abrir comunidade <ArrowRight className="size-4"/></Button></div>}</section>
  </div>;
}
