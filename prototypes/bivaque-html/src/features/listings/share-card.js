// Rodada 29: cartão de compartilhamento (referências do Mobbin: Rodeo e Brink). Anúncio e negócio
// abrem uma folha com a prévia de uma imagem pronta para grupos de WhatsApp: foto, preço ou
// indicações, bairro e "Bivaque". A imagem é desenhada no próprio aparelho (canvas); nada é
// enviado a serviço externo. "Compartilhar link" segue o fluxo de sempre (share()).
let shareCard=null;
const SHARE_W=1080,SHARE_H=1350;
function shareCardData(type,id){
 if(type==='anuncio'){const x=itemById(id);if(!accessibleRecord(x))return null;const imovel=x.kind==='imovel';
  return {type,id,photo:image(x.photos?.[0]),glyph:x.icon||(imovel?'apartment':'sell'),tag:imovel?x.ptype||'Imóvel':'Desapego',big:money(x.numPrice)+(imovel?' /mês':''),title:x.title,lines:[imovel?[x.beds?`${x.beds} ${x.beds===1?'quarto':'quartos'}`:'',x.area?`${x.area} m²`:'',x.parking?`${x.parking} ${x.parking===1?'vaga':'vagas'}`:''].filter(Boolean).join(' · '):[x.cond,x.cat].filter(Boolean).join(' · '),imovel&&x.condo?`${money(itemTotal(x))} por mês com condomínio`:''].filter(Boolean),place:`${x.hood} · ${x.city}`};}
 if(type==='negocio'){const b=bizById(id);if(!accessibleRecord(b))return null;
  return {type,id,photo:image(b.photos?.[0]),glyph:b.icon||'storefront',tag:b.cat,big:`${b.recN||0} ${b.recN===1?'indicação':'indicações'}`,title:b.name,lines:[b.disc?`Benefício: ${b.disc}`:'da comunidade de militares e famílias'],place:`${(b.hoods||[]).slice(0,2).join(', ')||b.city} · ${b.city}`};}
 return null;
}
// Quebra o texto em até `lines` linhas; a última ganha reticências se sobrar texto.
function shareWrap(ctx,text,max,lines){
 const words=String(text).split(/\s+/).filter(Boolean),out=[];let cur='',cut=false;
 for(const w of words){const t=cur?`${cur} ${w}`:w;if(ctx.measureText(t).width<=max){cur=t;continue;}if(out.length===lines-1){cut=true;break;}out.push(cur);cur=w;}
 if(cur){let last=cur;if(cut||ctx.measureText(last).width>max){while(last&&ctx.measureText(`${last}…`).width>max)last=last.slice(0,-1);last=`${last.trimEnd()}…`;}out.push(last);}
 return out.slice(0,lines);
}
async function shareCardBlob(d){
 const css=getComputedStyle(document.documentElement),tok=n=>css.getPropertyValue(`--md-sys-color-${n}`).trim()||'#003748';
 const c=document.createElement('canvas');c.width=SHARE_W;c.height=SHARE_H;const g=c.getContext('2d'),font=(w,s)=>`${w} ${s}px "Roboto Flex", system-ui, sans-serif`;
 await Promise.all([document.fonts.load(font(700,64)),document.fonts.load(font(500,40)),document.fonts.load('200px "Material Symbols Rounded"')]).catch(()=>{});
 g.fillStyle='#f9f9fb';g.fillRect(0,0,SHARE_W,SHARE_H);
 const ph=720;
 if(d.photo){try{const img=new Image();img.src=d.photo;await img.decode();const s=Math.max(SHARE_W/img.width,ph/img.height),w=img.width*s,h=img.height*s;g.drawImage(img,(SHARE_W-w)/2,(ph-h)/2,w,h);}catch{d={...d,photo:''};}}
 // Sem foto: o ícone do anúncio no lugar da imagem.
 if(!d.photo){g.fillStyle='#e7e8ea';g.fillRect(0,0,SHARE_W,ph);g.fillStyle='#71787d';g.font='220px "Material Symbols Rounded"';g.textAlign='center';g.textBaseline='middle';g.fillText(d.glyph,SHARE_W/2,ph/2+10);g.textAlign='left';g.textBaseline='alphabetic';}
 g.font=font(700,34);const tw=g.measureText(d.tag).width;g.fillStyle='rgba(20,41,51,.86)';g.beginPath();g.roundRect(48,48,tw+48,64,16);g.fill();g.fillStyle='#fff';g.fillText(d.tag,72,92);
 let y=ph+96;g.fillStyle='#191c1d';g.font=font(800,72);g.fillText(d.big,64,y);
 y+=74;g.font=font(700,50);for(const line of shareWrap(g,d.title,SHARE_W-128,2)){g.fillText(line,64,y);y+=62;}
 g.font=font(500,38);g.fillStyle='#41484c';for(const line of d.lines){for(const l of shareWrap(g,line,SHARE_W-128,1)){g.fillText(l,64,y);y+=52;}}
 g.fillStyle=tok('primary');g.fillText(d.place,64,Math.min(y+6,SHARE_H-170));
 g.fillStyle=tok('primary');g.fillRect(0,SHARE_H-130,SHARE_W,130);g.fillStyle='#2f8a50';g.beginPath();g.roundRect(64,SHARE_H-105,80,80,20);g.fill();g.fillStyle='#fff';g.font=font(800,52);g.textAlign='center';g.fillText('B',104,SHARE_H-46);g.textAlign='left';g.font=font(700,44);g.fillText('Bivaque',168,SHARE_H-70);g.font=font(500,30);g.fillStyle='rgba(255,255,255,.85)';g.fillText('Comunidade de militares e famílias',168,SHARE_H-30);
 return new Promise(r=>c.toBlob(r,'image/png'));
}
async function openShareCard(type,id){
 const d=shareCardData(type,id);if(!d){await share(type,id);return;}
 if(shareCard?.url)URL.revokeObjectURL(shareCard.url);
 showDialog('Compartilhar',`<div class="share-card"><div class="share-preview" id="share-preview" aria-busy="true"><span class="share-wait">Preparando o cartão…</span></div><p class="form-note">Imagem pronta para grupos de WhatsApp, feita neste aparelho. O link abre o anúncio no Bivaque.</p></div>`,`${btn('Compartilhar link','share-link',`${type}|${id}`,'text','link')}${btn('Baixar imagem','share-download','','outlined','image')}${btn('Compartilhar com imagem','share-image','','filled','share')}`,'share-card');
 const blob=await shareCardBlob(d),box=$('#share-preview');if(!box||!dialog.open)return;
 shareCard={type,id,blob,url:URL.createObjectURL(blob),name:`bivaque-${type}-${id}.png`,title:d.title};
 box.removeAttribute('aria-busy');box.innerHTML=`<img src="${shareCard.url}" alt="${esc(`Cartão de compartilhamento: ${d.title}, ${d.big}, ${d.place}`)}">`;
 const file=new File([blob],shareCard.name,{type:'image/png'});shareCard.file=file;
 if(!(navigator.canShare?.({files:[file]}))){const b=$('#dialog [data-action="share-image"]');if(b)b.style.display='none';}
}
async function shareCardAction(action,value){
 if(!['share-link','share-image','share-download'].includes(action))return false;
 if(action==='share-link'){const [type,id]=value.split('|');if(dialog.open)await closeDialog(true);await share(type,id);return true;}
 if(!shareCard?.blob){notify('O cartão ainda está sendo preparado.','info');return true;}
 if(action==='share-download'){const a=document.createElement('a');a.href=shareCard.url;a.download=shareCard.name;document.body.appendChild(a);a.click();a.remove();notify('Imagem salva no aparelho','image');return true;}
 const link=new URL(location.href);const rec=shareCard.type==='anuncio'?itemById(shareCard.id):bizById(shareCard.id);link.hash=`${shareCard.type}/${encodeURIComponent(shareCard.id)}?cidade=${encodeURIComponent(rec?.city||state.city)}`;
 try{await navigator.share({files:[shareCard.file],title:`${shareCard.title} · Bivaque`,text:`${shareCard.title} · ${link.href}`});notify('Cartão compartilhado','share');}catch(error){if(error.name!=='AbortError')notify('Não foi possível compartilhar a imagem. Use “Baixar imagem” ou “Compartilhar link”.','error');}
 return true;
}
