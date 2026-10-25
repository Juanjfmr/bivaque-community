import ConceptScreen from "@/components/concept-screen";

const sections = [
 "inicio", "busca", "imoveis", "desapegos", "servicos", "negocios",
 "comunidade", "grupos", "conversas", "movimentacao", "guia",
 "pedidos", "agenda", "vilas", "clube", "talentos", "caronas",
 "voce", "salvos"
];

export const dynamicParams = false;
export function generateStaticParams(){return sections.map(section=>({section}));}
export default function Page(){return <ConceptScreen/>;}
