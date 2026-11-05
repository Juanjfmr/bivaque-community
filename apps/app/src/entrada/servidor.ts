/**
 * Cliente do app para as rotas `/api/app/entry/*` (LAN-F01).
 *
 * O app nunca fala com o Supabase: as rotas do servidor resolvem a sessão pelo
 * cookie (mesma origem, o app é servido em `/app` pelo Next) e aplicam o
 * contrato da SPA ADR §5. Aqui só entram as decisões que são da tela:
 *
 * - **Nada de CPF em URL ou log.** O CPF vai no corpo do POST e só; o cliente
 *   não registra, não guarda e não devolve o valor.
 * - **Sessão automática.** `credentials: "include"` manda o cookie da web; o
 *   app de loja usa o mesmo caminho enquanto a ponte de token não existir.
 * - **Cabeçalho do app em toda escrita.** O servidor recusa escrita por cookie
 *   sem ele (CSRF), e o app é o único que o manda.
 */

const CABECALHOS_DO_APP: Readonly<Record<string, string>> = {
  "content-type": "application/json",
  "x-bivaque-app": "bivaque-spa",
}

export type Resposta = Readonly<{ status: number; corpo: Record<string, unknown> }>

export class FalhaDaEntrada extends Error {
  readonly codigo: string
  readonly status: number

  constructor(codigo: string, status: number) {
    super(`entrada: ${codigo} (${status})`)
    this.name = "FalhaDaEntrada"
    this.codigo = codigo
    this.status = status
  }
}

/** Uma chamada crua: devolve status e corpo, sem decidir o que é erro. */
async function pedir(
  caminho: string,
  init: Readonly<{ metodo?: "GET" | "POST" | "PUT"; corpo?: unknown }> = {},
): Promise<Resposta> {
  let resposta: Response
  try {
    resposta = await fetch(`/api/app/entry/${caminho}`, {
      method: init.metodo ?? "GET",
      credentials: "include",
      headers: CABECALHOS_DO_APP,
      ...(init.corpo === undefined ? {} : { body: JSON.stringify(init.corpo) }),
    })
  } catch {
    throw new FalhaDaEntrada("rede", 0)
  }
  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>
  return { status: resposta.status, corpo }
}

function texto(corpo: Record<string, unknown>, chave: string): string | null {
  const valor = corpo[chave]
  return typeof valor === "string" ? valor : null
}

export type RespostaDeProgresso = Readonly<{
  autenticado: boolean
  via?: string
  provedor?: "google" | "email"
  progresso?: unknown
}>

export async function lerProgresso(): Promise<RespostaDeProgresso> {
  const resposta = await pedir("progress")
  if (resposta.status === 401) return { autenticado: false }
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "progresso-indisponivel",
      resposta.status,
    )
  }
  return {
    autenticado: resposta.corpo["autenticado"] === true,
    ...(typeof resposta.corpo["via"] === "string" ? { via: resposta.corpo["via"] } : {}),
    ...(resposta.corpo["provedor"] === "google" || resposta.corpo["provedor"] === "email"
      ? { provedor: resposta.corpo["provedor"] }
      : {}),
    progresso: resposta.corpo["progresso"],
  }
}

export async function salvarProgresso(progresso: unknown): Promise<void> {
  const resposta = await pedir("progress", { metodo: "PUT", corpo: progresso })
  // 409 = a pessoa já tem vínculo com a cidade; o rascunho não é mais escrito.
  // Não é falha a mostrar na tela.
  if (resposta.status === 409) return
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "progresso-nao-salvo",
      resposta.status,
    )
  }
}

export type EnvioDoCodigo =
  | { readonly estado: "enviado"; readonly reenviarEm: number }
  | { readonly estado: "limite"; readonly reenviarEm: number }
  // O servidor recusou o endereço (forma inválida): a tela diz "e-mail inválido",
  // não "indisponível" — a pessoa corrige, não espera.
  | { readonly estado: "email-invalido" }
  | { readonly estado: "indisponivel" }

export async function enviarCodigo(email: string): Promise<EnvioDoCodigo> {
  const resposta = await pedir("otp", { metodo: "POST", corpo: { email } })
  if (resposta.status === 200) {
    const reenviarEm = resposta.corpo["reenviarEm"]
    return { estado: "enviado", reenviarEm: typeof reenviarEm === "number" ? reenviarEm : 60 }
  }
  if (resposta.status === 429) {
    const reenviarEm = resposta.corpo["reenviarEm"]
    return { estado: "limite", reenviarEm: typeof reenviarEm === "number" ? reenviarEm : 60 }
  }
  if (resposta.status === 400 && resposta.corpo["erro"] === "email-invalido") {
    return { estado: "email-invalido" }
  }
  return { estado: "indisponivel" }
}

export type VerificacaoDoCodigo =
  | { readonly estado: "autenticado" }
  | { readonly estado: "codigo-invalido" }
  | { readonly estado: "limite"; readonly reenviarEm: number }
  | { readonly estado: "indisponivel" }

export async function verificarCodigo(email: string, codigo: string): Promise<VerificacaoDoCodigo> {
  const resposta = await pedir("otp/verify", { metodo: "POST", corpo: { email, codigo } })
  if (resposta.status === 200) return { estado: "autenticado" }
  if (resposta.status === 400) return { estado: "codigo-invalido" }
  if (resposta.status === 429) {
    const reenviarEm = resposta.corpo["reenviarEm"]
    return { estado: "limite", reenviarEm: typeof reenviarEm === "number" ? reenviarEm : 60 }
  }
  return { estado: "indisponivel" }
}

export async function aceitarTermos(): Promise<void> {
  const resposta = await pedir("consent", { metodo: "POST" })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(texto(resposta.corpo, "erro") ?? "aceite-nao-gravado", resposta.status)
  }
}

export type StatusDaVerificacao = Readonly<{
  status: string | null
  membroDaCidade: boolean
}>

export async function lerVerificacao(): Promise<StatusDaVerificacao> {
  const resposta = await pedir("verification")
  if (resposta.status === 401) throw new FalhaDaEntrada("sem-sessao", 401)
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "verificacao-indisponivel",
      resposta.status,
    )
  }
  const status = resposta.corpo["status"]
  return {
    status: typeof status === "string" ? status : null,
    membroDaCidade: resposta.corpo["membroDaCidade"] === true,
  }
}

export type ResultadoDoCpf = Readonly<{
  status: string
  errorCode?: string
}>

/** O CPF vai no corpo, nunca na URL; a resposta é o resultado sem motivo técnico. */
export async function consultarCpf(cpf: string): Promise<ResultadoDoCpf> {
  const resposta = await pedir("cpf", { metodo: "POST", corpo: { cpf } })
  const outcome = resposta.corpo["outcome"]
  if (resposta.status === 200 && typeof outcome === "object" && outcome !== null) {
    const dados = outcome as Record<string, unknown>
    return {
      status: typeof dados["status"] === "string" ? dados["status"] : "temporary_error",
      ...(typeof dados["errorCode"] === "string" ? { errorCode: dados["errorCode"] } : {}),
    }
  }
  throw new FalhaDaEntrada(texto(resposta.corpo, "erro") ?? "cpf-indisponivel", resposta.status)
}

export type EntradaDoProvisionamento = Readonly<{
  ibgeCode: string
  displayName: string
  moment?: "arriving" | "resident" | "leaving"
  arrivalDate?: string
  departureDate?: string
  destinationIbgeCode?: string
}>

export async function provisionar(entrada: EntradaDoProvisionamento): Promise<void> {
  const resposta = await pedir("provision", {
    metodo: "POST",
    corpo: {
      ibge_code: entrada.ibgeCode,
      display_name: entrada.displayName,
      ...(entrada.moment === undefined ? {} : { moment: entrada.moment }),
      ...(entrada.arrivalDate === undefined ? {} : { arrival_date: entrada.arrivalDate }),
      ...(entrada.departureDate === undefined ? {} : { departure_date: entrada.departureDate }),
      ...(entrada.destinationIbgeCode === undefined
        ? {}
        : { destination_ibge_code: entrada.destinationIbgeCode }),
    },
  })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "provisionamento-indisponivel",
      resposta.status,
    )
  }
}

export async function salvarInteresses(grupos: readonly string[]): Promise<void> {
  const resposta = await pedir("interests", { metodo: "POST", corpo: { grupos } })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "interesses-nao-salvos",
      resposta.status,
    )
  }
}

/** O combinado é registrado com a versão do Código de Conduta que a tela mostrou. */
export async function registrarCombinado(versao: number): Promise<void> {
  const resposta = await pedir("combinado", { metodo: "POST", corpo: { versao } })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "combinado-nao-registrado",
      resposta.status,
    )
  }
}

export async function salvarAvisos(avisos: "ativados" | "agora-nao"): Promise<void> {
  const resposta = await pedir("notices", { metodo: "POST", corpo: { avisos } })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(texto(resposta.corpo, "erro") ?? "avisos-nao-salvos", resposta.status)
  }
}

// ── catálogo de cidades (rotas públicas do Next, mesma origem) ─────────────
export type CidadeDoCatalogo = Readonly<{ ibgeCode: string; cityName: string }>

let estadosEmCache: readonly string[] | null = null
const cidadesEmCache = new Map<string, readonly CidadeDoCatalogo[]>()

export async function carregarEstados(): Promise<readonly string[]> {
  if (estadosEmCache !== null) return estadosEmCache
  let resposta: Response
  try {
    resposta = await fetch("/api/localities", { credentials: "include" })
  } catch {
    throw new FalhaDaEntrada("rede", 0)
  }
  if (!resposta.ok) throw new FalhaDaEntrada("catalogo-indisponivel", resposta.status)
  const corpo = (await resposta.json().catch(() => ({}))) as { ufs?: unknown }
  const ufs = Array.isArray(corpo.ufs)
    ? corpo.ufs.filter((uf): uf is string => typeof uf === "string")
    : []
  estadosEmCache = ufs
  return ufs
}

export async function carregarCidades(uf: string): Promise<readonly CidadeDoCatalogo[]> {
  const guardadas = cidadesEmCache.get(uf)
  if (guardadas !== undefined) return guardadas
  let resposta: Response
  try {
    resposta = await fetch(`/api/localities/${encodeURIComponent(uf)}`, {
      credentials: "include",
    })
  } catch {
    throw new FalhaDaEntrada("rede", 0)
  }
  if (!resposta.ok) throw new FalhaDaEntrada("catalogo-indisponivel", resposta.status)
  const corpo = (await resposta.json().catch(() => ({}))) as { municipalities?: unknown }
  const lista = Array.isArray(corpo.municipalities) ? corpo.municipalities : []
  const cidades = lista.flatMap((linha): CidadeDoCatalogo[] => {
    if (typeof linha !== "object" || linha === null) return []
    const dados = linha as Record<string, unknown>
    return typeof dados["ibgeCode"] === "string" && typeof dados["cityName"] === "string"
      ? [{ ibgeCode: dados["ibgeCode"], cityName: dados["cityName"] }]
      : []
  })
  cidadesEmCache.set(uf, cidades)
  return cidades
}

export type GrupoDaEntrada = Readonly<{
  id: string
  nome: string
  descricao: string | null
}>

/** Inicia o OAuth do Google: devolve a URL de autorização (o PKCE vai em cookie). */
export async function iniciarGoogle(): Promise<string> {
  const resposta = await pedir("oauth", { metodo: "POST", corpo: { provedor: "google" } })
  const url = texto(resposta.corpo, "url")
  if (resposta.status !== 200 || url === null) {
    throw new FalhaDaEntrada(texto(resposta.corpo, "erro") ?? "oauth-indisponivel", resposta.status)
  }
  return url
}

/** Aceita o convite familiar já autenticado: sem senha e sem CPF. */
export async function aceitarConvite(entrada: { codigo: string; nome: string }): Promise<void> {
  const resposta = await pedir("invite", {
    metodo: "POST",
    corpo: { codigo: entrada.codigo, nome: entrada.nome },
  })
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "convite-indisponivel",
      resposta.status,
    )
  }
}

export type PreviewDoConvite =
  | Readonly<{ estado: "ok"; inviterName: string; email: string | null }>
  | Readonly<{ estado: "email-nao-confere" }>
  | Readonly<{ estado: "invalido" }>
  | Readonly<{ estado: "limite" }>
  | Readonly<{ estado: "indisponivel" }>

/**
 * Valida o código do convite antes de qualquer envio de e-mail. Devolve o nome
 * de quem convidou (para o título da etapa) e o endereço que o convite declara,
 * quando existe — é ele que vira o campo só de leitura.
 */
export async function previewConvite(codigo: string, email?: string): Promise<PreviewDoConvite> {
  const resposta = await pedir("invite/preview", {
    metodo: "POST",
    corpo: { codigo, ...(email === undefined ? {} : { email }) },
  })
  if (resposta.status === 200) {
    const inviterName = texto(resposta.corpo, "inviterName")
    return {
      estado: "ok",
      inviterName: inviterName === null || inviterName.trim() === "" ? "família" : inviterName,
      email: texto(resposta.corpo, "email"),
    }
  }
  if (resposta.status === 429) return { estado: "limite" }
  if (resposta.status === 400) {
    return resposta.corpo["erro"] === "email-nao-confere"
      ? { estado: "email-nao-confere" }
      : { estado: "invalido" }
  }
  return { estado: "indisponivel" }
}

/**
 * Envia o documento de identidade para a análise manual. Multipart de verdade:
 * o `content-type` com o boundary é do navegador, nunca escrito à mão. O arquivo
 * não vai para o rascunho nem fica na memória da tela depois da resposta.
 */
export async function enviarDocumento(arquivo: File): Promise<void> {
  const formulario = new FormData()
  formulario.append("documento", arquivo)
  let resposta: Response
  try {
    resposta = await fetch("/api/app/entry/document", {
      method: "POST",
      credentials: "include",
      headers: { "x-bivaque-app": "bivaque-spa" },
      body: formulario,
    })
  } catch {
    throw new FalhaDaEntrada("rede", 0)
  }
  if (resposta.status === 200) return
  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>
  throw new FalhaDaEntrada(texto(corpo, "erro") ?? "documento-indisponivel", resposta.status)
}

export async function carregarGrupos(): Promise<readonly GrupoDaEntrada[]> {
  const resposta = await pedir("groups")
  if (resposta.status === 401) throw new FalhaDaEntrada("sem-sessao", 401)
  if (resposta.status !== 200) {
    throw new FalhaDaEntrada(
      texto(resposta.corpo, "erro") ?? "grupos-indisponiveis",
      resposta.status,
    )
  }
  const lista = Array.isArray(resposta.corpo["grupos"]) ? resposta.corpo["grupos"] : []
  return lista.flatMap((linha): GrupoDaEntrada[] => {
    if (typeof linha !== "object" || linha === null) return []
    const dados = linha as Record<string, unknown>
    return typeof dados["id"] === "string" && typeof dados["nome"] === "string"
      ? [
          {
            id: dados["id"],
            nome: dados["nome"],
            descricao: typeof dados["descricao"] === "string" ? dados["descricao"] : null,
          },
        ]
      : []
  })
}
