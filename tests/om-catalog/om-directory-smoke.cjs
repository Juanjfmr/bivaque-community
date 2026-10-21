const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../prototypes/bivaque-html/src/features/transfers');
let modal='',rendered=0,selected='';
const env={
 state:{city:'Manaus'},icon:()=>'',esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),
 btn:s=>'<button>'+s+'</button>',dialog:{open:false},
 showDialog:(name,html)=>{modal=html},closeDialog:async()=>{},render:()=>{rendered++},
 notify:s=>{selected=s},document:{addEventListener:()=>{},getElementById:()=>({focus:()=>{}})}
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(root,'om-directory-data.js'),'utf8'),env);
vm.runInContext(fs.readFileSync(path.join(root,'om-directory.js'),'utf8'),env);
assert.equal(vm.runInContext('OM_DIRECTORY.length',env),1396);
assert.ok(vm.runInContext('omMatches("BAMN")',env).length>=1);
assert.match(vm.runInContext('renderOmGuidePanel()',env),/Proximidade de imóveis indisponível/);
(async()=>{
 await vm.runInContext('omDirectoryAction("om-open","")',env);
 assert.match(modal,/om-directory-query/);
 await vm.runInContext('omDirectoryAction("om-select",OM_DIRECTORY[0].id)',env);
 assert.equal(rendered,1);
 assert.match(selected,/consulta/);
 console.log('OM picker smoke: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
