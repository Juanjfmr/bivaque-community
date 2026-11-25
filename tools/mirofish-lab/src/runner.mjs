import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scenarioInput} from './scenarios.mjs';
import {createClient} from './client.mjs';
import {createHash} from 'node:crypto';

export const RUN_DIR = fileURLToPath(new URL('../runs/', import.meta.url));
const TERMINAL_TASK = new Set(['completed', 'failed']);
export const VALID_PHASES = new Set(['graph_wait','prepare_wait','running','report_wait','completed','failed']);
function statePath(key, dir) {return join(dir, `${key}.json`);}
function safeId(id) {if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Identificador inesperado do MiroFish.'); return id;}
function taskResult(data) {if (data?.status === 'failed') throw new Error('Etapa remota falhou; consulte logs do MiroFish local.'); return data?.status === 'completed' || data?.status === 'ready';}

export async function loadState(key, dir = RUN_DIR) {
  if (!['A','B','C'].includes(key)) throw new Error('Cenário inválido.');
  let content;
  try {content = await readFile(statePath(key, dir), 'utf8');}
  catch (err) {if (err.code === 'ENOENT') return null; throw err;}
  const state = JSON.parse(content);
  if (state.key !== key || !VALID_PHASES.has(state.phase)) throw new Error('Estado local inválido.');
  return state;
}
export async function saveState(state, dir = RUN_DIR) {
  await mkdir(dir, {recursive:true, mode:0o700});
  const f = statePath(state.key, dir);
  const tmp = `${f}.${process.pid}.tmp`;
  state.updatedAt = new Date().toISOString();
  await writeFile(tmp, JSON.stringify(state,null,2)+'\n', {mode:0o600, flag:'wx'});
  await rename(tmp, f);
  return state;
}

export async function start(key, {client = createClient(), dir = RUN_DIR} = {}) {
  if (await loadState(key, dir)) throw new Error('Este cenário já possui estado local. Continue com advance; não reinicie por cima.');
  const scenario = await scenarioInput(key);
  const body = new FormData();
  body.set('files', new Blob([scenario.input], {type:'text/markdown'}), `bivaque-manaus-${key}.md`);
  body.set('simulation_requirement', scenario.requirement);
  body.set('project_name', `Bivaque Laboratório Manaus — ${key}`);
  body.set('additional_context', 'Conteúdo inteiramente sintético; não usar pessoas, posts ou dados reais.');
  const project = await client.request('/api/graph/ontology/generate', {method:'POST',form:body});
  const projectId = safeId(project.project_id);
  const graph = await client.request('/api/graph/build', {method:'POST', json:{project_id:projectId, chunk_size:500, chunk_overlap:50}});
  const state = {key, scenario:scenario.name, inputSha256:scenario.sha256, projectId, graphTaskId:safeId(graph.task_id), phase:'graph_wait', roundsCap:6, memoryUpdate:false, syntheticOnly:true, createdAt:new Date().toISOString()};
  return saveState(state, dir);
}

export async function advance(key, {client = createClient(), dir = RUN_DIR} = {}) {
  const state = await loadState(key, dir);
  if (!state) throw new Error('Cenário não iniciado. Execute start antes.');
  if (state.phase === 'completed' || state.phase === 'failed') return state;
  // State changes are persisted only after remote success; if response is lost, inspect upstream before retrying a write.
  if (state.phase === 'graph_wait') {
    const task = await client.request(`/api/graph/task/${safeId(state.graphTaskId)}`);
    if (!taskResult(task)) return state;
    const project = await client.request(`/api/graph/project/${safeId(state.projectId)}`);
    state.graphId = safeId(project.graph_id);
    const sim = await client.request('/api/simulation/create', {method:'POST',json:{project_id:state.projectId,graph_id:state.graphId,enable_twitter:false,enable_reddit:true}});
    state.simulationId = safeId(sim.simulation_id);
    const prepare = await client.request('/api/simulation/prepare',{method:'POST',json:{simulation_id:state.simulationId,parallel_profile_count:2,use_llm_for_profiles:true}});
    state.prepareTaskId = prepare.task_id ? safeId(prepare.task_id) : null;
    state.phase='prepare_wait';
  } else if (state.phase === 'prepare_wait') {
    const prepared = await client.request('/api/simulation/prepare/status',{method:'POST',json:{task_id:state.prepareTaskId, simulation_id:safeId(state.simulationId)}});
    if (!taskResult(prepared)) return state;
    await client.request('/api/simulation/start',{method:'POST',json:{simulation_id:state.simulationId,platform:'reddit',max_rounds:state.roundsCap,enable_graph_memory_update:false,force:false}});
    state.phase='running';
  } else if (state.phase === 'running') {
    const run = await client.request(`/api/simulation/${safeId(state.simulationId)}/run-status`);
    if (run.runner_status === 'failed') throw new Error('Simulação remota falhou.');
    if (!['completed','stopped'].includes(run.runner_status)) return state;
    const result = await client.request('/api/report/generate',{method:'POST',json:{simulation_id:state.simulationId,force_regenerate:false}});
    state.reportTaskId = result.task_id ? safeId(result.task_id) : null;
    state.phase='report_wait';
  } else if (state.phase === 'report_wait') {
    const progress = await client.request('/api/report/generate/status',{method:'POST',json:{task_id:state.reportTaskId,simulation_id:safeId(state.simulationId)}});
    if (!taskResult(progress)) return state;
    const report = await client.request(`/api/report/by-simulation/${safeId(state.simulationId)}`);
    const content = report.markdown_content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Relatório remoto vazio; não marcar concluído.');
    const hash = createHash('sha256').update(content).digest('hex');
    await mkdir(dir,{recursive:true,mode:0o700});
    await writeFile(join(dir,`${key}-relatorio.md`), content, {mode:0o600});
    state.reportId=safeId(report.report_id);
    state.reportSha256=hash;
    state.phase='completed';
  }
  return saveState(state, dir);
}
