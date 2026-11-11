import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=(path)=>readFileSync(join(root,path),'utf8');
test('app é React Native real, sem WebView nem React DOM',()=>{
 const p=JSON.parse(read('package.json'));
 assert.equal(p.main,'expo-router/entry');
 for(const name of ['expo','expo-router','react-native','expo-image-picker','@react-native-async-storage/async-storage']) assert.ok(p.dependencies[name],`falta ${name}`);
 assert.equal(Boolean(p.dependencies['react-dom']),false);
 for(const screen of ['(tabs)/index','(tabs)/mercado','(tabs)/comunidade','(tabs)/voce','pergunta/[id]','anuncio/[id]','bairro/[id]','conversa/[id]','criar','perguntar','guia','mensagens']){
   const text=read(`app/${screen}.tsx`);
   assert.ok(!/\bWebView\b|\biframe\b|window\.localStorage|document\./.test(text),`não nativo em ${screen}`);
 }
});
test('jornadas criam e consultam dados persistentes',()=>{
 const s=read('src/store.tsx');
 for(const name of ['createQuestion','reply','solve','favorite','createListing','chatFor','message','toggleGroup','toggleEvent']) assert.ok(s.includes(name),`faltando ${name}`);
 assert.ok(s.includes('AsyncStorage.getItem'));
 assert.ok(s.includes('AsyncStorage.setItem'));
});
test('APK separado da produção',()=>{
 const app=JSON.parse(read('app.json')).expo;
 assert.equal(app.android.package,'com.bivaque.community.expuibeta');
 assert.notEqual(app.android.package,'com.bivaque.community.mobile');
 assert.equal(app.scheme,'bivaque-ui-beta');
});
test('imagens referenciadas existem no repositório de origem',()=>{
 const source=read('src/assets.ts');
 const list=[...source.matchAll(/require\('\.\.\/assets\/(.*?)'\)/g)].map(x=>x[1]);
 assert.ok(list.length>=15);
 for(const file of list){
   const path=join(root,'assets',file);
   assert.ok(existsSync(path),`asset não existe: ${file}`);
 }
});

test('Expo UI é a base nativa e os controles têm efeitos reais',()=>{
 const p=JSON.parse(read('package.json'));
 assert.ok(p.dependencies.expo.startsWith('~56.'),'Expo SDK 56');
 assert.ok(p.dependencies['@expo/ui'].startsWith('~56.'),'Expo UI 56');
 assert.ok(p.dependencies['expo-image'],'Expo Image');
 const controls=read('src/native-controls.tsx');
 assert.match(controls,/from '@expo\/ui'/);
 for(const component of ['Host','BottomSheet','Button']) assert.ok(controls.includes(component));
 const market=read('app/(tabs)/mercado.tsx');
 assert.ok(market.includes('NativeMarketFilters'));
 const create=read('app/criar.tsx');
 const ask=read('app/perguntar.tsx');
 assert.ok(create.includes('NativeChoice')&&ask.includes('NativeChoice'));
 const profile=read('app/(tabs)/voce.tsx');
 const store=read('src/store.tsx');
 assert.ok(profile.includes('Switch')&&store.includes('hapticsEnabled'));
 assert.ok(store.includes('AsyncStorage.setItem'));
});
