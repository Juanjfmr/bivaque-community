import { lerVerificacao, verificarCodigo } from "./servidor"

export async function verificarCodigoEVinculo(email: string, codigo: string) {
  const resultado = await verificarCodigo(email, codigo)
  if (resultado.estado !== "autenticado") return resultado
  try {
    const verificacao = await lerVerificacao()
    return verificacao.membroDaCidade ? { estado: "membro" as const } : resultado
  } catch {
    return { estado: "verificacao-indisponivel" as const }
  }
}
