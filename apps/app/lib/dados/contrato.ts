import type { Json, Tables } from "../../../../supabase/database.generated"

// Projeções do contrato público. Metadados visuais do HTML ficam separados;
// os IDs demonstrativos nunca são enviados ao backend por esta porta de leitura.
export type Localidade = Pick<Tables<"localities">, "id" | "city_name" | "state_code">
type Apresentacao = { apresentacao: Json }
export type Grupo = Pick<Tables<"groups">, "id" | "name" | "description" | "locality_id"> &
  Apresentacao
export type Publicacao = Pick<
  Tables<"posts">,
  "id" | "content" | "group_id" | "user_id" | "locality_id"
> &
  Apresentacao
export type Comentario = Pick<Tables<"comments">, "id" | "content" | "post_id" | "user_id"> &
  Apresentacao
export type Pergunta = Pick<
  Tables<"recommendation_requests">,
  "id" | "title" | "body" | "is_resolved" | "locality_id"
> &
  Apresentacao
export type Resposta = Pick<
  Tables<"recommendation_replies">,
  "id" | "request_id" | "author_id" | "body"
> &
  Apresentacao
export type Anuncio = Pick<
  Tables<"listings">,
  | "id"
  | "title"
  | "kind"
  | "price_cents"
  | "neighborhood"
  | "description"
  | "status"
  | "locality_id"
  | "owner_user_id"
> &
  Apresentacao
export type Evento = Pick<
  Tables<"events">,
  "id" | "title" | "venue" | "starts_at" | "locality_id" | "organizer_id" | "status" | "description"
> &
  Apresentacao
export type Negocio = Pick<
  Tables<"provider_profiles">,
  "id" | "display_name" | "category" | "bio" | "owner_user_id"
> &
  Apresentacao
export type Conversa = Pick<Tables<"dm_conversations">, "id" | "participant_a" | "participant_b"> &
  Partial<Pick<Tables<"dm_conversations">, "context_type" | "context_id">> &
  Apresentacao
export type Mensagem = Pick<
  Tables<"dm_messages">,
  "id" | "content" | "conversation_id" | "sender_id" | "created_at"
>
export type Aviso = Pick<
  Tables<"notifications">,
  "id" | "action" | "target_id" | "target_type" | "read_at"
> &
  Apresentacao

export interface DadosDaCidade {
  localidade: Localidade
  grupos: Grupo[]
  publicacoes: Publicacao[]
  comentarios: Comentario[]
  perguntas: Pergunta[]
  respostas: Resposta[]
  anuncios: Anuncio[]
  eventos: Evento[]
  negocios: Negocio[]
  conversas: Conversa[]
  mensagens: Mensagem[]
  avisos: Aviso[]
}

export interface ResumoDaCasca {
  cidade: string
  cidadeDeCasa: string
  avisos: number
  conversas: number
  nomeDaPessoa: string
}

export interface DadosDoApp {
  lerCidade(cidade: string, opcoes?: { signal?: AbortSignal }): Promise<DadosDaCidade>
  resumoDaCasca(): ResumoDaCasca
  imagem(referencia: string): string
  auxiliares(): Json
}
