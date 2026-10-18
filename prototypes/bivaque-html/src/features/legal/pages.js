// Rodada 58 (A4 da auditoria funcional): Política de privacidade e Código de conduta legíveis. O
// cadastro exige aceitar os dois; agora os nomes no aceite abrem a página e voltam ao mesmo passo.
// As rotas `privacidade` e `conduta` abrem para quem saiu (com o visual da entrada) e para quem
// entrou (com a barra do app). Texto de versão de teste: a versão final é do jurídico.
const LEGAL_VERSION='18/10/2026',LEGAL_ROUTES=['privacidade','conduta'];
const LEGAL_DOCS={
 privacidade:{title:'Política de privacidade',sections:[
  ['O que guardamos','Seu nome, e-mail, cidade e o que você publica. O CPF serve só para confirmar o vínculo e não fica salvo.'],
  ['Quem vê','Só membros confirmados da família militar. Seu bairro só aparece se você permitir.'],
  ['Seus direitos','Ver, corrigir ou apagar seus dados a qualquer momento, em Configurações.'],
  ['Neste teste','Tudo o que você digita fica só neste aparelho. Nenhuma mensagem sai dele.']]},
 conduta:{title:'Código de conduta',sections:[
  ['Respeito','Trate cada pessoa com educação. Discordar é normal; ofender, ameaçar ou perseguir não é.'],
  ['Nada de discriminação','Não são aceitos preconceito de origem, cor, religião, gênero, orientação ou condição da família.'],
  ['Dados de outras pessoas','Não publique endereço, telefone, CPF, documentos ou fotos de outras pessoas sem a permissão delas. Isso vale também para crianças.'],
  ['Comércio honesto','Anuncie só o que você pode entregar, com preço e estado reais. Valores e pagamento são combinados entre vocês; o Bivaque não intermedeia pagamento.'],
  ['Como denunciar','Use Denunciar no menu do conteúdo. A equipe analisa e pode remover o conteúdo ou limitar a conta.']]}
};
const legalRoute=()=>LEGAL_ROUTES.includes(route.name);
// Quem saiu lê as páginas com o visual da entrada, sem a barra do app.
const entryChrome=()=>route.name==='entrar'||((legalRoute()||supportRoute())&&!!state.signedOut);
// O que a pessoa digitou na entrada fica só na memória enquanto ela lê o documento. Nada vai para o
// armazenamento; a senha é descartada assim que ela sai da leitura.
var entryDraft=null;
const ENTRY_DRAFT_FIELDS=['en-name','en-email','en-pass','en-pass-login','en-code'];
function entryDraftSave(){
 if(route.name!=='entrar')return;const fields={};
 for(const id of ENTRY_DRAFT_FIELDS){const f=$('#'+id);if(f&&!f.readOnly)fields[id]=f.value||'';}
 entryDraft={id:route.id,fields,consent:!!$('#en-consent')?.checked};
}
function entryDraftRestore(){
 const d=entryDraft;if(!d)return;entryDraft=null;if(route.name!=='entrar'||route.id!==d.id)return;
 for(const [id,v] of Object.entries(d.fields)){const f=$('#'+id);if(f&&v)f.value=v;}
 const c=$('#en-consent');if(c)c.checked=d.consent;
}
function entryDraftPrune(){if(entryDraft&&route.name!=='entrar'&&!legalRoute())entryDraft=null;}
function legalLink(kind){return `<button type="button" class="en-inline" data-action="open-legal" data-value="${kind}">${esc(LEGAL_DOCS[kind].title)}</button>`;}
// "Li e aceito a Política de privacidade e o Código de conduta" com os dois nomes como links.
const legalConsentText=()=>`Li e aceito a ${legalLink('privacidade')} e o ${legalLink('conduta')}`;
function renderLegal(){
 const d=LEGAL_DOCS[route.name],body=`<p class="small muted">Versão de teste · ${LEGAL_VERSION}</p>${d.sections.map(([h,t])=>`<h2 class="legal-h">${esc(h)}</h2><p class="legal-p">${esc(t)}</p>`).join('')}<p class="legal-p muted">${route.name==='privacidade'?legalLink('conduta'):legalLink('privacidade')}</p>`;
 if(state.signedOut)return `<div class="en en-form legal-doc"><header class="en-top">${iconBtn('arrow_back','back','','Voltar')}<span class="en-mark" aria-hidden="true">B</span><span class="en-brand">Bivaque</span></header><h1 class="en-h1" tabindex="-1">${esc(d.title)}</h1>${body}</div>`;
 return `<article class="legal-doc"><div class="page-head"><h1>${esc(d.title)}</h1></div>${body}</article>`;
}
async function legalAction(action,value){
 if(action!=='open-legal'||!LEGAL_ROUTES.includes(value))return false;
 entryDraftSave();if(dialog.open)await closeDialog(true);navigate(value);return true;
}
