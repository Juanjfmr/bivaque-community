import { FalhaDaEntrada } from "./servidor"

/**
 * A mensagem fixa de cada falha do convite. O 400 do aceite tem motivos
 * diferentes (consentimento, nome, e-mail ausente) e cada um precisa da sua
 * frase; código inválido/vencido continua com a frase única.
 */
export function mensagemDoConvite(falha: unknown): string {
  if (falha instanceof FalhaDaEntrada) {
    if (falha.status === 400) {
      switch (falha.codigo) {
        case "consentimento-pendente":
          return "Aceite os Termos e o Código de Conduta antes de entrar."
        case "nome-invalido":
          return "Confira o nome informado e tente de novo."
        case "email-ausente":
          return "Seu e-mail não chegou nesta sessão. Volte e entre de novo."
        default:
          return "Código inválido ou vencido. Volte e confira o convite."
      }
    }
    if (falha.status === 429) return "Muitas tentativas. Espere um pouco e tente de novo."
    if (falha.status === 503) return "O convite está indisponível agora. Tente de novo."
  }
  return "Não foi possível aceitar o convite agora. Tente de novo."
}
