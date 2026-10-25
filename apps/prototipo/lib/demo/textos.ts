// PROTO-001 — os textos da jornada, tirados do protótipo de HTML
// (`prototypes/bivaque-html/src/features/...`). Ficam num lugar só para a tela
// não repetir string e para a troca pela copy real ser um arquivo.
//
// A pessoa da demonstração é a do protótipo (`prototypes/bivaque-html/src/app/state.js`).

export const CIDADE = "Manaus"

export const PESSOA = {
  id: "pessoal-rafael",
  nome: "Rafael Souza",
  iniciais: "RS",
  bairro: "Flores",
} as const

// Mesmos exemplos que giram na busca do Início
// (`features/home/views.js`, HOME_SEARCH_EXAMPLES).
export const EXEMPLOS_DE_BUSCA = [
  "diarista de confiança",
  "escola perto de casa",
  "berço",
  "apartamento de 2 quartos",
  "pediatra pelo plano",
] as const

export const ATALHOS = [
  { id: "negocios", rotulo: "Negócios" },
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
  { id: "indicacoes", rotulo: "Indicações" },
] as const

export const EM_BREVE_SELO = "Em breve"

export const INICIO = {
  tituloAntes: "O que você precisa em",
  buscar: "Buscar no Bivaque",
  buscarNota: "A busca ainda não funciona aqui.",
  perguntas: "A comunidade procura",
  verPerguntas: "Ver perguntas",
  perguntasVazio: "Uma pergunta pode ajudar muita gente",
  perguntasVazioTexto: "Busque uma indicação ou compartilhe uma dúvida com sua cidade.",
} as const

export const COMUNIDADE = {
  titulo: "Comunidade",
  subtitulo: "O que a comunidade sabe fica disponível para quem chegar depois.",
  abaIndicacoes: "Indicações",
  abaGrupos: "Grupos",
  gruposEmBreve: "Em breve",
  perguntar: "Perguntar",
  resolvidas: (n: number) => `${n} ${n === 1 ? "indicação resolvida" : "indicações resolvidas"}`,
  resolvidasTexto: "Busque uma resposta antes de perguntar.",
  filtros: { ajudar: "Para ajudar", resolvidas: "Resolvidas", minhas: "Minhas" },
  notaAjudar: "Perguntas sem resposta aparecem primeiro. Responder leva um minuto.",
  vazioAjudar: "Ninguém esperando resposta",
  vazio: "Nenhuma pergunta por aqui",
  vazioTexto: "Você pode buscar uma indicação ou iniciar uma nova pergunta.",
  pedirIndicacao: "Pedir indicação",
} as const

export const LISTA = {
  mostrando: (n: number, total: number) => `Mostrando ${n} de ${total} perguntas`,
  carregandoMais: (n: number) => `Carregando mais ${n}…`,
  mostrarMais: (n: number) => `Mostrar mais ${n}`,
  visto: (total: number) => `Você viu as ${total} perguntas`,
  fimTitulo: "Não achou sua dúvida?",
  fimTexto: "Pergunte: quem mora aqui responde.",
} as const

export const PERGUNTAR = {
  titulo: "Pedir indicação",
  campoTitulo: "Sua pergunta",
  campoDetalhe: "Detalhe (opcional)",
  campoDetalheNota: "Inclua o que você precisa e o bairro, se fizer diferença.",
  parecidas: "Uma resposta já pode ajudar",
  parecidasNada:
    "Nenhuma pergunta resolvida com esses termos. Sua pergunta pode ajudar a próxima família.",
  nota: (cidade: string) => `Sua pergunta aparece para a comunidade de ${cidade}.`,
  cancelar: "Cancelar",
  publicar: "Publicar pergunta",
  publicada: "Pergunta publicada",
  curta: "Escreva uma pergunta com um pouco mais de contexto.",
} as const

export const PERGUNTA = {
  respostas: "Respostas",
  resolvida: "Resolvida",
  semResposta: "Sem resposta",
  resposta: (n: number) => `${n} ${n === 1 ? "resposta" : "respostas"}`,
  autor: "Sua indicação",
  membro: "Membro da comunidade",
  ajudou: "Ajudou a resolver",
  util: "Útil",
  resolver: "Ajudou a resolver",
  reabrir: "Reabrir pergunta",
  seguir: "Seguir respostas",
  pararDeSeguir: "Parar de seguir respostas",
  seguiu: "Você acompanha as respostas",
  deixouDeSeguir: "Você deixou de acompanhar",
  resolvidaAviso: "Resolvida. Sua experiência fica disponível para a comunidade.",
  reabertaAviso: "Pergunta reaberta",
  respostasVazio: "A comunidade ainda não respondeu",
  respostasVazioTexto:
    "Sua pergunta já está disponível. Você pode acompanhar as respostas por aqui.",
  compor: "Compartilhe uma indicação",
  campo: "Sua resposta",
  enviar: "Enviar indicação",
  enviada: "Indicação enviada",
  naoEncontrada: "Não encontramos esta pergunta",
  naoEncontradaTexto: "Confira o endereço ou volte ao início.",
  irParaInicio: "Ir para o início",
} as const

export const MINHAS = {
  titulo: "Minhas perguntas e indicações",
  subtitulo: "Seu histórico de participação na comunidade.",
  vazio: "Seu histórico começa aqui",
  vazioTexto: "Uma dúvida sua pode virar uma resposta útil para outras famílias.",
} as const

export const EM_BREVE = {
  conversas: "Conversas",
  voce: "Você",
  selo: "Em breve",
} as const

export const ERRO = {
  titulo: "Não conseguimos carregar as indicações.",
  texto: "Tente de novo em alguns minutos.",
  tentar: "Tentar de novo",
} as const

export const CARREGANDO = "Carregando as indicações" as const
