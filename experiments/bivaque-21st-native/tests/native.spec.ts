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
 await page.getByRole("button",{name:"Imóveis"}).click();
 await expect(page.getByText("Apartamento 3 quartos, mobiliado")).toBeVisible();
 await page.screenshot({path:"proof/imoveis.png",fullPage:true});
 await page.getByRole("button",{name:"Negócios"}).click();
 await expect(page.getByText("Confeitaria da Lu")).toBeVisible();
 await page.screenshot({path:"proof/negocios.png",fullPage:true});
});
test("Community: questions, groups, events",async({page})=>{
 await page.goto("/");
 await page.getByRole("navigation",{name:"Bottom Navigation"}).getByRole("button",{name:"Comunidade"}).click();
 await expect(page.getByText("Gente que se ajuda.")).toBeVisible();
 await page.screenshot({path:"proof/comunidade.png",fullPage:true});
 await page.getByRole("button",{name:"Grupos"}).click();
 await expect(page.getByText("Chegando em Manaus")).toBeVisible();
 await page.getByRole("button",{name:"Entrar"}).first().click();
 await page.getByRole("button",{name:"Encontros"}).click();
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
