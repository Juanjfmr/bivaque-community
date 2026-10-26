"use client"

import { Heart, MapPin, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

// Adaptado do Product List 01 (Shadcn Studio).
// Estrutura preservada: grid responsivo -> Card -> CardContent -> imagem ->
// badges -> descrição -> preço/favorito. Botão de carrinho não faz sentido
// no Bivaque e foi substituído por abertura do anúncio.
// Referência de origem: Shadcn Studio public/r/product-list-01.json;\n// o original não é redistribuído por restrição da licença
export type BivaqueListing = {
  id: string; image: string; title: string; location: string;
  price: string; kind: "Imóvel" | "Desapego"; meta: string
}
export function BivaqueProductList({
  products, saved, onToggleSaved, onOpen
}:{
  products: BivaqueListing[];
  saved: Set<string>;
  onToggleSaved:(id:string)=>void;
  onOpen:(item:BivaqueListing)=>void;
}){
  if(!products.length)return <div className="rounded-xl border bg-card px-5 py-10 text-sm text-muted-foreground">Nenhum anúncio demonstrativo neste filtro.</div>;
  return <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
    {products.map(product=><Card key={product.id} className="group relative gap-0 overflow-hidden border-border bg-card py-0 shadow-none transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-0 px-0">
        <button type="button" aria-label={"Abrir anúncio: "+product.title} className="relative block aspect-[1.42] w-full overflow-hidden bg-muted text-left" onClick={()=>onOpen(product)}>
          <img src={product.image} alt={product.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
          <Badge className="absolute bottom-3 left-3 rounded-md bg-card text-foreground shadow-sm hover:bg-card">{product.kind}</Badge>
        </button>
        <button type="button" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-card/95 shadow-sm transition-colors hover:bg-card" aria-pressed={saved.has(product.id)} aria-label={saved.has(product.id)?"Remover dos salvos":"Salvar anúncio"} onClick={()=>onToggleSaved(product.id)}>
          <Heart className={"size-[18px] "+(saved.has(product.id)?"fill-[#B84A3A] stroke-[#B84A3A]":"stroke-foreground")} />
        </button>
        <button type="button" className="flex grow flex-col gap-1.5 px-3.5 pb-3.5 pt-3.5 text-left" onClick={()=>onOpen(product)}>
          <span className="block text-[16px] font-semibold leading-tight tracking-tight">{product.price}</span>
          <span className="line-clamp-2 min-h-10 text-[13px] font-medium leading-5">{product.title}</span>
          <span className="text-[11px] text-muted-foreground">{product.meta}</span>
          <span className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-foreground"><MapPin className="size-3"/>{product.location}<ArrowUpRight className="ml-auto size-3.5"/></span>
        </button>
      </CardContent>
    </Card>)}
  </div>
}
