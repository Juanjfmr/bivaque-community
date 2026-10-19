const KEY='bivaque-material-web-v3';
const CITY_NAMES=Object.keys(SOURCE.cities);
const CAT_NAMES=['Todos','Climatização','Elétrica','Mecânica','Saúde','Pets','Mudança','Comida','Aulas','Refrigeração','Beleza','Outros'];
const PHOTO_BY_ITEM={i1:'sofa',i2:'apartment',i3:'crib',i4:'fridge',i5:'interior',i6:'interior'};
const PHOTO_BY_BIZ={b1:'service',b2:'moving',b3:'kitchen',b4:'cake',b5:'classroom',b6:'service',b7:'workshop',b8:'pets',b9:'dentist'};
const KNOWLEDGE_TEXT={
 saude:'Nesta conversa de exemplo, os moradores recomendaram confirmar diretamente com a clínica a disponibilidade, o atendimento infantil e a cobertura do plano. Consulte a página do negócio e peça essas informações antes de agendar.',
 escola:'As famílias sugeriram visitar a escola, confirmar a série e o horário integral e testar o trajeto nos horários de entrada e saída. A disponibilidade de vagas precisa ser confirmada diretamente com a instituição.',
 casa:'A recomendação da comunidade é combinar por escrito o serviço, o valor e o horário antes da visita. O relato original e os negócios relacionados aparecem abaixo.',
 carro:'Moradores compartilharam experiências de atendimento. Antes de contratar, peça orçamento detalhado, confirme a garantia do serviço e combine a autorização de peças e mão de obra.',
 pets:'As famílias indicaram confirmar com a clínica os horários, o endereço e a disponibilidade antes de sair. A indicação da comunidade está vinculada à página do negócio.',
 mudanca:'Quem já se mudou recomendou comparar propostas com embalagem, montagem, prazo, seguro e documentação dos itens. Combine a coleta e a entrega por escrito.'
};
const MEMORY_BIZ={saude:'b9',escola:'b5',casa:'b6',carro:'b7',pets:'b8',mudanca:'b2'};
