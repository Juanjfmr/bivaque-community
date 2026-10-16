// Rodada 22: o que importa em cada mercado. Imóvel (só aluguel): tipo, total do mês, quartos,
// área, vagas e comodidades. Desapego: categoria, estado de uso, preço e retirada prevista.
const PROPERTY_TYPES=['Apartamento','Casa','Casa em condomínio','Flat ou studio','Kitnet'];
const PROPERTY_AMENITIES=[['furnished','Mobiliado'],['pets','Aceita pets'],['ac','Ar-condicionado'],['balcony','Varanda'],['pool','Piscina'],['gym','Academia'],['doorman','Portaria 24h'],['leisure','Área de lazer']];
const ITEM_CATEGORIES=['Móveis','Eletrodomésticos','Eletrônicos','Infantil','Casa e decoração','Esporte e lazer','Pets','Roupas e acessórios','Outros'];
const ITEM_CONDITIONS=['Novo','Seminovo','Usado','Precisa de reparo'];
function propertyCardLine(x){
 const facts=[x.beds?`${x.beds} ${x.beds===1?'quarto':'quartos'}`:'',x.area?`${x.area} m²`:'',x.parking?`${x.parking} ${x.parking===1?'vaga':'vagas'}`:''].filter(Boolean).join(' · ');
 return `<p class="card-line">${icon('apartment')}${esc(facts||'Imóvel')}</p>${x.condo?`<p class="card-meta">${money(itemTotal(x))} com condomínio</p>`:''}`;
}
function pickupText(x){return x.pickup&&x.pickup>dateISO(0)?`Retirada a partir de ${new Date(`${x.pickup}T12:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`:'';}
function itemCardLine(x){
 const facts=[x.cond,x.cat].filter(Boolean).join(' · '),pick=pickupText(x);
 return `<p class="card-line">${icon('sell')}${esc(facts||'Desapego')}</p>${pick?`<p class="card-meta">${esc(pick)}</p>`:''}`;
}
function propertyDetailHtml(i){
 const amen=(i.amen||[]).map(amenityLabel).filter(Boolean);
 return `${i.ptype?`<p class="small muted">${esc(i.ptype)} para alugar</p>`:''}<div class="facts"><div class="fact"><b>${i.beds||'—'}</b><span>quartos</span></div><div class="fact"><b>${i.area||'—'} m²</b><span>área</span></div><div class="fact"><b>${i.parking??'—'}</b><span>vagas</span></div></div><p class="small muted">${i.condo?`Aluguel ${money(i.numPrice)} + condomínio ${money(i.condo)} = <b>${money(itemTotal(i))} / mês</b>.`:'Sem condomínio.'}</p>${amen.length?`<section class="section">${sectionTitle('Comodidades')}<md-chip-set>${amen.map(a=>`<md-assist-chip label="${esc(a)}">${icon('check','icon')}</md-assist-chip>`).join('')}</md-chip-set></section>`:''}`;
}
function itemDetailHtml(i){
 if(!i.cond&&!i.cat&&!i.pickup)return '';
 return `<div class="facts"><div class="fact"><b>${esc(i.cond||'—')}</b><span>estado de uso</span></div><div class="fact"><b>${esc(i.cat||'—')}</b><span>categoria</span></div><div class="fact"><b>${esc(pickupText(i).replace('Retirada a partir de ','')||'Já disponível')}</b><span>retirada</span></div></div>`;
}
const amenityLabel=k=>PROPERTY_AMENITIES.find(([v])=>v===k)?.[1]||'';
// Atributos dos anúncios de exemplo que já existiam (os campos já salvos têm prioridade).
function demoListingAttrs(){return {
 i1:{cat:'Móveis',cond:'Seminovo',pickup:dateISO(20)},
 i2:{ptype:'Apartamento',amen:['leisure','pool','gym','doorman','balcony']},
 i3:{cat:'Infantil',cond:'Seminovo'},
 i4:{cat:'Eletrodomésticos',cond:'Usado',pickup:dateISO(40)},
 i5:{ptype:'Apartamento',amen:['balcony','ac']},
 i6:{cat:'Móveis',cond:'Usado',pickup:dateISO(40)}};}
// Anúncios de exemplo novos, com as fotos que o protótipo já embute (sem peso extra); sem foto
// adequada, o cartão mostra o ícone, em vez de uma foto que não corresponde ao anúncio.
function demoListingsNew(){
 const base=(id,k,x)=>({id,city:'Manaus',status:'active',saved:false,demo:true,views:0,createdAt:Date.now()-(7+k)*36e5,flag:x.kind==='imovel'?'Aluguel':'',per:x.kind==='imovel'?'/mês':'',price:money(x.numPrice),photos:x.photo?[x.photo]:[],...x});
 return [
  base('i7',0,{kind:'imovel',numPrice:2900,title:'Casa 3 quartos com quintal',hood:'Parque 10',photo:'kitchen',ptype:'Casa',beds:3,area:140,parking:2,condo:0,amen:['pets','ac'],seller:'Diego F.',sini:'DF',stone:'c3',note:'Transferido para o Rio de Janeiro',desc:'Casa térrea com quintal, cozinha ampla e três quartos, um suíte. Aceita pets. Sem condomínio.'}),
  base('i8',1,{kind:'imovel',numPrice:1100,title:'Kitnet mobiliada no Centro',hood:'Centro',photo:'interior',ptype:'Kitnet',beds:1,area:28,parking:0,condo:0,amen:['furnished','ac'],seller:'Jéssica L.',sini:'JL',stone:'c2',note:'Mora no Centro',desc:'Kitnet mobiliada com ar-condicionado, perto do comércio e de ônibus. Contas de água inclusas.'}),
  base('i9',2,{kind:'imovel',numPrice:2200,title:'Flat mobiliado no Adrianópolis',hood:'Adrianópolis',photo:'apartment',ptype:'Flat ou studio',beds:1,area:42,parking:1,condo:650,amen:['furnished','ac','pool','gym','doorman'],seller:'Renato A.',sini:'RA',stone:'c1',note:'Mora no Adrianópolis',desc:'Flat pronto para morar, com piscina, academia e portaria 24h. Uma vaga coberta.'}),
  base('i10',3,{kind:'imovel',numPrice:4800,title:'Casa em condomínio, 4 quartos',hood:'Tarumã',photo:'kitchen',ptype:'Casa em condomínio',beds:4,area:220,parking:3,condo:550,amen:['pets','pool','leisure','doorman','balcony'],seller:'Mônica L.',sini:'ML',stone:'c4',note:'Transferida para Natal',desc:'Condomínio fechado com piscina e área de lazer. Quatro quartos, varanda e três vagas.'}),
  base('i11',4,{kind:'desapego',numPrice:250,title:'Kit de ferramentas completo',hood:'Planalto',photo:'',icon:'build',cat:'Outros',cond:'Usado',seller:'Marcos T.',sini:'MT',stone:'c3',note:'Mora no Planalto',desc:'Furadeira, jogo de chaves e caixa organizadora. Tudo funcionando.'}),
  base('i12',5,{kind:'desapego',numPrice:80,title:'20 caixas de mudança',hood:'Flores',photo:'',icon:'local_shipping',cat:'Outros',cond:'Usado',pickup:dateISO(5),seller:'Ana P.',sini:'AP',stone:'c2',note:'Chegou em Manaus este mês',desc:'Caixas reforçadas, usadas em uma mudança. Retirada a partir da próxima semana.'}),
  base('i13',6,{kind:'desapego',numPrice:120,title:'Caixa de transporte para cachorro médio',hood:'Ponta Negra',photo:'pets',cat:'Pets',cond:'Seminovo',seller:'Bruna S.',sini:'BS',stone:'c4',note:'Mora na Ponta Negra',desc:'Aprovada para viagem aérea, com bebedouro. Usada uma vez na transferência.'})];
}
// Migração local: completa os atributos dos exemplos e acrescenta os novos uma única vez, para
// que um exemplo apagado pela pessoa não volte. A etapa inicial (seed) não ganha exemplos novos.
function normalizeListings(s){
 const attrs=demoListingAttrs();
 const items=s.items.map(x=>x.demo&&attrs[x.id]?{...attrs[x.id],...x}:x);
 if(s.listingDemoV)return {...s,items};
 const have=new Set(items.map(x=>x.id)),extra=s.stage==='seed'?[]:demoListingsNew().filter(x=>!have.has(x.id));
 return {...s,items:[...items,...extra],listingDemoV:1};
}
