"use client";

import * as React from "react";
import { MapPin, ArrowRight, MapPinned, WifiOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mapPinsFor, missingNeighborhoods, type MapPin as Pin } from "@/lib/catalog-geography.mjs";

type Listing={id:string;city:string;hood:string;title:string;price?:string;image?:string};
type MapAPI={remove:()=>void;fitBounds:(bounds:[[number,number],[number,number]],options:object)=>void;on:(name:string,cb:()=>void)=>void};
type MarkerAPI={setLngLat:(coords:[number,number])=>MarkerAPI;addTo:(map:MapAPI)=>MarkerAPI};
type GL={
 Map:new(options:{container:HTMLElement;style:string;center:[number,number];zoom:number;attributionControl?:object;cooperativeGestures?:boolean})=>MapAPI;
 Marker:new(options:{element:HTMLElement})=>MarkerAPI;
 NavigationControl:new(options:{showCompass:boolean})=>object;
};
type ExtendedMap=MapAPI&{addControl:(control:object,pos:string)=>void};
const SOURCE_JS="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const SOURCE_CSS="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const BASEMAP="https://tiles.openfreemap.org/styles/liberty";
let loader:Promise<GL>|null=null;
function loadMap():Promise<GL>{
 const w=window as unknown as {maplibregl?:GL};
 if(w.maplibregl)return Promise.resolve(w.maplibregl);
 if(loader)return loader;
 loader=new Promise<GL>((resolve,reject)=>{
   if(!document.querySelector('link[data-bivaque-map]')){const css=document.createElement("link");css.rel="stylesheet";css.href=SOURCE_CSS;css.dataset.bivaqueMap="true";document.head.appendChild(css);}
   const script=document.createElement("script");script.src=SOURCE_JS;script.async=true;script.dataset.bivaqueMap="true";
   const timeout=setTimeout(()=>{script.remove();reject(new Error("tempo esgotado"))},15000);
   script.onload=()=>{clearTimeout(timeout);w.maplibregl?resolve(w.maplibregl):reject(new Error("biblioteca não disponível"))};
   script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error("falha de rede"))};
   document.head.appendChild(script);
 }).catch(error=>{loader=null;throw error});
 return loader!;
}
export function CatalogMap({city,listings,onOpen,onFilter}:{city:string;listings:Listing[];onOpen:(id:string)=>void;onFilter:(hood:string)=>void}){
 const container=React.useRef<HTMLDivElement|null>(null);
 const map=React.useRef<MapAPI|null>(null);
 const [error,setError]=React.useState(false);
 const [loading,setLoading]=React.useState(true);
 const [hood,setHood]=React.useState<string|null>(null);
 const [mobile,setMobile]=React.useState(false);
 const pins=React.useMemo(()=>mapPinsFor(city,listings),[city,listings]);
 const missing=React.useMemo(()=>missingNeighborhoods(city,listings),[city,listings]);
 const listByHood=React.useMemo(()=>listings.filter(x=>x.hood===hood),[listings,hood]);
 React.useEffect(()=>{const fn=()=>setMobile(window.innerWidth<720);fn();window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn)},[]);
 React.useEffect(()=>{
  let disposed=false;
  const element=container.current;
  map.current?.remove();map.current=null;setError(false);setLoading(true);
  if(!element||!pins.length){setLoading(false);return}
  loadMap().then(gl=>{
   if(disposed||!element.isConnected)return;
   const p=pins[0].point as [number,number];
   const m=new gl.Map({container:element,style:BASEMAP,center:p,zoom:pins.length===1?12.5:10.5,attributionControl:{compact:true},cooperativeGestures:true}) as ExtendedMap;
   map.current=m;m.addControl(new gl.NavigationControl({showCompass:false}),"top-right");
   for(const pin of pins){
    const el=document.createElement("button");el.type="button";el.textContent=String(pin.count);el.setAttribute("aria-label",pin.hood+": "+pin.count+" anúncios");
    el.style.cssText="border:2px solid white;border-radius:999px;min-width:42px;height:42px;padding:0 8px;background:#253033;color:#fff;box-shadow:0 2px 8px #0005;font-weight:700;font-size:13px;cursor:pointer";
    el.addEventListener("click",()=>{if(!disposed)setHood(pin.hood)});
    new gl.Marker({element:el}).setLngLat(pin.point as [number,number]).addTo(m);
   }
   if(pins.length>1){const lons=pins.map(x=>x.point[0]),lats=pins.map(x=>x.point[1]);m.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],{padding:65,maxZoom:13,duration:0});}
   m.on("load",()=>{if(!disposed)setLoading(false)});
   m.on("error",()=>{if(!disposed){setError(true);setLoading(false)}});
  }).catch(()=>{if(!disposed){setError(true);setLoading(false)}});
  return ()=>{disposed=true;map.current?.remove();map.current=null};
 },[city,pins]);
 return <div className="space-y-4">
  <div className="relative overflow-hidden rounded-xl border bg-muted">
    <div role="region" aria-label="Mapa aproximado de anúncios por bairro" ref={container} className="h-[370px] w-full sm:h-[480px]"/>
    {loading&&<div className="absolute inset-0 flex items-center justify-center bg-card/75 text-center text-sm text-muted-foreground"><MapPinned className="mr-2 size-5"/>Carregando mapa…</div>}
    {error&&<div className="absolute inset-x-4 top-4 rounded-lg border bg-card/95 p-4 text-sm text-foreground shadow-sm"><WifiOff className="mr-2 inline size-4"/>O mapa precisa de internet. Selecione um bairro abaixo para continuar.</div>}
    {!pins.length&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card text-center text-sm text-muted-foreground"><MapPin/>Nenhum bairro dos anúncios possui coordenadas aprovadas no R72.<span>Use a lista para consultar os anúncios.</span></div>}
  </div>
  <p className="text-[11px] leading-relaxed text-muted-foreground">Centros aproximados de bairros, nunca endereços dos anúncios ou localização de organizações militares. Base cartográfica OpenStreetMap / OpenFreeMap. Mesmos centros públicos do R72.</p>
  <section aria-label="Anúncios por bairro"><h2 className="mb-3 text-base font-semibold">Bairros com anúncios</h2>
    <div className="flex flex-wrap gap-2">{[...new Set(listings.map(x=>x.hood))].map(h=><Button size="sm" variant="outline" className="min-h-11 rounded-full" key={h} onClick={()=>setHood(h)}><MapPin className="size-4"/>{h} · {listings.filter(x=>x.hood===h).length}</Button>)}</div>
  </section>
  {!!missing.length&&<p className="text-[11px] text-muted-foreground">Sem coordenada aprovada para: {missing.join(", ")}. Os anúncios desses bairros continuam acessíveis pela lista.</p>}
  <Sheet open={hood!==null} onOpenChange={v=>{if(!v)setHood(null)}}>
    <SheetContent side={mobile?"bottom":"right"} className="max-h-[78dvh] overflow-y-auto sm:max-w-[450px]">
      <SheetHeader><SheetTitle>{hood} · {listByHood.length} anúncios</SheetTitle><SheetDescription>Resultados com os filtros atuais. Localização aproximada.</SheetDescription></SheetHeader>
      <div className="space-y-3 px-4 pb-4">
        {listByHood.map(v=><button key={v.id} onClick={()=>{setHood(null);onOpen(v.id)}} className="flex min-h-[74px] w-full items-center gap-3 border-b py-2 text-left">{v.image&&<img className="size-16 rounded-lg object-cover" src={v.image} alt=""/>}<span className="flex-1"><strong className="block text-[13px]">{v.title}</strong><span className="text-xs text-muted-foreground">{v.price||city}</span></span><ArrowRight className="size-4"/></button>)}
        <Button className="w-full" variant="outline" onClick={()=>{if(hood)onFilter(hood);setHood(null)}}>Ver só este bairro na lista <ArrowRight/></Button>
      </div>
    </SheetContent>
  </Sheet>
 </div>;
}
