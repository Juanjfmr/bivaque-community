import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const target=resolve('assets');
mkdirSync(target,{recursive:true});
const sources=[
 [resolve('../../apps/app/public/demo'), 'demo'],
 [resolve('../../apps/app/public/ilustracoes'), 'ilustracoes'],
];
for(const [root,sub] of sources) {
 if(!existsSync(root)) throw new Error('Não foi encontrada a fonte de imagens: '+root);
 cpSync(root,resolve(target,sub),{recursive:true});
}
console.log('Imagens de produto copiadas do repositório original');
