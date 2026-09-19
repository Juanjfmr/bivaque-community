// RUN-004 / O06 — destino da rota de compatibilidade `/community`.
//
// O contrato O06 pede: sem `post`, encaminhar ao início; com `post`, ao detalhe
// estável, "preservando autorização" e "migrando produtores de links antes de
// retirar o caminho antigo".
//
// DRIFT REAL, registrado aqui em vez de disfarçado: a spec supõe que `?post=`
// tem um detalhe estável. Ele não existe. `?post=` sempre carregou um id de
// `public.posts` — é o que a notificação `comment` grava
// (20260802001400_personal_notifications.sql:90, target_type 'post') e o que o
// "copiar link" do card produz. A rota `/publicacoes/[id]`, por sua vez, lê
// `recommendation_requests`: outra tabela, outra entidade. Encaminhar o id de
// um post para lá renderiza "sem acesso" para conteúdo que é do próprio dono —
// mentira pior que o feed antigo.
//
// Enquanto `posts` não tiver rota de detalhe, o destino honesto do id é o
// container que de fato o renderiza: o feed de `/inicio`, com o parâmetro
// preservado para o foco (mesmo comportamento de rolar-e-destacar que a página
// antiga tinha). Id que o feed não contém simplesmente não foca — não existe
// caminho por onde a rota conte que aquele post existe.
//
// Regra pura, longe do JSX, para ser auditável sem navegador:
//   - ausente, repetido, vazio ou só espaços  -> início, sem parâmetro;
//   - fora do formato canônico de UUID        -> início, sem parâmetro;
//   - UUID canônico                           -> início, com foco naquele id.
//
// Parâmetro repetido (`?post=a&post=b`) chega como array: escolher um dos dois
// seria arbitrar qual link a pessoa quis, então também vai ao início.

import type { Route } from "next"

export const LEGACY_COMMUNITY_HOME = "/inicio" as Route

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LegacyCommunityTarget = {
  /** "publicacao" quando há id canônico a focar; "inicio" em qualquer outro caso. */
  kind: "publicacao" | "inicio"
  /** Caminho interno absoluto do encaminhamento. */
  path: Route
}

/** Endereço do feed com foco num post — o permalink que substitui `/community?post=`. */
export function postFocusHref(postId: string): Route {
  return `${LEGACY_COMMUNITY_HOME}?post=${postId.toLowerCase()}` as Route
}

export function legacyCommunityTarget(
  post: string | string[] | null | undefined,
): LegacyCommunityTarget {
  const home: LegacyCommunityTarget = { kind: "inicio", path: LEGACY_COMMUNITY_HOME }
  if (typeof post !== "string") return home

  const candidate = post.trim()
  if (!UUID_PATTERN.test(candidate)) return home

  // Canonicaliza a caixa: o destino é o mesmo registro, e a URL fica estável.
  return { kind: "publicacao", path: postFocusHref(candidate) }
}
