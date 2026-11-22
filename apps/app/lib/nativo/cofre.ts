import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage"
import { Capacitor } from "@capacitor/core"

const RENOVACAO = "sessao.renovacao"
const PKCE = "sessao.pkce"

type FluxoPkce = Readonly<{ verificador: string; criadoEm: number }>

let configuracao: Promise<void> | null = null

function configurar(): Promise<void> {
  configuracao ??= Promise.all([
    SecureStorage.setSynchronize(false),
    SecureStorage.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly),
    SecureStorage.setKeyPrefix("bivaque."),
  ]).then(() => undefined)
  return configuracao
}

async function ler(chave: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    await configurar()
    const valor = await SecureStorage.get(chave)
    return typeof valor === "string" && valor ? valor : null
  } catch {
    return null
  }
}

async function gravar(chave: string, valor: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error("cofre disponivel apenas no aparelho")
  await configurar()
  await SecureStorage.set(chave, valor)
}

async function apagar(chave: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error("cofre disponivel apenas no aparelho")
  await configurar()
  await SecureStorage.remove(chave)
}

export const lerRenovacao = () => ler(RENOVACAO)
export const gravarRenovacao = (token: string) => gravar(RENOVACAO, token)
export const apagarRenovacao = () => apagar(RENOVACAO)
export const gravarPkce = (fluxo: FluxoPkce) => gravar(PKCE, JSON.stringify(fluxo))
export const apagarPkce = () => apagar(PKCE)

export async function lerPkce(): Promise<FluxoPkce | null> {
  const valor = await ler(PKCE)
  if (valor === null) return null
  try {
    const fluxo: unknown = JSON.parse(valor)
    if (typeof fluxo !== "object" || fluxo === null) return null
    const dados = fluxo as Record<string, unknown>
    if (typeof dados["verificador"] !== "string" || typeof dados["criadoEm"] !== "number") {
      return null
    }
    return { verificador: dados["verificador"], criadoEm: dados["criadoEm"] }
  } catch {
    return null
  }
}
