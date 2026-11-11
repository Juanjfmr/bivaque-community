
import type { ExperienceItem } from "./components/ui/carousel-cards";

export const photos = {
  apartment: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=950&q=85",
  apartment2: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=950&q=85",
  condo: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=950&q=85",
  service: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=950&q=85",
  run: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=950&q=85",
  neighborhood: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=950&q=85",
  table: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=950&q=85",
  garden: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=950&q=85",
} as const;

export const homes: ExperienceItem[] = [
  {id:"moradia-1",title:"Apartamento com varanda no Parque 10",location:"Parque 10 · Manaus",image:photos.apartment,price:2600,currency:"R$",date:"Aluguel mensal",priceLabel:"/ mês",rating:4.9,badge:"Destaque"},
  {id:"moradia-2",title:"Casa próxima à Vila Militar",location:"Ponta Negra · Manaus",image:photos.apartment2,price:3800,currency:"R$",date:"Aluguel mensal",priceLabel:"/ mês",rating:4.8,badge:"Novo"},
  {id:"moradia-3",title:"Apartamento mobiliado de 2 quartos",location:"Adrianópolis · Manaus",image:photos.condo,price:3100,currency:"R$",date:"Aluguel mensal",priceLabel:"/ mês",rating:4.9},
  {id:"moradia-4",title:"Residência com área de convivência",location:"Flores · Manaus",image:photos.garden,price:3300,currency:"R$",date:"Aluguel mensal",priceLabel:"/ mês",rating:4.7},
];
export const services: ExperienceItem[] = [
  {id:"servico-1",title:"Eletricista recomendado por vizinhos",location:"Atende Manaus",image:photos.service,price:120,currency:"R$",date:"Valor ilustrativo",priceLabel:"/ serviço",rating:4.9,badge:"Indicado"},
  {id:"servico-2",title:"Montagem e pequenos reparos",location:"Zona Centro-Sul",image:photos.condo,price:140,currency:"R$",rating:4.8},
  {id:"servico-3",title:"Limpeza residencial",location:"Atende Manaus",image:photos.garden,price:160,currency:"R$",rating:4.9},
];
export const events: ExperienceItem[] = [
  {id:"evento-1",title:"Corrida de sábado na Ponta Negra",location:"Ponta Negra · Manaus",image:photos.run,price:0,currency:"R$",date:"Sábado · 6h",badge:"Comunidade"},
  {id:"evento-2",title:"Encontro de famílias recém-chegadas",location:"Manaus",image:photos.table,price:0,currency:"R$",date:"Domingo · 16h",badge:"Famílias"},
];
export const initialPosts = [
  {id:1,author:"Mariana A.",time:"há 2 h",place:"Parque 10",type:"Pergunta",title:"Alguém indica eletricista confiável na região?",body:"Preciso de uma indicação para um reparo simples. Se alguém já contratou, agradeço o contato.",comments:12,likes:8},
  {id:2,author:"Carlos M.",time:"há 5 h",place:"Ponta Negra",type:"Encontro",title:"Grupo de corrida para iniciantes aos sábados",body:"Ponto de encontro às 6h. Quem chegou há pouco na cidade também é muito bem-vindo.",comments:9,likes:21},
  {id:3,author:"Ana R.",time:"ontem",place:"Flores",type:"Indicação",title:"Dica para quem está buscando moradia",body:"Visitem a rua em horários diferentes antes de fechar o contrato. O movimento muda muito à noite.",comments:6,likes:17},
];
export type Post = (typeof initialPosts)[number];
export const categories = [
  {id:"todos",label:"Tudo"},{id:"moradias",label:"Moradias"},{id:"servicos",label:"Serviços"},{id:"eventos",label:"Encontros"}
] as const;
export type Category = (typeof categories)[number]["id"];
