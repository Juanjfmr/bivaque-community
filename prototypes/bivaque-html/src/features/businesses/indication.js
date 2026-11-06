/* R73 — indicação rápida com importação local de vCard; nenhum convite é enviado automaticamente. */
function indicationVcard(text){
 const lines=String(text||'').replace(/\r?\n[ \t]/g,'').split(/\r?\n/);
 const find=k=>lines.map(line=>line.match(new RegExp('^(?:item\\d+\\.)?'+k+'(?:;[^:]*)?:(.*)$','i'))).filter(Boolean).map(m=>m[1].trim());
 return {name:(find('FN')[0]||'').replace(/\\,/g,','),contacts:[...find('TEL'),...find('URL'),...find('X-SOCIALPROFILE')].map(x=>x.replace(/^tel:/i,'')).filter(Boolean)};
}
function indicationKeys(values){
 const keys=new Set();
 for(const v of values){
  const s=String(v||'').trim();if(!s)continue;
  const phone=s.replace(/\D/g,'');if(/^\d{10,15}$/.test(phone)){keys.add('tel:'+phone.replace(/^55(?=\d{10,11}$)/,''));continue;}
  const instagram=s.match(/(?:instagram\.com\/|^@)([a-z0-9._]+)/i);if(instagram){keys.add('ig:'+instagram[1].toLowerCase());continue;}
  const url=s.match(/https?:\/\/\S+/i);if(url){keys.add('url:'+url[0].toLowerCase().replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''));}
 }
 return [...keys];
}
function indicationExisting(name,contacts){
 const wanted=new Set(indicationKeys(contacts));
 return cityBiz().find(b=>{
  if(norm(b.name)===norm(name))return true;
  const known=indicationKeys([b.whatsapp,b.instagram&&'@'+b.instagram,b.website,...(b.suggestedContacts||[])]);
  return known.some(k=>wanted.has(k));
 });
}
function openIndicate(){
 if(!canPost())return;
 editor={kind:'indicate',photos:[]};editorDirty=false;
 const body='<p class="form-note">Compartilhe um profissional que você recomendaria. Só o nome é obrigatório.</p>'+
  '<div class="form-grid">'+
  field('ind-name','Nome do contato ou negócio','','required minlength="3" maxlength="100" class="full"')+
  field('ind-contact','Telefones, Instagram ou links (opcional)','','type="textarea" rows="2" maxlength="500" class="full" supporting-text="Pode colar vários números, um por linha."')+
  '<label class="ind-vcard full">'+icon('contact_phone')+'<span><b>Importar contato (.vcf)</b><small>Inclui todos os telefones disponíveis no arquivo.</small></span><input id="ind-vcard" type="file" accept=".vcf,text/vcard,text/x-vcard"></label>'+
  selectField('ind-category','Tipo de serviço (opcional)',[['','Não sei informar'],...GROUP_NAMES],'')+
  field('ind-hood','Bairro (opcional)','','maxlength="60"')+
  field('ind-why','Por que recomenda? (opcional)','','type="textarea" rows="2" maxlength="500" class="full"')+
  '</div><p class="form-note">No protótipo, os dados ficam neste dispositivo. O contato indicado não será divulgado nem receberá mensagem automaticamente.</p>';
 showDialog('Indicar alguém',body,btn('Cancelar','close-dialog','','text')+btn('Registrar indicação','submit-indicate','','filled','thumb_up'),'editor');
 $('#ind-vcard')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>1024*1024){notify('O arquivo de contatos deve ter até 1 MB.','error');return;}
  try{
   const parsed=indicationVcard(await file.text());
   const n=$('#ind-name'),c=$('#ind-contact');
   if(!n?.value.trim()&&parsed.name)n.value=parsed.name;
   if(c){const before=c.value.trim();c.value=[before,...parsed.contacts].filter(Boolean).join('\n').slice(0,500);}
   editorDirty=true;
   notify(parsed.contacts.length?parsed.contacts.length+' contato(s) importado(s).':'Arquivo lido. Confira o nome do contato.','info');
  }catch{notify('Não foi possível ler o contato. Tente um arquivo .vcf.','error');}
 });
}
async function submitIndicate(){
 if(!canPost()||!validFields(['ind-name']))return;
 const name=$('#ind-name').value.trim(),cat=$('#ind-category')?.value||'Outros',hood=$('#ind-hood')?.value.trim()||'',why=$('#ind-why')?.value.trim()||'',raw=$('#ind-contact')?.value||'';
 if(name.length<3){notify('Informe o nome do contato ou negócio.','error');return;}
 if(hoodCep(hood)){notify('Informe o bairro, sem o CEP.','error');return;}
 const contacts=[...new Set(raw.split(/[\n;,]+/).map(x=>x.trim()).filter(Boolean))];
 const duplicate=indicationExisting(name,contacts);
 if(duplicate?.myInd){await closeDialog(true);navigate('negocio',duplicate.id);notify('Você já indicou este contato.','info');return;}
 const id=duplicate?.id||uid('b'),recordCat=GROUP_NAMES.includes(cat)?cat:'Outros';
 const ok=mutate(()=>{
  if(duplicate){
   duplicate.recN=(duplicate.recN||0)+1;duplicate.myInd=true;
   if(why){duplicate.says=duplicate.says||[];duplicate.says.push([initals(state.profile.name),'me',state.profile.name,why]);}
   duplicate.suggestedContacts=[...new Set([...(duplicate.suggestedContacts||[]),...contacts])];
  }else state.biz.unshift({id,name,city:state.city,cat:recordCat,hoods:hood?[hoodInfo(hood,state.city)?.name||hood]:[],svc:[],bio:'',hours:'A confirmar com o responsável',photos:[],icon:'storefront',ini:initals(name),claimed:false,myInd:true,recN:1,says:why?[[initals(state.profile.name),'me',state.profile.name,why]]:[],suggestedContacts:contacts,saved:false});
 },{redraw:false});
 if(ok){await closeDialog(true);navigate('negocio',id);notify(duplicate?'Sua indicação foi adicionada':'Contato indicado');}
}
