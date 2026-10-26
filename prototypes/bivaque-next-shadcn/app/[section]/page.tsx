import LibraryApp from "@/components/library-app";
const sections=["inicio","busca","imoveis","desapegos","servicos","negocios","comunidade","grupos","conversas","movimentacao","guia","pedidos","agenda","vilas","clube","talentos","caronas","voce","salvos","acesso","painel","ajuda","privacidade","conduta","planos"];
export const dynamicParams=false;
export function generateStaticParams(){return sections.map(section=>({section}));}
export default function Page(){return <LibraryApp/>;}
