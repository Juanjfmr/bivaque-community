// Rodada 49: números de exemplo do Painel do Bivaque (visão do dono da plataforma). O protótipo não
// tem dados de várias cidades nem de receita; a tela marca tudo isso como "Dados de exemplo".
const OWNER_DEMO={
 cities:{
  'Rio de Janeiro':{fam:630,arriving:88,served:.84,unanswered:1,ambassadors:6},
  'Brasília':{fam:410,arriving:74,served:.78,unanswered:2,ambassadors:4},
  'Manaus':{fam:140,arriving:38,served:.66,unanswered:2,ambassadors:3},
  'Natal':{fam:9,arriving:12,served:.25,unanswered:4,ambassadors:0}
 },
 kpis:[
  {id:'active',label:'Famílias ativas na semana',value:1284,fmt:'n',delta:'▲ 8%',up:true,series:[820,860,900,940,1010,1080,1120,1190,1230,1284],scale:true},
  {id:'solved',label:'Perguntas resolvidas em 24 h',value:82,fmt:'%',delta:'▲ 5 pts',up:true,series:[70,72,71,75,74,78,77,80,81,82]},
  {id:'revenue',label:'Receita dos planos (mês)',value:4870,fmt:'R$',delta:'▼ 2%',up:false,series:[4700,4800,4950,5000,4980,4950,4900,4920,4890,4870],scale:true}
 ],
 // O que saiu do normal. "go" leva a uma ação que existe nesta rodada.
 changes:[
  {icon:'trending_up',tone:'red',city:'Manaus',title:'Denúncias de golpe em Manaus',text:'Subiram de 1 para 5 esta semana; 4 citam Pix antecipado.',go:'report'},
  {icon:'group',tone:'amber',city:'Natal',title:'Natal sem embaixador',text:'12 famílias chegam em 60 dias; 4 perguntas paradas.',go:'stale'},
  {icon:'event_busy',tone:'amber',city:'Manaus',title:'2 planos vencem sem renovação',text:'Mudanças Rio Negro e Sorriso Kids, na quinta.',go:''},
  {icon:'trending_up',tone:'green',city:'Brasília',title:'Brasília passou de 400 famílias',text:'Grupo “Chegadas de dezembro” com 74 membros.',go:''}
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
 staleExtra:{Natal:4}
};
