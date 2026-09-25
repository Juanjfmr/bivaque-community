"use client"

// Barrel público do módulo de publicação. As consumidoras (/inicio,
// /community, /communities/[id], /groups/[id], app-shell) importam daqui e
// não mudam: nomes, tipos e assinaturas são os mesmos de antes da separação
// da RECON-014. A divisão é por responsabilidade — cartão em
// feed-post-card, criação em feed-post-create, edição em feed-post-edit — e
// os arquivos novos abaixo de 500 linhas cada.

export { FeedPost, type FeedPostProps } from "./feed-post-card"
export { CreatePostPage } from "./feed-post-create"
export { EditPostPage } from "./feed-post-edit"
export type { FeedPostRow } from "./feed-post-shared"
