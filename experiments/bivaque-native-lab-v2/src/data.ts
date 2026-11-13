export type Question = {
 id:string; author:string; role:string; neighborhood:string; ago:string; title:string; body:string;
 category:string; replies:number; useful:number; resolved?:boolean; hidden?:boolean;
};
export type Listing = {id:string;type:'imovel'|'desapego';title:string;price:number;fee?:number;region:string;rooms?:number;area?:number;parking?:number;kind:string;description:string;features:string[];author:string;available:boolean; palette:string;};
export type Provider = {id:string;name:string;specialty:string;neighborhood:string;references:number;verified:boolean;intro:string;palette:string;};
export type Group = {id:string;title:string;topic:string;members:number;private:boolean;description:string;cover:string;recent:string;};
export type Event = {id:string;day:string;month:string;title:string;place:string;time:string;capacity:number;going:number;description:string;};
export type Thread={id:string;name:string;context:string;last:string;ago:string;unread:number;messages:{from:'me'|'them';body:string;time:string}[]};
export const neighborhoods=['Todos','Adrianópolis','Aleixo','Centro','Flores','Parque Dez','Ponta Negra','Cidade Nova','Chapada','Planalto'];
export const questions:Question[]=[
 {id:'q1',author:'Marina A.',role:'Família militar',neighborhood:'Parque Dez',ago:'há 20 min',title:'Eletricista de confiança para uma instalação simples?',body:'Preciso instalar luminárias no apartamento. Quem já contratou alguém aqui em Manaus e pode indicar?',category:'Serviços',replies:8,useful:14},
 {id:'q2',author:'Carolina P.',role:'Dependente',neighborhood:'Flores',ago:'há 1 h',title:'Como é morar no bairro Adrianópolis com crianças?',body:'Estamos chegando à cidade e queremos entender rotina, trânsito, escolas e estrutura por perto.',category:'Moradia',replies:12,useful:21},
 {id:'q3',author:'André V.',role:'Militar',neighborhood:'Aleixo',ago:'há 2 h',title:'Corrida pela manhã: alguém forma grupo?',body:'Estou organizando treinos leves durante a semana. Quem se interessa?',category:'Comunidade',replies:5,useful:8},
 {id:'q4',author:'Lívia N.',role:'Dependente',neighborhood:'Cidade Nova',ago:'ontem',title:'Alguém conhece uma clínica veterinária boa?',body:'Preferência por indicação pessoal, com atendimento de emergência e preço transparente.',category:'Serviços',replies:6,useful:11},
 {id:'q5',author:'Roberto M.',role:'Veterano',neighborhood:'Ponta Negra',ago:'ontem',title:'Qual caminho mais prático para conhecer Manaus?',body:'Gostaria de sugestões de passeios e locais com estrutura para ir com crianças.',category:'Guia',replies:9,useful:17}
];
export const listings:Listing[]=[
 {id:'l1',type:'imovel',title:'Apartamento amplo perto do Parque Dez',price:2600,fee:540,region:'Parque Dez',rooms:3,area:92,parking:2,kind:'Apartamento',description:'Imóvel de demonstração com varanda, duas vagas e boa distribuição. Visita e condições por conversa.',features:['Varanda','Condomínio','Elevador'],author:'Renato F.',available:true,palette:'#D5D6C6'},
 {id:'l2',type:'imovel',title:'Casa com quintal no bairro Flores',price:3200,fee:0,region:'Flores',rooms:3,area:144,parking:2,kind:'Casa',description:'Casa de demonstração com espaço externo. Fotos e detalhes simulados neste laboratório.',features:['Quintal','2 vagas','Aceita pets'],author:'Sônia P.',available:true,palette:'#D0DCD5'},
 {id:'l3',type:'imovel',title:'Apartamento 2 quartos em Adrianópolis',price:2100,fee:420,region:'Adrianópolis',rooms:2,area:68,parking:1,kind:'Apartamento',description:'Opção fictícia para testar filtros, salvamento, conversa e comparação.',features:['Portaria','1 vaga'],author:'Paula D.',available:true,palette:'#DAD0C5'},
 {id:'l4',type:'desapego',title:'Mesa de jantar com quatro cadeiras',price:650,region:'Chapada',kind:'Móveis',description:'Peças em bom estado, retirada com o anunciante. Exemplo ilustrativo.',features:['Retirada local','Bom estado'],author:'João B.',available:true,palette:'#DBD6C8'},
 {id:'l5',type:'desapego',title:'Bicicleta aro 29 revisada',price:890,region:'Ponta Negra',kind:'Esporte',description:'Bicicleta usada de demonstração. Combine detalhes na conversa.',features:['Revisada','Usada'],author:'Bruna C.',available:true,palette:'#CEDBD1'}
];
export const providers:Provider[]=[
 {id:'p1',name:'Cláudio N.',specialty:'Eletricista residencial',neighborhood:'Parque Dez',references:18,verified:true,intro:'Instalações, revisão de tomadas e pequenos reparos. Indicações demonstrativas.',palette:'#D2E2D9'},
 {id:'p2',name:'Ateliê Muda',specialty:'Mudanças e transporte',neighborhood:'Adrianópolis',references:11,verified:false,intro:'Pequenos fretes, desmontagem e organização. Perfil fictício.',palette:'#E6D4C0'},
 {id:'p3',name:'Sol & Casa',specialty:'Limpeza residencial',neighborhood:'Aleixo',references:14,verified:true,intro:'Limpeza pós-mudança e manutenção semanal. Perfil de demonstração.',palette:'#E0E4C9'},
 {id:'p4',name:'Mãe da Obra',specialty:'Marcenaria e montagem',neighborhood:'Flores',references:7,verified:false,intro:'Montagem de móveis e pequenos projetos. Perfil fictício.',palette:'#C7D9D8'}
];
export const groups:Group[]=[
 {id:'g1',title:'Corrida em Manaus',topic:'Atividades',members:138,private:false,description:'Treinos, pontos de encontro e indicações de percursos em Manaus.',cover:'#2C554A',recent:'Próximo treino: sábado, 6h'},
 {id:'g2',title:'Famílias recém-chegadas',topic:'Guarnição',members:216,private:false,description:'Perguntas sobre bairros, escolas, rotinas e adaptação à cidade.',cover:'#594F43',recent:'Carolina perguntou sobre escolas'},
 {id:'g3',title:'Desapegos da guarnição',topic:'Trocas',members:344,private:true,description:'Trocas e desapegos entre participantes da comunidade.',cover:'#615047',recent:'Novos itens em móveis'},
 {id:'g4',title:'Pets e passeios',topic:'Interesses',members:83,private:false,description:'Informações sobre veterinários, parques e animais de estimação.',cover:'#425D68',recent:'Indicações atualizadas'}
];
export const events:Event[]=[
 {id:'v1',day:'14',month:'NOV',title:'Corrida leve no Parque dos Bilhares',place:'Parque dos Bilhares',time:'06:00',capacity:30,going:18,description:'Encontro fictício de corredores, ritmo livre e acolhimento de iniciantes.'},
 {id:'v2',day:'21',month:'NOV',title:'Encontro de famílias recém-chegadas',place:'Espaço comunitário · Manaus',time:'09:30',capacity:40,going:29,description:'Conversa de demonstração sobre adaptação à cidade e serviços úteis.'},
 {id:'v3',day:'28',month:'NOV',title:'Feira de trocas da comunidade',place:'Zona Centro-Sul',time:'15:00',capacity:60,going:32,description:'Evento fictício para experimentar inscrições e capacidade.'}
];
export const initialThreads:Thread[]=[
 {id:'m1',name:'Marina A.',context:'Indicação de eletricista',last:'Obrigada, vou enviar o contato.',ago:'09:40',unread:2,messages:[{from:'them',body:'Você conhece algum eletricista?',time:'09:25'},{from:'me',body:'Tenho uma indicação de quem já trabalhou aqui.',time:'09:30'},{from:'them',body:'Obrigada, vou enviar o contato.',time:'09:40'}]},
 {id:'m2',name:'Renato F.',context:'Apartamento no Parque Dez',last:'Podemos combinar uma visita.',ago:'Ontem',unread:0,messages:[{from:'me',body:'Olá! O apartamento ainda está disponível?',time:'Ontem'},{from:'them',body:'Podemos combinar uma visita.',time:'Ontem'}]}
];
export const places=[{name:'Parque Dez',detail:'Rotina prática, parques e serviços locais',tag:'Famílias'},{name:'Adrianópolis',detail:'Comércio, opções de escolas e apartamentos',tag:'Mobilidade'},{name:'Flores',detail:'Opções residenciais e espaços para crianças',tag:'Moradia'},{name:'Ponta Negra',detail:'Lazer, orla e passeios ao ar livre',tag:'Lazer'}];
