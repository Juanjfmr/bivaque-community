// Rodada 63: "Mostrar meu bairro" (Configurações). Só vale para o que a própria pessoa publicou: com a
// preferência desligada, o bairro some de onde os outros leem (anúncio, pedido, cabeçalho de pergunta,
// resposta e publicação de grupo). O dado continua guardado: religar mostra de novo. O bairro do
// perfil (opcional) é o que aparece nos cabeçalhos; anúncio e pedido levam o bairro que a pessoa escolheu.
const hoodShown=x=>!!x&&!!x.hood&&!(x.mine&&!state.prefs.showHood);
// "Bairro · " já escapado para HTML; vazio quando a pessoa não quer mostrar. plain=true devolve texto puro.
const hoodTag=(x,sep=' · ',plain=false)=>hoodShown(x)?(plain?x.hood:esc(x.hood))+sep:'';
// Sufixo do cabeçalho de conteúdo próprio: " · Parque 10", só com a preferência ligada e um bairro no perfil.
const ownHoodSuffix=mine=>mine&&state.prefs.showHood&&state.profile.hood?` · ${esc(state.profile.hood)}`:'';
// Só Manaus tem a lista de bairros e as coordenadas do mapa; nas outras cidades não há filtro de bairro nem Mapa.
const HOOD_CITIES=['Manaus'];
const cityHasHoods=(city=state.city)=>HOOD_CITIES.includes(city);
// Rodada 64: nos formulários, cidade sem lista de bairros pede um texto livre e opcional (não os bairros de Manaus).
function hoodField(id,value='',city=state.homeCity){return cityHasHoods(city)?selectField(id,'Bairro',[['','Escolher bairro'],...HOODS],value,'required'):field(id,'Bairro (opcional)',value,'maxlength="60"');}
