// Rascunho de publicação — armazenamento do PRÓPRIO navegador (RECON-014).
//
// Regras do contrato, travadas aqui e não na UI:
//  - O rascunho nunca vai para o servidor nem para qualquer armazenamento
//    compartilhado: este módulo só toca localStorage.
//  - Toda leitura e toda escrita passam por try/catch. Em aba anônima ou com
//    dados de site bloqueados o acessor LANÇA — a tela não pode quebrar por
//    causa disso; o chamador recebe null/false e segue funcionando.
//  - O rascunho nunca vira publicação sozinho: quem publica é a pessoa, com o
//    botão Publicar. Descartar rascunho é explícito e confirmável na UI; aqui,
//    clearPostDraft é chamado apenas por ação da pessoa (descartar confirmado,
//    publicação concluída, ou esvaziamento manual de todos os campos).

const DRAFT_KEY = "bivaque.post-draft.v1"

export interface PostDraft {
  postType: string
  content: string
  details: string
  linkUrl: string
  pollOptions: string[]
  photoPath: string
  /** unix-ms do último salvamento, para a UI dizer "rascunho salvo há X" */
  savedAt: number
}

export function hasDraftContent(draft: PostDraft | null | undefined): boolean {
  if (!draft) return false
  return Boolean(
    draft.content.trim() ||
      draft.details.trim() ||
      draft.linkUrl.trim() ||
      draft.pollOptions.length > 0 ||
      draft.photoPath.trim(),
  )
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

// O conteúdo do localStorage é dado não-confiável (pode ser antigo, de outra
// versão, ou corrompido por outra aba). Nada entra na UI sem validação de
// shape — nada é "confiado" só porque estava guardado.
function parseDraft(raw: string): PostDraft | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const candidate = parsed as Record<string, unknown>
  const text = (key: string): string =>
    typeof candidate[key] === "string" ? (candidate[key] as string) : ""
  const draft: PostDraft = {
    postType:
      candidate["postType"] === "photo" ||
      candidate["postType"] === "link" ||
      candidate["postType"] === "poll"
        ? (candidate["postType"] as string)
        : "text",
    content: text("content"),
    details: text("details"),
    linkUrl: text("linkUrl"),
    pollOptions: Array.isArray(candidate["pollOptions"])
      ? candidate["pollOptions"].filter((item): item is string => typeof item === "string")
      : [],
    photoPath: text("photoPath"),
    savedAt: typeof candidate["savedAt"] === "number" ? (candidate["savedAt"] as number) : 0,
  }
  return draft
}

/** Lê o rascunho salvo. null quando não há rascunho OU quando o acesso ao
 *  armazenamento é negado (aba anônima, dados de site bloqueados). */
export function loadPostDraft(): PostDraft | null {
  try {
    const store = storage()
    if (!store) return null
    const raw = store.getItem(DRAFT_KEY)
    if (raw === null) return null
    return parseDraft(raw)
  } catch {
    return null
  }
}

export interface PostDraftFields {
  postType: string
  content: string
  details: string
  linkUrl: string
  pollOptions: string[]
  photoPath: string
}

/** Grava os campos correntes como rascunho, carimbando a hora. */
export function savePostDraftFields(fields: PostDraftFields): boolean {
  return savePostDraft({ ...fields, savedAt: Date.now() })
}

/** Grava o rascunho. false quando o navegador recusa armazenamento — a UI
 *  avisa que não pôde guardar e o texto da pessoa continua no formulário. */
export function savePostDraft(draft: PostDraft): boolean {
  try {
    const store = storage()
    if (!store) return false
    store.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

/** Remove o rascunho do navegador. true quando o armazenamento estava
 *  disponível e apagou; false quando o acesso é negado (nada foi apagado
 *  porque não havia onde estar). */
export function clearPostDraft(): boolean {
  try {
    const store = storage()
    if (!store) return false
    store.removeItem(DRAFT_KEY)
    return true
  } catch {
    return false
  }
}
