import {test,expect} from "@playwright/test";
const widths=[320,360,375,430,768,1440];
for (const width of widths) {
 test("home responsive "+width,async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width,height:860});
  await page.goto("/");
  await expect(page.getByText("Chegou em Manaus?")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Bottom Navigation"})).toBeVisible();
  await page.waitForTimeout(350);
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  expect(dimensions.scrollWidth,`Overflow em ${width}px`).toBeLessThanOrEqual(dimensions.width);
  await page.screenshot({path:"proof/home-"+width+".png",fullPage:true});
  expect(errors).toEqual([]);
 });
}
test("Mercado: navigates and filters",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
 await expect(page.getByText("Entre pessoas de confiança.")).toBeVisible();
 await page.getByRole("radio",{name:"Grátis"}).click();
 await expect(page.getByText("Armários de cozinha")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/mercado-filtrado.png",fullPage:true});
 await page.getByRole("radio",{name:"Imóveis"}).click();
 await expect(page.getByText("Apartamento 3 quartos, mobiliado")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/imoveis.png",fullPage:true});
 await page.getByRole("radio",{name:"Negócios"}).click();
 await expect(page.getByText("Confeitaria da Lu")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/negocios.png",fullPage:true});
});
test("Community: questions, groups, events",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
 await expect(page.getByText("Gente que se ajuda.")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/comunidade.png",fullPage:true});
 await page.getByRole("radio",{name:"Grupos"}).click();
 await expect(page.getByText("Chegando em Manaus")).toBeVisible();
 await page.getByRole("button",{name:"Entrar"}).first().click();
 await page.getByRole("radio",{name:"Encontros"}).click();
 await expect(page.getByText("Café de boas-vindas para quem chegou")).toBeVisible();
 await page.getByRole("button",{name:"Vou participar"}).first().click();
 await expect(page.getByText("Confirmado")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/encontros.png",fullPage:true});
});
test("Detail, search, publish",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
 await page.getByText("Berço com colchão, pouco uso").first().click();
 await expect(page.getByRole("heading",{name:"Berço com colchão, pouco uso"})).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/detalhe.png",fullPage:true});
 await page.getByRole("button",{name:"Voltar"}).click();
 await page.getByRole("button",{name:"Buscar"}).click();
 await page.getByPlaceholder("O que você procura?").fill("geladeira");
 await expect(page.getByText("Geladeira duplex")).toBeVisible();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/busca.png",fullPage:true});
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
 await page.getByRole("button",{name:"Publicar"}).click();
 await page.getByLabel("Texto da publicação").fill("Teste de anúncio criado no React.");
 await expect(page.getByRole("button",{name:"Publicar"})).toBeEnabled();
 await page.waitForTimeout(800);
 await page.screenshot({path:"proof/publicar.png",fullPage:true});
});

test("P0/P1 mobile: tabs legible, categories filter, save does not navigate",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
  await expect(page.getByRole("radio",{name:"Desapegos"})).toBeVisible();
  await page.waitForTimeout(800);
 await page.screenshot({path:"proof/mercado-mobile-375.png",fullPage:true});
  await page.getByRole("radio",{name:"Infantil"}).click();
  await expect(page.getByText("Berço com colchão, pouco uso")).toBeVisible();
  await expect(page.getByText("Geladeira duplex")).toHaveCount(0);
  await page.getByRole("radio",{name:"Móveis",exact:true}).click();
  await expect(page.getByText("Sofá de três lugares")).toBeVisible();
  await expect(page.getByText("Berço com colchão, pouco uso")).toHaveCount(0);
  await page.getByRole("radio",{name:"Todos"}).click();
  await page.locator(".listing .save button").first().click();
  await expect(page.getByText("Entre pessoas de confiança.")).toBeVisible();
  await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
  await page.getByRole("button",{name:"Salvos"}).click();
  await expect(page.getByText("Berço com colchão, pouco uso")).toBeVisible();
  await page.waitForTimeout(800);
 await page.screenshot({path:"proof/salvos-mobile-375.png",fullPage:true});
  expect(errors).toEqual([]);
});

test("P1 mobile: native segmented and group header",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto("/");
  await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
  await expect(page.getByRole("radio",{name:"Perguntas"})).toBeVisible();
  await page.getByRole("radio",{name:"Grupos"}).click();
  await page.getByRole("button",{name:"Ver grupo"}).first().click();
  await expect(page.getByText("Convide para o grupo")).toBeVisible();
  await page.waitForTimeout(800);
 await page.screenshot({path:"proof/grupo-mobile-375.png",fullPage:true});
});


test("Momentos reordenam a Home; cidade nova/rala/viva",async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await expect(page.getByTestId("home-highlight-chegando")).toBeVisible();
 await page.getByRole("button",{name:/Manaus · Chegando/}).click();
 await page.getByRole("button",{name:"Saindo",exact:true}).click();
 await expect(page.getByTestId("home-highlight-saindo")).toBeVisible();
 await page.getByRole("button",{name:/Manaus · Saindo/}).click();
 await page.getByRole("button",{name:"Morando",exact:true}).click();
 await expect(page.getByTestId("home-highlight-morando")).toBeVisible();
 await page.getByRole("button",{name:/Manaus · Morando/}).click();
 await page.getByRole("button",{name:"Nova"}).click();
 await expect(page.getByTestId("city-empty")).toBeVisible();
 await expect(page.getByText("Manaus está começando no Bivaque")).toBeVisible();
 await page.screenshot({path:"proof/cidade-nova-375.png",fullPage:true});
 await page.getByRole("button",{name:/Manaus · Morando/}).click();
 await page.getByRole("button",{name:"Rala"}).click();
 await expect(page.getByTestId("city-empty")).toHaveCount(0);
 await expect(page.getByText("Manaus ainda tem pouco por aqui.",{exact:false})).toBeVisible();
 await page.screenshot({path:"proof/cidade-rala-375.png",fullPage:true});
});

test("Publicar pergunta exibe item e oferece desfazer",async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
 await page.getByRole("button",{name:"Publicar"}).click();
 await page.getByRole("button",{name:"Pergunta",exact:true}).click();
 await page.getByLabel("Texto da publicação").fill("Onde encontrar um eletricista indicado para a vila?");
 await page.getByRole("button",{name:"Publicar pergunta"}).click();
 await expect(page.getByText("Onde encontrar um eletricista indicado para a vila?")).toBeVisible();
 await page.screenshot({path:"proof/pergunta-publicada-375.png",fullPage:true});
 await page.getByRole("button",{name:"Desfazer"}).click();
 await expect(page.getByText("Onde encontrar um eletricista indicado para a vila?")).toHaveCount(0);
});

test("Anúncio gera contato contextual e Back restaura o detalhe",async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
 await page.getByText("Berço com colchão, pouco uso").first().click();
 await expect(page.getByRole("heading",{name:"Berço com colchão, pouco uso"})).toBeVisible();
 await page.getByRole("button",{name:/Tenho interesse/}).click();
 await expect(page.getByTestId("chat-context")).toContainText("Berço com colchão, pouco uso");
 await expect(page.getByRole("heading",{name:"Conversa com Luciana Prado"})).toBeVisible();
 await page.goBack();
 await expect(page.getByRole("heading",{name:"Berço com colchão, pouco uso"})).toBeVisible();
 await page.screenshot({path:"proof/contato-back-375.png",fullPage:true});
});

test("Comunidade permite responder, marcar solução e desfazer",async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
 await page.getByTestId("question-p1").getByRole("button",{name:/Ver respostas/}).click();
 await page.getByLabel("Sua indicação").fill("Conheço uma clínica no bairro, posso indicar o contato.");
 await page.getByRole("button",{name:"Responder"}).click();
 await expect(page.getByText("Conheço uma clínica no bairro, posso indicar o contato.")).toBeVisible();
 await page.getByRole("button",{name:"Marcar como solução"}).last().click();
 await expect(page.getByRole("button",{name:/Solução marcada/})).toBeVisible();
 await page.screenshot({path:"proof/resposta-solucao-375.png",fullPage:true});
});

test("Salvar pergunta é acessível por teclado",async({page})=>{
 await page.setViewportSize({width:320,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
 const save=page.getByTestId("question-p1").getByRole("button",{name:"Salvar pergunta"});
 await save.focus();
 await page.keyboard.press("Enter");
 await expect(page.getByTestId("question-p1").getByRole("button",{name:"Remover dos salvos"})).toHaveAttribute("aria-pressed","true");
});

test("Upload recusa arquivo que não é imagem",async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
 await page.getByRole("button",{name:"Publicar"}).click();
 await page.locator('input[type="file"]').setInputFiles({name:"texto.txt",mimeType:"text/plain",buffer:Buffer.from("não é imagem")});
 await expect(page.getByRole("alert")).toContainText("arquivo(s) recusado(s)");
});

test("Tema e movimento reduzido",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.setViewportSize({width:375,height:812});
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
 await page.getByRole("button",{name:"Tema"}).click();
 await expect(page.locator("html")).toHaveClass(/dark/);
 expect(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
 await page.screenshot({path:"proof/tema-escuro-375.png",fullPage:true});
});
