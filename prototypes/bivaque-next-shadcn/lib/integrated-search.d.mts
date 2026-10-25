export type SearchHit={id:string;title:string;meta:string;type:string;price?:string;image?:string;snippet?:string};
export type SearchGroups={items:SearchHit[];biz:SearchHit[];asks:SearchHit[];groups:SearchHit[];events:SearchHit[]};
export function normalize(text?:string):string;
export function queryWords(query:string):string[];
export function isMatch(query:string,text:string):boolean;
export function buildSearchSections(data:{query:string;city:string;items:ReadonlyArray<{id:string;city:string;kind:string;title:string;meta:string;description:string;badge?:string;price?:string;image?:string}>;providers:ReadonlyArray<{id:string;city:string;name:string;category:string;description:string;hood:string;services:string[];image?:string}>;questions:ReadonlyArray<{id:string;city:string;title:string;category:string;author:string;answers:Array<{author:string;text:string}>}>;groups:ReadonlyArray<{id:string;city:string;name:string;description:string;members:number;open:boolean;posts:Array<{text:string}>}>;events:ReadonlyArray<{id:string;city:string;title:string;category:string;place:string;when:string;description:string}>;replies?:Record<string,string[]>;}):SearchGroups;
export function countSearchResults(groups:SearchGroups):number;
