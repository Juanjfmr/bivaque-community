import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
const source=resolve("../../apps/app/public");
const target=resolve("public");
for(const directory of ["demo","ilustracoes"]){
 const from=resolve(source,directory),to=resolve(target,directory);
 if(!existsSync(from))throw new Error("Original asset directory absent: "+from);
 mkdirSync(dirname(to),{recursive:true});
 cpSync(from,to,{recursive:true});
 console.log("assets copied:",directory,readdirSync(to).length);
}
