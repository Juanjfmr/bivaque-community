import { createContext, type ReactNode, type RefObject, useContext } from "react"
import type {
  CidadeDoCatalogo,
  EnvioDoCodigo,
  GrupoDaEntrada,
  ResultadoDoCpf,
  VerificacaoDoCodigo,
} from "./servidor"

/**
 * O servidor real da entrada, disponível para as etapas aprovadas (LAN-F01,
 * lote B). As etapas funcionam sem o provedor — é assim que a prévia de
 * desenvolvimento continua com o servidor simulado. No caminho de produção a
 * tela injeta este provedor e as mesmas etapas passam a falar com
 * `/api/app/entry/*` e com o catálogo de cidades.
 *
 * O e-mail em trânsito fica aqui porque não pode ir para o rascunho (dado
 * sensível): quem guarda é a memória da sessão, entre a etapa do e-mail e a do
 * código.
 */

export type ServidorDaEntrada = Readonly<{
  emailEmTransito: RefObject<string | null>
  enviarCodigo: (email: string) => Promise<EnvioDoCodigo>
  verificarCodigo: (codigo: string) => Promise<VerificacaoDoCodigo>
  consultarCpf: (cpf: string) => Promise<ResultadoDoCpf>
  carregarEstados: () => Promise<readonly string[]>
  carregarCidades: (uf: string) => Promise<readonly CidadeDoCatalogo[]>
  carregarGrupos: () => Promise<readonly GrupoDaEntrada[]>
  salvarInteresses: (grupos: readonly string[]) => Promise<void>
  registrarCombinado: (versao: number) => Promise<void>
  salvarAvisos: (avisos: "ativados" | "agora-nao") => Promise<void>
  enviarDocumento: (arquivo: File) => Promise<void>
  iniciarGoogle: () => Promise<string>
  aceitarConvite: (entrada: { codigo: string; nome: string }) => Promise<void>
  /** O código do convite vive só aqui: é credencial e não entra no rascunho. */
  codigoDoConvite: RefObject<string | null>
  registrarConvite: (codigo: string) => void
}>

const Contexto = createContext<ServidorDaEntrada | null>(null)

export function ProvedorDoServidorDaEntrada({
  servidor,
  children,
}: {
  readonly servidor: ServidorDaEntrada
  readonly children: ReactNode
}) {
  return <Contexto.Provider value={servidor}>{children}</Contexto.Provider>
}

/** `null` na prévia: as etapas sabem cair no comportamento simulado. */
export function useServidorDaEntrada(): ServidorDaEntrada | null {
  return useContext(Contexto)
}
