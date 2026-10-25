import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function readBlock(theme) {
  const regex=theme==="light"?/:root\s*\{([\s\S]*?)\n\}/:/\.dark\s*\{([\s\S]*?)\n\}/;
  const match=css.match(regex);
  if (!match) throw new Error("Missing theme "+theme);
  return Object.fromEntries([...match[1].matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map(v=>[v[1],v[2].trim()]));
}

const root=readBlock("light"), dark={...root,...readBlock("dark")};
function resolve(map,name,depth=0){
  if(depth>8)throw Error("Token reference loop: "+name);
  const raw=map[name]; if(!raw)throw Error("Missing token "+name);
  const ref=raw.match(/^var\((--[a-z0-9-]+)\)$/);
  if(ref)return resolve(map,ref[1],depth+1);
  if(!/^#[0-9a-f]{6}$/i.test(raw))throw Error("Not a hex text color: "+name+"="+raw);
  return raw;
}
function luminance(hex){
  const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);
  return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
const pairs=[
  ["--foreground","--background"],["--card-foreground","--card"],
  ["--popover-foreground","--popover"],["--primary-foreground","--primary"],
  ["--secondary-foreground","--secondary"],["--muted-foreground","--muted"],
  ["--accent-foreground","--accent"],["--sidebar-foreground","--sidebar"],
  ["--bivaque-create-foreground","--bivaque-create"]
];
let failed=0;
for(const [theme,map] of [["light",root],["dark",dark]]){
  for(const [front,back] of pairs){
    const ratio=contrast(resolve(map,front),resolve(map,back));
    console.log(theme,front,"on",back,ratio.toFixed(2)+":1");
    if(ratio<4.5){console.error("Contrast below WCAG AA normal-text target: "+front+" "+theme);failed++}
  }
  const danger=contrast("#FFFFFF",resolve(map,"--destructive"));
  console.log(theme,"white on --destructive",danger.toFixed(2)+":1");
  if(danger<4.5){console.error("Destructive white-on-color contrast insufficient");failed++}
}
if(failed)process.exit(1);
console.log("Bivaque: approved theme text-pair contrast checks passed.");
