import { enviar, FalhaDaApi, ler } from "../api/cliente"
import { type CanalDaPreferencia, type PreferenciasDeAviso, TIPOS_DO_AVISO } from "./avisos"

/**
 * A porta do push no app (RUN-137, ADR-20261107).
 *
 * A permissão do sistema só é pedida quando a pessoa liga o push nas
 * preferências — nunca ao abrir o app. A inscrição do aparelho vai para
 * `/api/app/push`, com o `user_id` vindo da sessão no servidor. Sair do app
 * (a rota de entrada é o ponto de saída do app) apaga a inscrição deste
 * aparelho.
 *
 * O navegador é injetável para o teste exercitar o interruptor sem DOM, sem
 * Service Worker e sem provedor.
 */

export type ConfiguracaoDePush = Readonly<{
  configurado: boolean
  chavePublica: string | null
}>

export type AssinaturaDoNavegador = Readonly<{
  endpoint: string
  keys: Readonly<{ p256dh: string; auth: string }>
}>

export type NavegadorDePush = Readonly<{
  suportado: () => boolean
  pedirPermissao: () => Promise<NotificationPermission>
  inscrever: (chave: BufferSource) => Promise<AssinaturaDoNavegador>
  inscricaoAtual: () => Promise<AssinaturaDoNavegador | null>
  cancelar: () => Promise<void>
  rotulo: () => string
}>

export type ResultadoDeInscricao =
  | { estado: "inscrito" }
  | { estado: "negado" }
  | { estado: "indisponivel" }
  | { estado: "falhou" }

type Opcoes = Readonly<{ signal?: AbortSignal; navegador?: NavegadorDePush }>

function base64urlParaBytes(chave: string): Uint8Array<ArrayBuffer> {
  const base64 = chave.replace(/-/g, "+").replace(/_/g, "/")
  const comPreenchimento = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const bruto = atob(comPreenchimento)
  const bytes = new Uint8Array(bruto.length)
  for (let indice = 0; indice < bruto.length; indice++) bytes[indice] = bruto.charCodeAt(indice)
  return bytes
}

/** Decodifica a chave pública VAPID (base64url) para o `subscribe` do navegador. */
export function aplicarChave(chave: string): Uint8Array<ArrayBuffer> {
  return base64urlParaBytes(chave)
}

/** O interruptor existe só quando o navegador suporta e o servidor tem as chaves. */
export function deveOferecerPush(suportado: boolean, configurado: boolean): boolean {
  return suportado && configurado
}

function assinaturaDoJson(json: PushSubscriptionJSON): AssinaturaDoNavegador | null {
  const chaves = json.keys
  const p256dh = chaves?.["p256dh"]
  const auth = chaves?.["auth"]
  if (json.endpoint === undefined || p256dh === undefined || auth === undefined) {
    return null
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth } }
}

const navegadorReal: NavegadorDePush = {
  suportado() {
    return (
      typeof navigator !== "undefined" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    )
  },
  async pedirPermissao() {
    if (Notification.permission !== "default") return Notification.permission
    return Notification.requestPermission()
  },
  async inscrever(chave) {
    const registro = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
    const existente = await registro.pushManager.getSubscription()
    const assinatura =
      existente ??
      (await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chave,
      }))
    const json = assinaturaDoJson(assinatura.toJSON())
    if (json === null) throw new Error("assinatura sem chaves públicas")
    return json
  },
  async inscricaoAtual() {
    const registro = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    const assinatura = await registro?.pushManager.getSubscription()
    if (assinatura === undefined || assinatura === null) return null
    return assinaturaDoJson(assinatura.toJSON())
  },
  async cancelar() {
    const registro = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    const assinatura = await registro?.pushManager.getSubscription()
    await assinatura?.unsubscribe()
  },
  rotulo() {
    return "Navegador"
  },
}

function exigirRegistro(valor: unknown): Record<string, unknown> {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
  }
  return valor as Record<string, unknown>
}

export async function lerConfiguracaoDePush(opcoes: Opcoes = {}): Promise<ConfiguracaoDePush> {
  const corpo = exigirRegistro(await ler("/api/app/push", opcoes))
  if (typeof corpo["configurado"] !== "boolean") {
    throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
  }
  const chave = corpo["chavePublica"]
  return {
    configurado: corpo["configurado"],
    chavePublica: typeof chave === "string" && chave !== "" ? chave : null,
  }
}

/**
 * Liga o push neste aparelho: confere a configuração, pede a permissão (só
 * aqui), inscreve e grava pela rota. Permissão negada mantém desligado e não
 * grava nada.
 */
export async function inscreverPush(opcoes: Opcoes = {}): Promise<ResultadoDeInscricao> {
  const navegador = opcoes.navegador ?? navegadorReal
  if (!navegador.suportado()) return { estado: "indisponivel" }

  // A permissão é pedida antes de qualquer espera de rede: o navegador exige
  // ativação do gesto, e o interruptor só aparece quando o servidor já tem as
  // chaves (a consulta de configuração é o que a tela faz para mostrá-lo).
  let permissao: NotificationPermission
  try {
    permissao = await navegador.pedirPermissao()
  } catch {
    return { estado: "falhou" }
  }
  if (permissao !== "granted") return { estado: "negado" }

  let configuracao: ConfiguracaoDePush
  try {
    configuracao = await lerConfiguracaoDePush(opcoes)
  } catch {
    return { estado: "falhou" }
  }
  if (configuracao.chavePublica === null) return { estado: "indisponivel" }

  try {
    const assinatura = await navegador.inscrever(aplicarChave(configuracao.chavePublica))
    await registrarInscricao(navegador, assinatura, opcoes)
    return { estado: "inscrito" }
  } catch {
    return { estado: "falhou" }
  }
}

/** Grava no servidor a inscrição que o navegador já tem. */
async function registrarInscricao(
  navegador: NavegadorDePush,
  assinatura: AssinaturaDoNavegador,
  opcoes: Opcoes,
): Promise<void> {
  await enviar(
    "POST",
    "/api/app/push",
    {
      kind: "web",
      destination: assinatura.endpoint,
      keys: assinatura.keys,
      label: navegador.rotulo(),
    },
    opcoes,
  )
}

/** Apaga a inscrição deste aparelho (servidor e navegador). */
export async function desinscreverPush(opcoes: Opcoes = {}): Promise<number> {
  const navegador = opcoes.navegador ?? navegadorReal
  if (!navegador.suportado()) return 0

  const atual = await navegador.inscricaoAtual().catch(() => null)
  if (atual === null) return 0

  try {
    const corpo = exigirRegistro(
      await enviar("DELETE", "/api/app/push", { destination: atual.endpoint }, opcoes),
    )
    return typeof corpo["removidos"] === "number" ? corpo["removidos"] : 0
  } finally {
    // Mesmo sem sessão no servidor, o aparelho não deve continuar inscrito.
    await navegador.cancelar().catch(() => undefined)
  }
}

/**
 * A saída do app. A rota de entrada é o único ponto de saída da sessão no app
 * hoje; a mesma função serve ao "Sair" quando ele existir.
 */
export async function sairDoAparelho(): Promise<void> {
  await desinscreverPush().catch(() => undefined)
}

/** Liga ou desliga o canal push em todos os tipos de aviso. */
export function comPushEmTodos(
  preferencias: PreferenciasDeAviso,
  ativo: boolean,
): PreferenciasDeAviso {
  const semPush = preferencias.channels.filter((canal) => canal.channel !== "push")
  const push: CanalDaPreferencia[] = TIPOS_DO_AVISO.map((notificationType) => ({
    notificationType,
    channel: "push",
    enabled: ativo,
  }))
  return { ...preferencias, channels: [...semPush, ...push] }
}

/** O estado do interruptor na tela: disponível e ligado neste aparelho. */
export async function estadoDoInterruptorDePush(
  navegador: NavegadorDePush = navegadorReal,
): Promise<Readonly<{ disponivel: boolean; ligado: boolean }>> {
  const suportado = navegador.suportado()
  if (!suportado) return { disponivel: false, ligado: false }
  try {
    const configuracao = await lerConfiguracaoDePush({ navegador })
    if (!deveOferecerPush(suportado, configuracao.configurado)) {
      return { disponivel: false, ligado: false }
    }
    const inscricao = await navegador.inscricaoAtual()
    if (inscricao === null) return { disponivel: true, ligado: false }
    // O servidor é a verdade da entrega: regravar a inscrição que o navegador
    // já tem devolve a linha apagada pela retenção de 90 dias, sem pedir
    // permissão de novo (ela já foi concedida quando o push foi ligado).
    await registrarInscricao(navegador, inscricao, { navegador }).catch(() => undefined)
    return { disponivel: true, ligado: true }
  } catch {
    return { disponivel: false, ligado: false }
  }
}

/**
 * A saída do app: a rota de entrada, já sem sessão. Um membro autenticado que
 * abre a entrada continua inscrito — perder o push sem ter saído seria defeito.
 */
export function saiuDoApp(nomeDaRota: string, autenticado: boolean): boolean {
  return nomeDaRota === "entrar" && !autenticado
}
