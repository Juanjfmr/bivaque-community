/**
 * O manifesto da galeria de prova: as 52 linhas da seção 7 (componentes) e os
 * 40 movimentos da seção 6, do inventário.
 *
 * A galeria existe porque a onda 1c entrega a casca e os componentes comuns, mas
 * **não** entrega as telas das ondas 2 a 8 — e um componente sem tela não tem
 * onde ser visto. Ela vive em `/app/galeria`, fora do catálogo de rotas, e só
 * desenha componente com o **modo de prova** ligado: em uso normal o endereço
 * mostra a página indisponível, como qualquer endereço fora do catálogo. Nada
 * aqui aparece na navegação real nem inventa conteúdo de produto.
 *
 * A régua não é o que a galeria diz: é o inventário. `tests/galeria.test.ts`
 * carrega a lista dos 52 ids e a dos 40 movimentos por conta própria e exige um
 * item para cada linha; `tests/e2e/componentes.spec.ts` e
 * `tests/e2e/movimento.spec.ts` exigem o mesmo no navegador.
 */

export type Consumidor = "casca 1c" | `onda ${number}`

export type ItemDaGaleria = {
  readonly id: string
  readonly titulo: string
  /** De onde o item vem no inventário (§7). */
  readonly regra: string
  /** Quem consome: a casca desta onda ou a onda que ainda vai chegar. */
  readonly consumidor: Consumidor
  /** `nota` = linha do inventário que **não** vira componente (com o porquê). */
  readonly forma: "componente" | "nota"
}

export const ITENS_DA_GALERIA: readonly ItemDaGaleria[] = [
  // ── primitivos — shell/primitives.js ──────────────────────────────────────
  {
    id: "imagem-do-asset",
    titulo: "Imagem do asset",
    regra: "§7 primitivos: image(ref) — data: URI passa, o resto devolve vazio",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "capa",
    titulo: "Capa 16/9",
    regra: "§7 primitivos: cover — foto, fallback com ícone e pílula do rótulo",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "botao",
    titulo: "Botão",
    regra: "§7 primitivos: btn — filled, tonal, text e outlined, com perigo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "botao-de-icone",
    titulo: "Botão de ícone",
    regra: "§7 primitivos: iconBtn — círculo de 44 px com nome acessível próprio",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "selecao",
    titulo: "Seleção",
    regra: "§7 primitivos: selectField — lista de opções com rótulo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "campo",
    titulo: "Campo de texto",
    regra: "§7 primitivos: field — entrada e área de texto, com rótulo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "etiqueta",
    titulo: "Etiqueta",
    regra: "§7 primitivos: pill — neutro, ok, aviso, patrocinado e informação",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "titulo-de-secao",
    titulo: "Título de seção",
    regra: "§7 primitivos: sectionTitle — h2 com ação de texto à direita",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "arte-vazia",
    titulo: "Arte vazia",
    regra: "§7 primitivos: EMPTY_ART — o desenho sem imagem nova, peso zero",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "estado-vazio",
    titulo: "Estado vazio",
    regra: "§7 primitivos: empty — arte, título, texto e ação opcional",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "cartao-de-foto",
    titulo: "Cartão de anúncio",
    regra: "§7 primitivos: photoCard — salvar, capa, preço, título e atributos",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "cartao-de-negocio",
    titulo: "Cartão de negócio",
    regra: "§7 primitivos: businessCard — mesma anatomia, com plano e indicações",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "linha-de-pergunta",
    titulo: "Linha de pergunta",
    regra: "§7 primitivos: questionRow — avatar, pergunta, autor e pílula de estado",
    consumidor: "onda 3",
    forma: "componente",
  },
  {
    id: "linha-de-encontro",
    titulo: "Linha de encontro",
    regra: "§7 primitivos: eventRow — data, título, local e presença",
    consumidor: "onda 4",
    forma: "componente",
  },

  // ── helpers puros — utilities/format.js ───────────────────────────────────
  {
    id: "sem-ponteiro-de-dom",
    titulo: "$ / $$ — não portado",
    regra: "§7 helpers: consulta de DOM imperativa; em React é ref/estado",
    consumidor: "casca 1c",
    forma: "nota",
  },
  {
    id: "sem-escape-manual",
    titulo: "esc — não portado",
    regra:
      "§7 helpers: o JSX escapa sozinho; o único escape manual é o seletor do descritor de foco",
    consumidor: "casca 1c",
    forma: "nota",
  },
  {
    id: "texto-normalizado",
    titulo: "normalizar / iniciais",
    regra: "§7 helpers: norm e initals, com o BV de reserva",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "icone",
    titulo: "Ícone",
    regra: "§7 helpers: icon — Material Symbols local, sempre aria-hidden",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "marca",
    titulo: "Marca",
    regra: "§7 helpers: mark — o símbolo do Bivaque em SVG",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "moeda",
    titulo: "Moeda",
    regra: "§7 helpers: money — real, sem centavos",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "id-local",
    titulo: "Id local",
    regra: "§7 helpers: uid — prefixo e 12 caracteres",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "data-iso",
    titulo: "Data ISO",
    regra: "§7 helpers: dateISO — YYYY-MM-DD local, com deslocamento",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "rotulo-de-data",
    titulo: "Rótulo de data",
    regra: "§7 helpers: dateLabel — dia e mês por extenso",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "dias-ate",
    titulo: "Dias até",
    regra: "§7 helpers: countDays — dias inteiros, mínimo zero",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "iniciais",
    titulo: "Iniciais",
    regra: "§7 helpers: initals — até duas letras, BV sem nome",
    consumidor: "casca 1c",
    forma: "componente",
  },

  // ── shell de estado ───────────────────────────────────────────────────────
  {
    id: "lista-paginada",
    titulo: "Lista paginada",
    regra: "§7 shell: pagedHtml — blocos de 24, carregamento ao rolar e foco no item novo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "pe-de-lista",
    titulo: "Pé de lista",
    regra: "§7 shell: pagedFootHtml, pagedSeen, pagedStatus, pagedMore, pagedWatch",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "fim-de-lista",
    titulo: "Fim de lista",
    regra: "§7 shell: askEndHtml — convite a perguntar quando a lista acaba",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "chips-de-filtro",
    titulo: "Chips de filtro",
    regra: "§7 shell: filterChips — grupo único com alvo de 44 px",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "indicador-de-segmento",
    titulo: "Indicador de segmento",
    regra: "§7 shell: segmentsAfterRender — a pílula que desliza até o chip escolhido",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "sobreposicao",
    titulo: "Sobreposição",
    regra: "§7 shell: showDialog — diálogo, folha e gaveta do mesmo componente",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "fechar-sobreposicao",
    titulo: "Fechar sobreposição",
    regra: "§7 shell: closeDialog — fecha e devolve o foco ao acionador",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "guarda-de-edicao",
    titulo: "Guarda de edição",
    regra: "§7 shell: leaveDialog — edição não salva confirma antes de sair",
    consumidor: "onda 6",
    forma: "nota",
  },
  {
    id: "confirmacao",
    titulo: "Confirmação",
    regra: "§7 shell: confirm — título, texto, Continuar e Confirmar, com perigo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "historico-da-sobreposicao",
    titulo: "Histórico da sobreposição",
    regra: "§7 shell: pushDialogHistory/dropDialogHistory — uma sobreposição, uma entrada",
    consumidor: "casca 1c",
    forma: "nota",
  },
  {
    id: "aviso",
    titulo: "Aviso",
    regra: "§7 shell: notify — pilha de 2, desfazer de 7 s e barra de tempo",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "selo-verificado",
    titulo: "Selo verificado",
    regra: "§7 shell: verifiedBadgeHtml — selo com a explicação a um toque",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "explicacao-do-selo",
    titulo: "Explicação do selo",
    regra: "§7 shell: openVerifiedInfo — as quatro linhas do que o selo significa",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "contagem-animada",
    titulo: "Contagem animada e avatares",
    regra: "§7 shell: animateCounts, countUp, countHtml e avatarStack",
    consumidor: "casca 1c",
    forma: "componente",
  },

  // ── padrões de view ───────────────────────────────────────────────────────
  {
    id: "cabeca-de-pagina",
    titulo: "Cabeça de página",
    regra: "§7 view: page-head — h1, subtítulo e ação, nas 18 telas que repetem o mesmo bloco",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "secao",
    titulo: "Seção",
    regra: "§7 view: section + section-title, com slot de ações",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "grade",
    titulo: "Grade",
    regra: "§7 view: card-grid — 1, 2, 3 ou 4 colunas conforme a largura",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "lista",
    titulo: "Lista e linha",
    regra: "§7 view: list / list-row — a base das dez linhas de uma tela só",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "cartao-de-publicacao",
    titulo: "Cartão de publicação",
    regra: "§7 view: gPostCard — pergunta, evento, enquete e oferta",
    consumidor: "onda 4",
    forma: "componente",
  },
  {
    id: "linha-de-ajuste",
    titulo: "Linha de ajuste",
    regra: "§7 view: profileRow — ícone, título, subtítulo e chevron",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "faixa-de-visita",
    titulo: "Faixa de visita",
    regra: "§7 view: readonlyHtml — conhecendo outra cidade, com a volta",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "fim-de-bloco",
    titulo: "Fim de bloco",
    regra: "§7 view: paged-end — a variante de catálogo do fim de lista",
    consumidor: "onda 5",
    forma: "componente",
  },
  {
    id: "chips",
    titulo: "Chips",
    regra: "§7 view: chip / pill — etiqueta, filtro, comodidade e sugestão",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "avatar",
    titulo: "Avatar",
    regra: "§7 view: avatar — 44 px com iniciais e a variante da própria pessoa",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "menu-de-linha",
    titulo: "Menu da linha",
    regra: "§7 view: menu ⋮ — ações do contexto com nome acessível próprio",
    consumidor: "casca 1c",
    forma: "componente",
  },
  {
    id: "acoes-do-detalhe",
    titulo: "Ações do detalhe",
    regra: "§7 view: actionsBar — a barra fixa do detalhe, com as ações da tela",
    consumidor: "onda 4",
    forma: "componente",
  },
  {
    id: "esqueleto",
    titulo: "Esqueleto — não portado",
    regra: "§7 view: não existe esqueleto geral; há o do pager e o shimmer da foto, cobertos aqui",
    consumidor: "casca 1c",
    forma: "nota",
  },
]

export type MovimentoDaGaleria = {
  readonly numero: number
  readonly nome: string
  readonly ondeVive: string
  readonly consumidor: Consumidor
}

export const MOVIMENTOS: readonly MovimentoDaGaleria[] = [
  { numero: 1, nome: "animatePage", ondeVive: "src/casca/Casca.tsx", consumidor: "casca 1c" },
  {
    numero: 2,
    nome: "foto em voo (abrir)",
    ondeVive: "não implementado — depende do detalhe",
    consumidor: "onda 5",
  },
  {
    numero: 3,
    nome: "foto em voo (voltar)",
    ondeVive: "não implementado — depende do detalhe",
    consumidor: "onda 5",
  },
  {
    numero: 4,
    nome: "cascata do detalhe",
    ondeVive: "lib/movimento.ts (atrasoDaSubida)",
    consumidor: "onda 5",
  },
  {
    numero: 5,
    nome: "cascata das listas",
    ondeVive: "lib/movimento.ts (atrasoDaLista, limiteDaCascata)",
    consumidor: "casca 1c",
  },
  {
    numero: 6,
    nome: "contador animateCounts",
    ondeVive: "components/bivaque/contador.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 7,
    nome: "celebrate",
    ondeVive: "lib/movimento.ts (animarSePossivel) + galeria",
    consumidor: "onda 3",
  },
  {
    numero: 8,
    nome: "entrada da foto (imageSettled)",
    ondeVive: "components/bivaque/esqueleto.tsx",
    consumidor: "onda 5",
  },
  {
    numero: 9,
    nome: "esqueleto da foto (img-shimmer)",
    ondeVive: "components/bivaque/esqueleto.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 10,
    nome: "abrir/fechar diálogo",
    ondeVive: "components/bivaque/sobreposicao.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 11,
    nome: "fecho do menu Criar (celular)",
    ondeVive: "src/casca/MenuCriar.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 12,
    nome: "morfo botão→painel Criar",
    ondeVive: "src/casca/MenuCriar.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 13,
    nome: "cascata do painel Criar (cp-in)",
    ondeVive: "src/casca/MenuCriar.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 14,
    nome: "paleta de comandos",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 2",
  },
  {
    numero: 15,
    nome: "dica de deslize (swipeHint)",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 16,
    nome: "encaixe do deslize",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 17,
    nome: "arrasto lateral da linha",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 18,
    nome: "retorno pela borda",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 19,
    nome: "toque longo",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 20,
    nome: "indicador de segmentos (seg-ind)",
    ondeVive: "components/bivaque/chips-de-filtro.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 21,
    nome: "barra de etapas do wizard",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 6",
  },
  {
    numero: 22,
    nome: "abertura da folha de filtros",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 5",
  },
  {
    numero: 23,
    nome: "altura da folha do bairro",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 5",
  },
  {
    numero: 24,
    nome: "arrasto da folha do bairro",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 5",
  },
  {
    numero: 25,
    nome: "encolher a página de trás (sheet-depth)",
    ondeVive: "lib/movimento.ts (paginaEncolhe) + src/casca",
    consumidor: "casca 1c",
  },
  {
    numero: 26,
    nome: "arrasto da folha de diálogo",
    ondeVive: "lib/movimento.ts (distanciaFechaFolha) + sobreposicao.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 27,
    nome: "minimizar a navegação",
    ondeVive: "lib/movimento.ts (calcularMinimizada) + src/casca/NavegacaoPrincipal.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 28,
    nome: "rótulo do Criar compacto",
    ondeVive: "src/casca/NavegacaoPrincipal.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 29,
    nome: "título que sobe (syncTopTitle)",
    ondeVive: "lib/movimento.ts (tituloDeveDocar) + src/casca/BarraDoTopo.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 30,
    nome: "barra imersiva do detalhe",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 5",
  },
  {
    numero: 31,
    nome: "balões de conversa (msg-in)",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 7",
  },
  {
    numero: 32,
    nome: "barra de tempo do aviso",
    ondeVive: "components/bivaque/avisos.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 33,
    nome: "blocos da lista longa (paged)",
    ondeVive: "components/bivaque/lista-paginada.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 34,
    nome: "estados vazios ilustrados",
    ondeVive: "components/bivaque/estado-vazio.tsx",
    consumidor: "casca 1c",
  },
  {
    numero: 35,
    nome: "press nos cartões",
    ondeVive: "src/styles.css (.bv-press)",
    consumidor: "casca 1c",
  },
  {
    numero: 36,
    nome: "pontos do celebrate (burst)",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 3",
  },
  {
    numero: 37,
    nome: "zoom da foto na galeria",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 6",
  },
  {
    numero: 38,
    nome: "troca de foto (lbSlideIn)",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 6",
  },
  {
    numero: 39,
    nome: "foto acompanha o dedo",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 6",
  },
  {
    numero: 40,
    nome: "processamento de fotos do editor",
    ondeVive: "não implementado nesta onda",
    consumidor: "onda 6",
  },
]

export function idsDaGaleria(): readonly string[] {
  return ITENS_DA_GALERIA.map((item) => item.id)
}

export const IDS_ENTREGUES_AGORA: readonly string[] = ITENS_DA_GALERIA.filter(
  (item) => item.consumidor === "casca 1c",
).map((item) => item.id)
