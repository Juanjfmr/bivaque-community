#!/usr/bin/env node
import {scenarioInput,SCENARIOS} from './scenarios.mjs';
import {start,advance,loadState} from './runner.mjs';
import {createClient,upstreamBase} from './client.mjs';
import {renderDashboard} from './dashboard.mjs';
const [command,key,...flags] = process.argv.slice(2);
async function main() {
  if (command === 'plan') {
    for (const k of Object.keys(SCENARIOS)) {let s=await scenarioInput(k); console.log(`${k} — ${s.name} | sha256: ${s.sha256}`);}
    console.log('Somente perfis fictícios. Sem consulta ao Supabase, sem publicação de agentes e sem previsão de mercado.');
    return;
  }
  if (command === 'dashboard') {console.log('Painel local: '+await renderDashboard());return;}
  if (command === 'doctor') {
    const base = upstreamBase();
    const info = await createClient({base}).request('/health');
    if (info.service !== 'MiroFish Backend') throw new Error('O serviço local não parece ser o MiroFish.');
    console.log(`MiroFish acessível em ${base}; não foram verificados provedores externos.`);
    return;
  }
  if (!['A','B','C'].includes(key)) throw new Error('Informe cenário A, B ou C.');
  if (command === 'status') {const x=await loadState(key);console.log(x?JSON.stringify(x,null,2):'Não iniciado.');return;}
  if (command === 'start' || command === 'advance') {
    if (!flags.includes('--execute') || !flags.includes('--confirm-synthetic')) throw new Error('Esta operação pode cobrar API externa. Exige --execute --confirm-synthetic.');
    const state=command==='start'?await start(key):await advance(key);
    console.log(JSON.stringify(state,null,2));return;
  }
  throw new Error('Comandos: plan | dashboard | doctor | status A | start A --execute --confirm-synthetic | advance A --execute --confirm-synthetic');
}
main().catch(err=>{console.error(`Falha: ${err.message}`);process.exitCode=1;});
