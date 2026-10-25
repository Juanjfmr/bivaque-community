import LibraryApp from "@/components/library-app";
import {HOUSING,CLASSIFIEDS,PROVIDERS,QUESTIONS,GROUPS,EVENTS,REQUESTS} from "@/components/modules/fixtures";

export const dynamicParams = false;
export function generateStaticParams(){
 return [
 ...HOUSING.map(x=>({section:"anuncio",id:x.id})),
 ...CLASSIFIEDS.map(x=>({section:"anuncio",id:x.id})),
 ...PROVIDERS.map(x=>({section:"negocio",id:x.id})),
 ...QUESTIONS.map(x=>({section:"pergunta",id:x.id})),
 ...GROUPS.map(x=>({section:"grupo",id:x.id})),
 ...EVENTS.map(x=>({section:"evento",id:x.id})),
 ...REQUESTS.map(x=>({section:"pedido",id:x.id})),
 ];
}
export default function DetailPage(){return <LibraryApp/>;}
