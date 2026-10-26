// Real Chromium smoke tests and visual captures for the isolated shadcn branch.
// R72 remains the visual authority; these screenshots are for manual comparison.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = "http://127.0.0.1:4173/bivaque-community/";
const output = "qa-artifacts";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [375, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({viewport:{width,height:850},colorScheme:theme,deviceScaleFactor:1});
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(url + "inicio/", {waitUntil:"domcontentloaded"});
      await page.getByRole("heading",{name:/O que você precisa em/}).waitFor({timeout:20000});
      await page.waitForTimeout(300);
      const metrics=await page.evaluate(()=>({w:window.innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.w+2, "Horizontal overflow "+width+"/"+theme+" "+JSON.stringify(metrics));
      assert.deepEqual(errors,[],"JavaScript page errors in "+width+"/"+theme);
      const nav=page.getByRole("navigation",{name:"Navegação principal mobile"});
      assert.equal(await nav.isVisible(),width<720,"Unexpected bottom nav at "+width);
      if(width<720)assert.equal(await nav.getByRole("button",{name:"Abrir menu Criar"}).isVisible(),true);
      await page.screenshot({path:output+"/inicio-"+width+"-"+theme+".png",fullPage:true,animations:"disabled"});
      if(width===375||width===1440){
        for(const module of ["imoveis","comunidade","servicos"]){
          await page.goto(url+module+"/",{waitUntil:"domcontentloaded"});
          await page.locator("h1").first().waitFor({timeout:15000});
          await page.screenshot({path:output+"/"+module+"-"+width+"-"+theme+".png",fullPage:true,animations:"disabled"});
        }
      }
      results.push({width,theme,overflow:metrics.scroll-metrics.w,jsErrors:errors.length});
      await context.close();
    }
  }
  // Browser flows rather than source-only checks.
  const context=await browser.newContext({viewport:{width:375,height:850},colorScheme:"light"});
  const page=await context.newPage();
  const failures=[];
  page.on("pageerror",err=>failures.push(err.message));
  await page.goto(url+"inicio/",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:/O que você precisa em/}).waitFor();
  await page.getByRole("navigation",{name:"Navegação principal mobile"}).getByRole("button",{name:"Abrir menu Criar"}).click();
  await page.getByRole("menuitem",{name:/Anunciar moradia/}).click();
  await page.locator("#post-title").fill("Moradia de teste QA");
  await page.locator("#post-desc").fill("Rascunho de exemplo para verificar a persistência local.");
  await page.getByRole("button",{name:"Salvar demonstração"}).click();
  await page.goto(url+"imoveis/",{waitUntil:"domcontentloaded"});
  await page.getByText("Moradia de teste QA").waitFor({timeout:10000});
  // The search must find community groups, not just classified ads.
  await page.goto(url+"busca/",{waitUntil:"domcontentloaded"});
  await page.locator("#global-search").fill("Famílias militares em Brasília");
  await page.getByRole("button",{name:/Famílias militares em Brasília/}).waitFor();
  // Switching city cannot preserve filter data nor expose the Brasília guide.
  await page.locator('[data-slot="select-trigger"][aria-label="Selecionar cidade"]').click();
  await page.getByRole("option",{name:"Manaus"}).click();
  await page.goto(url+"guia/",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"Guia de Manaus em preparação"}).waitFor();
  assert.equal(await page.getByText("Considere Asa Norte").count(),0);
  assert.deepEqual(failures,[],"Browser flow JS failures");
  await page.screenshot({path:output+"/guia-manaus-empty-375.png",fullPage:true});
  await context.close();
  // P1 journeys: no credentials, documents or backend calls.
  const p1Context=await browser.newContext({viewport:{width:375,height:850},colorScheme:"light"});
  const p1=await p1Context.newPage();
  const p1Errors=[];
  p1.on("pageerror",error=>p1Errors.push(error.message));
  await p1.goto(url+"acesso/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Entrada na comunidade"}).waitFor();
  await p1.getByRole("button",{name:/Começar demonstração/}).click();
  await p1.locator("#demo-alias").fill("Pessoa de teste");
  await p1.getByRole("button",{name:/Enviar perfil fictício para análise/}).click();
  await p1.getByText("Perfil em análise simulada",{exact:true}).waitFor();
  await p1.getByRole("button",{name:/Simular aprovação/}).click();
  await p1.getByText("Aprovação fictícia concluída",{exact:true}).waitFor();
  await p1.screenshot({path:output+"/acesso-375-light.png",fullPage:true,animations:"disabled"});

  await p1.goto(url+"inicio/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("navigation",{name:"Navegação principal mobile"}).getByRole("button",{name:"Abrir menu Criar"}).click();
  await p1.getByRole("menuitem",{name:/Anunciar moradia/}).click();
  await p1.locator("#post-title").fill("Moradia de teste P1");
  await p1.locator("#post-desc").fill("Texto fictício para validar os controles de edição e pausa.");
  await p1.getByRole("button",{name:"Salvar demonstração"}).click();
  await p1.goto(url+"imoveis/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Editar"}).first().click();
  await p1.locator("#post-title").fill("Moradia editada P1");
  await p1.getByRole("button",{name:"Salvar alterações"}).click();
  await p1.getByText("Moradia editada P1").waitFor();
  await p1.getByRole("button",{name:"Pausar"}).first().click();
  await p1.getByText("Pausado",{exact:true}).waitFor();
  await p1.getByRole("button",{name:"Retomar"}).first().click();
  await p1.getByText("Ativo no teste",{exact:true}).waitFor();

  await p1.goto(url+"pergunta/q2/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Denunciar"}).click();
  await p1.getByRole("button",{name:"Registrar denúncia de teste"}).click();
  await p1.goto(url+"painel/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Fila de moderação"}).waitFor();
  await p1.getByRole("button",{name:"Ocultar no laboratório"}).first().click();
  await p1.screenshot({path:output+"/painel-375-light.png",fullPage:true,animations:"disabled"});
  await p1.goto(url+"pergunta/q2/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Conteúdo ocultado na demonstração"}).waitFor();
  await p1.getByRole("button",{name:"Revisar no painel"}).click();
  await p1.getByRole("tab",{name:"Todas"}).click();
  await p1.getByRole("button",{name:"Reabrir"}).click();
  await p1.goto(url+"pergunta/q2/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Denunciar"}).waitFor();

  // P2: open and restricted groups, local posts, moderation by post and accurate area tools.
  await p1.goto(url+"grupo/g1/",{waitUntil:"domcontentloaded"});
  await p1.locator("#group-message").fill("Experiência de teste sobre moradia e mudança, apenas para a demonstração.");
  await p1.getByRole("button",{name:"Publicar no grupo"}).click();
  const localPost=p1.locator("article").filter({hasText:"Experiência de teste sobre moradia e mudança"}).first();
  await localPost.waitFor();
  await localPost.getByRole("button",{name:/curtidas fictícias/}).click();
  await localPost.getByRole("textbox",{name:"Comentar publicação de Você"}).fill("Comentário de teste sem dados reais.");
  await localPost.getByRole("button",{name:"Enviar comentário"}).click();
  await localPost.getByText("Comentário de teste sem dados reais.").waitFor();
  await p1.screenshot({path:output+"/grupo-375-light.png",fullPage:true,animations:"disabled"});
  await localPost.getByRole("button",{name:"Denunciar"}).click();
  await p1.getByRole("button",{name:"Registrar denúncia de teste"}).click();
  await p1.goto(url+"painel/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Ocultar no laboratório"}).first().click();
  await p1.goto(url+"grupo/g1/",{waitUntil:"domcontentloaded"});
  assert.equal(await p1.getByText("Experiência de teste sobre moradia e mudança, apenas para a demonstração.").count(),0,"Reported group post must be hidden locally");
  await p1.goto(url+"grupo/g3/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Solicitar acesso"}).click();
  await p1.getByRole("button",{name:"Cancelar solicitação"}).waitFor();
  await p1.reload();
  await p1.getByRole("button",{name:"Cancelar solicitação"}).waitFor();
  await p1.getByRole("button",{name:"Cancelar solicitação"}).click();
  await p1.getByRole("button",{name:"Solicitar acesso"}).waitFor();
  await p1.goto(url+"anuncio/h1/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:/Ampliar foto ilustrativa/}).click();
  await p1.getByRole("button",{name:"Fechar imagem"}).click();
  await p1.getByRole("button",{name:/Explorar região no OpenStreetMap/}).waitFor();
  await p1.screenshot({path:output+"/anuncio-375-light.png",fullPage:true,animations:"disabled"});
  // Public R72 entry: landing, real links, help/legal and a local support ticket.
  await p1.goto(url,{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Juntos somos mais fortes."}).waitFor();
  await p1.getByRole("link",{name:"Ajuda"}).last().click();
  await p1.getByRole("heading",{name:"Ajuda"}).waitFor();
  await p1.getByRole("link",{name:/Fale com a gente/}).click();
  await p1.locator("#ticket-text").fill("Solicitação fictícia de suporte para testar histórico.");
  await p1.getByRole("button",{name:"Registrar chamado de teste"}).click();
  await p1.getByRole("heading",{name:"Fale com a gente"}).waitFor();
  await p1.getByRole("button",{name:/Ver meus chamados/}).click();
  await p1.getByText("Solicitação fictícia de suporte para testar histórico.").waitFor();
  await p1.reload();
  await p1.getByText("Solicitação fictícia de suporte para testar histórico.").waitFor();
  await p1.goto(url+"privacidade/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Política de privacidade"}).waitFor();
  await p1.goto(url+"conduta/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Código de conduta"}).waitFor();
  await p1.goto(url+"planos/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Planos do Bivaque"}).waitFor();
  await p1.goto(url,{waitUntil:"domcontentloaded"});
  await p1.screenshot({path:output+"/landing-375-light.png",fullPage:true,animations:"disabled"});
  await p1.goto(url+"anuncio/h1/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Salvar anúncio"}).click();
  await p1.goto(url+"anuncio/h2/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Salvar anúncio"}).click();
  await p1.goto(url+"comparar/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Comparar imóveis salvos"}).waitFor();
  await p1.getByText("Total mensal").waitFor();
  await p1.goto(url+"imoveis/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("button",{name:"Salvar busca"}).click();
  await p1.goto(url+"alertas/",{waitUntil:"domcontentloaded"});
  await p1.getByRole("heading",{name:"Buscas salvas"}).waitFor();
  await p1.getByRole("button",{name:"Excluir alerta"}).click();
  await p1.getByText("Nenhuma busca salva").waitFor();
  assert.deepEqual(p1Errors,[],"P1 browser journey JS errors");
  await p1Context.close();
  process.stdout.write(JSON.stringify({status:"passed",screenshots:results,flow:["create","persist","search group","switch city","guide isolation","P1 onboarding","edit and pause","moderation and restore","group feed and comments","restricted request","photo zoom","area lookup","public landing","help and support","legal and plans","compare saved","search alerts"]},null,2)+"\n");
} finally {await browser.close();}
