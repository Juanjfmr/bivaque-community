// PORT-006 (lote 4 da entrada) — o conteúdo da Ajuda, transcrito de
// `HELP_TOPICS` em prototypes/bivaque-html/src/features/support/help.js.
//
// Divergências propositais, todas para não descrever o que o produto não faz:
//   * "Neste teste nenhum e-mail é enviado" (recuperar a senha) saiu — no
//     Bivaque real o e-mail do link é enviado;
//   * "Neste teste o chamado fica só neste aparelho" também saiu — o chamado de
//     quem tem conta fica registrado no servidor;
//   * "deslize a pergunta" virou o menu da própria publicação (⋮), que é como o
//     Next oferece Ocultar;
//   * apagar a conta: o Next confirma com a marcação do aviso, não digitando
//     APAGAR.
export type HelpTopic = Readonly<{
  id: string
  icon: string
  questions: ReadonlyArray<readonly [question: string, answer: string]>
  subtitle: string
  title: string
}>

export const HELP_TOPICS: ReadonlyArray<HelpTopic> = [
  {
    id: "conta",
    icon: "badge",
    subtitle: "CPF, convite, senha",
    title: "Conta e entrada",
    questions: [
      [
        "Por que pedem o CPF?",
        "Para confirmar seu vínculo na fonte oficial. O número só é conferido e não fica salvo no Bivaque.",
      ],
      [
        "Sou cônjuge ou dependente. Como entro?",
        "Pelo convite de quem é militar, veterano ou pensionista. Essa pessoa cria o código em Você → Família convidada. O convite vale só para o e-mail de quem foi convidado, por 7 dias, e não pede CPF.",
      ],
      [
        "A fonte oficial não confirmou meu vínculo.",
        "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado.",
      ],
      [
        "Esqueci a senha.",
        "Na tela Entrar, toque em Esqueci minha senha e informe seu e-mail. O link para criar uma senha nova chega na hora.",
      ],
      [
        "Como apago minha conta?",
        "Em Você → Configurações → Conta e privacidade → Excluir conta. A exclusão é permanente e não pode ser desfeita.",
      ],
    ],
  },
  {
    id: "comunidade",
    icon: "forum",
    subtitle: "Perguntas, grupos, encontros",
    title: "Comunidade",
    questions: [
      [
        "Como peço uma indicação?",
        "Em Comunidade, toque em Perguntar e escreva sua dúvida. Quem conhece a cidade responde, e você marca a resposta que ajudou.",
      ],
      [
        "Como edito ou excluo o que publiquei?",
        "Abra a pergunta, a resposta, a publicação, o comentário ou o encontro e toque em ⋮. Só quem publicou vê Editar e Excluir. Excluir não pode ser desfeito.",
      ],
      [
        "Como oculto uma pergunta?",
        "Abra o menu da pergunta e toque em Ocultar. Só você deixa de vê-la. Para mostrar de novo, vá em Você → Configurações → Ocultados.",
      ],
      [
        "Como entro num grupo e confirmo presença num encontro?",
        "Em Comunidade → Grupos, escolha o grupo e entre. Os encontros ficam na Agenda: toque em Confirmar presença. Se o encontro mudar ou for cancelado, quem confirmou é avisado.",
      ],
    ],
  },
  {
    id: "anuncios",
    icon: "sell",
    subtitle: "Publicar, editar, pedir orçamento",
    title: "Anúncios e negócios",
    questions: [
      [
        "Como publico um anúncio?",
        "Toque em Criar e escolha Desapego ou Imóvel. Só perfis verificados publicam, e só na sua cidade; nas outras você consulta.",
      ],
      [
        "Como edito, encerro ou excluo um anúncio?",
        "Em Você → Meus anúncios, abra o anúncio. Você pode editar, marcar como encerrado, reativar ou excluir.",
      ],
      [
        "Como peço orçamento ou serviço?",
        "Na página de um negócio, toque em Pedir orçamento. Para receber propostas de vários prestadores, abra Pedidos de serviço em Você: até 5 empresas respondem e você escolhe.",
      ],
      [
        "Como indico um negócio?",
        "Na página do negócio, toque em Indicar este negócio e conte sua experiência.",
      ],
      [
        "O Bivaque cobra ou intermedeia pagamento?",
        "Não. Valor e pagamento são combinados entre vocês. Desconfie de quem pede pagamento adiantado.",
      ],
    ],
  },
  {
    id: "seguranca",
    icon: "verified_user",
    subtitle: "Bloquear, denunciar, privacidade",
    title: "Segurança",
    questions: [
      [
        "Como bloqueio uma pessoa?",
        "No ⋮ de uma resposta, comentário ou publicação dela, no menu da conversa ou na página do anúncio, toque em Bloquear. Você deixa de ver o que ela publica e ela não fala mais com você; ela não é avisada. Desbloqueie em Configurações → Pessoas bloqueadas.",
      ],
      [
        "Como denuncio um conteúdo?",
        "Use Denunciar no anúncio, na pergunta, na resposta, no comentário, na publicação, na conversa, na página do negócio ou no pedido de serviço. Escolha o motivo; a equipe analisa e pode remover o conteúdo ou limitar a conta.",
      ],
      [
        "Quem vê meus dados?",
        "Só membros confirmados da família militar. Seu bairro só aparece se você permitir, em Configurações → Mostrar meu bairro.",
      ],
      [
        "O que faço diante de um golpe?",
        "Não envie dinheiro adiantado nem códigos recebidos por mensagem. Denuncie o anúncio e combine a entrega num local movimentado.",
      ],
      [
        "O que acontece se eu apagar minha conta?",
        "Seus anúncios, perguntas e páginas saem da comunidade. Suas respostas e indicações ficam, sem o seu nome, e suas conversas são apagadas para você.",
      ],
    ],
  },
]

// Rótulos do chamado, iguais aos do protótipo (`TICKET_TOPICS`).
export const TICKET_TOPICS: ReadonlyArray<readonly [value: string, label: string]> = [
  ["conta", "Conta"],
  ["comunidade", "Comunidade"],
  ["anuncios", "Anúncios"],
  ["seguranca", "Segurança"],
  ["outro", "Outro"],
]
