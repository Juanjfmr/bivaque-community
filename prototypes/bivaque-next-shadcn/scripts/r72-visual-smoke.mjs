import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const out=resolve(import.meta.dirname,"../out"),base="/bivaque-community",port=4173;
const types={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".woff2":"font/woff2",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ico":"image/x-icon"};
const srv=createServer(async(req,res)=>{
  const raw=decodeURIComponent(new URL(req.url||"/","http://127.0.0.1:"+port).pathname);
  if(!(raw===base||raw.startsWith(base+"/"))){res.writeHead(404);res.end();return}
  const rel=raw.slice(base.length).replace(/^\/+/,"");
  if(rel.includes("..")){res.writeHead(403);res.end();return}
  let path=join(out,rel||"index.html");
  try{const info=await stat(path);if(info.isDirectory())path=join(path,"index.html");
    const bytes=await readFile(path);res.writeHead(200,{"content-type":types[extname(path)]||"application/octet-stream"});res.end(bytes);
  }catch{res.writeHead(404);res.end("not found")}
});
await new Promise(ok=>srv.listen(port,"127.0.0.1",ok));
const browser=await chromium.launch({headless:true});
await mkdir(resolve(import.meta.dirname,"../visual-qa"),{recursive:true});
const errors=[];
try{
 for(const width of [375,768,1440]){
  for(const theme of ["light","dark"]){
   const context=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1,colorScheme:theme,locale:"pt-BR"});
   const page=await context.newPage();
   page.on("pageerror",e=>errors.push({width,theme,error:e.message}));
   await page.goto("http://127.0.0.1:"+port+base+"/",{waitUntil:"domcontentloaded"});
   await page.getByText("O que você precisa em",{exact:false}).first().waitFor({timeout:12000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,"Horizontal overflow home "+width+"/"+theme);
   if(width===375){
     assert.equal(await page.locator('nav[aria-label="Navegação principal mobile"] button').count(),4);
     assert.equal(await page.getByRole("button",{name:"Abrir menu Criar"}).isVisible(),true);
   }
   await page.screenshot({path:resolve(import.meta.dirname,"../visual-qa/home-"+width+"-"+theme+".png"),fullPage:true,animations:"disabled"});
   await page.goto("http://127.0.0.1:"+port+base+"/imoveis/",{waitUntil:"domcontentloaded"});
   await page.getByRole("heading",{name:"Imóveis"}).first().waitFor({timeout:12000});
   await page.screenshot({path:resolve(import.meta.dirname,"../visual-qa/imoveis-"+width+"-"+theme+".png"),fullPage:true,animations:"disabled"});
   const over=await page.evaluate(()=>{
      const limit=innerWidth;
      return {viewport:limit,scrollWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll("body *")].flatMap(el=>{
        const r=el.getBoundingClientRect();
        return r.right>limit+2&&r.width>0&&getComputedStyle(el).display!=="none"?[{tag:el.tagName,cl:String(el.className).slice(0,130),text:(el.textContent||"").slice(0,45),left:Math.round(r.left),right:Math.round(r.right)}]:[]
      }).slice(0,20)};
   });
   if(over.scrollWidth>width+2)console.error("OVERFLOW",JSON.stringify(over));
   assert.equal(over.scrollWidth>width+2,false,"Horizontal overflow listings "+width+"/"+theme);
   if(width===375&&theme==="light"){
      await page.locator('[data-slot="toggle-group-item"]').filter({hasText:"Mapa"}).first().click();
      await page.getByRole("region",{name:"Mapa aproximado de anúncios por bairro"}).waitFor({timeout:15000});
      await page.getByRole("button",{name:/Asa Norte/}).first().click();
      await page.getByRole("button",{name:/Ver só este bairro na lista/}).click();
      assert.equal(await page.locator('[data-slot="toggle-group-item"]').filter({hasText:"Lista"}).first().getAttribute("data-state"),"on");
      await page.getByRole("button",{name:/Total por mês/}).first().click();
      await page.getByPlaceholder("Máximo (R$)").fill("3500");
      await page.getByRole("button",{name:/Ver \d+ resultados/}).last().click();
      await page.getByRole("button",{name:"Avise-me"}).click();
      await page.getByRole("button",{name:/Gerenciar/}).first().click();
      await page.getByRole("heading",{name:"Alertas de busca"}).waitFor();
      await page.getByRole("button",{name:"Fechar"}).click();
   }
   await page.goto("http://127.0.0.1:"+port+base+"/busca/",{waitUntil:"domcontentloaded"});
   await page.getByRole("heading",{name:/Buscar em/}).first().waitFor();
   await page.getByRole("textbox",{name:"Buscar em todos os módulos"}).fill("inventário");
   await page.getByText("Indicações e respostas",{exact:false}).first().waitFor();
   await page.getByText("Paulo R.:",{exact:false}).first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,"Horizontal overflow search "+width+"/"+theme);
   await page.screenshot({path:resolve(import.meta.dirname,"../visual-qa/busca-"+width+"-"+theme+".png"),fullPage:true,animations:"disabled"});
   if(width===375&&theme==="light"){
     await page.getByRole("textbox",{name:"Buscar em todos os módulos"}).press("Enter");
     await page.reload({waitUntil:"domcontentloaded"});
     await page.getByRole("textbox",{name:"Buscar em todos os módulos"}).fill("");
     await page.getByText("Buscas recentes").first().waitFor();
     await page.getByRole("button",{name:/inventário/}).first().click();
     await page.getByText("Paulo R.:").first().waitFor();
   }
   await context.close();
  }
 }
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log("Visual smoke passed; 18 screenshots captured.");
}finally{await browser.close();await new Promise(ok=>srv.close(ok))}
