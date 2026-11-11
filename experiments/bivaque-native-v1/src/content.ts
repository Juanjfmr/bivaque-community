import type {PhotoKey} from './assets';
export type Moment='chegando'|'morando'|'saindo';
export type Reply={id:string;author:string;text:string;at:string};
export type Question={id:string;author:string;neighborhood:string;category:string;title:string;body:string;at:string;replies:Reply[];solved:boolean;isMine?:boolean};
export type ListingKind='Desapego'|'Imóvel'|'Serviço';
export type Listing={id:string;kind:ListingKind;title:string;price:number|null;unit?:string;description:string;neighborhood:string;seller:string;photo?:PhotoKey;localUri?:string;at:string;isMine?:boolean};
export type Message={id:string;own:boolean;text:string;at:string};
export type Conversation={id:string;listingId:string;title:string;participant:string;messages:Message[]};
export type Group={id:string;name:string;members:number;tag:string;description:string;emoji:string};
export type Event={id:string;name:string;place:string;date:string;category:string;photo:PhotoKey};
export type Bairro={id:string;name:string;tag:string;description:string;bestFor:string;image:PhotoKey;highlights:string[]};
export const bairros:Bairro[]=[
{id:'ponta-negra',name:'Ponta Negra',tag:'À beira do Rio Negro',description:'Orla, espaços de lazer e uma rotina marcada pelo Rio Negro. Vale avaliar deslocamentos antes de decidir a moradia.',bestFor:'Passeios e convivência',image:'sunset',highlights:['Orla e caminhada','Restaurantes','Passeios em família']},
{id:'adrianopolis',name:'Adrianópolis',tag:'Serviços por perto',description:'Região urbana com comércio e serviços variados. Uma opção para quem prioriza conveniência no dia a dia.',bestFor:'Praticidade',image:'interior',highlights:['Comércio e serviços','Restaurantes','Acesso a diferentes vias']},
{id:'dom-pedro',name:'Dom Pedro',tag:'Bairro residencial',description:'Bairro com ruas residenciais e comércio local. Compare trajetos e estruturas antes de escolher onde morar.',bestFor:'Vida de bairro',image:'apartment',highlights:['Mercados','Escolas e serviços','Comércio local']},
{id:'parque-dez',name:'Parque Dez',tag:'Rotina e movimento',description:'Bairro bastante conhecido por sua vida local e opções de lazer. A experiência muda bastante de uma rua para outra.',bestFor:'Rotina ativa',image:'friends',highlights:['Espaços de lazer','Serviços','Vida local']},
];
export const initialQuestions:Question[]=[
{id:'q1',author:'Mariana Costa',neighborhood:'Ponta Negra',category:'Indicação',title:'Alguém indica um eletricista confiável?',body:'Preciso instalar três luminárias e revisar um disjuntor. Preferência por alguém que atenda na região da Ponta Negra.',at:'há 24 min',solved:false,replies:[{id:'r1',author:'Daniela A.',text:'Para esse tipo de serviço, peça orçamento discriminado e confirme referências recentes de quem já contratou.',at:'há 18 min'},{id:'r2',author:'Felipe M.',text:'Também preciso de indicação. Você consegue compartilhar o contato depois?',at:'há 9 min'}]},
{id:'q2',author:'Paulo Lima',neighborhood:'Dom Pedro',category:'Chegada',title:'Como foi a adaptação de vocês a Manaus?',body:'Vou me mudar no próximo mês com duas crianças. Quais foram as primeiras coisas que resolveram?',at:'há 1 h',solved:false,replies:[{id:'r3',author:'Carolina F.',text:'Eu começaria avaliando a distância entre casa, trabalho e escola nos horários de pico.',at:'há 45 min'}]},
{id:'q3',author:'Ana Ribeiro',neighborhood:'Adrianópolis',category:'Família',title:'Atividades infantis aos fins de semana',body:'Quais passeios funcionam melhor com crianças pequenas, de preferência com sombra e estrutura?',at:'ontem',solved:false,replies:[{id:'r4',author:'Breno S.',text:'A região da Ponta Negra costuma ser uma opção para caminhar no fim da tarde.',at:'ontem'}]},
{id:'q4',author:'João Augusto',neighborhood:'Parque Dez',category:'Mudança',title:'Transportadora e desmontagem de móveis',body:'Estou preparando uma saída de Manaus. Busco sugestões para embalar eletrodomésticos com segurança.',at:'ontem',solved:true,replies:[{id:'r5',author:'Mariana Costa',text:'Fotografe a instalação e identifique os cabos antes de desmontar. Peça seguro e inventário da transportadora.',at:'ontem'}]},
{id:'q5',author:'Camila F.',neighborhood:'Ponta Negra',category:'Pets',title:'Onde passear com cachorro ao entardecer?',body:'Procuro lugares agradáveis para caminhada com meu cachorro, sem trânsito intenso.',at:'há 2 dias',solved:false,replies:[]},
];
export const initialListings:Listing[]=[
{id:'a1',kind:'Desapego',title:'Berço de madeira com colchão',description:'Berço conservado, usado por uma criança. Retirada combinada na Ponta Negra. É possível conferir as medidas antes da visita.',price:380,neighborhood:'Ponta Negra',seller:'Luciana Prado',photo:'crib',at:'hoje'},
{id:'a2',kind:'Desapego',title:'Sofá de três lugares',description:'Sofá em tecido claro, três lugares. Ideal para quem está montando a casa. Transporte por conta do comprador.',price:700,neighborhood:'Dom Pedro',seller:'Bianca Sales',photo:'sofa',at:'ontem'},
{id:'a3',kind:'Desapego',title:'Geladeira duplex',description:'Geladeira duplex em uso, funcionando. Pode ser vista antes de fechar negócio.',price:1100,neighborhood:'Parque Dez',seller:'Marcos Vilar',photo:'fridge',at:'há 2 dias'},
{id:'a4',kind:'Imóvel',title:'Apartamento com varanda',description:'Apartamento de dois quartos, varanda e vaga. Visitas mediante agendamento. Valores de condomínio devem ser confirmados.',price:2800,unit:'/mês',neighborhood:'Adrianópolis',seller:'Renata Lopes',photo:'apartment',at:'hoje'},
{id:'a5',kind:'Imóvel',title:'Apartamento próximo a serviços',description:'Dois quartos, cozinha equipada e área social. Visitas agendadas diretamente com o responsável.',price:2500,unit:'/mês',neighborhood:'Dom Pedro',seller:'Rafael Araújo',photo:'interior',at:'ontem'},
{id:'a6',kind:'Desapego',title:'Mesa de jantar em madeira',description:'Mesa para quatro lugares, desmontagem simples.',price:450,neighborhood:'Ponta Negra',seller:'Fernanda M.',photo:'kitchen',at:'há 3 dias'},
{id:'a7',kind:'Serviço',title:'Montagem de móveis',description:'Montagem, pequenos ajustes e instalação de móveis. Combine orçamento e disponibilidade antes da contratação.',price:null,unit:'Solicitar orçamento',neighborhood:'Manaus',seller:'Serviços em Manaus',photo:'service',at:'hoje'},
{id:'a8',kind:'Serviço',title:'Aulas e reforço escolar',description:'Acompanhamento e reforço escolar, com formato a combinar com o responsável.',price:null,unit:'Consultar horários',neighborhood:'Manaus',seller:'Rede local',photo:'classroom',at:'há 4 dias'},
];
export const groups:Group[]=[
{id:'g1',name:'Chegando a Manaus',members:42,tag:'Mudanças',emoji:'🧳',description:'Informações úteis, dúvidas e acolhimento entre famílias recém-chegadas.'},
{id:'g2',name:'Famílias na cidade',members:78,tag:'Família',emoji:'🌿',description:'Passeios, escola, rotina com crianças e encontros da comunidade.'},
{id:'g3',name:'Corrida e caminhada',members:31,tag:'Esporte',emoji:'🏃',description:'Companhia para treinar, percursos e grupos de caminhada.'},
{id:'g4',name:'Desapegos e mudanças',members:56,tag:'Mercado',emoji:'📦',description:'Compartilhe dicas para uma mudança organizada e acompanhe anúncios.'},
];
export const events:Event[]=[
{id:'e1',name:'Caminhada no fim da tarde',place:'Orla da Ponta Negra',date:'Sáb · 17h',category:'Ao ar livre',photo:'sunset'},
{id:'e2',name:'Encontro de famílias',place:'Parque Dez',date:'Dom · 9h',category:'Família',photo:'friends'},
{id:'e3',name:'Troca de experiências para recém-chegados',place:'Comunidade local',date:'Qua · 19h',category:'Chegada',photo:'arrival'},
];
export const makeId=(prefix:string)=>`${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
export const money=(value:number|null,unit?:string)=>value===null?(unit??'A combinar'):`${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value)}${unit??''}`;
