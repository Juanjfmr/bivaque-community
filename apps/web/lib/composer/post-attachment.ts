// Anexo da publicação → `post_type` e colunas extras de `public.posts`.
//
// Este módulo existe porque derivar o tipo num lugar e montar as colunas extras
// noutro é exatamente como uma coluna extra entra sem o `post_type` que a CHECK
// correspondente exige. `derivePostType` é a ÚNICA fonte das duas coisas, e
// `attachmentPublishBlocker` é a única fonte da trava do anexo ligado-e-vazio.
//
// Extraído de feed-post-create.tsx — o objeto `derived` e as duas guardas do
// handleSubmit — SEM mudança de comportamento: mesmas entradas, mesmas saídas,
// mesmas frases, mesma ordem de checagem. Não é validação de formato: é não
// deixar anexo visível virar anexo nenhum em silêncio.

/** Anexo é um só: `public.posts` guarda `photo_path` OU `link_url` sob CHECKs
 *  que exigem o `post_type` correspondente, então dois anexos ao mesmo tempo
 *  são um estado que o banco não sabe representar. */
export type PostAttachment = "photo" | "link" | null

/** Os três `post_type` que o compositor sabe produzir. Não há `poll`: o produto
 *  não tem enquete e nenhum caminho grava `poll_options`. */
export type DerivedPostTypeName = "text" | "photo" | "link"

/** As colunas extras que o anexo REAL produz. Sem anexo, nenhuma. */
export interface PostAttachmentColumns {
  photo_path?: string
  link_url?: string
}

export interface DerivedPostType {
  postType: DerivedPostTypeName
  extras: PostAttachmentColumns
}

/** Dica da TELA DE ENTRADA: qual anexo já vem oferecido ao abrir. Nunca escolhe
 *  o formato — qualquer valor fora dos dois anexos reais é nenhum anexo. */
export function normalizeAttachment(value: string | undefined): PostAttachment {
  return value === "photo" || value === "link" ? value : null
}

/** O ANEXO REAL deriva o formato E as colunas extras, num único objeto. É por
 *  isso que as quatro CHECKs de `public.posts` valem por construção:
 *    sem anexo → text   (nem photo_path, nem link_url)
 *    com foto  → photo  (só photo_path)  → post_photo_requires_photo_type
 *    com link  → link   (só link_url)    → post_link_requires_link_type
 *                                        → post_link_type_requires_url
 *    poll_options NUNCA é gravado — não há caminho que o produza
 *                                        → post_poll_requires_poll_type
 *
 *  Anexo LIGADO e VAZIO cai no ramo `text`. É justamente por isso que
 *  `attachmentPublishBlocker` existe: sem a trava, quem liga "Foto", escolhe o
 *  arquivo e publica ENQUANTO o envio acontece — ou quem abre o seletor e não
 *  escolhe nada — viajaria como pergunta de TEXTO, com o `post_type` certo e a
 *  pessoa perdendo, sem aviso, uma ação que ela mesma tomou. */
export function derivePostType(
  attachment: PostAttachment,
  photoPath: string,
  linkUrl: string,
): DerivedPostType {
  const photo = photoPath.trim()
  const link = linkUrl.trim()
  if (attachment === "photo" && photo) {
    return { postType: "photo", extras: { photo_path: photo } }
  }
  if (attachment === "link" && link) {
    return { postType: "link", extras: { link_url: link } }
  }
  return { postType: "text", extras: {} }
}

/** null = pode publicar. String = a frase que diz o que fazer (anexar ou
 *  desligar o anexo), uma por anexo. A ordem é a mesma do compositor original:
 *  foto primeiro, link depois. */
export function attachmentPublishBlocker(
  attachment: PostAttachment,
  photoPath: string,
  linkUrl: string,
): string | null {
  if (attachment === "photo" && !photoPath.trim()) {
    return "Anexe a foto ou desligue o anexo de foto para publicar."
  }
  if (attachment === "link" && !linkUrl.trim()) {
    return "Informe o endereço do link ou desligue o anexo de link para publicar."
  }
  return null
}

/** As colunas que a EDIÇÃO grava. O destino nunca muda (a prancha 45 trava o
 *  seletor); o que muda é o texto e a foto:
 *    foto presente               → photo, com o caminho
 *    post de foto sem foto agora → text, photo_path null (a pessoa removeu a
 *                                  foto; `photo` sem foto violaria o sentido do
 *                                  tipo e deixaria o cartão com imagem quebrada)
 *    demais casos                → o tipo original, sem tocar em photo_path
 *  Link não é editado aqui: um post de link mantém tipo e `link_url`. */
export interface EditedPostColumns {
  content: string
  post_type: string
  photo_path?: string | null
}

export function deriveEditedPost(
  originalType: string,
  content: string,
  photoPath: string,
): EditedPostColumns {
  const photo = photoPath.trim()
  if (originalType === "link") return { content, post_type: "link" }
  if (photo) return { content, post_type: "photo", photo_path: photo }
  if (originalType === "photo") return { content, post_type: "text", photo_path: null }
  return { content, post_type: originalType }
}
