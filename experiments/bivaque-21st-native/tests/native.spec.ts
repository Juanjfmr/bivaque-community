import {test,expect} from "@playwright/test";
const widths=[320,360,375,430,768,1440];
for (const width of widths) {
 test("home responsive "+width,async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width,height:860});
  await page.goto("/");
  await expect(page.getByText("Seu lugar, mesmo quando tudo muda.")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Bottom Navigation"})).toBeVisible();
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
 await page.screenshot({path:"proof/mercado-filtrado.png",fullPage:true});
 await page.getByRole("radio",{name:"Imóveis"}).click();
 await expect(page.getByText("Apartamento 3 quartos, mobiliado")).toBeVisible();
 await page.screenshot({path:"proof/imoveis.png",fullPage:true});
 await page.getByRole("radio",{name:"Negócios"}).click();
 await expect(page.getByText("Confeitaria da Lu")).toBeVisible();
 await page.screenshot({path:"proof/negocios.png",fullPage:true});
});
test("Community: questions, groups, events",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
 await expect(page.getByText("Gente que se ajuda.")).toBeVisible();
 await page.screenshot({path:"proof/comunidade.png",fullPage:true});
 await page.getByRole("radio",{name:"Grupos"}).click();
 await expect(page.getByText("Chegando em Manaus")).toBeVisible();
 await page.getByRole("button",{name:"Entrar"}).first().click();
 await page.getByRole("radio",{name:"Encontros"}).click();
 await expect(page.getByText("Café de boas-vindas para quem chegou")).toBeVisible();
 await page.getByRole("button",{name:"Vou participar"}).first().click();
 await expect(page.getByText("Confirmado")).toBeVisible();
 await page.screenshot({path:"proof/encontros.png",fullPage:true});
});
test("Detail, search, publish",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
 await page.getByText("Berço com colchão, pouco uso").first().click();
 await expect(page.getByRole("heading",{name:"Berço com colchão, pouco uso"})).toBeVisible();
 await page.screenshot({path:"proof/detalhe.png",fullPage:true});
 await page.getByRole("button",{name:"Voltar"}).click();
 await page.getByRole("button",{name:"Buscar"}).click();
 await page.getByPlaceholder("O que você procura?").fill("geladeira");
 await expect(page.getByText("Geladeira duplex")).toBeVisible();
 await page.screenshot({path:"proof/busca.png",fullPage:true});
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
 await page.getByRole("button",{name:"Publicar"}).click();
 await page.getByLabel("Texto da publicação").fill("Teste de anúncio criado no React.");
 await expect(page.getByRole("button",{name:"Publicar"})).toBeEnabled();
 await page.screenshot({path:"proof/publicar.png",fullPage:true});
});

test("P0/P1 mobile: tabs legible, categories filter, save does not navigate",async({page})=>{
  await page.setViewportSize({width:375,height:812});
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Mercado"}).click();
  await expect(page.getByRole("radio",{name:"Desapegos"})).toBeVisible();
  await page.screenshot({path:"proof/mercado-mobile-375.png",fullPage:true});
  await page.getByRole("radio",{name:"Infantil"}).click();
  await expect(page.getByText("Berço com colchão, pouco uso")).toBeVisible();
  await expect(page.getByText("Geladeira duplex")).toHaveCount(0);
  await page.getByRole("radio",{name:"Móveis"}).click();
  await expect(page.getByText("Sofá de três lugares")).toBeVisible();
  await expect(page.getByText("Berço com colchão, pouco uso")).toHaveCount(0);
  await page.getByRole("radio",{name:"Todos"}).click();
  await page.locator(".listing .save button").first().click();
  await expect(page.getByText("Entre pessoas de confiança.")).toBeVisible();
  await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Você"}).click();
  await page.getByRole("button",{name:"Salvos"}).click();
  await expect(page.getByText("Berço com colchão, pouco uso")).toBeVisible();
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
  await page.screenshot({path:"proof/grupo-mobile-375.png",fullPage:true});
});
