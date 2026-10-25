/* Fictional content for the Bivaque visual lab. No real profiles, permissions, listings or endorsements. */
export type Housing={id:string;title:string;city:string;hood:string;type:"Aluguel"|"Venda";price:number;priceLabel:string;bedrooms:number;parking:number;area:number;pets:boolean;furnished:boolean;om:string;image:string;description:string;owner:string};
export type Classified={id:string;title:string;category:string;city:string;hood:string;price:number;condition:string;image:string;owner:string;description:string};
export type Provider={id:string;name:string;category:string;city:string;hood:string;recommendations:number;verified:boolean;benefit?:string;image:string;services:string[];description:string};
export type Question={id:string;author:string;title:string;category:string;city:string;answers:{author:string;text:string;date:string}[];resolved:boolean;helped:number;date:string};
export type Group={id:string;name:string;city:string;description:string;members:number;open:boolean;posts:{id:string;author:string;text:string;date:string;likes:number}[]};
export type Event={id:string;title:string;city:string;place:string;when:string;description:string;going:number;category:string};
export type Request={id:string;title:string;city:string;hood:string;category:string;detail:string;author:string;status:"Aberto"|"Em negociação"|"Concluído";proposals:{provider:string;amount:string;timeline:string;detail:string}[]};
export type Benefit={id:string;partner:string;category:string;headline:string;description:string;code:string;expires:string;audience:string};
const img=(id:string)=>"https://images.unsplash.com/"+id+"?auto=format&fit=crop&w=840&q=83";
export const HOUSING:Housing[]=[
{id:"h1",title:"Apartamento 3 quartos na Asa Norte",city:"Brasília",hood:"Asa Norte",type:"Aluguel",price:3500,priceLabel:"R$ 3.500/mês",bedrooms:3,parking:1,area:120,pets:true,furnished:false,om:"Comando da Aeronáutica",image:img("photo-1600607687920-4e2a09cf159d"),description:"Apartamento com três quartos, varanda e ambientes amplos. Dados ilustrativos para avaliação do protótipo.",owner:"Mariana R."},
{id:"h2",title:"Casa em condomínio no Jardim Botânico",city:"Brasília",hood:"Jardim Botânico",type:"Aluguel",price:6800,priceLabel:"R$ 6.800/mês",bedrooms:4,parking:2,area:250,pets:true,furnished:false,om:"Hospital das Forças Armadas",image:img("photo-1600596542815-ffad4c1539a9"),description:"Casa com quintal e quatro dormitórios. Anúncio fictício de demonstração.",owner:"Carlos N."},
{id:"h3",title:"Kitnet mobiliada na Asa Sul",city:"Brasília",hood:"Asa Sul",type:"Aluguel",price:2100,priceLabel:"R$ 2.100/mês",bedrooms:1,parking:0,area:35,pets:false,furnished:true,om:"Comando da Aeronáutica",image:img("photo-1600566753190-17f0baa2a6c3"),description:"Kitnet mobiliada com ambiente integrado. Valores e disponibilidade ilustrativos.",owner:"Luciana P."},
{id:"h4",title:"Apartamento 2 quartos no Sudoeste",city:"Brasília",hood:"Sudoeste",type:"Venda",price:690000,priceLabel:"R$ 690.000",bedrooms:2,parking:1,area:78,pets:true,furnished:false,om:"Hospital das Forças Armadas",image:img("photo-1600607687939-ce8a6c25118c"),description:"Apartamento reformado, perto de serviços. Publicação simulada.",owner:"Roberto A."}
];
export const CLASSIFIEDS:Classified[]=[
{id:"d1",title:"Sofá retrátil seminovo",category:"Casa",city:"Brasília",hood:"Sudoeste",price:800,condition:"Bom estado",image:img("photo-1555041469-a586c61ea9bc"),owner:"Luana M.",description:"Sofá de três lugares, retirada a combinar. Oferta fictícia."},
{id:"d2",title:"Mesa de jantar com seis cadeiras",category:"Casa",city:"Brasília",hood:"Águas Claras",price:650,condition:"Seminovo",image:img("photo-1617806118233-18e1de247200"),owner:"Rafael S.",description:"Mesa e cadeiras em bom estado. Anúncio demonstrativo."},
{id:"d3",title:"Berço com colchão",category:"Infantil",city:"Brasília",hood:"Asa Norte",price:420,condition:"Usado",image:img("photo-1491013516836-7db643ee125a"),owner:"Paula R.",description:"Berço desmontado, retirada local. Dados fictícios."},
{id:"d4",title:"Bicicleta urbana aro 29",category:"Esporte",city:"Brasília",hood:"Taguatinga",price:900,condition:"Bom estado",image:img("photo-1485965120184-e220f721d03e"),owner:"Diego F.",description:"Bicicleta para passeios e deslocamentos, publicação de teste."}
];
export const PROVIDERS:Provider[]=[
{id:"s1",name:"Oficina Militar Motors",category:"Automóveis",city:"Brasília",hood:"Asa Norte",recommendations:18,verified:false,benefit:"Avaliação inicial sem custo",image:img("photo-1486262715619-67b85e0b08d3"),services:["Revisão","Mecânica","Diagnóstico"],description:"Oficina fictícia para demonstrar indicações e solicitação de orçamento."},
{id:"s2",name:"Psicóloga Camila Ribeiro",category:"Saúde",city:"Brasília",hood:"Asa Sul",recommendations:12,verified:false,image:img("photo-1600607687939-ce8a6c25118c"),services:["Atendimento","Orientação"],description:"Perfil demonstrativo, não representa profissional real."},
{id:"s3",name:"CrossFit Bivaque",category:"Esportes",city:"Brasília",hood:"Águas Claras",recommendations:14,verified:false,benefit:"Aula experimental fictícia",image:img("photo-1534438327276-14e5300c3a48"),services:["Condicionamento","Treino funcional"],description:"Negócio inventado para prototipar a experiência."},
{id:"s4",name:"Almeida & Castro",category:"Serviços profissionais",city:"Brasília",hood:"Asa Norte",recommendations:9,verified:false,image:img("photo-1589829545856-d10d557cf95f"),services:["Consultoria","Orientações"],description:"Exemplo de ficha comercial, não indicação real."},
{id:"s5",name:"Mudanças Planalto",category:"Mudanças",city:"Brasília",hood:"Toda a cidade",recommendations:7,verified:false,image:img("photo-1601584115197-04ecc0da31d7"),services:["Mudança residencial","Embalagem","Montagem"],description:"Prestador fictício para a jornada de movimentação."},
{id:"s6",name:"Reparos e elétrica DF",category:"Manutenção",city:"Brasília",hood:"Taguatinga",recommendations:8,verified:false,benefit:"Orçamento demonstrativo",image:img("photo-1581092921461-eab62e97a780"),services:["Elétrica","Pequenos reparos"],description:"Prestador fictício para pedidos de serviços."}
];
export const QUESTIONS:Question[]=[
{id:"q1",author:"Carla R.",title:"Pediatra que atenda pelo plano perto da Asa Norte?",category:"Saúde",city:"Brasília",answers:[],resolved:false,helped:0,date:"Hoje"},
{id:"q2",author:"Marcos T.",title:"Escolas infantis com período integral na Asa Sul?",category:"Educação",city:"Brasília",answers:[{author:"Ana P.",text:"Sugiro visitar as escolas próximas e confirmar vagas e turnos diretamente.",date:"Ontem"}],resolved:false,helped:2,date:"Ontem"},
{id:"q3",author:"Jéssica L.",title:"Qual empresa de mudança vocês recomendam?",category:"Movimentação",city:"Brasília",answers:[{author:"Paulo R.",text:"Peça pelo menos três propostas com o mesmo inventário e cobertura de danos.",date:"Há 2 dias"}],resolved:true,helped:9,date:"Há 2 dias"},
{id:"q4",author:"Bruna M.",title:"Indicação de diarista de confiança no Sudoeste?",category:"Casa",city:"Brasília",answers:[],resolved:false,helped:0,date:"Há 3 dias"}
];
export const GROUPS:Group[]=[
{id:"g1",name:"Famílias militares em Brasília",city:"Brasília",description:"Escolas, serviços, moradia e rotina familiar na cidade.",members:680,open:true,posts:[{id:"gp1",author:"Ana P.",text:"Quem estiver chegando este mês, deixem dúvidas sobre escola aqui. Podemos trocar experiências.",date:"Hoje",likes:12}]},
{id:"g2",name:"Chegadas e movimentações 2027",city:"Brasília",description:"Apoio para quem chega ou sai, mudanças e primeiras providências.",members:148,open:true,posts:[{id:"gp2",author:"Marcos T.",text:"Compartilhei um checklist de mudança. Acrescentem o que tiver funcionado!",date:"Ontem",likes:8}]},
{id:"g3",name:"Vizinhos do Sudoeste",city:"Brasília",description:"Recomendações e convivência entre moradores da região.",members:212,open:false,posts:[{id:"gp3",author:"Luana M.",text:"No próximo sábado vamos organizar um encontro no parque.",date:"Há 2 dias",likes:5}]},
{id:"g4",name:"Corrida e pedal",city:"Brasília",description:"Atividades físicas em grupo e encontros no fim de semana.",members:96,open:true,posts:[]}
];
export const EVENTS:Event[]=[
{id:"e1",title:"Café de boas-vindas",city:"Brasília",place:"Parque da Cidade (local a confirmar)",when:"24 nov · 9h",description:"Encontro demonstrativo de famílias recém-chegadas.",going:42,category:"Convivência"},
{id:"e2",title:"Pedal de domingo",city:"Brasília",place:"Asa Norte (local a confirmar)",when:"29 nov · 7h",description:"Passeio de bicicleta organizado pela comunidade, ilustrativo.",going:18,category:"Esporte"},
{id:"e3",title:"Troca de livros e brinquedos",city:"Brasília",place:"Águas Claras (local a confirmar)",when:"05 dez · 10h",description:"Atividade fictícia para demonstração de eventos.",going:26,category:"Família"}
];
export const REQUESTS:Request[]=[
{id:"r1",title:"Instalar ventilador e duas luminárias",city:"Brasília",hood:"Asa Norte",category:"Manutenção",detail:"Procuro eletricista para instalação residencial com orçamento fechado.",author:"Mariana R.",status:"Aberto",proposals:[{provider:"Reparos e elétrica DF",amount:"R$ 280",timeline:"Em até 3 dias",detail:"Inclui instalação, sem materiais."},{provider:"Eletro Centro",amount:"R$ 330",timeline:"Na próxima semana",detail:"Visita e serviço incluídos."}]},
{id:"r2",title:"Mudança para apartamento",city:"Brasília",hood:"Águas Claras",category:"Mudanças",detail:"Preciso de embalagem, transporte e montagem de móveis.",author:"Carlos N.",status:"Em negociação",proposals:[{provider:"Mudanças Planalto",amount:"R$ 1.850",timeline:"Em até 10 dias",detail:"Mudança residencial, sem materiais especiais."}]},
{id:"r3",title:"Limpeza após reforma",city:"Brasília",hood:"Sudoeste",category:"Casa",detail:"Limpeza de apartamento com dois quartos.",author:"Bruna M.",status:"Aberto",proposals:[]}
];
export const BENEFITS:Benefit[]=[
{id:"b1",partner:"CrossFit Bivaque",category:"Esporte",headline:"Aula experimental para a comunidade",description:"Exemplo de benefício. Não representa convênio vigente nem oferta comercial.",code:"DEMO-ESPORTE",expires:"Sem validade comercial",audience:"Membros elegíveis"},
{id:"b2",partner:"Mudanças Planalto",category:"Mudanças",headline:"Condição ilustrativa para movimentação",description:"Teste de como um prestador poderia oferecer benefício. Sem contratação real.",code:"DEMO-MUDANCA",expires:"Sem validade comercial",audience:"Membros elegíveis"},
{id:"b3",partner:"Oficina Militar Motors",category:"Automóveis",headline:"Avaliação inicial simulada",description:"Benefício fictício para comparação do design do clube.",code:"DEMO-AUTO",expires:"Sem validade comercial",audience:"Membros elegíveis"}
];
export const VILLAS=[{id:"v1",name:"Vila Ajuricaba",city:"Manaus",members:820,access:"Acesso restrito",description:"Comunidade residencial demonstrativa com avisos, solicitações e eventos."},{id:"v2",name:"Vila Militar do Sudoeste",city:"Brasília",members:146,access:"Acesso restrito",description:"Exemplo hipotético para testar o módulo de vilas."}];
export const ARRIVAL_STEPS=[{id:"t1",title:"Definir a organização militar de destino",detail:"Escolha sua OM para orientar a busca de moradia."},{id:"t2",title:"Pesquisar bairros e moradia",detail:"Compare o orçamento e a rotina de deslocamentos."},{id:"t3",title:"Solicitar propostas de mudança",detail:"Confirme embalagem, seguro, datas e montagem."},{id:"t4",title:"Organizar escola e serviços",detail:"Valide vagas, horários e disponibilidade."},{id:"t5",title:"Conhecer grupos e pessoas",detail:"Encontre a comunidade e eventos locais."}];
export const BRASILIA_GUIDE=[{title:"Moradia e bairros",body:"Considere Asa Norte, Asa Sul, Sudoeste e Águas Claras. Visite os imóveis e confira tempo de trajeto, condomínio e custos.",type:"Moradia"},{title:"Vida escolar",body:"Busque informações sobre matrícula, turno e trajeto. Confirme vagas e documentação com a escola.",type:"Família"},{title:"Documentos e serviços",body:"Confira os procedimentos de transferência na sua organização e as exigências dos prestadores antes de contratar.",type:"Serviços"},{title:"Transporte e rotina",body:"Compare horários reais de deslocamento, estacionamento, transporte público e vias de acesso.",type:"Cidade"}];


export type Talent={id:string;name:string;area:string;experience:string;city:string;skills:string[];description:string};
export type Ride={id:string;origin:string;destination:string;city:string;when:string;seats:number;driver:string;notes:string};
export const TALENTS:Talent[]=[
{id:"tal1",name:"Fernanda R.",area:"Administração e finanças",experience:"Projetos e gestão",city:"Brasília",skills:["Excel","Gestão de processos","Relatórios"],description:"Perfil profissional totalmente fictício para explorar conexões de competências."},
{id:"tal2",name:"Lucas M.",area:"Tecnologia",experience:"Desenvolvimento web",city:"Brasília",skills:["React","TypeScript","Design de produto"],description:"Exemplo de perfil de talento. Não representa vínculo ou serviço real."},
{id:"tal3",name:"Ana P.",area:"Educação",experience:"Aulas e orientação",city:"Brasília",skills:["Matemática","Reforço","Didática"],description:"Exemplo ilustrativo de competências compartilhadas na comunidade."}
];
export const RIDES:Ride[]=[
{id:"car1",origin:"Asa Norte",destination:"Águas Claras",city:"Brasília",when:"Segunda · 07h30",seats:2,driver:"Marcos T.",notes:"Trajeto demonstrativo; embarque e detalhes combinados somente entre participantes."},
{id:"car2",origin:"Sudoeste",destination:"Asa Sul",city:"Brasília",when:"Quarta · 08h00",seats:1,driver:"Paula R.",notes:"Carona ilustrativa para discussão do módulo; não existe reserva real."},
{id:"car3",origin:"Taguatinga",destination:"Plano Piloto",city:"Brasília",when:"Sexta · 18h30",seats:3,driver:"Carlos N.",notes:"Exemplo fictício de compartilhamento de deslocamento."}
];
