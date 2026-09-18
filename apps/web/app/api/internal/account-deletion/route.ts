import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Purga de contas com exclusão pedida e vencida (RECON-052,
// ADR-20260914-exclusao-de-conta).
//
// Quem chama é o pg_cron, por private.account_deletion_dispatch_due(): o banco
// reserva o lote e entrega os ids; esta rota é a única que fala com o GoTrue e
// com o Storage. Mesmo desenho do worker do outbox, pelo mesmo motivo — o
// segredo compartilhado é a fronteira, e sem ele a rota não é uma porta.
//
// Ordem por conta, e ela é deliberada:
//
//   0. o endereço de contato é lido e os dados que casam por ele (opt-out, fila
//      de entrega, lista de espera) são apagados ANTES do soft delete: o GoTrue
//      troca o e-mail por uma cadeia aleatória, e uma tentativa repetida nunca
//      mais acharia o endereço real. Falhar aqui aborta sem purgar nada;
//   1. mídias pessoais no bucket (avatar e documento de verificação, ambos
//      organizados por <user_id>/...), paginadas até acabar. Se falhar, nada foi
//      apagado ainda e a tentativa seguinte repete sem efeito colateral —
//      remover objeto ausente é no-op;
//   2. auth.admin.deleteUser(id, true): soft delete do GoTrue apaga credencial
//      e identidade e MANTÉM a linha de auth.users, que é o que segura a FK do
//      conteúdo público (posts/comments são ON DELETE CASCADE);
//   3. finalize_account_deletion: higieniza o dado pessoal e marca a purga.
//
// Antes da etapa 3 a conta ainda tem dado pessoal, então uma falha em 1 ou 2
// não pode marcar nada como concluído.
//
// O prazo é lido da própria linha do pedido ANTES de qualquer passo destrutivo:
// uma chamada fora do vencimento não pode apagar credencial nenhuma. A palavra
// final continua sendo do RPC, que compara due_at com o relógio do banco — as
// duas checagens são independentes, e a do banco é a que vale.

// O mesmo limite de private.account_deletion_batch_size().
const MAX_BATCH = 20

const AVATAR_BUCKET = "avatars"
const VERIFICATION_BUCKET = "verification-documents"

// Buckets de mídia PESSOAL. Fotos de anúncio, de evento, de comunidade e de
// pedido são conteúdo (ADR item 4): ficam onde estão, atribuídas ao
// display_name que a purga preserva.
const PERSONAL_BUCKETS = [AVATAR_BUCKET, VERIFICATION_BUCKET]

function secretMatches(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  )
}

// Página do Storage: 100 é o teto do list(), não o teto do titular. Um bucket
// com mais de 100 objetos e uma única chamada deixaria resíduo para trás — e a
// linha seria marcada como purgada mesmo assim.
const PAGE_SIZE = 100
const MAX_PAGES = 50

async function purgePersonalMedia(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  for (const bucket of PERSONAL_BUCKETS) {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const { data: objects, error: listError } = await supabase.storage
        .from(bucket)
        .list(userId, { limit: PAGE_SIZE, offset: page * PAGE_SIZE })

      if (listError) {
        return `${bucket}: ${listError.message}`
      }
      if (!objects || objects.length === 0) {
        break
      }

      const paths = objects.map((object) => `${userId}/${object.name}`)
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths)
      if (removeError) {
        return `${bucket}: ${removeError.message}`
      }

      if (objects.length < PAGE_SIZE) {
        break
      }

      // Teto de segurança: passou de MAX_PAGES, é melhor falhar e tentar de
      // novo do que marcar como purgado com resíduo.
      if (page === MAX_PAGES - 1) {
        return `${bucket}: more objects than the purge page ceiling`
      }
    }
  }

  return null
}

export async function POST(request: Request) {
  const expectedSecret = process.env["ACCOUNT_DELETION_WORKER_SECRET"]
  if (!expectedSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 })
  }

  const providedSecret = request.headers.get("x-account-deletion-secret")
  if (!providedSecret || !secretMatches(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const rawIds = (body as { user_ids?: unknown }).user_ids
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const ids = [
    ...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  ]
  if (ids.length === 0 || ids.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 })
  }

  const supabase = createServerClient()
  const outcomes: Record<string, string> = {}

  for (const id of ids) {
    // Pré-checagem do vencimento: nada destrutivo acontece antes dela.
    const { data: request, error: requestError } = await supabase
      .from("account_deletion_requests")
      .select("user_id, due_at, finalized_at")
      .eq("user_id", id)
      .maybeSingle()

    if (requestError) {
      log.error("account deletion lookup failed", { user_id: id, error: requestError.message })
      outcomes[id] = "lookup_failed"
      continue
    }
    if (!request) {
      outcomes[id] = "not_found"
      continue
    }
    if (request.finalized_at !== null) {
      outcomes[id] = "already_purged"
      continue
    }
    if (new Date(request.due_at).getTime() > Date.now()) {
      outcomes[id] = "not_due"
      continue
    }

    // O endereço de contato é PRECONDITION, não detalhe: o soft delete troca o
    // e-mail por uma cadeia aleatória, então sem ele a limpeza por endereço
    // (opt-out, fila de entrega, lista de espera) nunca mais acha nada. Falha
    // aqui não pode virar purga parcial.
    const { data: account, error: accountError } = await supabase.auth.admin.getUserById(id)
    if (accountError) {
      log.error("account deletion contact lookup failed", {
        user_id: id,
        error: accountError.message,
      })
      outcomes[id] = "lookup_failed"
      continue
    }
    const contactEmail = account?.user?.email ?? null

    // Antes do soft delete, pelo motivo acima. Idempotente: repetir é no-op.
    // Conta sem endereço (só telefone, por exemplo) não tem o que limpar por
    // endereço — e o RPC não recebe null: ou há endereço, ou não há chamada.
    if (contactEmail !== null) {
      const { error: contactError } = await supabase.rpc("purge_account_contact_data", {
        p_user_id: id,
        p_contact_email: contactEmail,
      })
      if (contactError) {
        log.error("account deletion contact purge failed", {
          user_id: id,
          error: contactError.message,
        })
        outcomes[id] = "contact_failed"
        continue
      }
    }

    const mediaError = await purgePersonalMedia(supabase, id)
    if (mediaError) {
      // Sem marcar falha no banco: a linha do pedido continua pendente e a
      // tentativa seguinte repete a limpeza de mídia.
      log.error("account deletion media purge failed", { user_id: id, error: mediaError })
      outcomes[id] = "media_failed"
      continue
    }

    // Antes de apagar a credencial: resolver o que a purga deixaria pendurado
    // (decisões de 18/09/2026, RECON-052-FOLLOWUP). Posse de comunidade/grupo
    // passa a um moderador aprovado e, sem moderador, à operação; vitrine e
    // anúncios encerram; pedidos de serviço abertos com a conta entre as partes
    // cancelam. Sem isto, sobra comunidade sem dono, anúncio de telefone que não
    // existe e pedido aberto com uma ponta que nunca responde.
    const { error: settleError } = await supabase.rpc("settle_account_possessions", {
      p_user_id: id,
    })
    if (settleError) {
      // Antes de qualquer coisa destrutiva: a linha do pedido segue pendente e a
      // tentativa seguinte repete. Apagar a credencial com posse pendurada
      // deixaria o estrago sem quem responder por ele.
      log.error("account deletion possession settlement failed", {
        user_id: id,
        error: settleError.message,
      })
      outcomes[id] = "settle_failed"
      continue
    }

    // shouldSoftDelete = true. O hard delete levaria junto posts, comentários,
    // comunidades e vínculos de terceiros por CASCADE — contra o item 4 do ADR.
    const { error: authError } = await supabase.auth.admin.deleteUser(id, true)
    if (authError) {
      log.error("account deletion auth delete failed", { user_id: id, error: authError.message })
      outcomes[id] = "auth_failed"
      continue
    }

    const { data, error: finalizeError } = await supabase.rpc("finalize_account_deletion", {
      p_user_id: id,
    })

    if (finalizeError) {
      // A credencial já foi apagada, mas o dado pessoal ainda não: a linha
      // continua pendente e a próxima execução tenta de novo. O erro fica
      // registrado na própria linha do pedido (sem conteúdo pessoal).
      log.error("account deletion finalize failed", { user_id: id, error: finalizeError.message })
      await supabase.rpc("finalize_account_deletion", {
        p_user_id: id,
        p_error: finalizeError.message,
      })
      outcomes[id] = "finalize_failed"
      continue
    }

    outcomes[id] = data ?? "error"
  }

  const summary = Object.values(outcomes).reduce<Record<string, number>>((accumulator, outcome) => {
    accumulator[outcome] = (accumulator[outcome] ?? 0) + 1
    return accumulator
  }, {})

  // Evento operacional por execução (ADR item 8). Sem e-mail, sem nome e sem
  // qualquer conteúdo da conta: só id, desfecho e contagem.
  log.info("account deletion purge processed batch", {
    processed: ids.length,
    outcomes: summary,
  })

  return NextResponse.json({ processed: ids.length, outcomes })
}
