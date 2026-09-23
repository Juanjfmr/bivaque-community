// Rascunho de publicação — armazenamento do PRÓPRIO navegador (RECON-014).
//
// O texto nunca vai para o servidor nem para armazenamento compartilhado. A
// chave é namespaced por usuário e locality: trocar de conta no mesmo navegador
// não pode revelar o rascunho anterior. A audiência persistida é apenas uma
// preferência local; o insert continua sendo autorizado pelo servidor.

const DRAFT_KEY_PREFIX = "bivaque.post-draft.v2"
const AUDIENCE_KEY_PREFIX = "bivaque.post-audience.v1"

export interface PostDraftScope {
  ownerId: string
  localityId: string
  audienceKey: string
}

export interface PostDraft extends PostDraftScope {
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

function draftKey(ownerId: string): string {
  return `${DRAFT_KEY_PREFIX}:${encodeURIComponent(ownerId)}`
}

function audienceStorageKey(ownerId: string, localityId: string): string {
  return `${AUDIENCE_KEY_PREFIX}:${encodeURIComponent(ownerId)}:${encodeURIComponent(localityId)}`
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
  const ownerId = text("ownerId")
  const localityId = text("localityId")
  const audienceKey = text("audienceKey")
  if (!ownerId || !localityId || !audienceKey) return null

  return {
    ownerId,
    localityId,
    audienceKey,
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
}

/** Lê o rascunho do membro e locality atuais; null quando não há ou o acesso é negado. */
export function loadPostDraft(
  ownerId: string | null | undefined,
  localityId: string,
): PostDraft | null {
  if (!ownerId) return null
  try {
    const store = storage()
    if (!store) return null
    const raw = store.getItem(draftKey(ownerId))
    if (raw === null) return null
    const draft = parseDraft(raw)
    if (!draft || draft.ownerId !== ownerId || draft.localityId !== localityId) return null
    return draft
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

/** Grava os campos correntes no namespace do membro/locality. */
export function savePostDraftFields(fields: PostDraftFields, scope: PostDraftScope): boolean {
  if (!scope.ownerId || !scope.localityId || !scope.audienceKey) return false
  return savePostDraft({ ...scope, ...fields, savedAt: Date.now() })
}

/** Grava o rascunho. false quando o navegador recusa armazenamento. */
export function savePostDraft(draft: PostDraft): boolean {
  try {
    const store = storage()
    if (!store) return false
    store.setItem(draftKey(draft.ownerId), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

/** Remove somente o rascunho do membro atual. */
export function clearPostDraft(ownerId: string | null | undefined): boolean {
  if (!ownerId) return false
  try {
    const store = storage()
    if (!store) return false
    store.removeItem(draftKey(ownerId))
    return true
  } catch {
    return false
  }
}

/** Guarda a última audiência escolhida, sem guardar conteúdo. */
export function savePostAudience(
  ownerId: string | null | undefined,
  localityId: string,
  audienceKey: string,
): boolean {
  if (!ownerId || !localityId || !audienceKey) return false
  try {
    const store = storage()
    if (!store) return false
    store.setItem(audienceStorageKey(ownerId, localityId), audienceKey)
    return true
  } catch {
    return false
  }
}

/** Recupera a preferência local; a autorização real é revalidada pelo compositor. */
export function loadPostAudience(
  ownerId: string | null | undefined,
  localityId: string,
): string | null {
  if (!ownerId) return null
  try {
    const store = storage()
    if (!store) return null
    return store.getItem(audienceStorageKey(ownerId, localityId))
  } catch {
    return null
  }
}
