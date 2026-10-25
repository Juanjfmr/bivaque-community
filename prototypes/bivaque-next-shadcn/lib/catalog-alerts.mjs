/** Normalization uses the same sorted array semantics as R72's alertKey(). */
export function criteriaKey(attrs) {
 return JSON.stringify(Object.keys(attrs).sort().map(k=>[k,Array.isArray(attrs[k])?[...attrs[k]].sort():attrs[k]]));
}
export function activeFilterCount(attrs,{housing=true}={}) {
 let n=(attrs.min!==""||attrs.max!==""?1:0)+(attrs.hoods?.length?1:0);
 if (housing) return n+(attrs.beds?1:0)+(attrs.parking?1:0)+(attrs.area?1:0)+(attrs.pets?1:0)+(attrs.furnished?1:0)+(attrs.availability?1:0)+(attrs.om&&attrs.om!=="Todas"?1:0);
 return n+(attrs.condition&&attrs.condition!=="Todos"?1:0)+(attrs.pickup&&attrs.pickup!=="Todos"?1:0);
}
export function findMatchingAlert(alerts,kind,city,attrs) {
 const target=criteriaKey(attrs);
 return alerts.find(x=>x.kind===kind&&x.city===city&&criteriaKey(x.attrs)===target)||null;
}
export function alertLabel(kind,attrs){
 const words=[kind==="imoveis"?"Imóveis":"Desapegos"];
 if(attrs.min||attrs.max)words.push(attrs.max?"até R$ "+Number(attrs.max).toLocaleString("pt-BR"):"a partir de R$ "+Number(attrs.min).toLocaleString("pt-BR"));
 if(attrs.hoods?.length)words.push(attrs.hoods.join(" ou "));
 if(kind==="imoveis"){if(attrs.beds)words.push(attrs.beds+"+ quartos");if(attrs.pets)words.push("aceita pets");if(attrs.furnished)words.push("mobiliado");}
 else{if(attrs.condition&&attrs.condition!=="Todos")words.push(attrs.condition);if(attrs.pickup&&attrs.pickup!=="Todos")words.push("retirada em "+(attrs.pickup==="now"?"breve":"até 30 dias"));}
 return words.join(" · ");
}
