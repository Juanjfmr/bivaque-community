import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPinsFor, neighborhoodPoint, missingNeighborhoods } from "../lib/catalog-geography.mjs";
import { criteriaKey, activeFilterCount, findMatchingAlert, alertLabel } from "../lib/catalog-alerts.mjs";
test("pins use only approved R72 neighborhood centers; never invent missing coordinates",()=>{
 assert.deepEqual(neighborhoodPoint("Brasília","Asa Norte"),[-47.883,-15.763]);
 assert.equal(neighborhoodPoint("Brasília","Jardim Botânico"),null);
 const data=[{city:"Brasília",hood:"Asa Norte"},{city:"Brasília",hood:"Asa Norte"},{city:"Brasília",hood:"Sudoeste"},{city:"Brasília",hood:"Jardim Botânico"}];
 const pins=mapPinsFor("Brasília",data);
 assert.deepEqual(pins.map(x=>[x.hood,x.count]),[["Asa Norte",2],["Sudoeste",1]]);
 assert.deepEqual(missingNeighborhoods("Brasília",data),["Jardim Botânico"]);
});
test("search alerts are order independent, scoped to kind and city",()=>{
 const a={hoods:["Sudoeste","Asa Norte"],min:"",max:"3000",beds:2};
 const b={beds:2,max:"3000",min:"",hoods:["Asa Norte","Sudoeste"]};
 assert.equal(criteriaKey(a),criteriaKey(b));
 const alert={id:"a",kind:"imoveis",city:"Brasília",attrs:a,label:"",enabled:true,created:1};
 assert.equal(findMatchingAlert([alert],"imoveis","Brasília",b)?.id,"a");
 assert.equal(findMatchingAlert([alert],"desapegos","Brasília",b),null);
 assert.equal(findMatchingAlert([alert],"imoveis","Manaus",b),null);
});
test("an unfiltered query cannot create a silent search alert",()=>{
 assert.equal(activeFilterCount({min:"",max:"",hoods:[],beds:0,parking:0,area:0,pets:false,furnished:false,availability:"",om:"Todas"}),0);
 assert.equal(activeFilterCount({min:"",max:"1500",hoods:[],condition:"Todos",pickup:"Todos"},{housing:false}),1);
 assert.match(alertLabel("imoveis",{max:"3000",hoods:["Asa Norte"],beds:2}),/Asa Norte/);
});
