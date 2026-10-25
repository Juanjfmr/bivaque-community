export type SavedSearchAlert={id:string;kind:"imoveis"|"desapegos";city:string;attrs:Record<string,unknown>;label:string;enabled:boolean;created:number};
export function criteriaKey(attrs:Record<string,unknown>):string;
export function activeFilterCount(attrs:Record<string,unknown>,opts?:{housing?:boolean}):number;
export function findMatchingAlert(alerts:SavedSearchAlert[],kind:string,city:string,attrs:Record<string,unknown>):SavedSearchAlert|null;
export function alertLabel(kind:string,attrs:Record<string,unknown>):string;
