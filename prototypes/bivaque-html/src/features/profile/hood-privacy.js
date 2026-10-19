// Rodada 63: "Mostrar meu bairro" (Configurações). Só vale para o que a própria pessoa publicou: com a
// preferência desligada, o bairro some de onde os outros leem (anúncio, pedido, cabeçalho de pergunta,
// resposta e publicação de grupo). O dado continua guardado: religar mostra de novo. O bairro do
// perfil (opcional) é o que aparece nos cabeçalhos; anúncio e pedido levam o bairro que a pessoa escolheu.
const hoodShown=x=>!!x&&!!x.hood&&!(x.mine&&!state.prefs.showHood);
// "Bairro · " já escapado para HTML; vazio quando a pessoa não quer mostrar. plain=true devolve texto puro.
const hoodTag=(x,sep=' · ',plain=false)=>hoodShown(x)?(plain?x.hood:esc(x.hood))+sep:'';
// Sufixo do cabeçalho de conteúdo próprio: " · Parque 10", só com a preferência ligada e um bairro no perfil.
const ownHoodSuffix=mine=>mine&&state.prefs.showHood&&state.profile.hood?` · ${esc(state.profile.hood)}`:'';
// Rodada 67: filtro de bairro e Mapa em toda cidade com base de bairros (data/demo/bairros.js).
const cityHasHoods=(city=state.city)=>hoodsOf(city).length>0;
// Ponto de partida da distância: o bairro do perfil, só na cidade onde a pessoa mora.
const hoodOrigin=(city=state.city)=>city===state.homeCity?hoodInfo(state.profile.hood,city):null;
// Rodada 66: nos formulários, o campo de bairro com busca (shell/hood-picker.js), em qualquer cidade.
function hoodField(id,value='',city=state.homeCity,help){return hoodPicker(id,'Bairro',value,{city,...(help?{help}:{})});}
