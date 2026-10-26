"use client";

import * as React from "react";
import {ShieldCheck, ShieldAlert, ArrowRight, CheckCircle2, UserRound, LockKeyhole, RotateCcw} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Progress} from "@/components/ui/progress";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

export type DemoEnrollment={
  stage:"visitante"|"cadastro"|"analise"|"aprovado-demo";
  persona:"militar"|"veterano"|"familiar";
  nickname:string;
};

export const INITIAL_DEMO_ENROLLMENT:DemoEnrollment={stage:"visitante",persona:"militar",nickname:""};
const steps=[
  {id:"visitante",name:"Entrar"},
  {id:"cadastro",name:"Perfil"},
  {id:"analise",name:"Análise"},
  {id:"aprovado-demo",name:"Teste"},
] as const;
const stages:DemoEnrollment["stage"][]=steps.map(x=>x.id);

export function DemoAccessPage({account,onChange,onNavigate}:{account:DemoEnrollment;onChange:(value:DemoEnrollment)=>void;onNavigate:(to:string)=>void}){
  const [alias,setAlias]=React.useState(account.nickname);
  React.useEffect(()=>setAlias(account.nickname),[account.nickname]);
  const stage=stages.includes(account.stage)?account.stage:"visitante";
  const position=stages.indexOf(stage)+1;
  return <div className="mx-auto max-w-3xl space-y-6">
    <header className="space-y-3 border-b pb-5">
      <Badge variant="outline"><LockKeyhole className="mr-1 size-3"/>Laboratório de entrada</Badge>
      <h1 className="font-serif text-3xl font-medium tracking-tight">Entrada na comunidade</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Explore as etapas de ingresso do Bivaque, sem coletar credenciais ou documentos.</p>
    </header>
    <Alert><ShieldAlert className="size-4"/><AlertTitle>Simulação, não autenticação</AlertTitle><AlertDescription>Não informe CPF, e-mail, senha, nome verdadeiro nem envie documento. Nenhum vínculo militar será conferido e nenhum acesso real será concedido. Os dados de exemplo ficam somente neste navegador.</AlertDescription></Alert>
    <div className="space-y-3"><div className="grid grid-cols-4 gap-1 text-center text-[11px] text-muted-foreground">{steps.map((x,i)=><span className={i===position-1?"font-semibold text-foreground":""} key={x.id}>{x.name}</span>)}</div><Progress value={position/steps.length*100}/></div>
    {stage==="visitante"&&<Card>
      <CardHeader><CardTitle>Uma comunidade que acompanha a vida militar</CardTitle><CardDescription>O produto real exige verificação de elegibilidade. Aqui você escolhe apenas um fluxo fictício.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Simule o onboarding de militar, veterano ou familiar e veja como o estado de análise apareceria.</p><Button className="w-full sm:w-auto" onClick={()=>onChange({...account,stage:"cadastro"})}>Começar demonstração <ArrowRight className="size-4"/></Button></CardContent>
    </Card>}
    {stage==="cadastro"&&<Card>
      <CardHeader><CardTitle>Perfil demonstrativo</CardTitle><CardDescription>Use um apelido fictício; não há conta nem cadastro real.</CardDescription></CardHeader>
      <CardContent><form className="space-y-5" onSubmit={e=>{e.preventDefault();if(alias.trim().length<2)return;onChange({...account,nickname:alias.trim(),stage:"analise"});}}>
        <div className="space-y-2"><Label htmlFor="demo-persona">Como deseja explorar?</Label><Select value={account.persona} onValueChange={v=>onChange({...account,persona:v as DemoEnrollment["persona"]})}><SelectTrigger id="demo-persona" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="militar">Militar da ativa (fictício)</SelectItem><SelectItem value="veterano">Veterano (fictício)</SelectItem><SelectItem value="familiar">Familiar (fictício)</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="demo-alias">Apelido fictício</Label><Input id="demo-alias" placeholder="Ex.: Pessoa de teste" required minLength={2} maxLength={40} autoComplete="off" value={alias} onChange={e=>setAlias(e.target.value)}/></div>
        <Alert><UserRound className="size-4"/><AlertTitle>Sem coleta de identidade</AlertTitle><AlertDescription>O fluxo real prevê verificação militar, mas esta prévia não aceita documentos, convites nem informações pessoais.</AlertDescription></Alert>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={alias.trim().length<2}>Enviar perfil fictício para análise <ArrowRight className="size-4"/></Button><Button type="button" variant="outline" onClick={()=>onChange({...account,stage:"visitante"})}>Voltar</Button></div>
      </form></CardContent>
    </Card>}
    {stage==="analise"&&<Card>
      <CardHeader><CardTitle>Perfil em análise simulada</CardTitle><CardDescription>Nenhum documento ou pedido foi enviado a um servidor.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3"><ShieldCheck className="size-7 text-muted-foreground"/><span><strong className="block text-sm">{account.nickname}</strong><span className="text-xs text-muted-foreground">Persona: {account.persona} · Status: análise fictícia</span></span></div>
        <p className="text-sm text-muted-foreground">Em uma implementação real, o estado depende de uma revisão autorizada. Para verificar apenas o desenho da próxima etapa, use a ação de laboratório.</p>
        <div className="flex flex-wrap gap-2"><Button onClick={()=>onChange({...account,stage:"aprovado-demo"})}>Simular aprovação <ArrowRight className="size-4"/></Button><Button variant="outline" onClick={()=>onChange({...account,stage:"cadastro"})}>Editar perfil</Button></div>
      </CardContent>
    </Card>}
    {stage==="aprovado-demo"&&<Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5"/> Aprovação fictícia concluída</CardTitle><CardDescription>O selo abaixo é apenas um estado de teste e não representa credencial ou elegibilidade real.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><Badge variant="secondary">Perfil de teste · acesso não verificado</Badge><p className="text-sm text-muted-foreground">As telas de comunidade e anúncios continuam demonstrativas. Nenhuma área restrita foi liberada por esta simulação.</p><Button onClick={()=>onNavigate("inicio")}>Explorar a prévia <ArrowRight className="size-4"/></Button></CardContent>
    </Card>}
    {stage!=="visitante"&&<Button variant="ghost" onClick={()=>{setAlias("");onChange(INITIAL_DEMO_ENROLLMENT);}}><RotateCcw className="size-4"/> Reiniciar demonstração de acesso</Button>}
  </div>;
}
