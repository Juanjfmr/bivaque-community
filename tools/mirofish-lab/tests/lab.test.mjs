import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scenarioInput} from '../src/scenarios.mjs';
import {upstreamBase,createClient} from '../src/client.mjs';
import {start,advance,loadState} from '../src/runner.mjs';

test('só loopback e caminhos permitidos; SSRF remoto bloqueado', async()=>{
  for (const target of ['https://mirofish.example','http://127.0.0.1.evil.com','http://user:pw@127.0.0.1:5001','file:///etc/passwd','http://169.254.169.254']) {
    assert.throws(()=>upstreamBase(target));
  }
  assert.equal(upstreamBase('http://127.0.0.1:5001'),'http://127.0.0.1:5001');
  const client=createClient({fetchImpl:async()=>{throw new Error('não deve chamar fetch');}});
  await assert.rejects(()=>client.request('/api/private/data'),/Endpoint não autorizado/);
});

test('semente sintética, versões consistentes e distintas',async()=>{
  const a=await scenarioInput('A'), b=await scenarioInput('B'), c=await scenarioInput('C');
  assert.match(a.input,/100% FICTÍCIOS/);
  assert.notEqual(a.sha256,b.sha256);
  assert.notEqual(c.sha256,b.sha256);
  assert.match(a.requirement,/não fabrique engajamento/);
  await assert.rejects(()=>scenarioInput('D'));
});

test('fluxo completo com mock: estados assíncronos, limite de rodadas e relatório verificável',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bivaque-lab-'));
  let graphDone=false,prepDone=false,simDone=false,reportDone=false;
  const requests=[];
  const client={request:async(path,opts={})=>{
    requests.push({path,options:opts});
    if(path==='/api/graph/ontology/generate') {assert.equal(opts.form.get('files').name,'bivaque-manaus-A.md');return {project_id:'proj_1'};}
    if(path==='/api/graph/build') return {task_id:'task_graph'};
    if(path==='/api/graph/task/task_graph') return {status:graphDone?'completed':'processing'};
    if(path==='/api/graph/project/proj_1') return {graph_id:'graph_1'};
    if(path==='/api/simulation/create') return {simulation_id:'sim_1'};
    if(path==='/api/simulation/prepare') return {task_id:'task_prep'};
    if(path==='/api/simulation/prepare/status') return {status:prepDone?'ready':'processing'};
    if(path==='/api/simulation/start') {assert.equal(opts.json.max_rounds,6);assert.equal(opts.json.enable_graph_memory_update,false);assert.equal(opts.json.platform,'reddit');return {runner_status:'running'};}
    if(path==='/api/simulation/sim_1/run-status') return {runner_status:simDone?'completed':'running'};
    if(path==='/api/report/generate') return {task_id:'task_report'};
    if(path==='/api/report/generate/status') return {status:reportDone?'completed':'processing'};
    if(path==='/api/report/by-simulation/sim_1') return {report_id:'report_1',markdown_content:'# Relatório fictício\nHipóteses, não dados reais.'};
    throw new Error('Chamada inesperada: '+path);
  }};
  assert.equal((await start('A',{client,dir})).phase,'graph_wait');
  await assert.rejects(()=>start('A',{client,dir}),/já possui estado/);
  assert.equal((await advance('A',{client,dir})).phase,'graph_wait');
  graphDone=true;
  assert.equal((await advance('A',{client,dir})).phase,'prepare_wait');
  assert.equal((await advance('A',{client,dir})).phase,'prepare_wait');
  prepDone=true;
  assert.equal((await advance('A',{client,dir})).phase,'running');
  assert.equal((await advance('A',{client,dir})).phase,'running');
  simDone=true;
  assert.equal((await advance('A',{client,dir})).phase,'report_wait');
  assert.equal((await advance('A',{client,dir})).phase,'report_wait');
  reportDone=true;
  const state=await advance('A',{client,dir});
  assert.equal(state.phase,'completed');
  assert.equal(state.reportSha256.length,64);
  assert.equal((await loadState('A',dir)).phase,'completed');
  assert.match(await readFile(join(dir,'A-relatorio.md'),'utf8'),/não dados reais/);
  assert.equal((await advance('A',{client,dir})).phase,'completed');
  assert.equal(requests.filter(x=>x.path==='/api/simulation/start').length,1);
  assert.equal(requests.filter(x=>x.path==='/api/report/generate').length,1);
});

test('falhas do upstream não se tornam sucesso',async()=>{
  const client=createClient({fetchImpl:async()=>({ok:true,status:200,json:async()=>({success:false,error:'Falha sintética'})})});
  await assert.rejects(()=>client.request('/api/graph/project/list'),/Falha sintética/);
});

test('painel local escapa relatório HTML e mostra zero sem execução', async()=>{
  const {renderDashboard}=await import('../src/dashboard.mjs');
  const {writeFile}=await import('node:fs/promises');
  const dir=await mkdtemp(join(tmpdir(),'bivaque-dash-'));
  let path=await renderDashboard(dir);
  assert.match(await readFile(path,'utf8'),/0\/3/);
  await writeFile(join(dir,'A.json'),JSON.stringify({key:'A',phase:'completed',roundsCap:6}));
  await writeFile(join(dir,'A-relatorio.md'),'<script>alert(1)</script>');
  path=await renderDashboard(dir);
  const html=await readFile(path,'utf8');
  assert.match(html,/1\/3/);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});
