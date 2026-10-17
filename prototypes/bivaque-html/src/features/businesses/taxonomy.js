// Rodada 12: grupos de serviço com especialidade opcional (lista aprovada pelo usuário em
// 15/10/2026). Substitui as 11 categorias soltas do HTML original em pedidos, negócios e
// indicações. Empresa sem especialidade marcada atende o grupo todo.
const SERVICE_GROUPS=[
 ['Casa e reparos',['Elétrica','Hidráulica','Pintura','Pedreiro e reforma','Pequenos reparos','Montagem de móveis','Chaveiro','Vidraçaria e serralheria']],
 ['Climatização e eletrodomésticos',['Instalação de ar','Limpeza de ar','Conserto de ar','Geladeira e freezer','Máquina de lavar','Fogão e micro-ondas']],
 ['Limpeza e jardim',['Diarista','Faxina pesada','Pós-obra ou mudança','Sofá e estofados','Dedetização','Jardinagem','Piscina']],
 ['Mudança e transporte',['Mudança completa','Embalagem','Frete e carreto','Guarda-móveis','Transporte de veículo','Montagem e desmontagem']],
 ['Veículos',['Mecânica','Elétrica automotiva','Funilaria e pintura','Pneus e alinhamento','Lavagem','Despachante']],
 ['Saúde',['Clínico geral','Pediatria','Dentista','Psicologia','Fisioterapia','Nutrição']],
 ['Beleza e bem-estar',['Cabelo','Barbearia','Unhas','Estética','Massagem','Personal trainer']],
 ['Educação',['Reforço escolar','Idiomas','Música','Preparatório e concursos','Informática']],
 ['Pets',['Veterinário','Banho e tosa','Hospedagem e pet sitter','Passeador','Adestramento','Transporte de pet']],
 ['Festas e comida',['Bolos e doces','Salgados','Marmitas','Buffet','Decoração','Fotografia e vídeo']],
 ['Tecnologia',['Celular','Computador','Internet e redes','TV e instalação','Câmeras e alarmes']],
 ['Documentos e consultoria',['Contabilidade e IR','Advocacia','Tradução','Corretor de imóveis','Seguros']],
 ['Outros',[]]
];
const GROUP_NAMES=SERVICE_GROUPS.map(g=>g[0]);
function groupSpecs(group){return SERVICE_GROUPS.find(g=>g[0]===group)?.[1]||[];}
function specOk(b,spec){return !spec||!b?.specs?.length||b.specs.includes(spec);}
// Categorias do HTML original (dados de exemplo e estado já salvo) → grupo e especialidade.
const LEGACY_CATS={'Climatização':['Climatização e eletrodomésticos'],'Refrigeração':['Climatização e eletrodomésticos','Geladeira e freezer'],'Elétrica':['Casa e reparos','Elétrica'],'Mecânica':['Veículos','Mecânica'],'Mudança':['Mudança e transporte'],'Comida':['Festas e comida'],'Aulas':['Educação'],'Beleza':['Beleza e bem-estar']};
function migrateBizCategory(b){const m=b&&LEGACY_CATS[b.cat];if(!m)return b;return {...b,cat:m[0],specs:b.specs?.length?b.specs:m[1]?[m[1]]:[]};}
function migrateRequestCategory(r){const m=LEGACY_CATS[r.cat];if(!m)return r;return {...r,cat:m[0],spec:r.spec??m[1]??null};}
function normalizeCategories(s){return {...s,biz:s.biz.map(migrateBizCategory),myBiz:s.myBiz?migrateBizCategory(s.myBiz):s.myBiz,requests:s.requests?.map(migrateRequestCategory)};}
// Especialidade escolhida em formulário: vazia ou da lista do grupo.
function specField(id,group,value,label='Especialidade (opcional)'){const specs=groupSpecs(group);return specs.length?selectField(id,label,[['','Qualquer especialidade'],...specs],specs.includes(value)?value:'','class="full"'):'';}
