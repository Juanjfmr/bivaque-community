import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { cidadeDaSessao, ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Interesses depois da entrada (F10 / RUN-160): os grupos da cidade que a
// pessoa marcou, para ler, trocar e limpar. Interesse é par usuário↔grupo
// (migration 20260821000003), e o conjunto é gravado pelo RPC canônico
// `record_user_group_interests` — o mesmo da entrada e da web antiga.
//
// `user_group_interests` é tabela operacional: não tem grant para o cliente da
// sessão, só para `service_role`. Por isso as duas rotas usam o cliente de
// serviço com autorização explícita aqui no código, DEPOIS de `exigirSessao`, e
// passam sempre o id da sessão — nunca um id do corpo. Como a leitura é
// privilegiada, a sessão sozinha não é permissão: a admissão da pessoa
// (verificação própria ou familiar admitido) é conferida antes de tudo, como a
// tela web fazia em `interests-actions.ts` (RUN-163).
//
// A cidade é a do vínculo `current` da sessão (ADR-20261105 §3.3). Grupo de
// outra cidade é recusado pelo próprio RPC (42501), que vira 409. Por isso a
// leitura devolve `interesses` sempre dentro de `grupos`: o que sobrou de uma
// cidade anterior não volta para a folha nem é reenviado no Salvar.

const CORPO_MAXIMO = 32 * 1024
const LIMITE_DE_GRUPOS = 20
const FORA_DA_CIDADE = "42501"
const NAO_ADMITIDO = "Conclua a verificação de acesso para escolher interesses."

type GruposLidos = { readonly ok: true; readonly grupos: string[] } | { readonly ok: false }

type Servico = NonNullable<ReturnType<typeof clienteDeServicoOuNulo>>

/**
 * A admissão da pessoa, a mesma que a tela web exigia antes da troca: verificação
 * própria `verified` OU convite familiar aceito. O dependente familiar entra sem
 * CPF e sem verificação própria (D16), então exigir `verified` recusaria
 * exatamente quem o convite admitiu; a regra do familiar fica no banco
 * (`has_verified_family_holder`), nunca no cliente.
 *
 * `null` é "não deu para conferir", que não é o mesmo que "não foi admitido":
 * quem não conseguiu conferir não lê nem grava, e a rota responde 503. A segunda
 * leitura só acontece para quem não é verificado.
 */
async function admissao(servico: Servico, userId: string): Promise<boolean | null> {
  try {
    const status = await servico.rpc("read_verification_status", { p_user_id: userId })
    if (status.error) return null
    // Resposta que não é lista = não deu para conferir (503). Lista VAZIA, ao
    // contrário, é legítima: é o familiar sem CPF admitido pelo titular (D16,
    // sem linha em verification_outcomes) — cai na consulta do vínculo abaixo.
    if (!Array.isArray(status.data)) return null
    const linha = status.data[0]
    if (linha !== undefined && linha.status === "verified") return true

    const familia = await servico.rpc("has_verified_family_holder", { p_user_id: userId })
    if (familia.error || typeof familia.data !== "boolean") return null
    return familia.data
  } catch {
    return null
  }
}

/**
 * Lê a lista de grupos do corpo. Ausente, fora de array, item que não é UUID ou
 * mais de 20 itens é recusa; duplicado (inclusive variante de caixa) sai antes
 * de gravar, porque a chave `(user_id, group_id)` não aceita o mesmo id duas
 * vezes na mesma gravação.
 */
function lerGrupos(bruto: unknown): GruposLidos {
  if (!Array.isArray(bruto) || bruto.length > LIMITE_DE_GRUPOS) return { ok: false }

  const grupos: string[] = []
  const vistos = new Set<string>()
  for (const item of bruto) {
    if (typeof item !== "string" || !ehUuid(item)) return { ok: false }
    const id = item.toLowerCase()
    if (vistos.has(id)) continue
    vistos.add(id)
    grupos.push(id)
  }
  return { ok: true, grupos }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const cabecalhos = sessao.sessao.cabecalhos
  const userId = sessao.sessao.usuario.id

  // A admissão vem antes de qualquer leitura de grupo: a lista é lida com
  // service_role, então a sessão sozinha não é permissão (PORT-005).
  const admitida = await admissao(servico, userId)
  if (admitida === null) {
    return responder(request, { erro: "admissao-indisponivel" }, 503, cabecalhos)
  }
  if (!admitida) {
    return responder(request, { erro: "nao-admitido", mensagem: NAO_ADMITIDO }, 403, cabecalhos)
  }

  try {
    const cidade = await cidadeDaSessao(servico, userId)
    // Sem vínculo atual não há cidade para escopar o que se oferece.
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 409, cabecalhos)

    const [disponiveis, gravados] = await Promise.all([
      servico.rpc("list_available_groups_for_interests", {
        p_user_id: userId,
        p_locality_id: cidade.id,
      }),
      servico.rpc("list_user_group_interests", { p_user_id: userId }),
    ])
    if (disponiveis.error) throw disponiveis.error
    if (gravados.error) throw gravados.error

    const grupos = disponiveis.data.map((grupo) => ({
      id: grupo.id,
      nome: grupo.name,
      jaMembro: grupo.already_member,
    }))
    // Trocar de cidade não apaga os interesses antigos, e o RPC recusa o conjunto
    // inteiro quando um grupo é de outra cidade (42501). Devolver só os que estão
    // em `grupos` mantém `interesses ⊆ grupos`: a folha não reenvia o passado, e o
    // replace-set do Salvar o descarta.
    const daCidade = new Set(grupos.map((grupo) => grupo.id))
    const interesses = gravados.data
      .map((interesse) => interesse.group_id)
      .filter((id) => daCidade.has(id))

    return responder(request, { grupos, interesses }, 200, cabecalhos)
  } catch (falha) {
    // A mensagem do banco não volta para o cliente nem os ids entram no log.
    log.error("voce interests: read failed", {
      error: falha instanceof Error ? falha.message : "erro desconhecido",
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503, cabecalhos)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403, sessao.sessao.cabecalhos)

  const lido = await lerCorpoJson(request, CORPO_MAXIMO)
  if (!lido.ok) {
    const erro = lido.status === 413 ? "grande-demais" : "corpo-invalido"
    return responder(request, { erro }, lido.status, sessao.sessao.cabecalhos)
  }

  const grupos = lerGrupos(lido.corpo["grupos"])
  if (!grupos.ok) {
    return responder(request, { erro: "grupos-invalidos" }, 400, sessao.sessao.cabecalhos)
  }

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const cabecalhos = sessao.sessao.cabecalhos
  const userId = sessao.sessao.usuario.id

  // Mesma admissão da leitura: gravar interesse é dado da pessoa, e a escrita é
  // feita com service_role depois desta conferência.
  const admitida = await admissao(servico, userId)
  if (admitida === null) {
    return responder(request, { erro: "admissao-indisponivel" }, 503, cabecalhos)
  }
  if (!admitida) {
    return responder(request, { erro: "nao-admitido", mensagem: NAO_ADMITIDO }, 403, cabecalhos)
  }

  // A cidade é a do vínculo `current`, lida pelo id da SESSÃO: um `locality_id`
  // no corpo não escolhe a cidade de ninguém.
  let cidade: Awaited<ReturnType<typeof cidadeDaSessao>>
  try {
    cidade = await cidadeDaSessao(servico, userId)
  } catch (falha) {
    log.error("voce interests: locality read failed", {
      error: falha instanceof Error ? falha.message : "erro desconhecido",
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503, cabecalhos)
  }
  // Sem vínculo atual não há cidade para escopar os interesses: a etapa
  // anterior não terminou.
  if (cidade === null) return responder(request, { erro: "sem-cidade" }, 409, cabecalhos)

  try {
    const { error } = await servico.rpc("record_user_group_interests", {
      p_user_id: userId,
      p_locality_id: cidade.id,
      p_group_ids: grupos.grupos,
    })
    if (error) {
      // O RPC é quem decide se o grupo é da cidade da sessão. A mensagem do
      // banco fica no log; o cliente recebe o motivo curto.
      log.error("voce interests write failed", { error: error.message })
      if (error.code === FORA_DA_CIDADE) {
        return responder(request, { erro: "grupo-de-outra-cidade" }, 409, cabecalhos)
      }
      return responder(request, { erro: "gravacao-indisponivel" }, 503, cabecalhos)
    }

    return responder(request, { ok: true, interesses: grupos.grupos }, 200, cabecalhos)
  } catch (falha) {
    log.error("voce interests: write failed", {
      error: falha instanceof Error ? falha.message : "erro desconhecido",
    })
    return responder(request, { erro: "gravacao-indisponivel" }, 503, cabecalhos)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
