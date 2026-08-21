export type GuideTopic =
  | "moradia"
  | "escola"
  | "mudanca"
  | "saude"
  | "clima"
  | "mobilidade"
  | "casa"
  | "internet"
  | "carro"
  | "seguranca"
  | "pets"
  | "rotina"
  | "lazer"

export type SourceKind = "oficial" | "comunidade" | "referencia"

export interface GuideSource {
  label: string
  url: string
  kind: SourceKind
}

export interface GuideTask {
  id: string
  topic: GuideTopic
  title: string
  body: string
  action: string
  sources?: GuideSource[]
}

export interface GuidePhase {
  id: string
  label: string
  range: string
  minDay: number
  maxDay: number
  title: string
  intro: string
  tasks: GuideTask[]
}

export const GUIDE_LAST_REVIEWED = "21 de agosto de 2026"

const sources = {
  tourism: {
    label: "Prefeitura de Manaus — turismo",
    url: "https://www.manaus.am.gov.br/turismo/o-que-ver-e-fazer-em-manaus/",
    kind: "oficial" as const,
  },
  culture: {
    label: "Secretaria de Cultura do Amazonas",
    url: "https://cultura.am.gov.br/duvidas-frequentes/",
    kind: "oficial" as const,
  },
  teatro: {
    label: "Teatro Amazonas — visitação",
    url: "https://cultura.am.gov.br/espacos-culturais/teatros/teatro-amazonas/",
    kind: "oficial" as const,
  },
  inmetJuly: {
    label: "INMET — climatologia de julho",
    url: "https://portal.inmet.gov.br/noticias/balan%C3%A7o-manaus-am-teve-chuva-acima-da-m%C3%A9dia-em-julho-de-2023",
    kind: "oficial" as const,
  },
  inmetSeptember: {
    label: "INMET — climatologia de setembro",
    url: "https://portal.inmet.gov.br/noticias/balan%C3%A7o-manaus-am-teve-chuva-acima-da-m%C3%A9dia-em-setembro-2023",
    kind: "oficial" as const,
  },
  water: {
    label: "Águas de Manaus — canais e serviços",
    url: "https://www.aguasdemanaus.com.br/aguas-de-manaus-registra-mais-de-600-mil-atendimentos-no-ano/",
    kind: "oficial" as const,
  },
  energy: {
    label: "Amazonas Energia — atendimento",
    url: "https://website.amazonasenergia.com/destaques/amazonas-energia-inaugura-nova-loja-no-bairro-flores/",
    kind: "oficial" as const,
  },
  energyStandard: {
    label: "Amazonas Energia — padrão de entrada",
    url: "https://website.amazonasenergia.com/informacoes/padrao-de-entrada/",
    kind: "oficial" as const,
  },
  passafacil: {
    label: "Prefeitura — PassaFácil 2026",
    url: "https://www.manaus.am.gov.br/semcom/semana-passafacil/",
    kind: "oficial" as const,
  },
  studentPass: {
    label: "Prefeitura — PassaFácil Estudantil 2026",
    url: "https://www.manaus.am.gov.br/noticia/nota/gratuidade-transporte-coletivo-estudantes/",
    kind: "oficial" as const,
  },
  samu: {
    label: "SAMU Manaus — orientação 192",
    url: "https://www.manaus.am.gov.br/semcom/orientacao-samu-manaus/",
    kind: "oficial" as const,
  },
  vaccines: {
    label: "Semsa — atualização vacinal",
    url: "https://www.manaus.am.gov.br/semsa/atualizacao-vacinal/",
    kind: "oficial" as const,
  },
  detran: {
    label: "Detran-AM — mudança de município",
    url: "https://www.detran.am.gov.br/servicos/mudanca-de-municipio-do-veiculo/",
    kind: "oficial" as const,
  },
  creci: {
    label: "CRECI-AM — consulta e atendimento",
    url: "https://portal.creci-am.gov.br/",
    kind: "oficial" as const,
  },
  civilDefense: {
    label: "Defesa Civil Manaus — Central 199",
    url: "https://www.manaus.am.gov.br/noticia/nota/tres-ocorrencias-em-razao-da-chuva/",
    kind: "oficial" as const,
  },
  rabies: {
    label: "Semsa — campanha antirrábica 2026",
    url: "https://www.manaus.am.gov.br/noticia/prevencao/prefeitura-semsa-etaparural-vacinacaoantirrabica/",
    kind: "oficial" as const,
  },
  redditHousing: {
    label: "r/Manaus — mudança e moradia",
    url: "https://www.reddit.com/r/Manaus/comments/1otgpbp/mudando_para_manaus/",
    kind: "comunidade" as const,
  },
  redditHousing2026: {
    label: "r/Manaus — moradia em 2026",
    url: "https://www.reddit.com/r/Manaus/comments/1srnjrv/moradia_em_manaus/",
    kind: "comunidade" as const,
  },
  redditInternet: {
    label: "r/Manaus — provedores em 2026",
    url: "https://www.reddit.com/r/Manaus/comments/1tzvf0m/indica%C3%A7%C3%A3o_de_provedores_de_internet/",
    kind: "comunidade" as const,
  },
  redditSchools: {
    label: "r/Manaus — família e escolas",
    url: "https://www.reddit.com/r/Manaus/comments/1vsxxml/mudando_com_a_fam%C3%ADlia_para_manaus_recomenda%C3%A7%C3%B5es/",
    kind: "comunidade" as const,
  },
} satisfies Record<string, GuideSource>

export const TOPIC_LABELS: Record<GuideTopic, string> = {
  moradia: "Moradia",
  escola: "Escola e filhos",
  mudanca: "Mudança",
  saude: "Saúde",
  clima: "Clima",
  mobilidade: "Mobilidade",
  casa: "Casa e serviços",
  internet: "Internet",
  carro: "Carro",
  seguranca: "Segurança",
  pets: "Pets",
  rotina: "Rotina",
  lazer: "Conhecer Manaus",
}

export const TOPIC_ORDER: GuideTopic[] = [
  "moradia",
  "escola",
  "mudanca",
  "saude",
  "clima",
  "mobilidade",
  "casa",
  "internet",
  "carro",
  "seguranca",
  "pets",
  "rotina",
  "lazer",
]

export const MANAUS_QUICK_FACTS = [
  {
    title: "O bairro certo é o que encurta sua rotina",
    body: "Em Manaus, uma distância curta no mapa pode significar uma experiência bem diferente conforme o horário. Antes de fechar imóvel, faça o trajeto até a sua OM, a escola e os compromissos principais no horário em que você realmente vai circular.",
    source: sources.redditHousing,
  },
  {
    title: "Calor é a constante; chuva é que muda",
    body: "O meio do ano tende a ser mais seco, e agosto/setembro costumam apertar no calor. Ar-condicionado, hidratação, sombra e horário de atividade física entram na rotina, não são detalhe de conforto.",
    source: sources.inmetSeptember,
  },
  {
    title: "Não escolha internet só pela marca",
    body: "A experiência muda por rua, prédio e rota da operadora. Pergunte a dois vizinhos do mesmo condomínio antes de contratar e, se trabalho remoto for crítico, pense em redundância com 5G.",
    source: sources.redditInternet,
  },
  {
    title: "Chegar provisório por alguns dias pode economizar meses",
    body: "Se você não conhece a cidade, uma hospedagem curta dá tempo para visitar imóvel, testar trânsito, ouvir vizinhos e conferir o entorno de dia e à noite antes de assinar um contrato longo.",
    source: sources.redditHousing2026,
  },
]

export const MANAUS_NEIGHBORHOODS = [
  {
    name: "Adrianópolis e Vieiralves",
    profile: "Centralidade, serviços e vida urbana",
    goodFor:
      "Quem quer mercado, restaurantes, clínicas e deslocamentos relativamente centrais por perto.",
    watch:
      "Aluguel costuma ser mais alto e a experiência muda bastante entre ruas. Verifique barulho e trânsito noturno no quarteirão.",
  },
  {
    name: "Parque 10 e Parque das Laranjeiras",
    profile: "Equilíbrio para família",
    goodFor:
      "Boa oferta de serviços, condomínios e acesso a eixos importantes sem ficar tão distante de várias regiões da cidade.",
    watch:
      "Parque 10 é grande. Falar só o nome do bairro não basta: simule a rota a partir do endereço exato.",
  },
  {
    name: "Flores, Chapada e Dom Pedro",
    profile: "Praticidade e acesso",
    goodFor:
      "Opções interessantes para quem prefere ficar perto de corredores centrais e quer comparar custo com bairros mais disputados.",
    watch:
      "Faça a vistoria da rua e da drenagem no entorno; na época chuvosa, a micro-localização pesa muito.",
  },
  {
    name: "Ponta Negra e Planalto",
    profile: "Condomínio, lazer e Zona Oeste",
    goodFor: "Quem valoriza condomínios, a orla e uma rotina mais voltada para a Zona Oeste.",
    watch:
      "Pode ficar excelente ou cansativo dependendo da sua OM e da escola. Não feche pelo apelo da orla sem testar o horário de pico.",
  },
  {
    name: "Centro, Cachoeirinha e Japiim",
    profile: "Localização funcional para alguns destinos",
    goodFor:
      "Podem fazer sentido quando o trabalho ou a rotina está mais ao Sul/Centro e o objetivo é reduzir deslocamento.",
    watch:
      "A leitura precisa ser de rua, não de bairro. Visite de dia e à noite e confira estacionamento, ruído, comércio e segurança do quarteirão.",
  },
]

export const MANAUS_CONTACTS = [
  { label: "Polícia", value: "190", note: "emergência de segurança" },
  { label: "SAMU", value: "192", note: "urgência médica" },
  { label: "Bombeiros", value: "193", note: "incêndio e salvamento" },
  { label: "Defesa Civil", value: "199", note: "alagamento, desabamento e risco estrutural" },
]

export const MANAUS_PHASES: GuidePhase[] = [
  {
    id: "d60",
    label: "Planejar",
    range: "D-60 a D-31",
    minDay: -60,
    maxDay: -31,
    title: "Decida o que não pode ser improvisado",
    intro:
      "Dois meses antes, o objetivo não é comprar passagem e caixa. É tirar as grandes incertezas: onde morar, como a família vai funcionar e o que precisa chegar antes de você.",
    tasks: [
      {
        id: "d60-map-routine",
        topic: "moradia",
        title: "Monte o mapa da sua vida antes de procurar apartamento",
        body: "Marque sua OM, escola ou creche, academia, mercado e qualquer compromisso fixo. Depois procure imóveis a partir dessas rotas. Manaus pune a escolha feita só por reputação do bairro: um endereço muito bom do outro lado da cidade pode custar duas horas por dia.",
        action: "Definir 3 regiões-alvo e simular os trajetos no horário real",
        sources: [sources.redditHousing, sources.redditHousing2026],
      },
      {
        id: "d60-school",
        topic: "escola",
        title: "Fale com escolas antes de fechar o bairro",
        body: "Para quem chega com filhos, escola e moradia precisam ser decididas juntas. Pergunte por vaga na série, turno, adaptação no meio do ano, lista de material, transporte e horário de entrada/saída. Uma escola excelente pode virar uma escolha ruim se criar dois picos de trânsito por dia.",
        action: "Montar uma shortlist de escolas e confirmar vaga, turno e calendário",
        sources: [sources.redditSchools],
      },
      {
        id: "d60-move-mode",
        topic: "mudanca",
        title: "Decida o que vai por mudança, avião e mala de primeira semana",
        body: "Não mande tudo no mesmo lote. Separe uma mala de sobrevivência para 7 a 10 dias com documentos, fardamento essencial, remédios, roupa leve, itens da criança e o que você precisa para trabalhar. A mudança pode cumprir o prazo; sua rotina não pode depender disso.",
        action: "Criar inventário em três colunas: comigo, carga, comprar em Manaus",
      },
      {
        id: "d60-climate-kit",
        topic: "clima",
        title: "Revise o que sua casa precisa para o clima daqui",
        body: "Ar-condicionado não é item de luxo para muita gente em Manaus; é parte da rotina de sono e trabalho. Ao avaliar imóvel, olhe quantidade e estado dos aparelhos, incidência de sol, vedação, mofo e custo provável de climatização.",
        action:
          "Adicionar ar-condicionado, incidência solar e sinais de umidade à vistoria do imóvel",
        sources: [sources.inmetJuly, sources.inmetSeptember],
      },
      {
        id: "d60-health",
        topic: "saude",
        title: "Atualize vacinas e organize receitas contínuas",
        body: "Confira caderneta de adultos e crianças com antecedência e leve receitas, relatórios e exames de quem faz acompanhamento. A Semsa reforça a atualização vacinal e cita a febre amarela entre as vacinas que merecem atenção em viagens; quando aplicável ao caso, a proteção não é imediata.",
        action: "Revisar vacinas, receitas, relatórios e estoque de medicação para a transição",
        sources: [sources.vaccines],
      },
      {
        id: "d60-pet",
        topic: "pets",
        title: "Planeje a chegada do pet como uma mudança separada",
        body: "Confirme regras da companhia aérea ou transportadora, caixa de transporte, vacinas e documentos veterinários. Também vale perguntar se o condomínio aceita o animal e como é o entorno para passeio; no calor, o horário muda bastante.",
        action: "Confirmar transporte, documentos veterinários e regra do condomínio",
        sources: [sources.rabies],
      },
    ],
  },
  {
    id: "d30",
    label: "Fechar",
    range: "D-30 a D-8",
    minDay: -30,
    maxDay: -8,
    title: "Transforme pesquisa em endereço e datas",
    intro:
      "Agora você começa a fechar coisas — mas ainda com margem para corrigir. O erro mais caro desta fase é assinar um contrato só porque a foto e o bairro parecem bons.",
    tasks: [
      {
        id: "d30-rent",
        topic: "moradia",
        title: "Não pague sinal de imóvel que ninguém confiável visitou",
        body: "Se você ainda estiver fora de Manaus, use corretor com registro verificável ou alguém de confiança para visitar. Peça vídeo contínuo do imóvel e do corredor/rua, confira quem está negociando e leia contrato e vistoria. Pressa de transferência é exatamente o cenário em que anúncio falso funciona.",
        action:
          "Validar corretor no CRECI, visitar o imóvel e revisar contrato/vistoria antes de pagar",
        sources: [sources.creci, sources.redditHousing],
      },
      {
        id: "d30-commute-test",
        topic: "mobilidade",
        title: "Teste o trajeto em terça ou quinta, não no domingo",
        body: "Abra o mapa no mesmo horário em que você vai sair para o trabalho e para buscar criança. Faça isso em mais de um dia. A diferença entre ‘perto’ e ‘prático’ aparece quando a cidade está funcionando de verdade.",
        action: "Registrar tempo de ida e volta das 2 melhores opções de moradia",
        sources: [sources.redditHousing2026],
      },
      {
        id: "d30-internet",
        topic: "internet",
        title: "Descubra qual internet funciona naquele prédio",
        body: "Cobertura no site da operadora é só o começo. Pergunte ao porteiro e a dois moradores quais provedores realmente estão instalados, se a fibra chega até o apartamento e como é a estabilidade. Se sua renda depende de conexão, tenha um plano B móvel.",
        action: "Confirmar disponibilidade e opinião de vizinhos no endereço exato",
        sources: [sources.redditInternet],
      },
      {
        id: "d30-utilities",
        topic: "casa",
        title: "Combine com o proprietário como água e energia serão entregues",
        body: "Defina por escrito se as contas chegam ativas e quando a titularidade muda. Águas de Manaus e Amazonas Energia oferecem troca de titularidade e outros serviços por canais próprios; isso fica muito mais simples quando você já tem matrícula/conta anterior e contrato em mãos.",
        action: "Pedir ao locador última conta de água e energia e alinhar a troca de titularidade",
        sources: [sources.water, sources.energy],
      },
      {
        id: "d30-car",
        topic: "carro",
        title: "Se o carro vai junto, decida a estratégia documental",
        body: "Quem muda o registro do veículo para o Amazonas precisa de vistoria e agendamento no Detran-AM. Não deixe para descobrir o fluxo depois que o carro chegou: confira documentos, pendências e o que será necessário para a mudança de município.",
        action: "Conferir CRLV-e, débitos, vistoria e agenda do Detran-AM",
        sources: [sources.detran],
      },
    ],
  },
  {
    id: "arrival",
    label: "Chegar",
    range: "D-7 a D+2",
    minDay: -7,
    maxDay: 2,
    title: "Proteja a primeira semana do caos da mudança",
    intro:
      "Na chegada, produtividade é ter roupa limpa, internet mínima, comida, sono e documentos acessíveis. O resto pode esperar alguns dias.",
    tasks: [
      {
        id: "arrival-first-night",
        topic: "mudanca",
        title: "Tenha plano para dormir sem depender da carga",
        body: "Se o imóvel estiver vazio, garanta colchão, roupa de cama, toalha e banho para a primeira noite. Quem chega com criança deve tratar isso como item crítico, junto com alimentação e um canto climatizado.",
        action: "Confirmar onde todos vão dormir nas primeiras 48 horas",
      },
      {
        id: "arrival-groceries",
        topic: "rotina",
        title: "Faça uma compra curta, não a compra do mês",
        body: "Nos primeiros dias, compre água, café da manhã, frutas, proteína simples, material de limpeza e itens de higiene. A compra grande faz mais sentido depois de você entender mercado, armazenamento, rotina e o quanto a casa aguenta sem virar depósito de caixas.",
        action: "Montar uma lista de 48 horas e deixar a compra grande para depois",
      },
      {
        id: "arrival-heat",
        topic: "clima",
        title: "Mude o ritmo antes de tentar vencer o calor",
        body: "Se você vem de clima mais ameno, não programe corrida, caminhada longa ou mudança pesada no meio da tarde nos primeiros dias. Beba água com frequência, use roupa leve e descubra quais horários funcionam para você e para as crianças.",
        action: "Reservar atividades externas para horários mais confortáveis na primeira semana",
        sources: [sources.inmetSeptember],
      },
      {
        id: "arrival-safety",
        topic: "seguranca",
        title: "Aprenda a rua antes de criar rotina automática",
        body: "Observe iluminação, movimento, entrada da garagem, ponto de embarque por aplicativo e onde você vai parar para descarregar compras. Segurança urbana é muito mais micro-local do que um rótulo de bairro.",
        action: "Fazer uma volta diurna e outra noturna no entorno imediato",
      },
      {
        id: "arrival-emergency",
        topic: "saude",
        title: "Salve os números de emergência agora, não quando precisar",
        body: "SAMU atende pelo 192. Polícia e Bombeiros usam 190 e 193. Em alagamento, risco de desabamento ou problema estrutural relacionado a chuva, a Defesa Civil de Manaus opera a Central 199 em regime 24 horas.",
        action: "Salvar 190, 192, 193 e 199 nos telefones da família",
        sources: [sources.samu, sources.civilDefense],
      },
    ],
  },
  {
    id: "d14",
    label: "Instalar",
    range: "D+3 a D+14",
    minDay: 3,
    maxDay: 14,
    title: "Faça a casa e a cidade começarem a trabalhar a seu favor",
    intro:
      "Passada a aterrissagem, a prioridade é eliminar atritos repetidos: conta, internet, transporte, escola e pequenos problemas da casa.",
    tasks: [
      {
        id: "d14-water-energy",
        topic: "casa",
        title: "Passe água e energia para a situação correta",
        body: "Com contrato e dados da unidade em mãos, regularize titularidade e cadastros. Aproveite para guardar matrícula, unidade consumidora e canais oficiais. Se houver instalação nova ou alteração elétrica, confirme o padrão de entrada antes de gastar com material.",
        action: "Regularizar titularidade e salvar matrícula/unidade consumidora",
        sources: [sources.water, sources.energy, sources.energyStandard],
      },
      {
        id: "d14-internet-install",
        topic: "internet",
        title: "Teste internet como ferramenta de trabalho, não só Speedtest",
        body: "Depois da instalação, faça chamada de vídeo, upload, streaming e o uso que realmente importa para você. Velocidade nominal não mostra rota ruim, perda de pacote ou Wi-Fi mal posicionado.",
        action: "Testar conexão no uso real e corrigir Wi-Fi antes de organizar o escritório",
        sources: [sources.redditInternet],
      },
      {
        id: "d14-passafacil",
        topic: "mobilidade",
        title: "Mesmo com carro, saiba usar o ônibus",
        body: "O PassaFácil pode ser solicitado por canais digitais e retirado em terminal. Talvez não seja seu transporte diário, mas ter a opção pronta ajuda dependente, filho mais velho, pane do carro e dias em que dirigir simplesmente não compensa.",
        action: "Avaliar se alguém da família precisa emitir PassaFácil",
        sources: [sources.passafacil, sources.studentPass],
      },
      {
        id: "d14-school-route",
        topic: "escola",
        title: "Ajuste a rotina escolar depois da primeira semana real",
        body: "Cronometre entrada e saída, veja onde estacionar, como fica a chuva e quem consegue buscar em emergência. Se houver transporte escolar, peça referência de outras famílias e combine claramente horário e ponto.",
        action: "Fechar plano A e plano B para levar e buscar as crianças",
      },
      {
        id: "d14-maintenance",
        topic: "casa",
        title: "Faça manutenção preventiva do ar-condicionado cedo",
        body: "Se o aparelho veio com o imóvel e você não conhece o histórico, limpeza e avaliação inicial evitam descobrir filtro saturado ou dreno ruim na pior noite. Fotografe qualquer problema preexistente e alinhe responsabilidade com o locador.",
        action: "Verificar limpeza, dreno e funcionamento dos aparelhos da casa",
      },
      {
        id: "d14-pet-vet",
        topic: "pets",
        title: "Escolha veterinário e rota de emergência antes de precisar",
        body: "Depois que o pet assentou, localize clínica de rotina e atendimento 24h razoavelmente próximos. Confira também vacinação antirrábica e proteção contra parasitas conforme orientação veterinária local.",
        action: "Salvar clínica de rotina e opção de emergência para o pet",
        sources: [sources.rabies],
      },
    ],
  },
  {
    id: "d30plus",
    label: "Criar rotina",
    range: "D+15 a D+30",
    minDay: 15,
    maxDay: 30,
    title: "Pare de viver como recém-chegado",
    intro:
      "A cidade começa a ficar mais fácil quando você deixa de resolver tudo do zero. Este é o momento de escolher seus lugares, horários e atalhos.",
    tasks: [
      {
        id: "d30plus-market",
        topic: "rotina",
        title: "Escolha mercado, feira e farmácia de rotina",
        body: "Compare preço, estacionamento, horário e tempo de fila. Para frutas regionais, farinha, peixes e ingredientes amazônicos, vale conhecer mercados e feiras além das grandes redes — mas escolha um lugar prático para o dia comum.",
        action: "Definir um mercado rápido, um mercado grande e uma farmácia de referência",
        sources: [sources.tourism],
      },
      {
        id: "d30plus-health-network",
        topic: "saude",
        title: "Mapeie onde sua família vai buscar atendimento",
        body: "Separe urgência de consulta de rotina. Salve a UBS de referência, hospital ou pronto atendimento do seu plano quando houver e o caminho até eles. Em emergência com risco à vida, o SAMU orienta pelo 192.",
        action: "Salvar UBS, atendimento do plano e rota de urgência",
        sources: [sources.samu],
      },
      {
        id: "d30plus-car-rain",
        topic: "carro",
        title: "Aprenda onde sua rota acumula água",
        body: "Na estação chuvosa, uma via que funciona todos os dias pode mudar rápido sob chuva forte. Observe os pontos críticos das suas rotas e não tente atravessar trecho alagado para economizar alguns minutos.",
        action: "Identificar uma rota alternativa para casa, escola e trabalho",
        sources: [sources.civilDefense],
      },
      {
        id: "d30plus-culture",
        topic: "lazer",
        title: "Faça um primeiro fim de semana de Manaus, sem maratona turística",
        body: "Teatro Amazonas e Largo de São Sebastião formam uma boa primeira leitura do Centro. Em outro dia, conheça Mercado Adolpho Lisboa e a Ponta Negra. Melhor ver a cidade em blocos do que tentar ‘zerar Manaus’ num sábado de calor.",
        action: "Escolher dois passeios urbanos para fazer com calma",
        sources: [sources.tourism, sources.teatro],
      },
      {
        id: "d30plus-food",
        topic: "lazer",
        title: "Descubra o Amazonas pelo prato",
        body: "Tambaqui, matrinxã, pirarucu, x-caboquinho, tucumã, farinha do Uarini e frutas regionais aparecem de jeitos muito diferentes pela cidade. Comece simples: pergunte a quem mora aqui onde vai quando quer comer bem, não onde leva turista.",
        action: "Experimentar um peixe regional e um café da manhã com tucumã",
        sources: [sources.tourism],
      },
    ],
  },
  {
    id: "d60plus",
    label: "Pertencer",
    range: "D+31 a D+60",
    minDay: 31,
    maxDay: 60,
    title: "Agora transforme endereço em pertencimento",
    intro:
      "Depois de um mês, as pendências grandes diminuem. O que melhora sua experiência daqui para frente é gente, repertório local e uma rotina que não depende de improviso.",
    tasks: [
      {
        id: "d60plus-community",
        topic: "rotina",
        title: "Entre nas comunidades que realmente fazem parte da sua vida",
        body: "Vila, escola, esporte, igreja, turma de corrida ou outra circunstância recorrente: é aí que aparecem os melhores atalhos locais. O Bivaque existe para tirar esse conhecimento do ruído e fazer a boa resposta continuar útil depois.",
        action: "Entrar nas comunidades e grupos que correspondem à sua rotina real",
      },
      {
        id: "d60plus-review-home",
        topic: "moradia",
        title: "Reavalie a casa com um mês de uso real",
        body: "Veja conta de energia, ruído, trânsito, internet, calor nos cômodos e pequenos defeitos que só aparecem com rotina. Se algo precisa ser negociado com o locador, faça enquanto a vistoria e a chegada ainda estão frescas.",
        action: "Fazer uma revisão da casa e registrar pendências com foto",
      },
      {
        id: "d60plus-nature",
        topic: "lazer",
        title: "Saia da capital com operador e plano, não por impulso",
        body: "Encontro das Águas, Presidente Figueiredo e outros passeios de natureza são parte da experiência de morar aqui. Confirme operador, horário, alimentação, roupa, sinal de celular e condições do passeio; quando houver água e trilha envolvidas, improviso custa mais.",
        action: "Planejar um passeio de natureza com logística verificada",
        sources: [sources.tourism],
      },
      {
        id: "d60plus-culture-calendar",
        topic: "lazer",
        title: "Acompanhe a agenda cultural, não só os cartões-postais",
        body: "A Secretaria de Cultura mantém programação de teatros, galerias e espaços públicos. Depois que você já viu o Teatro Amazonas, a cidade fica mais interessante quando passa a acompanhar o que está acontecendo nele e ao redor do Largo.",
        action: "Salvar a agenda de cultura do Amazonas nos favoritos",
        sources: [sources.culture],
      },
      {
        id: "d60plus-share",
        topic: "rotina",
        title: "Devolva um bizu bom para quem está chegando",
        body: "Se uma escola, prestador, clínica, transportadora ou solução de mudança realmente funcionou para você, registre a indicação com contexto. ‘É bom’ ajuda pouco; diga para quem serve, em que situação e o que você faria diferente.",
        action: "Registrar pelo menos uma indicação útil no Bivaque",
      },
    ],
  },
]

export function phaseForDay(day: number): GuidePhase | null {
  return MANAUS_PHASES.find((phase) => day >= phase.minDay && day <= phase.maxDay) ?? null
}

export function relativeDayLabel(day: number): string {
  if (day === 0) return "D"
  return day < 0 ? `D${day}` : `D+${day}`
}
