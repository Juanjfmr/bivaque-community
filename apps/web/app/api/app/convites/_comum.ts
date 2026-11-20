import { responder } from "../../../../lib/app-api/rota-do-app"

export function erroDoConvite(request: Request, code?: string) {
  const erros: Record<string, { status: number; erro: string; mensagem: string }> = {
    "42501": {
      status: 403,
      erro: "sem-permissao",
      mensagem: "Você não tem permissão para esta ação.",
    },
    P0002: { status: 404, erro: "convite-nao-encontrado", mensagem: "Convite não encontrado." },
    P0003: { status: 409, erro: "convite-usado", mensagem: "Este convite já foi usado." },
    P0004: { status: 410, erro: "convite-vencido", mensagem: "Este convite expirou." },
    P0005: {
      status: 429,
      erro: "cota-esgotada",
      mensagem: "Cota de convites esgotada. Tente novamente mais tarde.",
    },
  }
  const falha = (code && erros[code]) || {
    status: 503,
    erro: "indisponivel",
    mensagem: "Não foi possível processar o convite.",
  }
  return responder(request, { erro: falha.erro, mensagem: falha.mensagem }, falha.status)
}
