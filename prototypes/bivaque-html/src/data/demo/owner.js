// Rodada 49: números de exemplo do Painel do Bivaque (visão do dono da plataforma). O protótipo não
// tem dados de várias cidades nem de receita; a tela marca tudo isso como "Dados de exemplo".
const OWNER_DEMO={
 cities:{
  'Rio de Janeiro':{fam:630,arriving:88,arrived30:70,served:.84,ambassadors:6},
  'Brasília':{fam:410,arriving:74,arrived30:60,served:.78,ambassadors:4},
  'Manaus':{fam:140,arriving:38,arrived30:30,served:.66,ambassadors:3},
  'Natal':{fam:9,arriving:12,arrived30:4,served:.25,ambassadors:0}
 },
 kpis:[
  {id:'active',label:'Famílias ativas na semana',value:1010,fmt:'n',delta:'▲ 8%',up:true,series:[700,720,760,790,830,880,910,950,980,1010],scale:true},
  {id:'solved',label:'Perguntas resolvidas em 24 h',value:82,fmt:'%',delta:'▲ 5 pts',up:true,series:[70,72,71,75,74,78,77,80,81,82]},
  {id:'revenue',label:'Receita dos planos (mês)',fmt:'R$',delta:'▼ 2%',up:false,series:[4700,4800,4950,5000,4980,4950,4900,4920,4890,4870],revenue:true}
 ],
 // O que saiu do normal. "go" leva a uma ação que existe nesta rodada.
 changes:[
  {icon:'trending_up',tone:'red',city:'Manaus',title:'Denúncias de golpe em Manaus',text:'Subiram de 1 para 3 esta semana; todas citam Pix antecipado.',go:'report'},
  {icon:'group',tone:'amber',city:'Natal',title:'Natal sem embaixador',text:'12 famílias chegam em 60 dias; 4 perguntas paradas.',go:'stale'},
  {icon:'event_busy',tone:'amber',city:'Manaus',title:'2 planos vencem sem renovação',text:'Mudanças Rio Negro e Sorriso Kids, na quinta.',go:'page:negocios'},
  {icon:'trending_up',tone:'green',city:'Brasília',title:'Brasília passou de 400 famílias',text:'Grupo “Chegadas de dezembro” com 74 membros.',go:'page:cidades'}
 ],
 // Denúncias e pedidos que chegaram antes desta sessão. Pessoas e documentos são fictícios; nada
 // de posto, organização militar ou endereço.
 reports:[
  {id:'or1',type:'item',target:'i1',reason:'fraud',details:'Pediu Pix antes de mostrar o sofá.',hoursAgo:5},
  {id:'or2',type:'item',target:'i1',reason:'fraud',details:'Mesmo pedido de pagamento antecipado.',hoursAgo:4},
  {id:'or3',type:'item',target:'i1',reason:'fraud',details:'',hoursAgo:3}
 ],
 verifications:[
  {id:'ov1',name:'Carla R.',city:'Manaus',when:'em novembro',invitedBy:'Paulo R.',hoursAgo:2,checks:[['Nome confere com o documento',true],['Documento dentro da validade',true],['Cidade de destino confere com o pedido',false]]}
 ],
 claims:[{id:'oc1',biz:'b7',hoursAgo:20}],
 staleExtra:{Natal:4,'Brasília':2,'Rio de Janeiro':1},
 // Quem já está cuidando de um item (moderadora de exemplo).
 assignees:{'report:item|i1':'Ana P.'},
 ambassadors:{'Rio de Janeiro':['Bruno M.','Clara T.','Diego F.','Elisa R.','Fábio L.','Gabriela S.'],'Brasília':['Helena V.','Igor N.','Júlia C.','Kauã P.'],'Manaus':['Ana P.','Luana M.','Paulo R.'],'Natal':[]},
 // Rodada 52: planos dos negócios de exemplo (o resto é grátis) e a equipe de moderação.
 plans:{b2:{tier:'featured',price:390,renewDays:4},b9:{tier:'featured',price:390,renewDays:4},b4:{tier:'basic',price:99,renewDays:30},b1:{tier:'basic',price:99,renewDays:12}},
 quoteRequests:212,
 // Planos das cidades sem negócios no protótipo; com os de Manaus, a receita fecha em R$ 4.870.
 otherPlans:{'Rio de Janeiro':{count:6,revenue:2190},'Brasília':{count:4,revenue:1702},'Natal':{count:0,revenue:0}},
 moderators:[{name:'Ana P.',role:'Moderação',city:'Manaus'}]
};
