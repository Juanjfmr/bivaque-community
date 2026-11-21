import { SecureStoragePlugin } from "capacitor-secure-storage-plugin"

const RENOVACAO = "sessao.renovacao"
const PKCE = "sessao.pkce"

type FluxoPkce = Readonly<{ verificador: string; criadoEm: number }>

async function ler(chave: string): Promise<string | null> {
  try {
    return (await SecureStoragePlugin.get({ key: chave })).value || null
  } catch {
    return null
  }
}

async function gravar(chave: string, valor: string): Promise<void> {
  const resultado = await SecureStoragePlugin.set({ key: chave, value: valor })
  if (!resultado.value) throw new Error("Falha ao gravar no cofre")
}

async function apagar(chave: string): Promise<void> {
  await SecureStoragePlugin.remove({ key: chave })
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
