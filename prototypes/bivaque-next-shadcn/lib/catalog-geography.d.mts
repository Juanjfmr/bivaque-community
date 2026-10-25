export const BAIRROS:Record<string,Record<string,[number,number]>>;
export function neighborhoodPoint(city:string,hood:string):[number,number]|null;
export type MapPin={hood:string;point:[number,number];count:number};
export function mapPinsFor(city:string,listings:ReadonlyArray<{city:string;hood:string}>):MapPin[];
export function missingNeighborhoods(city:string,listings:ReadonlyArray<{city:string;hood:string}>):string[];
